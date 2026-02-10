// src/app/api/checkout/route.ts
import { NextResponse } from "next/server";
import Stripe from "stripe";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const key = process.env.STRIPE_SECRET_KEY;
if (!key) console.warn("⚠️ STRIPE_SECRET_KEY is not set");

const stripe = key ? new Stripe(key) : null;

export async function POST(req: Request) {
  try {
    if (!stripe) throw new Error("Stripe not configured");
    await req.json().catch(() => ({} as any)); // body reserved for future

    const priceId = process.env.STRIPE_PRICE_ID_MONTHLY;
    if (!priceId) throw new Error("Missing STRIPE_PRICE_ID_MONTHLY");

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

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      allow_promotion_codes: true,
      billing_address_collection: "auto",
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error("Checkout error:", err);
    return NextResponse.json(
      { error: err.message || "Checkout failed" },
      { status: 500 }
    );
  }
}
