import type { CommerceActivationRailSnapshot } from "@/lib/commerceActivationRail";

export type CommerceStat = {
  label: string;
  value: number;
};

export type CommerceActionLink = {
  href: string;
  label: string;
};

type CommerceNetworkSummary =
  | {
      businessCount: number;
      deliveryReadyCount: number;
      inventoryCount: number;
      productLinkedInventoryCount: number;
      liveOfferCount: number;
      productLinkedOfferCount: number;
    }
  | null
  | undefined;

type CommerceSelectedActivitySummary =
  | {
      leadCount: number;
      openLeadCount: number;
      reservedLeadCount: number;
      fulfilledLeadCount: number;
      notificationOptInCount: number;
      rewardCount: number;
    }
  | null
  | undefined;

export function money(cents: number | null): string {
  if (cents === null || !Number.isFinite(cents)) {
    return "-";
  }
  return `$${(cents / 100).toFixed(2)}`;
}

export function localDate(iso: string | null): string {
  if (!iso) return "-";
  const parsed = new Date(iso);
  if (!Number.isFinite(parsed.getTime())) return "-";
  return parsed.toLocaleString();
}

export function formatTokenAmount(value: number): string {
  return Number(value).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
  });
}

export function buildCommerceNetworkStats(
  networkSummary: CommerceNetworkSummary,
): CommerceStat[] {
  return [
    { label: "Businesses", value: networkSummary?.businessCount ?? 0 },
    { label: "Delivery ready", value: networkSummary?.deliveryReadyCount ?? 0 },
    { label: "Inventory", value: networkSummary?.inventoryCount ?? 0 },
    { label: "Linked inventory", value: networkSummary?.productLinkedInventoryCount ?? 0 },
    { label: "Live offers", value: networkSummary?.liveOfferCount ?? 0 },
    { label: "Linked offers", value: networkSummary?.productLinkedOfferCount ?? 0 },
  ];
}

export function buildCommerceSelectedStoreStats(
  selectedActivitySummary: CommerceSelectedActivitySummary,
): CommerceStat[] {
  return [
    { label: "Delivery leads", value: selectedActivitySummary?.leadCount ?? 0 },
    { label: "Open pipeline", value: selectedActivitySummary?.openLeadCount ?? 0 },
    { label: "Reserved", value: selectedActivitySummary?.reservedLeadCount ?? 0 },
    { label: "Fulfilled", value: selectedActivitySummary?.fulfilledLeadCount ?? 0 },
    { label: "Opt-ins", value: selectedActivitySummary?.notificationOptInCount ?? 0 },
    { label: "Rewards", value: selectedActivitySummary?.rewardCount ?? 0 },
  ];
}

export function buildCommerceActivationActionLinks(
  activationRail: CommerceActivationRailSnapshot,
): CommerceActionLink[] {
  return [
    activationRail.actionIds.includes("profile") || activationRail.actionIds.includes("fulfillment")
      ? { href: "#store-profile", label: "Complete store profile" }
      : null,
    activationRail.actionIds.includes("catalog") ||
    activationRail.actionIds.includes("linked-catalog") ||
    activationRail.actionIds.includes("low-stock")
      ? { href: "#inventory-studio", label: "Open inventory studio" }
      : null,
    activationRail.actionIds.includes("offers")
      ? { href: "#offer-studio", label: "Launch live offer" }
      : null,
    activationRail.actionIds.includes("low-stock")
      ? { href: "#inventory-ledger", label: "Review low stock" }
      : null,
    activationRail.actionIds.includes("demand")
      ? { href: "/admin/rewards", label: "Inspect rewards + demand" }
      : null,
    { href: "/admin/company", label: "Open company dashboards" },
  ].filter(Boolean) as CommerceActionLink[];
}
