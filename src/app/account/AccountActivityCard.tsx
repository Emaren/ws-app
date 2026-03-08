import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { describeDeliveryLeadSource, describeRewardReason } from "@/lib/rewardPresentation";

const WINDOW_DAYS = 30;
const RECENT_LEAD_LIMIT = 6;
const RECENT_REWARD_LIMIT = 8;

type TokenTotals = {
  WHEAT: number;
  STONE: number;
};

function createEmptyTokenTotals(): TokenTotals {
  return {
    WHEAT: 0,
    STONE: 0,
  };
}

function addRewardAmount(
  totals: TokenTotals,
  token: "WHEAT" | "STONE",
  amount: number,
  direction: "CREDIT" | "DEBIT",
) {
  const signedAmount = direction === "DEBIT" ? -amount : amount;
  totals[token] += signedAmount;
}

function formatTokenAmount(value: number): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
  }).format(value);
}

function formatMoney(cents: number | null): string {
  if (cents === null || !Number.isFinite(cents)) {
    return "-";
  }

  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

function formatDateTime(value: Date | string | null): string {
  if (!value) {
    return "-";
  }

  const parsed = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(parsed.getTime())) {
    return "-";
  }

  return parsed.toLocaleString();
}

function leadStatusClassName(status: string): string {
  switch (status) {
    case "FULFILLED":
      return "border-emerald-500/35 bg-emerald-500/10 text-emerald-200";
    case "RESERVED":
      return "border-sky-500/35 bg-sky-500/10 text-sky-200";
    case "CONTACTED":
      return "border-amber-500/35 bg-amber-500/10 text-amber-200";
    case "CANCELLED":
    case "EXPIRED":
      return "border-rose-500/35 bg-rose-500/10 text-rose-200";
    default:
      return "border-white/10 bg-white/5 text-white/80";
  }
}

export default async function AccountActivityCard({
  userId,
}: {
  userId: string;
}) {
  const windowStartsAt = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const [activityLeads, recentLeads, activityRewards, recentRewards] = await Promise.all([
    prisma.deliveryLead.findMany({
      where: {
        userId,
        requestedAt: {
          gte: windowStartsAt,
        },
      },
      select: {
        status: true,
        totalCents: true,
      },
    }),
    prisma.deliveryLead.findMany({
      where: {
        userId,
      },
      orderBy: [{ updatedAt: "desc" }, { requestedAt: "desc" }],
      take: RECENT_LEAD_LIMIT,
      select: {
        id: true,
        status: true,
        source: true,
        requestedQty: true,
        totalCents: true,
        requestedAt: true,
        updatedAt: true,
        business: {
          select: {
            name: true,
          },
        },
        inventoryItem: {
          select: {
            name: true,
          },
        },
        offer: {
          select: {
            title: true,
          },
        },
      },
    }),
    prisma.rewardLedger.findMany({
      where: {
        userId,
        createdAt: {
          gte: windowStartsAt,
        },
      },
      select: {
        token: true,
        direction: true,
        amount: true,
      },
    }),
    prisma.rewardLedger.findMany({
      where: {
        userId,
      },
      orderBy: [{ createdAt: "desc" }],
      take: RECENT_REWARD_LIMIT,
      select: {
        id: true,
        token: true,
        direction: true,
        amount: true,
        reason: true,
        createdAt: true,
        business: {
          select: {
            name: true,
          },
        },
      },
    }),
  ]);

  const rewardTotals = createEmptyTokenTotals();
  for (const reward of activityRewards) {
    addRewardAmount(
      rewardTotals,
      reward.token,
      Number(reward.amount.toString()),
      reward.direction,
    );
  }

  const leadCount = activityLeads.length;
  const activeLeadCount = activityLeads.filter((lead) =>
    lead.status === "NEW" || lead.status === "CONTACTED" || lead.status === "RESERVED",
  ).length;
  const reservedLeadCount = activityLeads.filter((lead) => lead.status === "RESERVED").length;
  const fulfilledLeadCount = activityLeads.filter((lead) => lead.status === "FULFILLED").length;
  const trackedDemandCents = activityLeads.reduce(
    (sum, lead) => sum + (lead.totalCents ?? 0),
    0,
  );

  return (
    <section className="rounded-xl border border-black/10 bg-black/[0.02] p-4 dark:border-white/15 dark:bg-white/[0.03] md:p-5">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] opacity-70">Activity</p>
          <h2 className="mt-1 text-base font-semibold md:text-lg">Delivery and rewards</h2>
          <p className="mt-1 text-sm opacity-75">
            Your last {WINDOW_DAYS} days of local buying activity and token earnings.
          </p>
        </div>
        <div className="text-sm opacity-70">
          Tracked demand: <span className="font-medium text-inherit">{formatMoney(trackedDemandCents)}</span>
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-lg border border-black/10 px-3 py-3 dark:border-white/15">
          <p className="text-xs uppercase tracking-[0.18em] opacity-65">Delivery requests</p>
          <p className="mt-1 text-2xl font-semibold">{leadCount}</p>
        </div>
        <div className="rounded-lg border border-black/10 px-3 py-3 dark:border-white/15">
          <p className="text-xs uppercase tracking-[0.18em] opacity-65">Active delivery flows</p>
          <p className="mt-1 text-2xl font-semibold">{activeLeadCount}</p>
        </div>
        <div className="rounded-lg border border-black/10 px-3 py-3 dark:border-white/15">
          <p className="text-xs uppercase tracking-[0.18em] opacity-65">Reserved / completed</p>
          <p className="mt-1 text-2xl font-semibold">
            {reservedLeadCount} / {fulfilledLeadCount}
          </p>
        </div>
        <div className="rounded-lg border border-black/10 px-3 py-3 dark:border-white/15">
          <p className="text-xs uppercase tracking-[0.18em] opacity-65">30-day token earnings</p>
          <p className="mt-1 text-sm font-medium">
            $STONE {formatTokenAmount(rewardTotals.STONE)} · $WHEAT{" "}
            {formatTokenAmount(rewardTotals.WHEAT)}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold md:text-base">Recent delivery activity</h3>
            <Link
              href="/offers"
              className="text-xs font-medium opacity-75 transition hover:opacity-100"
            >
              Browse offers
            </Link>
          </div>

          {recentLeads.length === 0 ? (
            <div className="rounded-lg border border-dashed border-black/15 px-3 py-4 text-sm opacity-75 dark:border-white/15">
              No delivery requests yet. When you use local buy and delivery actions, they will show up here.
            </div>
          ) : (
            <div className="space-y-2">
              {recentLeads.map((lead) => (
                <article
                  key={lead.id}
                  className="rounded-lg border border-black/10 px-3 py-3 dark:border-white/15"
                >
                  <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-1">
                      <p className="font-medium">
                        {lead.inventoryItem?.name || lead.offer?.title || lead.business.name}
                      </p>
                      <p className="text-sm opacity-75">
                        {lead.business.name}
                        {lead.offer?.title ? ` · ${lead.offer.title}` : ""}
                      </p>
                    </div>
                    <span
                      className={`inline-flex w-fit rounded-full border px-2.5 py-1 text-[11px] font-medium ${leadStatusClassName(lead.status)}`}
                    >
                      {lead.status}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs opacity-70">
                    <span>{describeDeliveryLeadSource(lead.source)}</span>
                    <span>Qty {lead.requestedQty}</span>
                    <span>{formatMoney(lead.totalCents)}</span>
                    <span>Requested {formatDateTime(lead.requestedAt)}</span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold md:text-base">Recent reward activity</h3>

          {recentRewards.length === 0 ? (
            <div className="rounded-lg border border-dashed border-black/15 px-3 py-4 text-sm opacity-75 dark:border-white/15">
              No reward activity yet. Delivery participation and completed checkout rewards will appear here.
            </div>
          ) : (
            <div className="space-y-2">
              {recentRewards.map((reward) => {
                const amount = Number(reward.amount.toString());
                const signedAmount = reward.direction === "DEBIT" ? -amount : amount;

                return (
                  <article
                    key={reward.id}
                    className="rounded-lg border border-black/10 px-3 py-3 dark:border-white/15"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{describeRewardReason(reward.reason)}</p>
                        <p className="mt-1 text-sm opacity-75">
                          {reward.business?.name || "Wheat & Stone"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">
                          {signedAmount >= 0 ? "+" : ""}
                          {formatTokenAmount(signedAmount)} {reward.token}
                        </p>
                        <p className="mt-1 text-xs opacity-70">
                          {formatDateTime(reward.createdAt)}
                        </p>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
