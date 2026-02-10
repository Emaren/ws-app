import type {
  Prisma,
  PrismaClient,
  SubscriptionEntitlement,
  SubscriptionPlan,
  SubscriptionStatus,
} from "@prisma/client";
import type Stripe from "stripe";
import { detectPlanFromPriceId } from "@/lib/billing/stripe";

const PREMIUM_ACCESS_STATUSES = new Set<SubscriptionStatus>([
  "ACTIVE",
  "TRIALING",
  "PAST_DUE",
]);

function normalizeEmail(input: string | null | undefined): string | null {
  if (typeof input !== "string") return null;
  const trimmed = input.trim().toLowerCase();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeUserExternalId(input: string | null | undefined): string | null {
  if (typeof input !== "string") return null;
  const trimmed = input.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function asStripeId(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (
    value &&
    typeof value === "object" &&
    "id" in value &&
    typeof (value as { id?: unknown }).id === "string"
  ) {
    const trimmed = (value as { id: string }).id.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  return null;
}

function toDateFromUnix(value: number | null | undefined): Date | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return null;
  }

  return new Date(value * 1000);
}

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

export function mapStripeSubscriptionStatus(
  stripeStatus: string | null | undefined,
): SubscriptionStatus {
  if (!stripeStatus) {
    return "NONE";
  }

  const normalized = stripeStatus.trim().toLowerCase();

  if (normalized === "incomplete") return "INCOMPLETE";
  if (normalized === "incomplete_expired") return "INCOMPLETE_EXPIRED";
  if (normalized === "trialing") return "TRIALING";
  if (normalized === "active") return "ACTIVE";
  if (normalized === "past_due") return "PAST_DUE";
  if (normalized === "canceled") return "CANCELED";
  if (normalized === "unpaid") return "UNPAID";
  if (normalized === "paused") return "PAUSED";
  return "NONE";
}

function resolvePrimaryPrice(subscription: Stripe.Subscription): Stripe.Price | null {
  const firstItem = subscription.items.data[0];
  if (!firstItem) {
    return null;
  }

  return firstItem.price ?? null;
}

export interface StripeEntitlementSnapshot {
  stripeCustomerId: string | null;
  stripeSubscriptionId: string;
  stripePriceId: string | null;
  stripeProductId: string | null;
  latestInvoiceId: string | null;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  cancelAtPeriodEnd: boolean;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  trialEndsAt: Date | null;
}

export function createStripeEntitlementSnapshot(
  subscription: Stripe.Subscription,
): StripeEntitlementSnapshot {
  const primaryItem = subscription.items.data[0];
  const primaryPrice = resolvePrimaryPrice(subscription);
  const stripePriceId = asStripeId(primaryPrice?.id ?? null);

  return {
    stripeCustomerId: asStripeId(subscription.customer),
    stripeSubscriptionId: subscription.id,
    stripePriceId,
    stripeProductId: asStripeId(primaryPrice?.product ?? null),
    latestInvoiceId: asStripeId(subscription.latest_invoice),
    plan: detectPlanFromPriceId(stripePriceId),
    status: mapStripeSubscriptionStatus(subscription.status),
    cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
    currentPeriodStart: toDateFromUnix(primaryItem?.current_period_start),
    currentPeriodEnd: toDateFromUnix(primaryItem?.current_period_end),
    trialEndsAt: toDateFromUnix(subscription.trial_end),
  };
}

interface IdentityHints {
  userExternalId?: string | null;
  userEmail?: string | null;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
}

async function findExistingEntitlement(
  prisma: PrismaClient,
  hints: IdentityHints,
): Promise<SubscriptionEntitlement | null> {
  const normalizedExternalId = normalizeUserExternalId(hints.userExternalId);
  const normalizedEmail = normalizeEmail(hints.userEmail);
  const stripeCustomerId = asStripeId(hints.stripeCustomerId);
  const stripeSubscriptionId = asStripeId(hints.stripeSubscriptionId);

  if (stripeSubscriptionId) {
    const bySubscription = await prisma.subscriptionEntitlement.findUnique({
      where: { stripeSubscriptionId },
    });
    if (bySubscription) {
      return bySubscription;
    }
  }

  if (stripeCustomerId) {
    const byCustomer = await prisma.subscriptionEntitlement.findUnique({
      where: { stripeCustomerId },
    });
    if (byCustomer) {
      return byCustomer;
    }
  }

  if (normalizedExternalId) {
    const byExternalId = await prisma.subscriptionEntitlement.findUnique({
      where: { userExternalId: normalizedExternalId },
    });
    if (byExternalId) {
      return byExternalId;
    }
  }

  if (normalizedEmail) {
    const byEmail = await prisma.subscriptionEntitlement.findFirst({
      where: { userEmail: normalizedEmail },
      orderBy: { updatedAt: "desc" },
    });
    if (byEmail) {
      return byEmail;
    }
  }

  return null;
}

export async function getUserEntitlementByIdentity(
  prisma: PrismaClient,
  identity: { userExternalId?: string | null; userEmail?: string | null },
): Promise<SubscriptionEntitlement | null> {
  return findExistingEntitlement(prisma, {
    userExternalId: identity.userExternalId,
    userEmail: identity.userEmail,
  });
}

function buildMetadataInput(
  existingMetadata: unknown,
  additions: Record<string, unknown>,
): Prisma.InputJsonValue | undefined {
  const merged = {
    ...asRecord(existingMetadata),
    ...additions,
  };

  if (Object.keys(merged).length === 0) {
    return undefined;
  }

  return merged as Prisma.InputJsonValue;
}

export interface SyncEntitlementFromStripeOptions {
  prisma: PrismaClient;
  subscription: Stripe.Subscription;
  userExternalId?: string | null;
  userEmail?: string | null;
  checkoutSessionId?: string | null;
  eventId?: string | null;
}

export async function syncEntitlementFromStripeSubscription(
  options: SyncEntitlementFromStripeOptions,
): Promise<SubscriptionEntitlement> {
  const {
    prisma,
    subscription,
    userExternalId,
    userEmail,
    checkoutSessionId,
    eventId,
  } = options;

  const snapshot = createStripeEntitlementSnapshot(subscription);
  const normalizedExternalId = normalizeUserExternalId(userExternalId);
  const normalizedEmail = normalizeEmail(userEmail);
  const now = new Date();

  const existing = await findExistingEntitlement(prisma, {
    userExternalId: normalizedExternalId,
    userEmail: normalizedEmail,
    stripeCustomerId: snapshot.stripeCustomerId,
    stripeSubscriptionId: snapshot.stripeSubscriptionId,
  });

  const metadata = buildMetadataInput(existing?.metadata, {
    lastStripeEventId: eventId ?? null,
    lastStripeSyncAt: now.toISOString(),
    lastCheckoutSessionId: checkoutSessionId ?? existing?.checkoutSessionId ?? null,
  });

  const data = {
    userExternalId: normalizedExternalId ?? existing?.userExternalId ?? null,
    userEmail: normalizedEmail ?? existing?.userEmail ?? null,
    stripeCustomerId: snapshot.stripeCustomerId,
    stripeSubscriptionId: snapshot.stripeSubscriptionId,
    stripePriceId: snapshot.stripePriceId,
    stripeProductId: snapshot.stripeProductId,
    latestInvoiceId: snapshot.latestInvoiceId,
    plan: snapshot.plan,
    status: snapshot.status,
    cancelAtPeriodEnd: snapshot.cancelAtPeriodEnd,
    currentPeriodStart: snapshot.currentPeriodStart,
    currentPeriodEnd: snapshot.currentPeriodEnd,
    trialEndsAt: snapshot.trialEndsAt,
    checkoutSessionId: checkoutSessionId ?? existing?.checkoutSessionId ?? null,
    syncedAt: now,
    mismatchReason: null,
    metadata,
  };

  if (existing) {
    return prisma.subscriptionEntitlement.update({
      where: { id: existing.id },
      data,
    });
  }

  return prisma.subscriptionEntitlement.create({
    data,
  });
}

export interface UpsertCheckoutEntitlementOptions {
  prisma: PrismaClient;
  session: Stripe.Checkout.Session;
  userExternalId: string;
  userEmail: string;
  plan: SubscriptionPlan;
}

export async function upsertEntitlementFromCheckoutSession(
  options: UpsertCheckoutEntitlementOptions,
): Promise<SubscriptionEntitlement> {
  const { prisma, session, userExternalId, userEmail, plan } = options;

  const normalizedExternalId = normalizeUserExternalId(userExternalId);
  if (!normalizedExternalId) {
    throw new Error("Cannot upsert entitlement without userExternalId");
  }

  const normalizedEmail = normalizeEmail(userEmail);
  const now = new Date();
  const checkoutStatus: SubscriptionStatus =
    session.status === "complete" ? "ACTIVE" : "INCOMPLETE";

  const existing = await findExistingEntitlement(prisma, {
    userExternalId: normalizedExternalId,
    userEmail: normalizedEmail,
    stripeCustomerId: asStripeId(session.customer),
    stripeSubscriptionId: asStripeId(session.subscription),
  });

  const metadata = buildMetadataInput(existing?.metadata, {
    checkoutMode: session.mode ?? null,
    checkoutStatus: session.status ?? null,
    checkoutPaymentStatus: session.payment_status ?? null,
    lastCheckoutCreatedAt: now.toISOString(),
  });

  const data = {
    userExternalId: normalizedExternalId,
    userEmail: normalizedEmail,
    plan,
    status: checkoutStatus,
    stripeCustomerId: asStripeId(session.customer),
    stripeSubscriptionId: asStripeId(session.subscription),
    checkoutSessionId: session.id,
    syncedAt: now,
    mismatchReason: null,
    metadata,
  };

  if (existing) {
    return prisma.subscriptionEntitlement.update({
      where: { id: existing.id },
      data,
    });
  }

  return prisma.subscriptionEntitlement.create({
    data,
  });
}

export function entitlementHasPremiumAccess(
  entitlement:
    | Pick<SubscriptionEntitlement, "plan" | "status" | "currentPeriodEnd">
    | null
    | undefined,
): boolean {
  if (!entitlement) {
    return false;
  }

  if (entitlement.plan === "FREE") {
    return false;
  }

  if (!PREMIUM_ACCESS_STATUSES.has(entitlement.status)) {
    return false;
  }

  if (entitlement.currentPeriodEnd) {
    const graceMs = 5 * 60 * 1000;
    return entitlement.currentPeriodEnd.getTime() + graceMs >= Date.now();
  }

  return true;
}

function isDateAligned(
  left: Date | null | undefined,
  right: Date | null | undefined,
  toleranceMs: number = 60_000,
): boolean {
  if (!left && !right) {
    return true;
  }

  if (!left || !right) {
    return false;
  }

  return Math.abs(left.getTime() - right.getTime()) <= toleranceMs;
}

export function computeEntitlementMismatchReasons(
  local: Pick<
    SubscriptionEntitlement,
    | "plan"
    | "status"
    | "stripeSubscriptionId"
    | "stripePriceId"
    | "cancelAtPeriodEnd"
    | "currentPeriodStart"
    | "currentPeriodEnd"
    | "latestInvoiceId"
  >,
  stripeSnapshot: StripeEntitlementSnapshot | null,
): string[] {
  const reasons: string[] = [];

  if (!stripeSnapshot) {
    if (local.stripeSubscriptionId) {
      reasons.push("Stripe subscription could not be found");
    }

    if (local.plan !== "FREE" || local.status !== "NONE") {
      reasons.push("Local entitlement indicates paid access without Stripe source");
    }

    return reasons;
  }

  if (local.plan !== stripeSnapshot.plan) {
    reasons.push(`Plan mismatch (local ${local.plan}, Stripe ${stripeSnapshot.plan})`);
  }

  if (local.status !== stripeSnapshot.status) {
    reasons.push(
      `Status mismatch (local ${local.status}, Stripe ${stripeSnapshot.status})`,
    );
  }

  if ((local.stripePriceId ?? null) !== (stripeSnapshot.stripePriceId ?? null)) {
    reasons.push("Price id mismatch");
  }

  if (local.cancelAtPeriodEnd !== stripeSnapshot.cancelAtPeriodEnd) {
    reasons.push("Cancel-at-period-end flag mismatch");
  }

  if (!isDateAligned(local.currentPeriodStart, stripeSnapshot.currentPeriodStart)) {
    reasons.push("Current period start mismatch");
  }

  if (!isDateAligned(local.currentPeriodEnd, stripeSnapshot.currentPeriodEnd)) {
    reasons.push("Current period end mismatch");
  }

  if ((local.latestInvoiceId ?? null) !== (stripeSnapshot.latestInvoiceId ?? null)) {
    reasons.push("Latest invoice mismatch");
  }

  return reasons;
}
