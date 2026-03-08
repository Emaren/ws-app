export function describeRewardReason(reason: string | null | undefined): string {
  const normalized = typeof reason === "string" ? reason.trim().toLowerCase() : "";

  switch (normalized) {
    case "delivery_lead_participation":
      return "Requested local delivery";
    case "delivery_checkout_completed":
      return "Completed delivery checkout";
    case "delivery_checkout_contributor":
      return "Contributor checkout credit";
    default:
      if (!normalized) {
        return "Reward activity";
      }
      return normalized
        .split(/[_\s]+/)
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
  }
}

export function describeDeliveryLeadSource(source: string | null | undefined): string {
  const normalized = typeof source === "string" ? source.trim().toLowerCase() : "";

  switch (normalized) {
    case "article_cta":
      return "Article CTA";
    case "local_ad":
      return "Local ad";
    case "inventory_alert":
      return "Inventory alert";
    case "campaign_click":
      return "Campaign click";
    case "affiliate":
      return "Affiliate handoff";
    default:
      if (!normalized) {
        return "Direct request";
      }
      return normalized
        .split(/[_\s]+/)
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
  }
}
