from __future__ import annotations


from dotenv import load_dotenv
from pathlib import Path

ENV_PATH = Path(__file__).resolve().parents[2] / ".env"  # backend/.env
load_dotenv(ENV_PATH)




import os
from dataclasses import dataclass
from typing import Iterable

import numpy as np
import pandas as pd
from sqlalchemy import create_engine, text

WINDOWS = (20, 30, 60)


# ---------- DB fetch ----------

def fetch_returns(engine) -> pd.DataFrame:
    """
    Fetch returns needed for beta. Returns are decimals.
    """
    sql = text("""
        SELECT day, portfolio_ret, voo_ret, qqq_ret
        FROM performance_daily
        ORDER BY day ASC;
    """)
    with engine.begin() as conn:
        df = pd.read_sql(sql, conn)

    df["day"] = pd.to_datetime(df["day"])
    for c in ["portfolio_ret", "voo_ret", "qqq_ret"]:
        df[c] = pd.to_numeric(df[c], errors="coerce")

    return df


# ---------- Beta math ----------

def rolling_beta(port: pd.Series, bench: pd.Series, window: int) -> pd.Series:
    cov = port.rolling(window).cov(bench)
    var = bench.rolling(window).var()
    beta = cov / var
    beta = beta.replace([np.inf, -np.inf], np.nan)
    return beta


def compute_all_betas(df: pd.DataFrame, windows: Iterable[int] = WINDOWS) -> pd.DataFrame:
    """
    Adds beta columns for each window vs VOO and QQQ.
    """
    out = df.copy()

    for w in windows:
        out[f"beta_{w}_voo"] = rolling_beta(out["portfolio_ret"], out["voo_ret"], w)
        out[f"beta_{w}_qqq"] = rolling_beta(out["portfolio_ret"], out["qqq_ret"], w)

    return out


# ---------- DB writes ----------

UPSERT_SQL = text("""
    INSERT INTO performance_metrics_daily (
        day,
        beta_20_voo, beta_30_voo, beta_60_voo,
        beta_20_qqq, beta_30_qqq, beta_60_qqq,
        computed_at
    )
    VALUES (
        :day,
        :beta_20_voo, :beta_30_voo, :beta_60_voo,
        :beta_20_qqq, :beta_30_qqq, :beta_60_qqq,
        now()
    )
    ON CONFLICT (day) DO UPDATE SET
        beta_20_voo = EXCLUDED.beta_20_voo,
        beta_30_voo = EXCLUDED.beta_30_voo,
        beta_60_voo = EXCLUDED.beta_60_voo,
        beta_20_qqq = EXCLUDED.beta_20_qqq,
        beta_30_qqq = EXCLUDED.beta_30_qqq,
        beta_60_qqq = EXCLUDED.beta_60_qqq,
        computed_at = now();
""")


def upsert_rows(engine, rows: list[dict]) -> None:
    if not rows:
        return
    with engine.begin() as conn:
        conn.execute(UPSERT_SQL, rows)


# ---------- Task 1: backfill ----------

def backfill_all(engine) -> None:
    """
    One-time: compute betas for ALL days and write them.
    Safe to run multiple times (upsert).
    """
    df = fetch_returns(engine)
    df = compute_all_betas(df, windows=WINDOWS)

    # Build rows for insert
    rows: list[dict] = []
    for _, r in df.iterrows():
        rows.append({
            "day": r["day"].date(),
            "beta_20_voo": None if pd.isna(r.get("beta_20_voo")) else float(r["beta_20_voo"]),
            "beta_30_voo": None if pd.isna(r.get("beta_30_voo")) else float(r["beta_30_voo"]),
            "beta_60_voo": None if pd.isna(r.get("beta_60_voo")) else float(r["beta_60_voo"]),
            "beta_20_qqq": None if pd.isna(r.get("beta_20_qqq")) else float(r["beta_20_qqq"]),
            "beta_30_qqq": None if pd.isna(r.get("beta_30_qqq")) else float(r["beta_30_qqq"]),
            "beta_60_qqq": None if pd.isna(r.get("beta_60_qqq")) else float(r["beta_60_qqq"]),
        })

    upsert_rows(engine, rows)


# ---------- Task 2: daily updater (Option 1) ----------

def get_latest_day_missing_metrics(engine) -> pd.Timestamp | None:
    """
    Find the newest performance_daily.day that does NOT exist in performance_metrics_daily.
    """
    sql = text("""
        SELECT pd.day
        FROM performance_daily pd
        LEFT JOIN performance_metrics_daily md
            ON md.day = pd.day
        WHERE md.day IS NULL
        ORDER BY pd.day DESC
        LIMIT 1;
    """)
    with engine.begin() as conn:
        row = conn.execute(sql).fetchone()

    if not row:
        return None
    return pd.to_datetime(row[0])


def compute_beta_for_single_day(df_all: pd.DataFrame, target_day: pd.Timestamp) -> dict | None:
    """
    Compute the beta row for one day using the full history (rolling windows ending on target_day).
    """
    df_all = df_all.sort_values("day").reset_index(drop=True)
    df_all = compute_all_betas(df_all, windows=WINDOWS)

    row = df_all.loc[df_all["day"] == target_day]
    if row.empty:
        return None

    r = row.iloc[0]
    return {
        "day": r["day"].date(),
        "beta_20_voo": None if pd.isna(r.get("beta_20_voo")) else float(r["beta_20_voo"]),
        "beta_30_voo": None if pd.isna(r.get("beta_30_voo")) else float(r["beta_30_voo"]),
        "beta_60_voo": None if pd.isna(r.get("beta_60_voo")) else float(r["beta_60_voo"]),
        "beta_20_qqq": None if pd.isna(r.get("beta_20_qqq")) else float(r["beta_20_qqq"]),
        "beta_30_qqq": None if pd.isna(r.get("beta_30_qqq")) else float(r["beta_30_qqq"]),
        "beta_60_qqq": None if pd.isna(r.get("beta_60_qqq")) else float(r["beta_60_qqq"]),
    }


def update_latest_missing(engine) -> None:
    """
    Daily job: insert metrics only for the latest day that is missing.
    This preserves your "freeze history" behavior.
    """
    target_day = get_latest_day_missing_metrics(engine)
    if target_day is None:
        print("No missing metrics days. Nothing to do.")
        return

    df_all = fetch_returns(engine)
    payload = compute_beta_for_single_day(df_all, target_day)

    if payload is None:
        print(f"Could not compute metrics for {target_day.date()}.")
        return

    upsert_rows(engine, [payload])
    print(f"Inserted/updated metrics for {target_day.date()}.")


# ---------- CLI entrypoints ----------

if __name__ == "__main__":
    import os
    from sqlalchemy import create_engine

    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise RuntimeError("DATABASE_URL not set")

    engine = create_engine(database_url)

    # -----------------------------
    # CHOOSE ONE (not both)
    # -----------------------------

    # 1) ONE-TIME BACKFILL (run once, then comment out)
    #backfill_all(engine)
    #print("Loaded DATABASE_URL =", os.getenv("DATABASE_URL"))


    # 2) DAILY UPDATE (use after backfill)
    # update_latest_missing(engine)
