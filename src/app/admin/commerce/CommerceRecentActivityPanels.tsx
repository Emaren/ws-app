import Link from "next/link";
import { describeDeliveryLeadSource, describeRewardReason } from "@/lib/rewardPresentation";
import {
  formatTokenAmount,
  localDate,
  money,
} from "./commerceConsolePresentation";
import type { OverviewResponse } from "./commerceConsoleTypes";

type CommerceRecentActivityPanelsProps = {
  selectedBusinessName: string | null;
  recentLeads: OverviewResponse["recentLeads"];
  recentRewards: OverviewResponse["recentRewards"];
};

function leadStatusClassName(status: string): string {
  switch (status) {
    case "FULFILLED":
      return "border-emerald-500/35 bg-emerald-500/10 text-emerald-100";
    case "RESERVED":
      return "border-sky-500/35 bg-sky-500/10 text-sky-100";
    case "CONTACTED":
      return "border-amber-500/35 bg-amber-500/10 text-amber-100";
    case "CANCELLED":
    case "EXPIRED":
      return "border-rose-500/35 bg-rose-500/10 text-rose-100";
    default:
      return "border-white/10 bg-white/5 text-white/80";
  }
}

export function CommerceRecentActivityPanels({
  selectedBusinessName,
  recentLeads,
  recentRewards,
}: CommerceRecentActivityPanelsProps) {
  return (
    <div className="grid items-start gap-4 xl:grid-cols-2">
      <div className="admin-card space-y-3 p-4 md:p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] opacity-70">Recent Leads</p>
            <h3 className="mt-1 text-lg font-semibold">Delivery pipeline</h3>
          </div>
          <span className="text-xs opacity-65">{selectedBusinessName || "Selected business"}</span>
        </div>

        {recentLeads.length === 0 ? (
          <p className="rounded-xl border border-dashed border-white/10 px-3 py-4 text-sm opacity-70">
            No delivery lead activity yet for this store.
          </p>
        ) : (
          <div className="space-y-2">
            {recentLeads.map((lead) => (
              <article key={lead.id} className="admin-surface rounded-xl px-3 py-3">
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <p className="font-medium break-words">
                      {lead.inventoryItemName || lead.offerTitle || "Delivery request"}
                    </p>
                    <p className="mt-1 text-sm opacity-75 break-words">
                      {lead.recipientName ||
                        lead.recipientEmail ||
                        lead.recipientPhone ||
                        "Unknown contact"}
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
                  <span>{money(lead.totalCents)}</span>
                  <span>{localDate(lead.updatedAt)}</span>
                </div>

                <p className="mt-2 text-xs opacity-60 break-words">
                  {lead.deliveryAddress || "Delivery address not supplied"}
                </p>
              </article>
            ))}
          </div>
        )}
      </div>

      <div className="admin-card space-y-3 p-4 md:p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] opacity-70">Recent Rewards</p>
            <h3 className="mt-1 text-lg font-semibold">Token movement</h3>
          </div>
          <Link
            href="/admin/rewards"
            className="text-xs font-medium opacity-75 transition hover:opacity-100"
          >
            Open rewards ops
          </Link>
        </div>

        {recentRewards.length === 0 ? (
          <p className="rounded-xl border border-dashed border-white/10 px-3 py-4 text-sm opacity-70">
            No reward entries yet for this store.
          </p>
        ) : (
          <div className="space-y-2">
            {recentRewards.map((reward) => {
              const signedAmount =
                reward.direction === "DEBIT" ? -reward.amount : reward.amount;

              return (
                <article key={reward.id} className="admin-surface rounded-xl px-3 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium break-words">
                        {describeRewardReason(reward.reason)}
                      </p>
                      <p className="mt-1 text-sm opacity-75 break-words">
                        {reward.userName || reward.userEmail || "Unknown user"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">
                        {signedAmount >= 0 ? "+" : ""}
                        {formatTokenAmount(signedAmount)} {reward.token}
                      </p>
                      <p className="mt-1 text-xs opacity-70">{localDate(reward.createdAt)}</p>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
