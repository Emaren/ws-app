// src/app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/authOptions";

// Make sure this API route is never statically generated.
// This avoids the dev error about generating static paths and chunk resolution.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const fetchCache = "force-no-store";

const handler = NextAuth(authOptions);

function hasValidRequestUrl(req: unknown): req is Request {
  return (
    !!req &&
    typeof req === "object" &&
    typeof (req as { url?: unknown }).url === "string"
  );
}

export async function GET(req: Request, ctx: unknown) {
  if (!hasValidRequestUrl(req)) {
    return new NextResponse(null, { status: 204 });
  }
  return (handler as any)(req, ctx);
}

export async function POST(req: Request, ctx: unknown) {
  if (!hasValidRequestUrl(req)) {
    return new NextResponse(null, { status: 204 });
  }
  return (handler as any)(req, ctx);
}
