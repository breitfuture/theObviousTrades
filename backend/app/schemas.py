# app/schemas.py
from pydantic import BaseModel
from typing import Optional, List

class Summary(BaseModel):
    equity: float
    cash: float
    pct_invested: float
    period_return: Optional[float] = None
    max_drawdown: Optional[float] = None
    sector_tilts: List[dict] = []

class PositionRow(BaseModel):
    ticker: str
    side: str
    quantity: float
    cost_basis: Optional[float] = None
    last: Optional[float] = None
    pl_abs: Optional[float] = None
    pl_pct: Optional[float] = None
    conviction: Optional[int] = None
    next_earnings: Optional[str] = None

class PerfPoint(BaseModel):
    date: str
    nav: float
    ret: Optional[float] = None
