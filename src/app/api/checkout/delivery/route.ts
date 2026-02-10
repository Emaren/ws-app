import { NextResponse } from "next/server";
import { getStripeClient } from "@/lib/billing/stripe";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

type DeliveryCheckoutLineItemRequest = {
  name?: string;
  quantity?: number;
  unitPriceCents?: number;
};

type DeliveryCheckoutRequestBody = {
  source?: string;
  articleSlug?: string;
  businessSlug?: string;
  businessName?: string;
  offerId?: string;
  inventoryItemId?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  deliveryAddress?: string;
  notes?: string;
  lineItems?: DeliveryCheckoutLineItemRequest[];
  successPath?: string;
  cancelPath?: string;
};

type NormalizedLineItem = {
  name: string;
  quantity: number;
  unitPriceCents: number;
};

function asTrimmedString(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
}

function normalizeEmail(value: unknown): string | null {
  const email = asTrimmedString(value, 160);
  if (!email) return null;
  const normalized = email.toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    return null;
  }
  return normalized;
}

function normalizeRelativePath(
  value: unknown,
  fallback: string,
): string {
  const candidate = asTrimmedString(value, 300);
  if (!candidate) return fallback;
  if (!candidate.startsWith("/")) return fallback;
  if (candidate.startsWith("//")) return fallback;
  return candidate;
}

function addQueryParams(url: string, entries: Record<string, string>): string {
  const parsed = new URL(url);
  for (const [key, value] of Object.entries(entries)) {
    parsed.searchParams.set(key, value);
  }
  return parsed.toString();
}

function normalizeLineItems(
  input: unknown,
): { ok: true; items: NormalizedLineItem[]; totalCents: number } | { ok: false; message: string } {
  if (!Array.isArray(input)) {
    return { ok: false, message: "lineItems must be an array." };
  }
  if (input.length < 1) {
    return { ok: false, message: "At least one order item is required." };
  }
  if (input.length > 12) {
    return { ok: false, message: "Order item limit is 12 line items." };
  }

  const items: NormalizedLineItem[] = [];
  let totalCents = 0;

  for (const rawItem of input) {
    const item = rawItem as DeliveryCheckoutLineItemRequest;
    const name = asTrimmedString(item?.name, 120);
    if (!name) {
      return { ok: false, message: "Each line item needs a name." };
    }

    const quantity =
      typeof item?.quantity === "number" && Number.isInteger(item.quantity)
        ? item.quantity
        : Number.NaN;
    if (!Number.isFinite(quantity) || quantity < 1 || quantity > 99) {
      return {
        ok: false,
        message: `Quantity for "${name}" must be a whole number between 1 and 99.`,
      };
    }

    const unitPriceCents =
      typeof item?.unitPriceCents === "number" && Number.isInteger(item.unitPriceCents)
        ? item.unitPriceCents
        : Number.NaN;
    if (!Number.isFinite(unitPriceCents) || unitPriceCents < 50 || unitPriceCents > 500_000) {
      return {
        ok: false,
        message: `Unit price for "${name}" must be between 50 and 500000 cents.`,
      };
    }

    totalCents += quantity * unitPriceCents;
    items.push({
      name,
      quantity,
      unitPriceCents,
    });
  }

  if (totalCents < 50) {
    return { ok: false, message: "Order total must be at least 50 cents." };
  }

  if (totalCents > 5_000_000) {
    return { ok: false, message: "Order total is too large for this checkout flow." };
  }

  return {
    ok: true,
    items,
    totalCents,
  };
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as DeliveryCheckoutRequestBody | null;
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
    }

    const lineItems = normalizeLineItems(body.lineItems);
    if (!lineItems.ok) {
      return NextResponse.json({ error: lineItems.message }, { status: 400 });
    }

    const customerEmail = normalizeEmail(body.customerEmail);
    const customerName = asTrimmedString(body.customerName, 120);
    const customerPhone = asTrimmedString(body.customerPhone, 40);
    const deliveryAddress = asTrimmedString(body.deliveryAddress, 300);
    if (!deliveryAddress) {
      return NextResponse.json({ error: "Delivery address is required for checkout." }, { status: 400 });
    }

    const origin =
      (process.env.NEXT_PUBLIC_SITE_ORIGIN?.trim() ||
        process.env.NEXTAUTH_URL?.trim() ||
        "https://wheatandstone.ca").replace(/\/+$/, "");

    const successPath = normalizeRelativePath(body.successPath, "/");
    const cancelPath = normalizeRelativePath(body.cancelPath, successPath);

    const SESSION_TOKEN_PLACEHOLDER = "__CHECKOUT_SESSION_ID__";
    const successUrl = addQueryParams(`${origin}${successPath}`, {
      deliveryCheckout: "success",
      session_id: SESSION_TOKEN_PLACEHOLDER,
    }).replace(SESSION_TOKEN_PLACEHOLDER, "{CHECKOUT_SESSION_ID}");
    const cancelUrl = addQueryParams(`${origin}${cancelPath}`, {
      deliveryCheckout: "canceled",
    });

    const summary = lineItems.items
      .map((item) => `${item.name} x${item.quantity}`)
      .join(" | ")
      .slice(0, 480);

    const stripe = getStripeClient();
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: lineItems.items.map((item) => ({
        quantity: item.quantity,
        price_data: {
          currency: "cad",
          unit_amount: item.unitPriceCents,
          product_data: {
            name: item.name,
          },
        },
      })),
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: customerEmail ?? undefined,
      billing_address_collection: "required",
      phone_number_collection: {
        enabled: true,
      },
      metadata: {
        checkoutFlow: "delivery",
        source: asTrimmedString(body.source, 40) ?? "LOCAL_AD",
        articleSlug: asTrimmedString(body.articleSlug, 120) ?? "",
        businessSlug: asTrimmedString(body.businessSlug, 120) ?? "",
        businessName: asTrimmedString(body.businessName, 120) ?? "",
        offerId: asTrimmedString(body.offerId, 64) ?? "",
        inventoryItemId: asTrimmedString(body.inventoryItemId, 64) ?? "",
        customerName: customerName ?? "",
        customerPhone: customerPhone ?? "",
        deliveryAddress,
        notes: asTrimmedString(body.notes, 450) ?? "",
        orderSummary: summary,
      },
    });

    return NextResponse.json({
      url: checkoutSession.url,
      sessionId: checkoutSession.id,
      totalCents: lineItems.totalCents,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Delivery checkout failed",
      },
      { status: 500 },
    );
  }
}
