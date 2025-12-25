// C:\Users\jake breitbach\TheObviousTradesFrontEnd\ta-fundamentals\theobvioustrades-frontend\src\app\api\portfolio\performance\route.ts
import { NextResponse } from "next/server";

function resolveApiBase(): string {
  let raw = process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000";
  raw = raw.replace(/\/+$/, "");        // strip trailing slashes
  raw = raw.replace(/\/api$/i, "");     // if someone set /api, remove it
  if (!/^https?:\/\//i.test(raw)) {
    // someone set a relative like '/api' — fall back to default
    return "http://127.0.0.1:8000";
  }
  return raw;
}

const API_BASE = resolveApiBase();

export async function GET() {
  const r = await fetch(`${API_BASE}/api/portfolio/performance`, { cache: "no-store" });
  const text = await r.text();
  return new NextResponse(text, {
    status: r.status,
    headers: { "content-type": r.headers.get("content-type") || "application/json" },
  });
}

