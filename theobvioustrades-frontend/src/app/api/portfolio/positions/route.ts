// src/app/api/portfolio/positions/route.ts
import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";

export async function GET() {
  const backend = process.env.BACKEND_URL ?? "http://127.0.0.1:8000";
  const url = `${backend}/api/portfolio/positions`;

  try {
    const resp = await fetch(url, { method: "GET" });
    const body = await resp.text();
    return new NextResponse(body, {
      status: resp.status,
      headers: { "Content-Type": resp.headers.get("content-type") ?? "application/json" },
    });
  } catch (err) {
    return NextResponse.json({ error: "Proxy to backend failed", detail: String(err) }, { status: 502 });
  }
}

