import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { recordAuthFunnelEvent } from "@/lib/authFunnel";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const CLIENT_ALLOWED_STAGES = new Set([
  "REGISTER_VIEW_STARTED",
  "REGISTER_SUBMIT_ATTEMPTED",
]);

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function trimTo(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
}

export async function POST(req: NextRequest) {
  const body = asRecord(await req.json().catch(() => null));
  const stage = trimTo(body?.stage, 64)?.toUpperCase() ?? null;
  if (!stage || !CLIENT_ALLOWED_STAGES.has(stage)) {
    return NextResponse.json({ message: "Invalid funnel stage" }, { status: 400 });
  }

  const provider = trimTo(body?.provider, 40) ?? null;
  const email = trimTo(body?.email, 320) ?? null;
  const sessionId = trimTo(body?.sessionId, 120) ?? null;
  const sourceContext = trimTo(body?.sourceContext, 120) ?? null;
  const metadata =
    body?.metadata && typeof body.metadata === "object"
      ? (body.metadata as Prisma.InputJsonValue)
      : null;

  await recordAuthFunnelEvent({
    stage,
    provider,
    email,
    sessionId,
    sourceContext: sourceContext ?? "register_page",
    metadata,
    headers: req.headers,
  });

  return NextResponse.json({ ok: true }, { status: 202 });
}
