# C:\Users\jake breitbach\TheObviousTrades\app\utils\json_sanitize.py

import math
from typing import Any

def sanitize_numbers(obj: Any) -> Any:
    """Recursively replace NaN/Inf/-Inf with None so JSONResponse won't fail."""
    if isinstance(obj, float):
        return obj if math.isfinite(obj) else None
    if isinstance(obj, dict):
        return {k: sanitize_numbers(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [sanitize_numbers(v) for v in obj]
    # If you sometimes return Decimals, uncomment:
    # from decimal import Decimal
    # if isinstance(obj, Decimal):
    #     v = float(obj)
    #     return v if math.isfinite(v) else None
    return obj
