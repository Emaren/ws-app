import { NextResponse } from "next/server";
import { getPublicDeliveryPaymentConfiguration } from "@/lib/siteConfiguration";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const deliveryPaymentConfig = await getPublicDeliveryPaymentConfiguration();
  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    deliveryPaymentConfig,
  });
}
