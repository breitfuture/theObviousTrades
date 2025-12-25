# app/main.py
import os
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from .db import get_db

# Each of these modules defines: `router = APIRouter()`
from .routers import portfolio, positions, uploads, transparency, performance, history, markets

app = FastAPI(title="The Obvious Trades API")

# CORS (tighten for prod as needed)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Simple DB health check
@app.get("/health/db")
def health_db(db = Depends(get_db)):
    db.execute(text("SELECT 1"))
    return {"status": "ok"}

# --- Routers ---
# Portfolio read APIs (charts, tables)
app.include_router(portfolio.router,    prefix="/api/portfolio", tags=["portfolio"])

# Positions-related endpoints under portfolio (if these return holdings/positions views)
app.include_router(positions.router,    prefix="/api/portfolio", tags=["positions"])

# File uploads (positions CSV + ROTH performance CSV/XLSX)
app.include_router(uploads.router,      prefix="/api",           tags=["uploads"])

# Transparency/history endpoints
app.include_router(transparency.router, prefix="/api",           tags=["transparency"])

# Performance read endpoints (e.g., GET /api/portfolio/performance)
app.include_router(performance.router,  prefix="/api/portfolio", tags=["performance"])
#app.include_router(history.router,  prefix="/api/portfolio", tags=["history"])

app.include_router(history.router)
app.include_router(markets.router)





"""
# app/main.py
import os
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

# use the same DB dependency your routers use
from .db import get_db

# Import routers
from .routers import portfolio, positions, uploads, transparency

app = FastAPI(title="The Obvious Trades API")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "*"  # tighten later for prod
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Health check (uses the same DB session dependency) ---
@app.get("/health/db")
def health_db(db = Depends(get_db)):
    db.execute(text("select 1"))
    return {"status": "ok"}

# --- Mount routers with the correct prefixes ---
# portfolio routes (e.g., /summary, /equity-curve) -> /api/portfolio/*
app.include_router(portfolio.router, prefix="/api/portfolio", tags=["portfolio"])

# positions routes should also live under /api/portfolio/*
# (assumes positions.router defines paths like "/positions")
app.include_router(positions.router, prefix="/api/portfolio", tags=["portfolio"])

# keep these as-is (adjust prefixes later if you want them under /api/* as well)
app.include_router(uploads.router)
app.include_router(transparency.router)

# Root (optional)
@app.get("/")
def root():
    return {"message": "Welcome to The Obvious Trades API 🚀"}
"""

"""

# app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Import your routers
from .routers import portfolio, positions, uploads, transparency

app = FastAPI(title="The Obvious Trades API")

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "*"  # You can tighten this later once deployed
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(portfolio.router)
app.include_router(positions.router)
app.include_router(uploads.router)
app.include_router(transparency.router)

# Root route (optional)
@app.get("/")
def root():
    return {"message": "Welcome to The Obvious Trades API 🚀"}

"""



"""
# app/main.py
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import os, requests
from datetime import date, timedelta
from dotenv import load_dotenv
from sqlalchemy import text
from app.db import SessionLocal  # adjust if you import from a different place

# NEW: portfolio routers
from .routers import portfolio, positions, uploads, transparency

app = FastAPI(title="The Obvious Trades API")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "*"],  # loosen for local dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Env & Polygon key
load_dotenv()
API = os.getenv("POLYGON_API_KEY")
if not API:
    raise RuntimeError("Set POLYGON_API_KEY in .env")

@app.get("/")
def root():
    return {"message": "Backend running"}

# --------- Your existing OHLC endpoint (kept) ----------
def fetch_ohlc_1d(ticker: str, years: int = 4):
    end = date.today()
    start = end - timedelta(days=365 * years + 14)
    url = (
        f"https://api.polygon.io/v2/aggs/ticker/{ticker.upper()}/range/1/day/"
        f"{start}/{end}?adjusted=true&sort=asc&limit=50000&apiKey={API}"
    )
    try:
        r = requests.get(url, timeout=30)
        r.raise_for_status()
        payload = r.json()
    except requests.RequestException as e:
        raise HTTPException(status_code=502, detail=f"Upstream error: {e}")

    results = payload.get("results", []) or []
    return [
        {
            "time": int(item["t"] // 1000),
            "open": float(item["o"]),
            "high": float(item["h"]),
            "low": float(item["l"]),
            "close": float(item["c"]),
        }
        for item in results
    ]

@app.get("/api/ohlc")
def ohlc(ticker: str):
    if not ticker or len(ticker) > 12:
        raise HTTPException(status_code=400, detail="Invalid ticker")
    return fetch_ohlc_1d(ticker, years=4)
# -------------------------------------------------------

# NEW: mount portfolio APIs
app.include_router(portfolio.router, prefix="/api/portfolio", tags=["portfolio"])
app.include_router(positions.router, prefix="/api/portfolio", tags=["positions"])
app.include_router(uploads.router, prefix="/api/performance", tags=["performance"])
app.include_router(transparency.router, prefix="/api/transparency", tags=["transparency"])


"""




















"""
# app/main.py
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import os, requests
from datetime import date, timedelta
from dotenv import load_dotenv
from sqlalchemy import text
from app.db import SessionLocal  # adjust if you import from a different place

# NEW: portfolio routers
from .routers import portfolio, positions, uploads, transparency

app = FastAPI(title="The Obvious Trades API")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "*"],  # loosen for local dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Env & Polygon key
load_dotenv()
API = os.getenv("POLYGON_API_KEY")
if not API:
    raise RuntimeError("Set POLYGON_API_KEY in .env")

@app.get("/")
def root():
    return {"message": "Backend running"}

# --------- OHLC endpoint ----------
def fetch_ohlc_1d(ticker: str, years: int = 4):
    end = date.today()
    start = end - timedelta(days=365 * years + 14)
    url = (
        f"https://api.polygon.io/v2/aggs/ticker/{ticker.upper()}/range/1/day/"
        f"{start}/{end}?adjusted=true&sort=asc&limit=50000&apiKey={API}"
    )
    try:
        r = requests.get(url, timeout=30)
        r.raise_for_status()
        payload = r.json()
    except requests.RequestException as e:
        raise HTTPException(status_code=502, detail=f"Upstream error: {e}")

    results = payload.get("results", []) or []
    return [
        {
            "time": int(item["t"] // 1000),
            "open": float(item["o"]),
            "high": float(item["h"]),
            "low": float(item["l"]),
            "close": float(item["c"]),
        }
        for item in results
    ]

@app.get("/api/ohlc")
def ohlc(ticker: str):
    if not ticker or len(ticker) > 12:
        raise HTTPException(status_code=400, detail="Invalid ticker")
    return fetch_ohlc_1d(ticker, years=4)
# ----------------------------------

# NEW: mount portfolio APIs
app.include_router(portfolio.router, prefix="/api/portfolio", tags=["portfolio"])
app.include_router(positions.router, prefix="/api/portfolio", tags=["positions"])
app.include_router(uploads.router, prefix="/api/performance", tags=["performance"])
app.include_router(transparency.router, prefix="/api/transparency", tags=["transparency"])

# ----------------------------------
# TEMP TEST ENDPOINT (remove after verifying)
# ----------------------------------
@app.get("/test-db")
def test_db_connection():
    
    Creates a tiny table if needed and inserts a row from FastAPI.
    Check in pgAdmin:  SELECT * FROM connection_test ORDER BY inserted_at DESC;
    
    db = SessionLocal()
    try:
        db.execute(text(
            CREATE TABLE IF NOT EXISTS connection_test (
                id SERIAL PRIMARY KEY,
                source TEXT,
                inserted_at TIMESTAMP DEFAULT NOW()
            );
        ))
        db.execute(text("INSERT INTO connection_test (source) VALUES ('fastapi')"))
        db.commit()
        # Return most recent row to prove it worked
        row = db.execute(text(
            "SELECT id, source, inserted_at FROM connection_test ORDER BY inserted_at DESC LIMIT 1"
        )).mappings().first()
        return {"ok": True, "last_row": dict(row)}
    finally:
        db.close()
"""
