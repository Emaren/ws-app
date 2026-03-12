export interface CommerceActivationRailInput {
  businessName: string | null;
  storeProfile:
    | {
        displayName: string | null;
        description: string | null;
        city: string | null;
        region: string | null;
        country: string | null;
        notificationEmail: string | null;
        deliveryEnabled: boolean;
        pickupEnabled: boolean;
      }
    | null
    | undefined;
  selectionSummary:
    | {
        inventoryCount: number;
        activeInventoryCount: number;
        productLinkedInventoryCount: number;
        lowStockCount: number;
        offerCount: number;
        liveOfferCount: number;
        featuredOfferCount: number;
        productLinkedOfferCount: number;
        deliveryEnabled: boolean;
        pickupEnabled: boolean;
      }
    | null
    | undefined;
  selectedActivitySummary:
    | {
        leadCount: number;
        openLeadCount: number;
        fulfilledLeadCount: number;
        notificationOptInCount: number;
        rewardCount: number;
        trackedDemandCents: number;
      }
    | null
    | undefined;
}

export interface CommerceActivationRailCheck {
  id:
    | "profile"
    | "catalog"
    | "linked-catalog"
    | "offers"
    | "fulfillment"
    | "demand"
    | "low-stock";
  title: string;
  status: "ready" | "attention" | "watch";
  detail: string;
}

export interface CommerceActivationRailSnapshot {
  businessLabel: string;
  readinessScore: number;
  readinessLabel: string;
  checks: CommerceActivationRailCheck[];
  actionIds: Array<CommerceActivationRailCheck["id"]>;
}

function present(value: string | null | undefined): boolean {
  return Boolean(value && value.trim().length > 0);
}

function pluralize(value: number, singular: string, plural = `${singular}s`): string {
  return `${value} ${value === 1 ? singular : plural}`;
}

export function buildCommerceActivationRail(
  input: CommerceActivationRailInput,
): CommerceActivationRailSnapshot {
  const businessLabel = input.businessName?.trim() || "Selected store";
  const storeProfile = input.storeProfile ?? null;
  const selectionSummary = input.selectionSummary ?? null;
  const activity = input.selectedActivitySummary ?? null;

  const profileMissing = [
    present(storeProfile?.displayName) ? null : "display name",
    present(storeProfile?.description) ? null : "description",
    present(storeProfile?.city) ? null : "city",
    present(storeProfile?.notificationEmail) ? null : "notification email",
  ].filter(Boolean) as string[];

  const profileReady = profileMissing.length === 0;
  const activeInventoryCount = selectionSummary?.activeInventoryCount ?? 0;
  const productLinkedInventoryCount = selectionSummary?.productLinkedInventoryCount ?? 0;
  const liveOfferCount = selectionSummary?.liveOfferCount ?? 0;
  const lowStockCount = selectionSummary?.lowStockCount ?? 0;
  const deliveryEnabled = selectionSummary?.deliveryEnabled ?? storeProfile?.deliveryEnabled ?? false;
  const pickupEnabled = selectionSummary?.pickupEnabled ?? storeProfile?.pickupEnabled ?? false;
  const leadCount = activity?.leadCount ?? 0;
  const openLeadCount = activity?.openLeadCount ?? 0;
  const fulfilledLeadCount = activity?.fulfilledLeadCount ?? 0;
  const rewardCount = activity?.rewardCount ?? 0;
  const notificationOptInCount = activity?.notificationOptInCount ?? 0;
  const trackedDemandCents = activity?.trackedDemandCents ?? 0;

  const readinessChecks = [
    profileReady,
    activeInventoryCount > 0,
    productLinkedInventoryCount > 0,
    liveOfferCount > 0,
    deliveryEnabled || pickupEnabled,
  ];
  const readinessScore = Math.round(
    (readinessChecks.filter(Boolean).length / readinessChecks.length) * 100,
  );

  let readinessLabel = "Needs setup";
  if (readinessScore >= 80) {
    readinessLabel = "Ready to scale";
  } else if (readinessScore >= 60) {
    readinessLabel = "Operational with gaps";
  }

  const checks: CommerceActivationRailCheck[] = [
    {
      id: "profile",
      title: "Store profile",
      status: profileReady ? "ready" : "attention",
      detail: profileReady
        ? "Profile, location, and notification rail are configured."
        : `Missing ${profileMissing.join(", ")}.`,
    },
    {
      id: "catalog",
      title: "Inventory coverage",
      status: activeInventoryCount > 0 ? "ready" : "attention",
      detail:
        activeInventoryCount > 0
          ? `${pluralize(activeInventoryCount, "active route")} available for local buying.`
          : "No active inventory routes yet.",
    },
    {
      id: "linked-catalog",
      title: "Product linkage",
      status:
        productLinkedInventoryCount > 0
          ? "ready"
          : activeInventoryCount > 0
            ? "watch"
            : "attention",
      detail:
        productLinkedInventoryCount > 0
          ? `${pluralize(productLinkedInventoryCount, "linked route")} connected to canonical products.`
          : activeInventoryCount > 0
            ? "Inventory exists, but nothing is linked back to canonical products yet."
            : "Linkage will appear once inventory is created.",
    },
    {
      id: "offers",
      title: "Offer surface",
      status: liveOfferCount > 0 ? "ready" : "attention",
      detail:
        liveOfferCount > 0
          ? `${pluralize(liveOfferCount, "live offer")} currently surfaced to shoppers.`
          : "No live offers are active for this store.",
    },
    {
      id: "fulfillment",
      title: "Fulfillment rail",
      status: deliveryEnabled || pickupEnabled ? "ready" : "attention",
      detail:
        deliveryEnabled || pickupEnabled
          ? `${deliveryEnabled ? "Delivery" : "Pickup"} is enabled for this store.`
          : "Delivery and pickup are both turned off.",
    },
    {
      id: "demand",
      title: "Demand signal",
      status: leadCount > 0 || rewardCount > 0 || notificationOptInCount > 0 ? "ready" : "watch",
      detail:
        leadCount > 0 || rewardCount > 0 || notificationOptInCount > 0
          ? `${pluralize(leadCount, "lead")}, ${pluralize(openLeadCount, "open request")}, ${pluralize(
              fulfilledLeadCount,
              "fulfillment",
            )}, and ${pluralize(rewardCount, "reward entry")} tracked.`
          : trackedDemandCents > 0
            ? "Demand value is present, but engagement counts are still sparse."
            : "No meaningful shopper activity has been recorded yet.",
    },
    {
      id: "low-stock",
      title: "Low-stock watch",
      status: lowStockCount > 0 ? "watch" : "ready",
      detail:
        lowStockCount > 0
          ? `${pluralize(lowStockCount, "item")} need stock attention.`
          : "No low-stock routes are currently flagged.",
    },
  ];

  const actionIds = Array.from(
    new Set(
      checks
        .filter((check) => check.status !== "ready")
        .map((check) => check.id),
    ),
  );

  return {
    businessLabel,
    readinessScore,
    readinessLabel,
    checks,
    actionIds,
  };
}
