# app/routers/transparency.py
from fastapi import APIRouter
import os, hashlib

router = APIRouter()
SNAPSHOT_DIR = os.environ.get("SNAPSHOT_DIR", "./snapshots")

@router.get("/latest")
def latest_snapshot():
    try:
        files = [f for f in os.listdir(SNAPSHOT_DIR) if f.endswith(".json")]
        files.sort()
        if not files:
            return {"snapshot": None}
        latest = files[-1]
        path = os.path.join(SNAPSHOT_DIR, latest)
        with open(path, "rb") as f:
            digest = hashlib.sha256(f.read()).hexdigest()
        return {"filename": latest, "sha256": digest}
    except FileNotFoundError:
        return {"snapshot": None}
    except Exception as e:
        return {"error": str(e)}
