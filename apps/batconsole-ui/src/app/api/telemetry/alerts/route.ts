import { NextResponse } from "next/server";

export const runtime = "nodejs";

const BASE = process.env.TELEMETRY_BASE_URL ?? "http://localhost:8790";

export async function GET() {
  const r = await fetch(`${BASE}/alerts`, { cache: "no-store" });

  const text = await r.text();
  return new NextResponse(text, {
    status: r.status,
    headers: {
      "content-type": r.headers.get("content-type") ?? "application/json",
    },
  });
}