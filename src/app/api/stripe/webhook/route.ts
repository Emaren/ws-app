import { NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { getStripeClient, getStripeWebhookSecret } from "@/lib/billing/stripe";
import { syncEntitlementFromStripeSubscription } from "@/lib/billing/entitlements";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

function readMetadataValue(
  value: string | null | undefined,
): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

async function syncFromSubscriptionObject({
  stripe,
  subscription,
  checkoutSessionId,
  eventId,
}: {
  stripe: Stripe;
  subscription: Stripe.Subscription;
  checkoutSessionId?: string;
  eventId: string;
}): Promise<void> {
  await syncEntitlementFromStripeSubscription({
    prisma,
    subscription,
    userExternalId: readMetadataValue(subscription.metadata?.userExternalId),
    userEmail: readMetadataValue(subscription.metadata?.userEmail),
    checkoutSessionId,
    eventId,
  });
}

async function syncBySubscriptionId({
  stripe,
  subscriptionId,
  checkoutSessionId,
  eventId,
  userExternalId,
  userEmail,
}: {
  stripe: Stripe;
  subscriptionId: string;
  checkoutSessionId?: string;
  eventId: string;
  userExternalId?: string | null;
  userEmail?: string | null;
}): Promise<void> {
  const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
    expand: ["items.data.price", "latest_invoice"],
  });

  await syncEntitlementFromStripeSubscription({
    prisma,
    subscription,
    userExternalId,
    userEmail,
    checkoutSessionId,
    eventId,
  });
}

export async function POST(req: Request) {
  try {
    const stripe = getStripeClient();
    const webhookSecret = getStripeWebhookSecret();

    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      return NextResponse.json(
        { error: "Missing Stripe signature" },
        { status: 400 },
      );
    }

    const payload = await req.text();
    const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);

    switch (event.type) {
      case "checkout.session.completed": {
        const checkoutSession = event.data.object as Stripe.Checkout.Session;
        const subscriptionId =
          typeof checkoutSession.subscription === "string"
            ? checkoutSession.subscription
            : checkoutSession.subscription?.id;

        if (subscriptionId) {
          await syncBySubscriptionId({
            stripe,
            subscriptionId,
            checkoutSessionId: checkoutSession.id,
            eventId: event.id,
            userExternalId: readMetadataValue(checkoutSession.metadata?.userExternalId),
            userEmail: readMetadataValue(checkoutSession.metadata?.userEmail),
          });
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
      case "customer.subscription.paused":
      case "customer.subscription.resumed": {
        const subscription = event.data.object as Stripe.Subscription;
        await syncFromSubscriptionObject({
          stripe,
          subscription,
          eventId: event.id,
        });
        break;
      }

      case "invoice.paid":
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const parentSubscription = invoice.parent?.subscription_details?.subscription;
        const subscriptionId =
          typeof parentSubscription === "string"
            ? parentSubscription
            : parentSubscription?.id;

        if (subscriptionId) {
          await syncBySubscriptionId({
            stripe,
            subscriptionId,
            eventId: event.id,
            userEmail: readMetadataValue(invoice.customer_email),
          });
        }
        break;
      }

      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Stripe webhook error", error);
    const message = error instanceof Error ? error.message : "Webhook processing failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
