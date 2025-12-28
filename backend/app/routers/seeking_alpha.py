from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Query
from sqlalchemy import text
from app import db
from datetime import datetime
import io, re, hashlib
import pandas as pd
import openpyxl


# NOTE: main.py mounts this router with prefix="/api/uploads"
# So final paths will be:
#   POST /api/uploads/sa/top-rated/upload-xlsx
#   POST /api/uploads/sa/quant/upload-xlsx
#   GET  /api/uploads/sa/files
#   GET  /api/uploads/sa/latest
router = APIRouter()


# --------------------------
# Helpers
# --------------------------
def _sha256_bytes(b: bytes) -> str:
    return hashlib.sha256(b).hexdigest()


def _infer_as_of_date(filename: str):
    # expects YYYY-MM-DD somewhere in filename
    m = re.search(r"(20\d{2}-\d{2}-\d{2})", filename or "")
    if not m:
        return None
    return datetime.strptime(m.group(1), "%Y-%m-%d").date()


def _to_float_num(x):
    if x is None:
        return None
    s = str(x).strip()
    if s in ("", "-", "—", "NM"):
        return None
    s = s.replace("$", "").replace(",", "")
    # handle negatives like (123.45)
    if s.startswith("(") and s.endswith(")"):
        s = "-" + s[1:-1]
    try:
        return float(s)
    except Exception:
        return None


def _to_float_pct(x):
    if x is None:
        return None
    s = str(x).strip()
    if s in ("", "-", "—", "NM"):
        return None
    s = s.replace("%", "").replace(",", "")
    try:
        return float(s) / 100.0
    except Exception:
        return None


def _norm_col(c: str) -> str:
    return re.sub(r"\s+", " ", str(c or "").strip().lower())

def _sanitize_xlsx_remove_conditional_formatting(content: bytes) -> bytes:
    """
    Some Seeking Alpha exports contain conditional formatting operators
    that break openpyxl. This removes conditional formatting and returns
    a clean XLSX as bytes.
    """
    bio = io.BytesIO(content)
    wb = openpyxl.load_workbook(bio, data_only=True)

    for ws in wb.worksheets:
        # safest: clear CF rules (attribute name varies slightly across versions)
        try:
            ws.conditional_formatting._cf_rules = {}
        except Exception:
            pass
        try:
            ws.conditional_formatting.cf_rules = {}
        except Exception:
            pass

    out = io.BytesIO()
    wb.save(out)
    return out.getvalue()


def _read_summary_df(content: bytes) -> pd.DataFrame:
    """
    Reads Seeking Alpha export. Prefers "Summary" sheet; falls back to first sheet.
    If openpyxl fails due to conditional formatting, sanitize and retry.
    """
    def _read_from_bytes(b: bytes) -> pd.DataFrame:
        bio = io.BytesIO(b)
        try:
            df0 = pd.read_excel(bio, sheet_name="Summary", engine="openpyxl")
        except Exception:
            bio.seek(0)
            df0 = pd.read_excel(bio, sheet_name=0, engine="openpyxl")
        df0 = df0.dropna(how="all")
        df0.columns = [_norm_col(c) for c in df0.columns]
        return df0

    try:
        return _read_from_bytes(content)
    except ValueError as e:
        # This is the specific class of error you're getting
        msg = str(e)
        if "Value must be one of" in msg:
            cleaned = _sanitize_xlsx_remove_conditional_formatting(content)
            return _read_from_bytes(cleaned)
        raise




# -------------------------------------------------------
# 1) Upload: Top Rated Stocks (factor grades, WS ratings)
# -------------------------------------------------------
@router.post("/sa/top-rated/upload-xlsx")
async def upload_sa_top_rated_xlsx(
    file: UploadFile = File(...),
    as_of_date: str | None = None,
    conn=Depends(db.get_db),
):
    try:
        content = await file.read()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not read file: {e}")

    sha = _sha256_bytes(content)

    # Determine as_of_date
    if as_of_date:
        try:
            dt = datetime.strptime(as_of_date, "%Y-%m-%d").date()
        except Exception:
            raise HTTPException(status_code=400, detail="as_of_date must be YYYY-MM-DD")
    else:
        dt = _infer_as_of_date(file.filename or "")
        if not dt:
            raise HTTPException(
                status_code=400,
                detail="Could not infer as_of_date from filename. Provide as_of_date=YYYY-MM-DD.",
            )

    df = _read_summary_df(content)

    required = ["rank", "symbol", "company name", "price", "change %", "quant rating"]
    if not all(c in df.columns for c in required):
        raise HTTPException(
            status_code=400,
            detail=f"Missing expected columns for Top Rated. Found: {list(df.columns)}",
        )

    # Insert file metadata (skip if duplicate sha)
    file_stmt = text("""
        INSERT INTO public.sa_files (as_of_date, report_type, original_filename, sha256, row_count)
        VALUES (:as_of_date, 'top_rated', :original_filename, :sha256, 0)
        ON CONFLICT (sha256) DO NOTHING
        RETURNING id;
    """)
    file_id = conn.execute(file_stmt, {
        "as_of_date": dt,
        "original_filename": file.filename or "unknown.xlsx",
        "sha256": sha,
    }).scalar()

    if not file_id:
        return {"status": "duplicate", "as_of_date": str(dt), "report_type": "top_rated", "sha256": sha}

    row_stmt = text("""
        INSERT INTO public.sa_rows (
          file_id, as_of_date, report_type,
          rank, symbol, company_name,
          price, change_pct, quant_rating,
          sa_analyst_rating, wall_st_rating,
          valuation_grade, growth_grade, profitability_grade, momentum_grade, eps_rev_grade,
          raw_json
        )
        VALUES (
          :file_id, :as_of_date, 'top_rated',
          :rank, :symbol, :company_name,
          :price, :change_pct, :quant_rating,
          :sa_analyst_rating, :wall_st_rating,
          :valuation_grade, :growth_grade, :profitability_grade, :momentum_grade, :eps_rev_grade,
          CAST(:raw_json AS jsonb)
        )
        ON CONFLICT (report_type, as_of_date, symbol) DO UPDATE
          SET rank = EXCLUDED.rank,
              company_name = EXCLUDED.company_name,
              price = EXCLUDED.price,
              change_pct = EXCLUDED.change_pct,
              quant_rating = EXCLUDED.quant_rating,
              sa_analyst_rating = EXCLUDED.sa_analyst_rating,
              wall_st_rating = EXCLUDED.wall_st_rating,
              valuation_grade = EXCLUDED.valuation_grade,
              growth_grade = EXCLUDED.growth_grade,
              profitability_grade = EXCLUDED.profitability_grade,
              momentum_grade = EXCLUDED.momentum_grade,
              eps_rev_grade = EXCLUDED.eps_rev_grade,
              raw_json = EXCLUDED.raw_json;
    """)

    inserted = 0
    for _, r in df.iterrows():
        sym = str(r.get("symbol") or "").strip().upper()
        if not sym:
            continue

        rank_val = None
        try:
            rank_val = int(str(r.get("rank")).strip())
        except Exception:
            rank_val = None

        payload = {
            "file_id": str(file_id),
            "as_of_date": dt,
            "rank": rank_val,
            "symbol": sym,
            "company_name": r.get("company name"),
            "price": _to_float_num(r.get("price")),
            "change_pct": _to_float_pct(r.get("change %")),
            "quant_rating": _to_float_num(r.get("quant rating")),
            "sa_analyst_rating": _to_float_num(r.get("sa analyst ratings")),
            "wall_st_rating": _to_float_num(r.get("wall street ratings")),
            "valuation_grade": r.get("valuation"),
            "growth_grade": r.get("growth"),
            "profitability_grade": r.get("profitability"),
            "momentum_grade": r.get("momentum"),
            "eps_rev_grade": r.get("eps rev."),
            "raw_json": pd.Series(r).to_json(),
        }
        conn.execute(row_stmt, payload)
        inserted += 1

    conn.execute(
        text("UPDATE public.sa_files SET row_count=:n WHERE id=:id"),
        {"n": inserted, "id": str(file_id)},
    )
    conn.commit()

    return {"status": "ok", "report_type": "top_rated", "as_of_date": str(dt), "rows_upserted": inserted}


# -------------------------------------------------------
# 2) Upload: Stocks by Quant (market cap, perf, 52w range)
# -------------------------------------------------------
@router.post("/sa/quant/upload-xlsx")
async def upload_sa_quant_xlsx(
    file: UploadFile = File(...),
    as_of_date: str | None = None,
    conn=Depends(db.get_db),
):
    try:
        content = await file.read()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not read file: {e}")

    sha = _sha256_bytes(content)

    # Determine as_of_date
    if as_of_date:
        try:
            dt = datetime.strptime(as_of_date, "%Y-%m-%d").date()
        except Exception:
            raise HTTPException(status_code=400, detail="as_of_date must be YYYY-MM-DD")
    else:
        dt = _infer_as_of_date(file.filename or "")
        if not dt:
            raise HTTPException(
                status_code=400,
                detail="Could not infer as_of_date from filename. Provide as_of_date=YYYY-MM-DD.",
            )

    df = _read_summary_df(content)

    required = ["rank", "symbol", "company name", "price", "change %", "quant rating"]
    if not all(c in df.columns for c in required):
        raise HTTPException(
            status_code=400,
            detail=f"Missing expected columns for Quant. Found: {list(df.columns)}",
        )

    file_stmt = text("""
        INSERT INTO public.sa_files (as_of_date, report_type, original_filename, sha256, row_count)
        VALUES (:as_of_date, 'quant', :original_filename, :sha256, 0)
        ON CONFLICT (sha256) DO NOTHING
        RETURNING id;
    """)
    file_id = conn.execute(file_stmt, {
        "as_of_date": dt,
        "original_filename": file.filename or "unknown.xlsx",
        "sha256": sha,
    }).scalar()

    if not file_id:
        return {"status": "duplicate", "as_of_date": str(dt), "report_type": "quant", "sha256": sha}

    row_stmt = text("""
        INSERT INTO public.sa_rows (
          file_id, as_of_date, report_type,
          rank, symbol, company_name,
          price, change_pct, quant_rating,
          sa_analyst_rating,
          sector, industry, market_cap, pe_ttm, net_income_ttm, yield_fwd,
          perf_1m, perf_6m,
          ebitda_fwd, low_52w, high_52w,
          raw_json
        )
        VALUES (
          :file_id, :as_of_date, 'quant',
          :rank, :symbol, :company_name,
          :price, :change_pct, :quant_rating,
          :sa_analyst_rating,
          :sector, :industry, :market_cap, :pe_ttm, :net_income_ttm, :yield_fwd,
          :perf_1m, :perf_6m,
          :ebitda_fwd, :low_52w, :high_52w,
          CAST(:raw_json AS jsonb)
        )
        ON CONFLICT (report_type, as_of_date, symbol) DO UPDATE
          SET rank = EXCLUDED.rank,
              company_name = EXCLUDED.company_name,
              price = EXCLUDED.price,
              change_pct = EXCLUDED.change_pct,
              quant_rating = EXCLUDED.quant_rating,
              sa_analyst_rating = EXCLUDED.sa_analyst_rating,
              sector = EXCLUDED.sector,
              industry = EXCLUDED.industry,
              market_cap = EXCLUDED.market_cap,
              pe_ttm = EXCLUDED.pe_ttm,
              net_income_ttm = EXCLUDED.net_income_ttm,
              yield_fwd = EXCLUDED.yield_fwd,
              perf_1m = EXCLUDED.perf_1m,
              perf_6m = EXCLUDED.perf_6m,
              ebitda_fwd = EXCLUDED.ebitda_fwd,
              low_52w = EXCLUDED.low_52w,
              high_52w = EXCLUDED.high_52w,
              raw_json = EXCLUDED.raw_json;
    """)

    inserted = 0
    for _, r in df.iterrows():
        sym = str(r.get("symbol") or "").strip().upper()
        if not sym:
            continue

        rank_val = None
        try:
            rank_val = int(str(r.get("rank")).strip())
        except Exception:
            rank_val = None

        secind = r.get("sector & industry")
        sector = None
        industry = None
        if isinstance(secind, str) and secind.strip():
            parts = [p.strip() for p in secind.split("/") if p.strip()]
            sector = parts[0] if parts else secind.strip()
            industry = parts[1] if len(parts) > 1 else None

        payload = {
            "file_id": str(file_id),
            "as_of_date": dt,
            "rank": rank_val,
            "symbol": sym,
            "company_name": r.get("company name"),
            "price": _to_float_num(r.get("price")),
            "change_pct": _to_float_pct(r.get("change %")),
            "quant_rating": _to_float_num(r.get("quant rating")),
            "sa_analyst_rating": _to_float_num(r.get("sa analyst ratings")),
            "sector": sector,
            "industry": industry,
            "market_cap": _to_float_num(r.get("market cap")),
            "pe_ttm": _to_float_num(r.get("p/e ttm")),
            "net_income_ttm": _to_float_num(r.get("net income ttm")),
            "yield_fwd": _to_float_pct(r.get("yield fwd")),
            "perf_1m": _to_float_pct(r.get("1m perf")),
            "perf_6m": _to_float_pct(r.get("6m perf")),
            "ebitda_fwd": _to_float_num(r.get("ebitda fwd")),
            "low_52w": _to_float_num(r.get("52w low")),
            "high_52w": _to_float_num(r.get("52w high")),
            "raw_json": pd.Series(r).to_json(),
        }
        conn.execute(row_stmt, payload)
        inserted += 1

    conn.execute(
        text("UPDATE public.sa_files SET row_count=:n WHERE id=:id"),
        {"n": inserted, "id": str(file_id)},
    )
    conn.commit()

    return {"status": "ok", "report_type": "quant", "as_of_date": str(dt), "rows_upserted": inserted}


# -------------------------------------------------------
# 3) Verification endpoints (Swagger-friendly tests)
# -------------------------------------------------------
@router.get("/sa/files")
def list_sa_files(
    report_type: str = Query("top_rated"),
    conn=Depends(db.get_db),
):
    rows = conn.execute(text("""
        SELECT id, as_of_date, report_type, original_filename, row_count, received_at
        FROM public.sa_files
        WHERE report_type = :rt
        ORDER BY as_of_date DESC
        LIMIT 50
    """), {"rt": report_type}).mappings().all()
    return [dict(r) for r in rows]


@router.get("/sa/latest")
def sa_latest_for_symbols(
    symbols: str = Query(..., description="Comma separated tickers, e.g. MU,CTMX"),
    report_type: str = Query("top_rated"),
    conn=Depends(db.get_db),
):
    syms = [s.strip().upper() for s in symbols.split(",") if s.strip()]
    if not syms:
        raise HTTPException(status_code=400, detail="No symbols provided.")

    # NOTE: For psycopg/SQLAlchemy, passing a Python list into ANY(:syms)
    # may require explicit casting depending on driver.
    # If this errors, replace with: symbol = ANY(CAST(:syms AS text[]))
    rows = conn.execute(text("""
        SELECT DISTINCT ON (symbol)
               symbol, as_of_date, report_type,
               rank, company_name, price, change_pct, quant_rating,
               sa_analyst_rating, wall_st_rating,
               valuation_grade, growth_grade, profitability_grade, momentum_grade, eps_rev_grade,
               sector, industry, market_cap, pe_ttm, net_income_ttm, yield_fwd, perf_1m, perf_6m,
               ebitda_fwd, low_52w, high_52w
        FROM public.sa_rows
        WHERE report_type = :rt
          AND symbol = ANY(CAST(:syms AS text[]))
        ORDER BY symbol, as_of_date DESC
    """), {"rt": report_type, "syms": syms}).mappings().all()

    return [dict(r) for r in rows]
