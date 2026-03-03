import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { listWsApiUsers, requireOffersManagerWsToken } from "../_shared";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type AssignmentMode = "ALL" | "USERS" | "EMAILS" | "ZERO_OFFER";

type WsUser = {
  id: string;
  email: string;
  name: string;
  role: string;
};

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeMode(raw: unknown): AssignmentMode {
  if (raw === "ALL" || raw === "USERS" || raw === "EMAILS" || raw === "ZERO_OFFER") {
    return raw;
  }
  return "USERS";
}

function parseStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function parseOptionalDate(value: unknown, fieldName: string): Date | null {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) {
    throw new Error(`${fieldName} must be a valid date`);
  }

  return parsed;
}

function isOfferLiveNow(offer: {
  status: string;
  startsAt: Date | null;
  endsAt: Date | null;
}): boolean {
  if (offer.status !== "LIVE") {
    return false;
  }

  const nowMs = Date.now();
  const startMs = offer.startsAt ? offer.startsAt.getTime() : null;
  const endMs = offer.endsAt ? offer.endsAt.getTime() : null;

  if (startMs !== null && nowMs < startMs) {
    return false;
  }
  if (endMs !== null && nowMs > endMs) {
    return false;
  }
  return true;
}

async function resolveZeroOfferUsers(
  users: WsUser[],
  businessScopeIds: string[] | null,
): Promise<WsUser[]> {
  const now = new Date();
  const activeAssignments = await prisma.userOfferInbox.findMany({
    where: {
      ...(businessScopeIds ? { businessId: { in: businessScopeIds } } : {}),
      status: { in: ["ACTIVE", "SEEN"] },
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      offer: {
        status: "LIVE",
        AND: [
          { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
          { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
        ],
      },
    },
    select: {
      userExternalId: true,
      userEmail: true,
      offer: {
        select: {
          status: true,
          startsAt: true,
          endsAt: true,
        },
      },
    },
  });

  const hasLiveByUserId = new Set<string>();
  const hasLiveByEmail = new Set<string>();

  for (const assignment of activeAssignments) {
    if (!isOfferLiveNow(assignment.offer)) {
      continue;
    }
    hasLiveByUserId.add(assignment.userExternalId);
    hasLiveByEmail.add(assignment.userEmail.toLowerCase());
  }

  return users.filter(
    (user) => !hasLiveByUserId.has(user.id) && !hasLiveByEmail.has(user.email.toLowerCase()),
  );
}

async function resolveScopedAudienceUsers(
  users: WsUser[],
  businessScopeIds: string[] | null,
  actorExternalId: string | null,
  actorEmail: string | null,
): Promise<WsUser[]> {
  if (!businessScopeIds) {
    return users;
  }

  if (businessScopeIds.length === 0) {
    return [];
  }

  const [existingAssignments, recipients] = await Promise.all([
    prisma.userOfferInbox.findMany({
      where: { businessId: { in: businessScopeIds } },
      select: {
        userExternalId: true,
        userEmail: true,
      },
      distinct: ["userExternalId"],
    }),
    prisma.notificationRecipient.findMany({
      where: { businessId: { in: businessScopeIds } },
      select: {
        userId: true,
        email: true,
      },
    }),
  ]);

  const allowedIds = new Set<string>();
  const allowedEmails = new Set<string>();

  for (const assignment of existingAssignments) {
    if (assignment.userExternalId) {
      allowedIds.add(assignment.userExternalId);
    }
    if (assignment.userEmail) {
      allowedEmails.add(assignment.userEmail.toLowerCase());
    }
  }

  for (const recipient of recipients) {
    if (recipient.userId) {
      allowedIds.add(recipient.userId);
    }
    if (recipient.email) {
      allowedEmails.add(recipient.email.toLowerCase());
    }
  }

  if (actorExternalId) {
    allowedIds.add(actorExternalId);
  }
  if (actorEmail) {
    allowedEmails.add(actorEmail.toLowerCase());
  }

  return users.filter(
    (user) =>
      allowedIds.has(user.id) || allowedEmails.has(user.email.toLowerCase()),
  );
}

function pickTargets(input: {
  users: WsUser[];
  mode: AssignmentMode;
  userIds: string[];
  emails: string[];
  zeroOfferUsers: WsUser[];
}): {
  targets: WsUser[];
  unmatchedEmails: string[];
} {
  const usersById = new Map(input.users.map((user) => [user.id, user]));
  const usersByEmail = new Map(input.users.map((user) => [user.email.toLowerCase(), user]));

  if (input.mode === "ALL") {
    return { targets: input.users, unmatchedEmails: [] };
  }

  if (input.mode === "USERS") {
    return {
      targets: input.userIds.map((userId) => usersById.get(userId)).filter((user): user is WsUser => Boolean(user)),
      unmatchedEmails: [],
    };
  }

  if (input.mode === "EMAILS") {
    const unmatchedEmails: string[] = [];
    const targets: WsUser[] = [];
    for (const email of input.emails) {
      const matched = usersByEmail.get(email.toLowerCase());
      if (matched) {
        targets.push(matched);
      } else {
        unmatchedEmails.push(email);
      }
    }

    return { targets, unmatchedEmails };
  }

  return { targets: input.zeroOfferUsers, unmatchedEmails: [] };
}

export async function POST(req: NextRequest) {
  const auth = await requireOffersManagerWsToken(req);
  if (auth instanceof NextResponse) {
    return auth;
  }

  const body = await req.json().catch(() => null);
  if (!isObjectRecord(body)) {
    return NextResponse.json({ message: "Invalid request body" }, { status: 400 });
  }

  const offerId = typeof body.offerId === "string" ? body.offerId.trim() : "";
  if (!offerId) {
    return NextResponse.json({ message: "offerId is required" }, { status: 400 });
  }

  const mode = normalizeMode(body.mode);
  const userIds = parseStringArray(body.userIds);
  const emails = parseStringArray(body.emails);
  const note = typeof body.note === "string" ? body.note.trim() : "";

  if (mode === "USERS" && userIds.length === 0) {
    return NextResponse.json({ message: "Select at least one user" }, { status: 400 });
  }
  if (mode === "EMAILS" && emails.length === 0) {
    return NextResponse.json({ message: "Provide at least one email" }, { status: 400 });
  }

  let assignmentExpiresAt: Date | null = null;
  try {
    assignmentExpiresAt = parseOptionalDate(body.expiresAt, "expiresAt");
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Invalid expiresAt" },
      { status: 400 },
    );
  }

  try {
    const [offer, wsUsers] = await Promise.all([
      prisma.offer.findUnique({
        where: { id: offerId },
        select: {
          id: true,
          businessId: true,
          title: true,
          status: true,
          startsAt: true,
          endsAt: true,
        },
      }),
      listWsApiUsers(auth.accessToken),
    ]);

    if (!offer) {
      return NextResponse.json({ message: "Offer not found" }, { status: 404 });
    }

    if (offer.status !== "LIVE") {
      return NextResponse.json(
        { message: "Offer must be LIVE before assigning to users" },
        { status: 400 },
      );
    }

    const businessScopeIds = auth.managedBusinessIds;
    if (businessScopeIds && !businessScopeIds.includes(offer.businessId)) {
      return NextResponse.json(
        { message: "Forbidden: offer is outside your business scope" },
        { status: 403 },
      );
    }

    const scopeUsers = await resolveScopedAudienceUsers(
      wsUsers,
      businessScopeIds,
      auth.actorExternalId,
      auth.actorEmail,
    );

    if (businessScopeIds && scopeUsers.length === 0) {
      return NextResponse.json(
        {
          message:
            "No scoped audience found yet. Add recipients for this business first, then assign offers.",
        },
        { status: 400 },
      );
    }

    const zeroOfferUsers =
      mode === "ZERO_OFFER"
        ? await resolveZeroOfferUsers(scopeUsers, businessScopeIds)
        : [];
    const { targets, unmatchedEmails } = pickTargets({
      users: scopeUsers,
      mode,
      userIds,
      emails,
      zeroOfferUsers,
    });

    const dedupedTargets = Array.from(new Map(targets.map((user) => [user.id, user])).values());

    if (dedupedTargets.length === 0) {
      return NextResponse.json(
        {
          message: "No matching users found for this assignment",
          unmatchedEmails,
        },
        { status: 400 },
      );
    }

    const existingRows = await prisma.userOfferInbox.findMany({
      where: {
        offerId: offer.id,
        userExternalId: { in: dedupedTargets.map((user) => user.id) },
      },
      select: {
        id: true,
        userExternalId: true,
      },
    });

    const existingByExternalId = new Map(
      existingRows.map((row) => [row.userExternalId, row.id]),
    );

    const now = new Date();
    const effectiveExpiresAt = assignmentExpiresAt ?? offer.endsAt ?? null;
    const metadata = {
      source: "admin-offers-console",
      mode,
      assignedAtIso: now.toISOString(),
      note: note || null,
    };

    let created = 0;
    let updated = 0;

    await prisma.$transaction(
      dedupedTargets.map((user) => {
        const existingId = existingByExternalId.get(user.id);
        if (existingId) {
          updated += 1;
          return prisma.userOfferInbox.update({
            where: { id: existingId },
            data: {
              userEmail: user.email,
              userName: user.name,
              status: "ACTIVE",
              assignmentMode:
                mode === "ALL"
                  ? "ALL"
                  : mode === "ZERO_OFFER"
                    ? "BACKFILL"
                    : mode === "EMAILS"
                      ? "SEGMENT"
                      : "DIRECT",
              assignedAt: now,
              expiresAt: effectiveExpiresAt,
              assignedByExternal: auth.actorExternalId,
              assignedByEmail: auth.actorEmail,
              metadata,
            },
          });
        }

        created += 1;
        return prisma.userOfferInbox.create({
          data: {
            userExternalId: user.id,
            userEmail: user.email,
            userName: user.name,
            offerId: offer.id,
            businessId: offer.businessId,
            status: "ACTIVE",
            assignmentMode:
              mode === "ALL"
                ? "ALL"
                : mode === "ZERO_OFFER"
                  ? "BACKFILL"
                  : mode === "EMAILS"
                    ? "SEGMENT"
                    : "DIRECT",
            assignedAt: now,
            expiresAt: effectiveExpiresAt,
            assignedByExternal: auth.actorExternalId,
            assignedByEmail: auth.actorEmail,
            metadata,
          },
        });
      }),
    );

    return NextResponse.json({
      ok: true,
      offer: {
        id: offer.id,
        title: offer.title,
      },
      mode,
      targetCount: dedupedTargets.length,
      created,
      updated,
      unmatchedEmails,
      assignedAt: now.toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        message: "Failed to assign offer",
        cause: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
