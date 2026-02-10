export const ANALYTICS_EVENT_TYPES = [
  "ARTICLE_VIEW",
  "AD_CLICK",
  "AFFILIATE_CLICK",
  "INVENTORY_CTA",
  "DELIVERY_CTA",
  "NOTIFICATION_OPT_IN",
] as const;

export type AnalyticsEventType = (typeof ANALYTICS_EVENT_TYPES)[number];

export const ANALYTICS_CHANNELS = ["EMAIL", "SMS", "PUSH"] as const;

export type AnalyticsChannel = (typeof ANALYTICS_CHANNELS)[number];

export type AnalyticsEventPayload = {
  eventType: AnalyticsEventType;
  articleSlug?: string | null;
  businessSlug?: string | null;
  campaignId?: string | null;
  offerId?: string | null;
  inventoryItemId?: string | null;
  sourceContext?: string | null;
  adSlot?: string | null;
  channel?: AnalyticsChannel | null;
  destinationUrl?: string | null;
  referrerUrl?: string | null;
  sessionId?: string | null;
  pagePath?: string | null;
  metadata?: Record<string, unknown> | unknown[] | null;
};
