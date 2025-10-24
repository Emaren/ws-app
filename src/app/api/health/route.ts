// src/app/api/health/route.ts
import { NextResponse } from "next/server";

// ensure this is always handled at runtime (no static optimization)
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  return NextResponse.json(
    { ok: true, ts: Date.now() },
    { headers: { "cache-control": "no-store" } }
  );
}
