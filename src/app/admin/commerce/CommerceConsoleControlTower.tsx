import Link from "next/link";
import type { CommerceActivationRailSnapshot } from "@/lib/commerceActivationRail";
import {
  type CommerceActionLink,
  type CommerceStat,
  formatTokenAmount,
  localDate,
} from "./commerceConsolePresentation";

type CommerceLeaderboardRow = {
  businessId: string;
  businessSlug: string;
  businessName: string;
  deliveryEnabled: boolean;
  activeInventoryCount: number;
  liveOfferCount: number;
  leadCount: number;
  fulfilledLeadCount: number;
  rewardTotals: {
    WHEAT: number;
    STONE: number;
  };
  leadToReserveRate: number;
  leadToFulfillmentRate: number;
};

type CommerceConsoleControlTowerProps = {
  scopeMode: "GLOBAL" | "BUSINESS";
  generatedAt: string | null;
  selectedBusinessId: string;
  businesses: Array<{
    id: string;
    name: string;
  }>;
  loading: boolean;
  onBusinessChange: (businessId: string) => void;
  error: string | null;
  notice: string | null;
  networkStats: CommerceStat[];
  selectedBusinessName: string;
  activityWindowDays: number;
  trackedDemandLabel: string;
  selectedStoreStats: CommerceStat[];
  buyerRewardsLabel: string;
  contributorRewardsLabel: string;
  reserveConversionRate: number;
  fulfillmentConversionRate: number;
  avgLeadValueLabel: string;
  businessPerformance: CommerceLeaderboardRow[];
  activationRail: CommerceActivationRailSnapshot;
  activationActionLinks: CommerceActionLink[];
};

export function CommerceConsoleControlTower({
  scopeMode,
  generatedAt,
  selectedBusinessId,
  businesses,
  loading,
  onBusinessChange,
  error,
  notice,
  networkStats,
  selectedBusinessName,
  activityWindowDays,
  trackedDemandLabel,
  selectedStoreStats,
  buyerRewardsLabel,
  contributorRewardsLabel,
  reserveConversionRate,
  fulfillmentConversionRate,
  avgLeadValueLabel,
  businessPerformance,
  activationRail,
  activationActionLinks,
}: CommerceConsoleControlTowerProps) {
  return (
    <>
      <div className="admin-card p-4 md:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl min-w-0 space-y-3">
            <p className="text-xs uppercase tracking-[0.24em] opacity-70">Commerce Console</p>
            <h2 className="text-2xl font-semibold text-balance md:text-3xl">
              Product-linked local buying, delivery, and offer authoring
            </h2>
            <p className="max-w-2xl text-sm opacity-80 md:text-base">
              This is the local control plane for Wheat &amp; Stone commerce. It turns
              businesses into store profiles, products into inventory, and inventory into
              live offers that show up across product pages and delivery paths.
            </p>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1">
                Scope: {scopeMode === "BUSINESS" ? "Business-scoped" : "Global"}
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                Generated {localDate(generatedAt)}
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                Businesses originate in Company Dashboards
              </span>
            </div>
          </div>

          <div className="grid w-full max-w-sm gap-2 text-sm xl:flex-none">
            <label className="min-w-0 space-y-1">
              <span className="text-xs uppercase tracking-wide opacity-70">Selected business</span>
              <select
                value={selectedBusinessId}
                onChange={(event) => onBusinessChange(event.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2"
                disabled={loading || businesses.length === 0}
              >
                {businesses.length === 0 ? <option value="">No businesses in scope</option> : null}
                {businesses.map((business) => (
                  <option key={business.id} value={business.id}>
                    {business.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Link
                href="/products"
                className="rounded-xl border border-emerald-400/35 bg-emerald-500/10 px-3 py-2 text-center font-medium transition hover:bg-emerald-500/20"
              >
                Open Products
              </Link>
              <Link
                href="/offers"
                className="rounded-xl border border-sky-400/35 bg-sky-500/10 px-3 py-2 text-center font-medium transition hover:bg-sky-500/20"
              >
                Open Offers
              </Link>
            </div>
          </div>
        </div>

        {error ? (
          <div className="mt-4 rounded-xl border border-rose-500/35 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">
            {error}
          </div>
        ) : null}
        {notice ? (
          <div className="mt-4 rounded-xl border border-emerald-400/35 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
            {notice}
          </div>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
        {networkStats.map((stat) => (
          <article key={stat.label} className="admin-card min-w-0 rounded-xl p-4">
            <p className="text-[11px] uppercase tracking-[0.14em] leading-snug text-balance opacity-70">
              {stat.label}
            </p>
            <p className="mt-1 text-2xl font-semibold">{stat.value}</p>
          </article>
        ))}
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(18rem,0.9fr)]">
        <div className="admin-card space-y-4 p-4 md:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[0.16em] opacity-70">
                Selected Store Activity
              </p>
              <h3 className="mt-1 text-xl font-semibold text-balance">
                {selectedBusinessName}
              </h3>
              <p className="mt-1 text-sm opacity-75">
                Last {activityWindowDays} days of delivery conversion and reward movement.
              </p>
            </div>
            <div className="flex max-w-full flex-wrap items-center gap-3 self-start rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm lg:max-w-[12rem] lg:justify-end lg:self-auto">
              <span className="text-xs uppercase tracking-[0.14em] leading-tight opacity-70">
                Tracked demand
              </span>
              <span className="shrink-0 text-lg font-medium text-white">{trackedDemandLabel}</span>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {selectedStoreStats.map((stat) => (
              <div key={stat.label} className="admin-surface min-w-0 rounded-xl p-3">
                <p className="text-[11px] uppercase tracking-[0.14em] leading-snug text-balance opacity-70">
                  {stat.label}
                </p>
                <p className="mt-1 text-xl font-semibold">{stat.value}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/5 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.18em] text-emerald-100/80">
                Buyer rewards
              </p>
              <p className="mt-1 text-lg font-semibold text-emerald-50">{buyerRewardsLabel}</p>
            </div>
            <div className="rounded-xl border border-amber-300/20 bg-amber-400/5 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.18em] text-amber-100/80">
                Contributor rewards
              </p>
              <p className="mt-1 text-lg font-semibold text-amber-50">
                {contributorRewardsLabel}
              </p>
            </div>
          </div>

          <div className="grid gap-3 text-sm opacity-80 sm:grid-cols-2 xl:grid-cols-3">
            <p>
              Reserve conversion <span className="font-medium">{reserveConversionRate}%</span>
            </p>
            <p>
              Fulfillment conversion <span className="font-medium">{fulfillmentConversionRate}%</span>
            </p>
            <p>
              Average request value <span className="font-medium">{avgLeadValueLabel}</span>
            </p>
          </div>
        </div>

        <div className="admin-card space-y-3 p-4 md:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[0.16em] opacity-70">Store Performance</p>
              <h3 className="mt-1 text-lg font-semibold">Network leaderboard</h3>
            </div>
            <span className="text-xs opacity-65">{activityWindowDays}-day activity</span>
          </div>

          {businessPerformance.length === 0 ? (
            <p className="rounded-xl border border-dashed border-white/10 px-3 py-4 text-sm opacity-70">
              No managed businesses in scope yet.
            </p>
          ) : (
            <div className="space-y-2">
              {businessPerformance.slice(0, 6).map((row) => (
                <article key={row.businessId} className="admin-surface rounded-xl px-3 py-3">
                  <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
                    <div className="min-w-0">
                      <p className="font-medium break-words">{row.businessName}</p>
                      <p className="mt-1 text-xs opacity-70">
                        {row.deliveryEnabled ? "Delivery enabled" : "Delivery off"} ·{" "}
                        {row.activeInventoryCount} active items · {row.liveOfferCount} live offers
                      </p>
                    </div>
                    <div className="text-left text-xs opacity-75 sm:text-right">
                      <p>{row.leadCount} leads</p>
                      <p>{row.fulfilledLeadCount} fulfilled</p>
                    </div>
                  </div>
                  <div className="mt-3 grid gap-2 text-xs opacity-80 md:grid-cols-2">
                    <p>
                      Reserve {row.leadToReserveRate}% · Fulfillment {row.leadToFulfillmentRate}%
                    </p>
                    <p className="break-words">
                      $STONE {formatTokenAmount(row.rewardTotals.STONE)} · $WHEAT{" "}
                      {formatTokenAmount(row.rewardTotals.WHEAT)}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="admin-card space-y-4 p-4 md:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.16em] opacity-70">Store Activation Rail</p>
            <h3 className="text-xl font-semibold text-balance">{activationRail.businessLabel}</h3>
            <p className="max-w-3xl text-sm opacity-75">
              Plain-English readiness view for the selected store. This tells you what is
              configured, what is thin, and where to jump next.
            </p>
          </div>

          <div className="rounded-2xl border border-amber-300/25 bg-amber-200/10 px-4 py-3 text-left lg:text-right">
            <p className="text-xs uppercase tracking-[0.18em] text-amber-100/75">
              Surface readiness
            </p>
            <p className="mt-1 text-2xl font-semibold">{activationRail.readinessScore}%</p>
            <p className="text-sm text-amber-50/80">{activationRail.readinessLabel}</p>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 2xl:[grid-template-columns:repeat(auto-fit,minmax(15rem,1fr))]">
          {activationRail.checks.map((check) => {
            const tone =
              check.status === "ready"
                ? "border-emerald-400/25 bg-emerald-500/5"
                : check.status === "attention"
                  ? "border-amber-300/25 bg-amber-300/8"
                  : "border-sky-400/20 bg-sky-500/5";
            const badgeTone =
              check.status === "ready"
                ? "text-emerald-200"
                : check.status === "attention"
                  ? "text-amber-100"
                  : "text-sky-100";

            return (
              <article key={check.id} className={`rounded-xl border px-4 py-3 ${tone}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold break-words">{check.title}</p>
                    <p className="mt-2 text-sm leading-relaxed opacity-80">{check.detail}</p>
                  </div>
                  <span className={`shrink-0 text-[11px] uppercase tracking-[0.18em] ${badgeTone}`}>
                    {check.status}
                  </span>
                </div>
              </article>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-2">
          {activationActionLinks.map((action) =>
            action.href.startsWith("#") ? (
              <a
                key={`${action.href}:${action.label}`}
                href={action.href}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm transition hover:bg-white/10"
              >
                {action.label}
              </a>
            ) : (
              <Link
                key={`${action.href}:${action.label}`}
                href={action.href}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm transition hover:bg-white/10"
              >
                {action.label}
              </Link>
            ),
          )}
        </div>
      </div>
    </>
  );
}
