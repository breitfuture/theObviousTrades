from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from sqlalchemy import text
from datetime import datetime, date
import io, csv, re, json
from ..db import get_db

router = APIRouter()

# -----------------------------
# Date helpers
# -----------------------------
MONTHS = {
    "jan": "01", "feb": "02", "mar": "03", "apr": "04", "may": "05", "jun": "06",
    "jul": "07", "aug": "08", "sep": "09", "oct": "10", "nov": "11", "dec": "12",
}

def _parse_date(s: str | None) -> date | None:
    if not s:
        return None
    s = s.strip()

    # 1) YYYY-MM-DD
    try:
        return datetime.strptime(s, "%Y-%m-%d").date()
    except Exception:
        pass

    # 2) 2025-11-03 / 2025_11_03 found in filename
    m = re.search(r"(\d{4})[-_](\d{2})[-_](\d{2})", s)
    if m:
        y, mm, dd = m.groups()
        return date(int(y), int(mm), int(dd))

    # 3) Nov-03-2025 / Nov 03 2025 etc
    m = re.search(
        r"(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[-_ ]?(\d{1,2})[-_ ]?(\d{4})",
        s,
        re.IGNORECASE,
    )
    if m:
        mon, d, y = m.groups()
        mm = MONTHS[mon.lower()]
        return date(int(y), int(mm), int(d))

    return None


# -----------------------------
# CSV helpers
# -----------------------------
def norm(x):
    return (x or "").strip()

def to_num(x):
    """Robust numeric parser: handles $, %, commas, parens, stray chars."""
    if x is None:
        return None
    s = str(x).strip()
    if s == "" or s == "--" or s.lower() == "n/a":
        return None

    neg = s.startswith("(") and s.endswith(")")
    s = s.replace(",", "").replace("$", "").replace("%", "")
    s = re.sub(r"[^0-9.\-]", "", s)

    if s in ("", ".", "-"):
        return None

    try:
        v = float(s)
        return -v if neg and v > 0 else v
    except Exception:
        return None

def pick(cols: dict, *cands: str) -> str | None:
    """
    Find a header by exact key first, then fuzzy 'contains'.
    `cols` is a {lowercased_header: original_header} map.
    Returns the original header name or None.
    """
    # exact
    for c in cands:
        if c in cols:
            return cols[c]

    # fuzzy
    for key_lower, original in cols.items():
        for c in cands:
            if c in key_lower:
                return original

    return None


# -----------------------------
# Route: upload positions (dated snapshot)
# -----------------------------
@router.post("/api/uploads/positions", tags=["uploads"])
async def upload_positions(
    file: UploadFile = File(...),
    as_of: str | None = Form(None),
    db = Depends(get_db),
):
    """
    Upload a Fidelity Positions CSV as a dated snapshot.

    - Populates `holdings` + `prices` (equity positions only).
    - Populates `positions_fidelity` with ALL rows (including SPAXX + Pending).

    Date stamping:
      - If `as_of` is provided (YYYY-MM-DD), use it.
      - Else parse date from filename (e.g., Nov-03-2025 or 2025-11-03).
      - Else fall back to today's date.
    """
    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Please upload a .csv file")

    # Decide snapshot date
    snap = _parse_date(as_of) or _parse_date(file.filename) or date.today()

    content = await file.read()
    buf = io.StringIO(content.decode("utf-8", errors="ignore"))
    reader = csv.DictReader(buf)

    cols = {c.lower(): c for c in (reader.fieldnames or [])}

    # Header picking (tolerant to slight naming differences)
    c_symbol        = pick(cols, "symbol", "security symbol", "ticker")
    c_qty           = pick(cols, "quantity", "shares", "current shares")
    c_avgcost       = pick(cols, "average cost basis", "average cost", "cost basis per share", "average cost basis")
    c_lastpx        = pick(cols, "last price", "price", "current price")
    c_lastpx_change = pick(cols, "last price change", "price change")
    c_currval       = pick(cols, "current va", "current value", "market value")
    c_todays_dollar = pick(cols, "today's ga $", "todays gain $", "today's gain $")
    c_todays_pct    = pick(cols, "today's ga %", "todays gain %", "today's gain %")
    c_total_dollar  = pick(cols, "total gain/loss dollar", "total gain dollar", "total gain/loss $")
    c_total_pct     = pick(cols, "total gain/loss percent", "total gain %")
    c_percent_of    = pick(cols, "percent of account", "percent of")
    c_costbasis_tot = pick(cols, "cost basis total", "cost basis t")
    c_acctname      = pick(cols, "account name", "account")
    c_acctnum       = pick(cols, "account number", "account #")
    c_desc          = pick(cols, "description")
    c_type          = pick(cols, "type")

    if not all([c_symbol, c_qty, c_avgcost]):
        raise HTTPException(
            status_code=400,
            detail=(
                "CSV missing required headers (symbol/quantity/average cost). "
                f"Got: {reader.fieldnames}"
            ),
        )

    inserted_holdings = 0
    inserted_prices   = 0
    created_secs      = 0
    created_accts     = 0
    skipped           = 0
    reasons = {"blank_symbol": 0, "spaxx": 0, "pending": 0, "bad_qty": 0, "bad_avgcost": 0}

    # Optional: clear existing snapshot before re-loading
    # db.execute(text("DELETE FROM holdings WHERE as_of = :d"), {"d": snap})
    # db.execute(text("DELETE FROM prices   WHERE date  = :d"), {"d": snap})
    # db.execute(text("DELETE FROM positions_fidelity WHERE as_of = :d"), {"d": snap})

    INSERT_POSITIONS_FIDELITY = text("""
        INSERT INTO public.positions_fidelity (
            as_of,
            source_filename,
            account_number,
            account_name,
            symbol,
            description,
            quantity,
            last_price,
            last_price_change,
            current_value,
            todays_gain_dollar,
            todays_gain_pct,
            total_gain_dollar,
            total_gain_pct,
            percent_of,
            cost_basis,
            average_cost,
            security_type,
            raw_row
        )
        VALUES (
            :as_of,
            :source_filename,
            :account_number,
            :account_name,
            :symbol,
            :description,
            :quantity,
            :last_price,
            :last_price_change,
            :current_value,
            :todays_gain_dollar,
            :todays_gain_pct,
            :total_gain_dollar,
            :total_gain_pct,
            :percent_of,
            :cost_basis,
            :average_cost,
            :security_type,
            :raw_row
        );
    """)

    for row in reader:
        # ---------- 1) Parse raw fields ----------
        acct_number = norm(row.get(c_acctnum)) if c_acctnum else None
        acct_name   = norm(row.get(c_acctname)) if c_acctname else None
        symbol      = norm(row.get(c_symbol)) if c_symbol else ""
        description = norm(row.get(c_desc)) if c_desc else None
        sec_type    = norm(row.get(c_type)) if c_type else None

        qty                = to_num(row.get(c_qty)) if c_qty else None
        last_price         = to_num(row.get(c_lastpx)) if c_lastpx else None
        last_price_change  = to_num(row.get(c_lastpx_change)) if c_lastpx_change else None
        current_value      = to_num(row.get(c_currval)) if c_currval else None
        todays_gain_dollar = to_num(row.get(c_todays_dollar)) if c_todays_dollar else None
        todays_gain_pct    = to_num(row.get(c_todays_pct)) if c_todays_pct else None
        total_gain_dollar  = to_num(row.get(c_total_dollar)) if c_total_dollar else None
        total_gain_pct     = to_num(row.get(c_total_pct)) if c_total_pct else None
        percent_of         = to_num(row.get(c_percent_of)) if c_percent_of else None
        cost_basis_total   = to_num(row.get(c_costbasis_tot)) if c_costbasis_tot else None
        avg_cost           = to_num(row.get(c_avgcost)) if c_avgcost else None

        # Fallback for cost basis total if missing but qty * avg_cost is available
        if cost_basis_total is None and qty is not None and avg_cost is not None:
            cost_basis_total = qty * avg_cost

        raw_json = json.dumps(row, ensure_ascii=False)

        # ---------- 2) ALWAYS store raw row in positions_fidelity ----------
        pf_params = {
            "as_of": snap,
            "source_filename": file.filename,
            "account_number": acct_number,
            "account_name": acct_name,
            "symbol": symbol,
            "description": description,
            "quantity": qty,
            "last_price": last_price,
            "last_price_change": last_price_change,
            "current_value": current_value,
            "todays_gain_dollar": todays_gain_dollar,
            "todays_gain_pct": todays_gain_pct,
            "total_gain_dollar": total_gain_dollar,
            "total_gain_pct": total_gain_pct,
            "percent_of": percent_of,
            "cost_basis": cost_basis_total,
            "average_cost": avg_cost,
            "security_type": sec_type,
            "raw_row": raw_json,
        }
        db.execute(INSERT_POSITIONS_FIDELITY, pf_params)

        # ---------- 3) Equity holdings/prices (like before) ----------
        ticker = symbol.upper()

        # Blank symbol → ok for positions_fidelity, but skip for holdings/prices
        if not ticker:
            reasons["blank_symbol"] += 1
            skipped += 1
            continue

        # Skip money-market & placeholders for holdings/prices
        if ticker in {"SPAXX", "SPAXX**", "MMF", "CASH"}:
            reasons["spaxx"] += 1
            skipped += 1
            continue

        if c_type and norm(row.get(c_type)).upper() == "PENDING ACTIVITY":
            reasons["pending"] += 1
            skipped += 1
            continue

        # For holdings, we require good qty + avg_cost
        if qty is None or qty == 0:
            reasons["bad_qty"] += 1
            skipped += 1
            continue
        if avg_cost is None:
            reasons["bad_avgcost"] += 1
            skipped += 1
            continue

        # ---- Get-or-create security ----
        sec = db.execute(
            text("SELECT id FROM securities WHERE ticker = :t"),
            {"t": ticker},
        ).mappings().first()
        if sec:
            security_id = sec["id"]
        else:
            sec = db.execute(
                text("INSERT INTO securities (ticker, name) VALUES (:t, NULL) RETURNING id"),
                {"t": ticker},
            ).mappings().first()
            security_id = sec["id"]
            created_secs += 1

        # ---- Get-or-create account (optional, by account name) ----
        account_id = None
        if acct_name:
            acct = db.execute(
                text("SELECT id FROM accounts WHERE name = :n"),
                {"n": acct_name},
            ).mappings().first()
            if acct:
                account_id = acct["id"]
            else:
                acct = db.execute(
                    text("INSERT INTO accounts (name) VALUES (:n) RETURNING id"),
                    {"n": acct_name},
                ).mappings().first()
                account_id = acct["id"]
                created_accts += 1

        # ---- Insert holding snapshot (uses `snap`, not NOW) ----
        db.execute(
            text("""
                INSERT INTO holdings (security_id, account_id, quantity, cost_basis, as_of)
                VALUES (:security_id, :account_id, :qty, :cost_basis, :as_of)
            """),
            {
                "security_id": security_id,
                "account_id": account_id,
                "qty": qty,
                "cost_basis": avg_cost,
                "as_of": snap,
            },
        )
        inserted_holdings += 1

        # ---- Insert price snapshot (also stamped to `snap`) ----
        if last_price is not None:
            db.execute(
                text("""
                    INSERT INTO prices (security_id, date, close)
                    VALUES (:security_id, :date, :px)
                """),
                {"security_id": security_id, "date": snap, "px": last_price},
            )
            inserted_prices += 1

    db.commit()

    return {
        "status": "ok",
        "snapshot_as_of": str(snap),
        "inserted_holdings": inserted_holdings,
        "inserted_prices": inserted_prices,
        "created_securities": created_secs,
        "created_accounts": created_accts,
        "skipped_rows": skipped,
        "skip_reasons": reasons,
    }


"""
# app/routers/uploads.py
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy import text
from datetime import datetime, date
from typing import Optional
import pandas as pd
import io, re, math

from ..db import get_db

router = APIRouter()

# ----------------------------
# Helpers
# ----------------------------
_money = re.compile(r"[$,]")
def _to_float(x) -> Optional[float]:
    if x is None or (isinstance(x, float) and math.isnan(x)): 
        return None
    if isinstance(x, (int, float)): 
        return float(x)
    # strings like "$186.68" or "1,234.56"
    s = _money.sub("", str(x)).strip()
    if s == "" or s.lower() in {"nan", "none"}:
        return None
    try:
        return float(s)
    except ValueError:
        return None

def _asof_from_filename(name: str) -> date:
    
    Try to read a date from filenames like 'Portfolio_Positions_Nov-02-2025.csv'.
    Fallback = today.
    
    m = re.search(r"(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*[-_ ]?(\d{1,2})[-_ ]?(\d{4})", name, re.I)
    if m:
        mon, day, yr = m.group(1), m.group(2), m.group(3)
        try:
            return datetime.strptime(f"{mon} {day} {yr}", "%b %d %Y").date()
        except Exception:
            pass
    return date.today()

# ----------------------------
# 1) Upload positions CSV (Fidelity export)
# ----------------------------
@router.post("/positions")
async def upload_positions(file: UploadFile = File(...), db = Depends(get_db)):
    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Please upload a CSV file.")

    as_of = _asof_from_filename(file.filename)
    raw = await file.read()
    try:
        df = pd.read_csv(io.BytesIO(raw))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"CSV parse error: {e}")

    # Expected columns (case-insensitive map)
    cols = {c.lower(): c for c in df.columns}
    def col(name):  # helper to get original-cased name
        return cols.get(name.lower())

    # Normalize rows
    df["Symbol"]    = df[col("Symbol")] if col("Symbol") else None
    df["Quantity"]  = df[col("Quantity")] if col("Quantity") else None
    df["LastPrice"] = df[col("Last Price")] if col("Last Price") else None
    df["AvgCost"]   = df[col("Average Cost Basis")] if col("Average Cost Basis") else None
    df["Desc"]      = df[col("Description")] if col("Description") else ""
    df["Type"]      = df[col("Type")] if col("Type") else ""

    # Clean numeric fields
    df["qty"]  = df["Quantity"].apply(_to_float)
    df["last"] = df["LastPrice"].apply(_to_float)
    df["avg"]  = df["AvgCost"].apply(_to_float)

    # Filter usable rows: real symbols with positive quantity
    def _keep(row):
        sym = str(row["Symbol"]) if row["Symbol"] is not None else ""
        if not sym or sym.strip() == "" or "**" in sym:  # e.g., SPAXX**
            return False
        if row["qty"] is None or row["qty"] <= 0:
            return False
        # skip explicit money-market/cash lines
        d = str(row["Desc"]).lower()
        t = str(row["Type"]).lower()
        if "money market" in d or "sweep" in d or t in {"cash", "money market"}:
            return False
        return True

    rows = df[df.apply(_keep, axis=1)].copy()

    # Transactional upsert
    inserted = 0
    updated  = 0
    with db.begin():
        for _, r in rows.iterrows():
            ticker = str(r["Symbol"]).strip().upper()
            name   = (str(r["Desc"]).strip() or ticker)[:255]
            qty    = float(r["qty"]) if r["qty"] is not None else 0.0
            last   = _to_float(r["last"])
            avg    = _to_float(r["avg"])

            # 1) Upsert security by ticker
            db.execute(text(
                insert into securities (ticker, name)
                values (:t, :n)
                on conflict (ticker) do update set name = excluded.name
            ), {"t": ticker, "n": name})

            # 2) Insert/Upsert holding snapshot
            # account_id is NULL for now; as_of controls the snapshot date
            db.execute(text(
                insert into holdings (account_id, security_id, quantity, cost_basis, as_of)
                select null, id, :q, :c, :as_of
                from securities where ticker = :t
                on conflict do nothing
            ), {"q": qty, "c": avg if avg is not None else 0.0, "as_of": as_of, "t": ticker})

            # 3) Price row for that as_of (optional but helpful)
            if last is not None:
                db.execute(text(
                    insert into prices (security_id, date, close)
                    select id, :d, :p from securities where ticker = :t
                    on conflict do nothing
                ), {"d": as_of, "p": last, "t": ticker})

            inserted += 1

    return {"ok": True, "as_of": as_of.isoformat(), "rows_ingested": inserted, "skipped": int(len(df) - len(rows))}

# ----------------------------
# 2) Upload performance Excel (sheet 'performances')
# ----------------------------
@router.post("/performance")
async def upload_performance(file: UploadFile = File(...), db = Depends(get_db)):
    if not (file.filename.lower().endswith(".xlsx") or file.filename.lower().endswith(".xls")):
        raise HTTPException(status_code=400, detail="Please upload an Excel file (.xlsx).")

    raw = await file.read()
    try:
        xls = pd.ExcelFile(io.BytesIO(raw))
        sheet = "performances" if "performances" in [s.lower() for s in xls.sheet_names] else xls.sheet_names[0]
        df = pd.read_excel(io.BytesIO(raw), sheet_name=sheet)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Excel parse error: {e}")

    # Your sample has dates embedded in the first column as strings like 'Thursday 9/18/2025'
    first_col = df.columns[0]
    # Pull out the mm/dd/yyyy part
    dates = df[first_col].astype(str).str.extract(r"(\d{1,2}/\d{1,2}/\d{4})")[0]
    df["_date"] = pd.to_datetime(dates, errors="coerce")

    # "Roth Balance" is in the 2nd column; daily return "Roth" is in the 4th
    nav_col = df.columns[1] if len(df.columns) > 1 else None
    ret_col = df.columns[3] if len(df.columns) > 3 else None

    df["_nav"] = pd.to_numeric(df[nav_col], errors="coerce") if nav_col else None
    df["_ret"] = pd.to_numeric(df[ret_col], errors="coerce") if ret_col else None

    clean = df.loc[~df["_date"].isna() & ~df["_nav"].isna(), ["_date", "_nav", "_ret"]].copy()
    if clean.empty:
        raise HTTPException(status_code=400, detail="No valid (date, nav) rows found in the sheet.")

    # Upsert into perf_manual
    with db.begin():
        for _, r in clean.iterrows():
            db.execute(text(
                insert into perf_manual (date, nav, ret, provider)
                values (:d, :n, :r, 'manual')
                on conflict (date) do update set nav = excluded.nav, ret = excluded.ret
            ), {"d": r["_date"].date(), "n": float(r["_nav"]), "r": (float(r["_ret"]) if pd.notna(r["_ret"]) else None)})

    return {"ok": True, "rows_ingested": int(clean.shape[0])}
"""