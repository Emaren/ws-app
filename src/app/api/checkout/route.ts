import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import {
  getStripeClient,
  getMonthlyPriceId,
  getYearlyPriceId,
  detectPlanFromPriceId,
} from "@/lib/billing/stripe";
import {
  getUserEntitlementByIdentity,
  upsertEntitlementFromCheckoutSession,
} from "@/lib/billing/entitlements";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

type CheckoutRequestBody = {
  plan?: string;
};

function resolvePriceId(body: CheckoutRequestBody): string {
  const requestedPlan = body.plan?.trim().toLowerCase();
  const monthlyPriceId = getMonthlyPriceId();
  const yearlyPriceId = getYearlyPriceId();

  if (requestedPlan === "premium_yearly") {
    if (!yearlyPriceId) {
      throw new Error("Missing STRIPE_PRICE_ID_YEARLY");
    }

    return yearlyPriceId;
  }

  if (!monthlyPriceId) {
    throw new Error("Missing STRIPE_PRICE_ID_MONTHLY");
  }

  return monthlyPriceId;
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session.user.email) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const stripe = getStripeClient();
    const body = (await req.json().catch(() => ({}))) as CheckoutRequestBody;
    const priceId = resolvePriceId(body);
    const normalizedEmail = session.user.email.trim().toLowerCase();

    const existingEntitlement = await getUserEntitlementByIdentity(prisma, {
      userExternalId: session.user.id,
      userEmail: normalizedEmail,
    });

    const configuredOrigin =
      process.env.NEXT_PUBLIC_SITE_ORIGIN?.trim() ||
      process.env.NEXTAUTH_URL?.trim() ||
      "https://wheatandstone.ca";
    const origin = configuredOrigin.replace(/\/+$/, "");

    const successUrl =
      process.env.STRIPE_SUCCESS_URL ??
      `${origin}/premium/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl =
      process.env.STRIPE_CANCEL_URL ?? `${origin}/premium/cancel`;

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      allow_promotion_codes: true,
      billing_address_collection: "auto",
      customer: existingEntitlement?.stripeCustomerId ?? undefined,
      customer_email: existingEntitlement?.stripeCustomerId
        ? undefined
        : normalizedEmail,
      client_reference_id: session.user.id,
      metadata: {
        userExternalId: session.user.id,
        userEmail: normalizedEmail,
      },
      subscription_data: {
        metadata: {
          userExternalId: session.user.id,
          userEmail: normalizedEmail,
        },
      },
    });

    await upsertEntitlementFromCheckoutSession({
      prisma,
      session: checkoutSession,
      userExternalId: session.user.id,
      userEmail: normalizedEmail,
      plan: detectPlanFromPriceId(priceId),
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (err: any) {
    console.error("Checkout error:", err);
    return NextResponse.json(
      { error: err.message || "Checkout failed" },
      { status: 500 }
    );
  }
}
