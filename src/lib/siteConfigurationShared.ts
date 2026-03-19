export const DEFAULT_DELIVERY_PAYMENT_TITLE = "Crypto & Hybrid Delivery Payment";
export const DEFAULT_DELIVERY_PAYMENT_SUMMARY =
  "Pay in CAD, in crypto, or split the balance between both. Wheat & Stone can settle delivery cost and delivery fee in fiat, $WHEAT, $STONE, or a blended mix.";
export const DEFAULT_DELIVERY_PAYMENT_INSTRUCTIONS =
  "Submit the delivery request, send any crypto portion to one of the configured addresses below, and we will confirm the remaining fiat balance or mixed split directly with you.";

export type SiteDeliveryPaymentMethod = {
  id: string;
  label: string;
  tokenSymbol: string;
  network: string;
  address: string;
  note: string | null;
};

export type SiteDeliveryPaymentConfig = {
  title: string;
  summary: string;
  instructions: string;
  methods: SiteDeliveryPaymentMethod[];
};

export const DEFAULT_DELIVERY_PAYMENT_CONFIG: SiteDeliveryPaymentConfig = {
  title: DEFAULT_DELIVERY_PAYMENT_TITLE,
  summary: DEFAULT_DELIVERY_PAYMENT_SUMMARY,
  instructions: DEFAULT_DELIVERY_PAYMENT_INSTRUCTIONS,
  methods: [],
};
