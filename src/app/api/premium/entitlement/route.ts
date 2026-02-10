import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiAuthContext } from "@/lib/apiAuth";
import {
  entitlementHasPremiumAccess,
  getUserEntitlementByIdentity,
} from "@/lib/billing/entitlements";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function toIso(value: Date | null): string | null {
  return value ? value.toISOString() : null;
}

export async function GET(req: NextRequest) {
  const auth = await getApiAuthContext(req);

  if (!auth.userId && !auth.email) {
    return NextResponse.json(
      { message: "Authentication required" },
      { status: 401 },
    );
  }

  const entitlement = await getUserEntitlementByIdentity(prisma, {
    userExternalId: auth.userId,
    userEmail: auth.email,
  });

  const effectiveEntitlement = entitlement
    ? {
        plan: entitlement.plan,
        status: entitlement.status,
        stripeCustomerId: entitlement.stripeCustomerId,
        stripeSubscriptionId: entitlement.stripeSubscriptionId,
        cancelAtPeriodEnd: entitlement.cancelAtPeriodEnd,
        currentPeriodStart: toIso(entitlement.currentPeriodStart),
        currentPeriodEnd: toIso(entitlement.currentPeriodEnd),
        trialEndsAt: toIso(entitlement.trialEndsAt),
        syncedAt: toIso(entitlement.syncedAt),
        mismatchReason: entitlement.mismatchReason,
      }
    : {
        plan: "FREE",
        status: "NONE",
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        cancelAtPeriodEnd: false,
        currentPeriodStart: null,
        currentPeriodEnd: null,
        trialEndsAt: null,
        syncedAt: null,
        mismatchReason: null,
      };

  return NextResponse.json({
    entitlement: effectiveEntitlement,
    hasPremiumAccess: entitlementHasPremiumAccess(entitlement),
  });
}
