import { PasswordResetDispatchSource } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiAuthContext } from "@/lib/apiAuth";
import { hasAnyRole, RBAC_ROLE_GROUPS } from "@/lib/rbac";
import { requireOffersManagerWsToken } from "../../offers/_shared";
import {
  createPasswordResetToken,
  normalizeEmail,
  recordPasswordResetDispatch,
  sendPasswordResetEmail,
  shouldExposeDebugResetUrl,
} from "@/lib/passwordResetSupport";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function parsePositiveInt(value: string | null, fallback: number, max: number): number {
  const parsed = Number.parseInt(value || "", 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }
  return Math.min(parsed, max);
}

function parseBusinessId(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function parseAction(input: unknown): "manual_link" | "resend" {
  const value = typeof input === "string" ? input.trim().toLowerCase() : "";
  return value === "manual_link" ? "manual_link" : "resend";
}

function safeErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function resolveAllowedBusinessIds(req: NextRequest): Promise<{
  actorEmail: string | null;
  actorUserId: string | null;
  businessIds: string[];
  isOwnerAdmin: boolean;
} | NextResponse> {
  const managerAuth = await requireOffersManagerWsToken(req);
  if (managerAuth instanceof NextResponse) {
    return managerAuth;
  }

  let businessIds: string[];
  if (managerAuth.isOwnerAdmin || managerAuth.managedBusinessIds === null) {
    const businesses = await prisma.business.findMany({
      select: { id: true },
      orderBy: { name: "asc" },
    });
    businessIds = businesses.map((row) => row.id);
  } else {
    businessIds = managerAuth.managedBusinessIds;
  }

  return {
    actorEmail: managerAuth.actorEmail,
    actorUserId: managerAuth.actorExternalId,
    businessIds,
    isOwnerAdmin: managerAuth.isOwnerAdmin,
  };
}

async function loadScopedEmails(businessId: string): Promise<string[]> {
  const [inboxRows, recipientRows] = await Promise.all([
    prisma.userOfferInbox.findMany({
      where: { businessId },
      select: { userEmail: true },
    }),
    prisma.notificationRecipient.findMany({
      where: {
        businessId,
        email: {
          not: null,
        },
      },
      select: { email: true },
    }),
  ]);

  const unique = new Set<string>();
  for (const row of inboxRows) {
    const email = normalizeEmail(row.userEmail);
    if (email) unique.add(email);
  }
  for (const row of recipientRows) {
    const email = normalizeEmail(row.email);
    if (email) unique.add(email);
  }
  return [...unique];
}

export async function GET(req: NextRequest) {
  const auth = await getApiAuthContext(req);
  if (!auth.token || !hasAnyRole(auth.role, RBAC_ROLE_GROUPS.staff)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const allowed = await resolveAllowedBusinessIds(req);
  if (allowed instanceof NextResponse) {
    return allowed;
  }

  const query = (req.nextUrl.searchParams.get("query") || "").trim().toLowerCase();
  const selectedBusinessIdParam = req.nextUrl.searchParams.get("businessId");
  const selectedBusinessId =
    selectedBusinessIdParam && allowed.businessIds.includes(selectedBusinessIdParam)
      ? selectedBusinessIdParam
      : allowed.businessIds[0] ?? null;
  const page = parsePositiveInt(req.nextUrl.searchParams.get("page"), 1, 10_000);
  const pageSize = parsePositiveInt(req.nextUrl.searchParams.get("pageSize"), 12, 100);
  const skip = (page - 1) * pageSize;

  const businesses = await prisma.business.findMany({
    where: { id: { in: allowed.businessIds } },
    select: { id: true, name: true, slug: true, ownerUserId: true, contactEmail: true },
    orderBy: { name: "asc" },
  });

  if (!selectedBusinessId) {
    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      businesses,
      selectedBusinessId: null,
      scopedUsersCount: 0,
      activeOfferRecipients: 0,
      page,
      pageSize,
      total: 0,
      totalPages: 1,
      rows: [],
      scopedUsers: [],
    });
  }

  const scopedEmails = await loadScopedEmails(selectedBusinessId);
  const filteredScopedEmails = query
    ? scopedEmails.filter((email) => email.includes(query))
    : scopedEmails;

  const [activeOfferRecipients, scopedUsers, dispatchRows, dispatchTotal] = await Promise.all([
    prisma.userOfferInbox.groupBy({
      by: ["userEmail"],
      where: { businessId: selectedBusinessId, status: "ACTIVE" },
      _count: { _all: true },
    }),
    prisma.user.findMany({
      where: {
        email: {
          in: filteredScopedEmails.slice(0, 250),
        },
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        lastAuthAt: true,
        registeredVia: true,
      },
      orderBy: { email: "asc" },
    }),
    filteredScopedEmails.length === 0
      ? Promise.resolve([] as Awaited<ReturnType<typeof prisma.passwordResetDispatch.findMany>>)
      : prisma.passwordResetDispatch.findMany({
          where: {
            email: {
              in: filteredScopedEmails,
            },
          },
          orderBy: { createdAt: "desc" },
          skip,
          take: pageSize,
          select: {
            id: true,
            email: true,
            source: true,
            provider: true,
            delivered: true,
            reason: true,
            requestedByEmail: true,
            createdAt: true,
            passwordResetToken: {
              select: {
                expiresAt: true,
                usedAt: true,
              },
            },
          },
        }),
    filteredScopedEmails.length === 0
      ? Promise.resolve(0)
      : prisma.passwordResetDispatch.count({
          where: {
            email: {
              in: filteredScopedEmails,
            },
          },
        }),
  ]);

  const activeCountByEmail = new Map<string, number>();
  for (const row of activeOfferRecipients) {
    activeCountByEmail.set(normalizeEmail(row.userEmail), row._count._all);
  }

  const totalPages = Math.max(1, Math.ceil(dispatchTotal / pageSize));
  const safePage = Math.min(page, totalPages);

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    businesses,
    selectedBusinessId,
    scopedUsersCount: scopedEmails.length,
    activeOfferRecipients: activeOfferRecipients.length,
    page: safePage,
    pageSize,
    total: dispatchTotal,
    totalPages,
    rows: dispatchRows,
    scopedUsers: scopedUsers.map((user) => ({
      ...user,
      activeOfferCount: activeCountByEmail.get(normalizeEmail(user.email)) ?? 0,
    })),
  });
}

export async function POST(req: NextRequest) {
  const auth = await getApiAuthContext(req);
  if (!auth.token || !hasAnyRole(auth.role, RBAC_ROLE_GROUPS.staff)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const allowed = await resolveAllowedBusinessIds(req);
  if (allowed instanceof NextResponse) {
    return allowed;
  }

  const body = (await req.json().catch(() => null)) as
    | { businessId?: unknown; email?: unknown; action?: unknown }
    | null;
  const businessId = parseBusinessId(body?.businessId);
  const email = normalizeEmail(body?.email);
  const action = parseAction(body?.action);

  if (!businessId || !allowed.businessIds.includes(businessId)) {
    return NextResponse.json({ message: "Business access denied" }, { status: 403 });
  }
  if (!email) {
    return NextResponse.json({ message: "Email is required" }, { status: 400 });
  }

  try {
    const scopedEmails = await loadScopedEmails(businessId);
    if (!scopedEmails.includes(email)) {
      return NextResponse.json(
        { message: "User is not in this company audience scope" },
        { status: 403 },
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true },
    });

    if (!existingUser) {
      return NextResponse.json(
        { message: "No local user account for this email yet" },
        { status: 404 },
      );
    }

    const token = await createPasswordResetToken({
      userId: existingUser.id,
      email: existingUser.email,
      request: req,
    });

    if (action === "manual_link") {
      await recordPasswordResetDispatch({
        tokenRecordId: token.tokenRecordId,
        userId: existingUser.id,
        email: existingUser.email,
        source: PasswordResetDispatchSource.ADMIN_MANUAL,
        emailResult: {
          delivered: false,
          provider: "manual",
          reason: "company_manual_reset_link_generated",
        },
        requestedByUserId: allowed.actorUserId ?? null,
        requestedByEmail: allowed.actorEmail ?? null,
        metadata: {
          sourceContext: "company_auth_support",
          businessId,
        },
      });

      return NextResponse.json({
        ok: true,
        action,
        email: existingUser.email,
        businessId,
        expiresAt: token.expiresAt.toISOString(),
        resetUrl: token.resetUrl,
      });
    }

    const emailResult = await sendPasswordResetEmail({
      to: existingUser.email,
      resetUrl: token.resetUrl,
    });

    await recordPasswordResetDispatch({
      tokenRecordId: token.tokenRecordId,
      userId: existingUser.id,
      email: existingUser.email,
      source: PasswordResetDispatchSource.ADMIN_RESEND,
      emailResult,
      requestedByUserId: allowed.actorUserId ?? null,
      requestedByEmail: allowed.actorEmail ?? null,
      metadata: {
        sourceContext: "company_auth_support",
        businessId,
      },
    });

    return NextResponse.json({
      ok: true,
      action,
      email: existingUser.email,
      businessId,
      delivered: emailResult.delivered,
      provider: emailResult.provider,
      reason: emailResult.reason ?? null,
      expiresAt: token.expiresAt.toISOString(),
      ...(shouldExposeDebugResetUrl(emailResult) ? { debugResetUrl: token.resetUrl } : null),
    });
  } catch (error) {
    return NextResponse.json(
      {
        message: "Failed to execute company auth support action",
        detail: safeErrorMessage(error),
      },
      { status: 500 },
    );
  }
}
