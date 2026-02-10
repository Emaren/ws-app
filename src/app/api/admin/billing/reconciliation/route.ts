import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { getApiAuthContext } from "@/lib/apiAuth";
import { hasAnyRole, RBAC_ROLE_GROUPS } from "@/lib/rbac";
import { getStripeClient } from "@/lib/billing/stripe";
import {
  computeEntitlementMismatchReasons,
  createStripeEntitlementSnapshot,
  syncEntitlementFromStripeSubscription,
} from "@/lib/billing/entitlements";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

const RESET_ACTION = "reset_to_free" as const;
const SYNC_ACTION = "sync_from_stripe" as const;

type ReconciliationAction = typeof RESET_ACTION | typeof SYNC_ACTION;

type EntitlementRecord = Awaited<
  ReturnType<typeof prisma.subscriptionEntitlement.findMany>
>[number];

function toIso(value: Date | null): string | null {
  return value ? value.toISOString() : null;
}

function forbidden() {
  return NextResponse.json({ message: "Forbidden" }, { status: 403 });
}

async function requireOwnerAdmin(req: NextRequest) {
  const auth = await getApiAuthContext(req);
  const isOwnerAdmin = hasAnyRole(auth.role, RBAC_ROLE_GROUPS.ownerAdmin);
  if (!auth.token || !isOwnerAdmin) {
    return { error: forbidden() };
  }

  return {
    auth,
  };
}

async function getOptionalStripeClient(): Promise<Stripe | null> {
  try {
    return getStripeClient();
  } catch {
    return null;
  }
}

async function getStripeSnapshotForEntitlement(
  stripe: Stripe,
  entitlement: EntitlementRecord,
): Promise<ReturnType<typeof createStripeEntitlementSnapshot> | null> {
  const tryRetrieveSubscription = async (
    subscriptionId: string,
  ): Promise<ReturnType<typeof createStripeEntitlementSnapshot> | null> => {
    try {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
        expand: ["items.data.price", "latest_invoice"],
      });
      return createStripeEntitlementSnapshot(subscription);
    } catch {
      return null;
    }
  };

  if (entitlement.stripeSubscriptionId) {
    const direct = await tryRetrieveSubscription(entitlement.stripeSubscriptionId);
    if (direct) {
      return direct;
    }
  }

  if (entitlement.stripeCustomerId) {
    try {
      const subscriptions = await stripe.subscriptions.list({
        customer: entitlement.stripeCustomerId,
        status: "all",
        limit: 1,
      });

      const first = subscriptions.data[0];
      if (first) {
        return createStripeEntitlementSnapshot(first);
      }
    } catch {
      // no-op
    }
  }

  if (entitlement.userEmail) {
    try {
      const customers = await stripe.customers.list({
        email: entitlement.userEmail,
        limit: 1,
      });

      const customer = customers.data[0];
      if (customer) {
        const subscriptions = await stripe.subscriptions.list({
          customer: customer.id,
          status: "all",
          limit: 1,
        });

        const first = subscriptions.data[0];
        if (first) {
          return createStripeEntitlementSnapshot(first);
        }
      }
    } catch {
      // no-op
    }
  }

  return null;
}

function presentRecord(
  entitlement: EntitlementRecord,
  stripeSnapshot: ReturnType<typeof createStripeEntitlementSnapshot> | null,
) {
  const mismatchReasons = computeEntitlementMismatchReasons(entitlement, stripeSnapshot);

  return {
    id: entitlement.id,
    userExternalId: entitlement.userExternalId,
    userEmail: entitlement.userEmail,
    local: {
      plan: entitlement.plan,
      status: entitlement.status,
      stripeCustomerId: entitlement.stripeCustomerId,
      stripeSubscriptionId: entitlement.stripeSubscriptionId,
      stripePriceId: entitlement.stripePriceId,
      stripeProductId: entitlement.stripeProductId,
      cancelAtPeriodEnd: entitlement.cancelAtPeriodEnd,
      currentPeriodStart: toIso(entitlement.currentPeriodStart),
      currentPeriodEnd: toIso(entitlement.currentPeriodEnd),
      trialEndsAt: toIso(entitlement.trialEndsAt),
      latestInvoiceId: entitlement.latestInvoiceId,
      syncedAt: toIso(entitlement.syncedAt),
      mismatchReason: entitlement.mismatchReason,
      updatedAt: toIso(entitlement.updatedAt),
      createdAt: toIso(entitlement.createdAt),
    },
    stripe: stripeSnapshot
      ? {
          plan: stripeSnapshot.plan,
          status: stripeSnapshot.status,
          stripeCustomerId: stripeSnapshot.stripeCustomerId,
          stripeSubscriptionId: stripeSnapshot.stripeSubscriptionId,
          stripePriceId: stripeSnapshot.stripePriceId,
          stripeProductId: stripeSnapshot.stripeProductId,
          cancelAtPeriodEnd: stripeSnapshot.cancelAtPeriodEnd,
          currentPeriodStart: toIso(stripeSnapshot.currentPeriodStart),
          currentPeriodEnd: toIso(stripeSnapshot.currentPeriodEnd),
          trialEndsAt: toIso(stripeSnapshot.trialEndsAt),
          latestInvoiceId: stripeSnapshot.latestInvoiceId,
        }
      : null,
    mismatchReasons,
    inSync: mismatchReasons.length === 0,
  };
}

async function listRecords(req: NextRequest) {
  const limitRaw = Number.parseInt(req.nextUrl.searchParams.get("limit") ?? "60", 10);
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 250) : 60;

  const entitlements = await prisma.subscriptionEntitlement.findMany({
    orderBy: { updatedAt: "desc" },
    take: limit,
  });

  const stripe = await getOptionalStripeClient();
  const records = await Promise.all(
    entitlements.map(async (entitlement) => {
      const stripeSnapshot = stripe
        ? await getStripeSnapshotForEntitlement(stripe, entitlement)
        : null;
      return presentRecord(entitlement, stripeSnapshot);
    }),
  );

  const mismatched = records.filter((record) => !record.inSync).length;

  return NextResponse.json({
    stripeAvailable: Boolean(stripe),
    generatedAt: new Date().toISOString(),
    summary: {
      total: records.length,
      inSync: records.length - mismatched,
      mismatched,
    },
    records,
  });
}

async function resolveSyncAction(
  stripe: Stripe,
  entitlement: EntitlementRecord,
  actorUserId: string | null,
) {
  let subscription: Stripe.Subscription | null = null;

  if (entitlement.stripeSubscriptionId) {
    try {
      subscription = await stripe.subscriptions.retrieve(
        entitlement.stripeSubscriptionId,
        {
          expand: ["items.data.price", "latest_invoice"],
        },
      );
    } catch {
      subscription = null;
    }
  }

  if (!subscription && entitlement.stripeCustomerId) {
    const subscriptions = await stripe.subscriptions.list({
      customer: entitlement.stripeCustomerId,
      status: "all",
      limit: 1,
    });
    subscription = subscriptions.data[0] ?? null;
  }

  if (!subscription && entitlement.userEmail) {
    const customers = await stripe.customers.list({
      email: entitlement.userEmail,
      limit: 1,
    });
    const customer = customers.data[0] ?? null;
    if (customer) {
      const subscriptions = await stripe.subscriptions.list({
        customer: customer.id,
        status: "all",
        limit: 1,
      });
      subscription = subscriptions.data[0] ?? null;
    }
  }

  if (!subscription) {
    const updated = await prisma.subscriptionEntitlement.update({
      where: { id: entitlement.id },
      data: {
        mismatchReason: "Manual sync requested but no Stripe subscription was found",
        syncedAt: new Date(),
      },
    });

    return {
      action: SYNC_ACTION,
      updatedRecord: presentRecord(updated, null),
      note: "No Stripe subscription found",
    };
  }

  const synced = await syncEntitlementFromStripeSubscription({
    prisma,
    subscription,
    userExternalId: entitlement.userExternalId,
    userEmail: entitlement.userEmail,
    eventId: `manual:${actorUserId ?? "unknown"}:${Date.now()}`,
  });

  const stripeSnapshot = createStripeEntitlementSnapshot(subscription);

  return {
    action: SYNC_ACTION,
    updatedRecord: presentRecord(synced, stripeSnapshot),
    note: "Synced local entitlement from Stripe",
  };
}

function metadataWithResetAudit(
  currentMetadata: unknown,
  actorUserId: string | null,
): Prisma.InputJsonValue {
  const base =
    currentMetadata &&
    typeof currentMetadata === "object" &&
    !Array.isArray(currentMetadata)
      ? (currentMetadata as Record<string, unknown>)
      : {};

  return {
    ...base,
    lastManualResetBy: actorUserId,
    lastManualResetAt: new Date().toISOString(),
  } satisfies Prisma.InputJsonValue;
}

async function resolveResetAction(entitlement: EntitlementRecord, actorUserId: string | null) {
  const updated = await prisma.subscriptionEntitlement.update({
    where: { id: entitlement.id },
    data: {
      plan: "FREE",
      status: "NONE",
      stripeSubscriptionId: null,
      stripePriceId: null,
      stripeProductId: null,
      latestInvoiceId: null,
      cancelAtPeriodEnd: false,
      currentPeriodStart: null,
      currentPeriodEnd: null,
      trialEndsAt: null,
      syncedAt: new Date(),
      mismatchReason: null,
      metadata: metadataWithResetAudit(entitlement.metadata, actorUserId),
    },
  });

  return {
    action: RESET_ACTION,
    updatedRecord: presentRecord(updated, null),
    note: "Entitlement reset to free",
  };
}

export async function GET(req: NextRequest) {
  const authResult = await requireOwnerAdmin(req);
  if ("error" in authResult) {
    return authResult.error;
  }

  return listRecords(req);
}

export async function POST(req: NextRequest) {
  const authResult = await requireOwnerAdmin(req);
  if ("error" in authResult) {
    return authResult.error;
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ message: "Invalid request body" }, { status: 400 });
  }

  const entitlementId =
    typeof body.entitlementId === "string" ? body.entitlementId.trim() : "";
  const action = typeof body.action === "string" ? body.action.trim() : "";

  if (!entitlementId) {
    return NextResponse.json(
      { message: "entitlementId is required" },
      { status: 400 },
    );
  }

  if (action !== SYNC_ACTION && action !== RESET_ACTION) {
    return NextResponse.json({ message: "Unsupported action" }, { status: 400 });
  }

  const entitlement = await prisma.subscriptionEntitlement.findUnique({
    where: { id: entitlementId },
  });

  if (!entitlement) {
    return NextResponse.json({ message: "Entitlement not found" }, { status: 404 });
  }

  if (action === RESET_ACTION) {
    const result = await resolveResetAction(entitlement, authResult.auth.userId ?? null);
    return NextResponse.json(result);
  }

  const stripe = await getOptionalStripeClient();
  if (!stripe) {
    return NextResponse.json(
      { message: "Stripe is not configured" },
      { status: 503 },
    );
  }

  try {
    const result = await resolveSyncAction(
      stripe,
      entitlement,
      authResult.auth.userId ?? null,
    );
    return NextResponse.json(result);
  } catch (error) {
    console.error("billing reconciliation sync failed", error);
    return NextResponse.json(
      { message: "Failed to sync entitlement from Stripe" },
      { status: 500 },
    );
  }
}
