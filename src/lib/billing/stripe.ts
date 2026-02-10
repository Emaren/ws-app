import type { SubscriptionPlan } from "@prisma/client";
import Stripe from "stripe";

let cachedStripeClient: Stripe | null = null;

function normalizeEnvValue(value: string | undefined): string | null {
  if (!value) return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

export function getStripeClient(): Stripe {
  if (cachedStripeClient) {
    return cachedStripeClient;
  }

  const secretKey = normalizeEnvValue(process.env.STRIPE_SECRET_KEY);
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY is not set");
  }

  cachedStripeClient = new Stripe(secretKey);
  return cachedStripeClient;
}

export function getStripeWebhookSecret(): string {
  const webhookSecret = normalizeEnvValue(process.env.STRIPE_WEBHOOK_SECRET);
  if (!webhookSecret) {
    throw new Error("STRIPE_WEBHOOK_SECRET is not set");
  }

  return webhookSecret;
}

export function getMonthlyPriceId(): string | null {
  return normalizeEnvValue(process.env.STRIPE_PRICE_ID_MONTHLY);
}

export function getYearlyPriceId(): string | null {
  return normalizeEnvValue(process.env.STRIPE_PRICE_ID_YEARLY);
}

export function detectPlanFromPriceId(priceId: string | null | undefined): SubscriptionPlan {
  const normalizedPriceId = normalizeEnvValue(priceId ?? undefined);
  if (!normalizedPriceId) {
    return "CUSTOM";
  }

  const monthlyPriceId = getMonthlyPriceId();
  const yearlyPriceId = getYearlyPriceId();

  if (monthlyPriceId && normalizedPriceId === monthlyPriceId) {
    return "PREMIUM_MONTHLY";
  }

  if (yearlyPriceId && normalizedPriceId === yearlyPriceId) {
    return "PREMIUM_YEARLY";
  }

  return "CUSTOM";
}
