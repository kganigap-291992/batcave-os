import { NextResponse } from "next/server";

export const runtime = "nodejs";

const BASE = process.env.TELEMETRY_BASE_URL ?? "http://localhost:8790";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const limit = url.searchParams.get("limit") ?? "200";

  const upstream = `${BASE}/events?limit=${encodeURIComponent(limit)}`;
  const r = await fetch(upstream, { cache: "no-store" });

  const text = await r.text();
  return new NextResponse(text, {
    status: r.status,
    headers: {
      "content-type": r.headers.get("content-type") ?? "application/json",
    },
  });
}