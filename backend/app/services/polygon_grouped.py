import os
import httpx
from typing import Any, Dict, List

BASE = "https://api.polygon.io"

def _get_key() -> str:
    key = os.getenv("POLYGON_API_KEY")
    if not key:
        raise RuntimeError("POLYGON_API_KEY not configured")
    return key

async def fetch_grouped_daily(date_str: str, adjusted: bool = True) -> List[Dict[str, Any]]:
    """
    date_str: YYYY-MM-DD
    Returns Polygon grouped daily 'results' for US stocks for that date.
    Endpoint: /v2/aggs/grouped/locale/us/market/stocks/{date}
    """
    api_key = _get_key()
    url = f"{BASE}/v2/aggs/grouped/locale/us/market/stocks/{date_str}"
    params = {"adjusted": "true" if adjusted else "false", "apiKey": api_key}

    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.get(url, params=params)

    if resp.status_code != 200:
        raise RuntimeError(f"Polygon error {resp.status_code}: {resp.text[:200]}")

    data = resp.json()
    return data.get("results", []) or []
