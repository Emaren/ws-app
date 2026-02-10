import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const GENERIC_MESSAGE =
  "If this email exists, password reset instructions will be sent.";

function normalizeEmail(input: unknown): string {
  if (typeof input !== "string") {
    return "";
  }

  return input.trim().toLowerCase();
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as
    | { email?: unknown }
    | null;

  const email = normalizeEmail(body?.email);
  if (!email) {
    return NextResponse.json({ message: GENERIC_MESSAGE }, { status: 200 });
  }

  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true },
  });

  if (existingUser) {
    console.info("password_reset_requested", {
      userId: existingUser.id,
      email: existingUser.email,
    });
  }

  return NextResponse.json({ message: GENERIC_MESSAGE }, { status: 200 });
}
