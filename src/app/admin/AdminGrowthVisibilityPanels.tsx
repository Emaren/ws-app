import type { SystemSnapshot } from "./adminDashboardTypes";
import {
  feedBadgeClass,
  formatCurrencyCents,
  formatDateTime,
  formatTokenAmount,
} from "./adminDashboardPresentation";

type AdminGrowthVisibilityPanelsProps = {
  systemSnapshot: SystemSnapshot;
  onNavigate: (href: string) => void;
};

export function AdminGrowthVisibilityPanels({
  systemSnapshot,
  onNavigate,
}: AdminGrowthVisibilityPanelsProps) {
  return (
    <>
      <div className="min-w-0 overflow-hidden rounded-lg border border-white/10 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold">Member Value Radar</p>
            <p className="text-xs opacity-75">
              Rewards, wallets, premium coverage, and the member-side value layer in one place.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onNavigate("/admin/rewards")}
              className="rounded border border-white/20 px-2 py-1 text-[11px] hover:bg-white/10"
            >
              Rewards Ops
            </button>
            <button
              type="button"
              onClick={() => onNavigate("/admin/users")}
              className="rounded border border-white/20 px-2 py-1 text-[11px] hover:bg-white/10"
            >
              Users Tower
            </button>
          </div>
        </div>
        <p className="mt-1 text-xs opacity-80">
          Local net WHEAT{" "}
          <span className="font-semibold">
            {formatTokenAmount(systemSnapshot.memberValue.localRewards.netByToken.WHEAT)}
          </span>{" "}
          · STONE{" "}
          <span className="font-semibold">
            {formatTokenAmount(systemSnapshot.memberValue.localRewards.netByToken.STONE)}
          </span>{" "}
          · Pending remote WHEAT{" "}
          <span className="font-semibold">
            {formatTokenAmount(systemSnapshot.memberValue.remoteRewards.pendingByToken.WHEAT)}
          </span>{" "}
          · STONE{" "}
          <span className="font-semibold">
            {formatTokenAmount(systemSnapshot.memberValue.remoteRewards.pendingByToken.STONE)}
          </span>
        </p>
        <p className="mt-1 text-xs opacity-80">
          Subscriptions tracked {systemSnapshot.memberValue.summary.trackedSubscriptions} · Trialing{" "}
          {systemSnapshot.memberValue.summary.trialingSubscriptions} · Past due{" "}
          {systemSnapshot.memberValue.summary.pastDueSubscriptions} · Remote reward users{" "}
          {systemSnapshot.memberValue.remoteRewards.usersInReport ?? "n/a"}
        </p>
        {systemSnapshot.memberValue.wallets.error ? (
          <p className="mt-1 text-xs text-amber-200">
            Wallet visibility issue: {systemSnapshot.memberValue.wallets.error}
          </p>
        ) : null}
        {systemSnapshot.memberValue.remoteRewards.error ? (
          <p className="mt-1 text-xs text-amber-200">
            Remote rewards visibility issue: {systemSnapshot.memberValue.remoteRewards.error}
          </p>
        ) : null}
        {!systemSnapshot.memberValue.wallets.accessTokenPresent ? (
          <p className="mt-1 text-xs text-sky-200">
            This admin session does not have the ws-api token needed for wallet visibility.
          </p>
        ) : null}
        <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-6">
          <article className="rounded-lg border border-white/10 p-2.5">
            <p className="text-[11px] uppercase tracking-wide opacity-70">Reward Entries</p>
            <p className="mt-1 text-lg font-semibold">
              {systemSnapshot.memberValue.summary.rewardEntriesTotal}
            </p>
          </article>
          <article className="rounded-lg border border-white/10 p-2.5">
            <p className="text-[11px] uppercase tracking-wide opacity-70">Rewarded Users</p>
            <p className="mt-1 text-lg font-semibold">
              {systemSnapshot.memberValue.summary.rewardedUsers}
            </p>
          </article>
          <article className="rounded-lg border border-white/10 p-2.5">
            <p className="text-[11px] uppercase tracking-wide opacity-70">Linked Wallets</p>
            <p className="mt-1 text-lg font-semibold">
              {systemSnapshot.memberValue.summary.linkedWallets ?? "n/a"}
            </p>
          </article>
          <article className="rounded-lg border border-white/10 p-2.5">
            <p className="text-[11px] uppercase tracking-wide opacity-70">Verified 7d</p>
            <p className="mt-1 text-lg font-semibold">
              {systemSnapshot.memberValue.summary.verifiedWallets7d ?? "n/a"}
            </p>
          </article>
          <article className="rounded-lg border border-white/10 p-2.5">
            <p className="text-[11px] uppercase tracking-wide opacity-70">Premium Active</p>
            <p className="mt-1 text-lg font-semibold">
              {systemSnapshot.memberValue.summary.activeSubscriptions}
            </p>
          </article>
          <article className="rounded-lg border border-white/10 p-2.5">
            <p className="text-[11px] uppercase tracking-wide opacity-70">Subscription Drift</p>
            <p className="mt-1 text-lg font-semibold text-amber-200">
              {systemSnapshot.memberValue.summary.subscriptionMismatches}
            </p>
          </article>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div className="min-w-0 rounded-lg border border-white/10 bg-black/20 p-2.5">
            <p className="text-xs font-semibold uppercase tracking-wide opacity-80">Top Members</p>
            <div className="mt-2 space-y-2">
              {systemSnapshot.memberValue.topMembers.map((member) => (
                <article key={member.id} className="rounded border border-white/10 px-2 py-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold break-words">{member.name ?? member.email}</p>
                    <span className={feedBadgeClass(member.walletLinked ? "good" : "warn")}>
                      {member.walletLinked ? "wallet linked" : "wallet missing"}
                    </span>
                  </div>
                  <p className="mt-1 break-words text-xs opacity-80">
                    {member.email} · {member.subscription?.plan ?? "no subscription"} ·{" "}
                    {member.subscription?.status ?? "inactive"}
                  </p>
                  <p className="mt-1 text-[11px] opacity-65">
                    WHEAT {formatTokenAmount(member.localNet.WHEAT)} · STONE{" "}
                    {formatTokenAmount(member.localNet.STONE)}
                  </p>
                </article>
              ))}
              {systemSnapshot.memberValue.topMembers.length === 0 ? (
                <p className="text-xs opacity-70">No member value rows are available yet.</p>
              ) : null}
            </div>
          </div>

          <div className="min-w-0 rounded-lg border border-white/10 bg-black/20 p-2.5">
            <p className="text-xs font-semibold uppercase tracking-wide opacity-80">
              Recent Reward Motion
            </p>
            <div className="mt-2 space-y-2">
              {systemSnapshot.memberValue.localRewards.recentRewards.map((entry) => (
                <article key={entry.id} className="rounded border border-white/10 px-2 py-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold break-words">
                      {entry.email ?? entry.name ?? "Unknown user"}
                    </p>
                    <span className={feedBadgeClass(entry.direction === "DEBIT" ? "warn" : "good")}>
                      {formatTokenAmount(entry.amount)} {entry.token}
                    </span>
                  </div>
                  <p className="mt-1 break-words text-xs opacity-80">{entry.reason}</p>
                  <p className="mt-1 text-[11px] opacity-65">
                    {entry.businessName ?? "Platform reward"} · {formatDateTime(entry.createdAt)}
                  </p>
                </article>
              ))}
              {systemSnapshot.memberValue.localRewards.recentRewards.length === 0 ? (
                <p className="text-xs opacity-70">No recent reward entries are available yet.</p>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-white/10 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold">Control Tower Sections</p>
            <p className="text-xs opacity-75">
              Health of the loader slices behind this dashboard, so one weak subsystem is easier to
              spot.
            </p>
          </div>
          <span className="text-xs opacity-70">
            {systemSnapshot.sectionDiagnostics.length} section loaders
          </span>
        </div>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {systemSnapshot.sectionDiagnostics.map((section) => (
            <article key={section.id} className="rounded-lg border border-white/10 bg-black/20 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold">{section.label}</p>
                <span className={feedBadgeClass(section.status)}>
                  {section.status === "good"
                    ? "Healthy"
                    : section.status === "warn"
                      ? "Attention"
                      : "Update"}
                </span>
              </div>
              <p className="mt-2 text-sm opacity-85">{section.summary}</p>
              {section.detail ? <p className="mt-1 text-xs opacity-70">{section.detail}</p> : null}
              <p className="mt-2 text-[11px] opacity-60">Updated {formatDateTime(section.updatedAt)}</p>
            </article>
          ))}
        </div>
      </div>

      <div className="min-w-0 overflow-hidden rounded-lg border border-white/10 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold">Business Performance Radar</p>
            <p className="text-xs opacity-75">
              Coverage, demand, outreach, and reward movement across the business network.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onNavigate("/admin/business")}
              className="rounded border border-white/20 px-2 py-1 text-[11px] hover:bg-white/10"
            >
              Business Console
            </button>
            <button
              type="button"
              onClick={() => onNavigate("/admin/commerce")}
              className="rounded border border-white/20 px-2 py-1 text-[11px] hover:bg-white/10"
            >
              Commerce Console
            </button>
            <button
              type="button"
              onClick={() => onNavigate("/admin/offers")}
              className="rounded border border-white/20 px-2 py-1 text-[11px] hover:bg-white/10"
            >
              Offers Console
            </button>
          </div>
        </div>
        <p className="mt-1 text-xs opacity-80">
          Last {systemSnapshot.businessRadar.windowDays} days ·{" "}
          {systemSnapshot.businessRadar.summary.businessCount} businesses tracked ·{" "}
          {systemSnapshot.businessRadar.summary.businessesNeedingAttention} needing attention · tracked
          demand{" "}
          <span className="font-semibold">
            {formatCurrencyCents(systemSnapshot.businessRadar.summary.trackedDemandCents)}
          </span>
          .
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-6">
          <article className="rounded-lg border border-white/10 p-2.5">
            <p className="text-[11px] uppercase tracking-wide opacity-70">Businesses</p>
            <p className="mt-1 text-lg font-semibold">
              {systemSnapshot.businessRadar.summary.businessCount}
            </p>
          </article>
          <article className="rounded-lg border border-white/10 p-2.5">
            <p className="text-[11px] uppercase tracking-wide opacity-70">Delivery Ready</p>
            <p className="mt-1 text-lg font-semibold">
              {systemSnapshot.businessRadar.summary.deliveryReadyCount}
            </p>
          </article>
          <article className="rounded-lg border border-white/10 p-2.5">
            <p className="text-[11px] uppercase tracking-wide opacity-70">Live Offers</p>
            <p className="mt-1 text-lg font-semibold">
              {systemSnapshot.businessRadar.summary.liveOfferCount}
            </p>
          </article>
          <article className="rounded-lg border border-white/10 p-2.5">
            <p className="text-[11px] uppercase tracking-wide opacity-70">Lead Demand</p>
            <p className="mt-1 text-lg font-semibold">
              {systemSnapshot.businessRadar.summary.leadCount}
            </p>
          </article>
          <article className="rounded-lg border border-white/10 p-2.5">
            <p className="text-[11px] uppercase tracking-wide opacity-70">Notifications Sent</p>
            <p className="mt-1 text-lg font-semibold text-emerald-300">
              {systemSnapshot.businessRadar.summary.notificationSentCount}
            </p>
          </article>
          <article className="rounded-lg border border-white/10 p-2.5">
            <p className="text-[11px] uppercase tracking-wide opacity-70">Attention</p>
            <p className="mt-1 text-lg font-semibold text-amber-200">
              {systemSnapshot.businessRadar.summary.businessesNeedingAttention}
            </p>
          </article>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="rounded-full border border-white/10 px-2.5 py-1 text-xs opacity-85">
            Verified: {systemSnapshot.businessRadar.summary.verifiedCount}
          </span>
          <span className="rounded-full border border-white/10 px-2.5 py-1 text-xs opacity-85">
            Active inventory: {systemSnapshot.businessRadar.summary.activeInventoryCount}
          </span>
          <span className="rounded-full border border-white/10 px-2.5 py-1 text-xs opacity-85">
            Low stock: {systemSnapshot.businessRadar.summary.lowStockCount}
          </span>
          <span className="rounded-full border border-white/10 px-2.5 py-1 text-xs opacity-85">
            Recipients: {systemSnapshot.businessRadar.summary.notificationRecipients}
          </span>
          <span className="rounded-full border border-white/10 px-2.5 py-1 text-xs opacity-85">
            Failed notifications: {systemSnapshot.businessRadar.summary.notificationFailedCount}
          </span>
          <span className="rounded-full border border-white/10 px-2.5 py-1 text-xs opacity-85">
            No live offers: {systemSnapshot.businessRadar.summary.businessesWithoutLiveOffers}
          </span>
          <span className="rounded-full border border-white/10 px-2.5 py-1 text-xs opacity-85">
            No active inventory: {systemSnapshot.businessRadar.summary.businessesWithoutActiveInventory}
          </span>
          <span className="rounded-full border border-white/10 px-2.5 py-1 text-xs opacity-85">
            STONE {formatTokenAmount(systemSnapshot.businessRadar.summary.rewardTotals.STONE)}
          </span>
          <span className="rounded-full border border-white/10 px-2.5 py-1 text-xs opacity-85">
            WHEAT {formatTokenAmount(systemSnapshot.businessRadar.summary.rewardTotals.WHEAT)}
          </span>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div className="min-w-0 rounded-lg border border-white/10 bg-black/20 p-2.5">
            <p className="text-xs font-semibold uppercase tracking-wide opacity-80">Top Businesses</p>
            <div className="mt-2 space-y-2">
              {systemSnapshot.businessRadar.topBusinesses.slice(0, 6).map((business) => (
                <article key={business.businessId} className="rounded border border-white/10 px-2 py-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold break-words">{business.name}</p>
                    <span className={feedBadgeClass(business.needsAttention ? "warn" : "good")}>
                      {business.needsAttention ? "attention" : "healthy"}
                    </span>
                  </div>
                  <p className="mt-1 break-words text-xs opacity-80">
                    {business.deliveryEnabled ? "Delivery on" : "Delivery off"} ·{" "}
                    {business.activeInventoryCount} active inventory · {business.liveOfferCount} live
                    offers · {business.notificationRecipients} recipients
                  </p>
                  <p className="mt-1 text-[11px] opacity-65">
                    Leads {business.leadCount} · fulfillment {business.leadToFulfillmentRate}% · demand{" "}
                    {formatCurrencyCents(business.trackedDemandCents)}
                  </p>
                  <p className="mt-1 text-[11px] opacity-65">
                    Notifications {business.notificationSentCount} sent /{" "}
                    {business.notificationFailedCount} failed · STONE{" "}
                    {formatTokenAmount(business.rewardTotals.STONE)} · WHEAT{" "}
                    {formatTokenAmount(business.rewardTotals.WHEAT)}
                  </p>
                </article>
              ))}
              {systemSnapshot.businessRadar.topBusinesses.length === 0 ? (
                <p className="text-xs opacity-70">No business performance rows are available yet.</p>
              ) : null}
            </div>
          </div>

          <div className="min-w-0 rounded-lg border border-white/10 bg-black/20 p-2.5">
            <p className="text-xs font-semibold uppercase tracking-wide opacity-80">Coverage Watchlist</p>
            <div className="mt-2 space-y-2">
              {systemSnapshot.businessRadar.watchlist.slice(0, 6).map((business) => (
                <article key={business.businessId} className="rounded border border-white/10 px-2 py-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold break-words">{business.name}</p>
                    <span className={feedBadgeClass("warn")}>review</span>
                  </div>
                  <p className="mt-1 break-words text-xs opacity-80">
                    {business.attentionReasons.join(" · ")}
                  </p>
                  <p className="mt-1 text-[11px] opacity-65">
                    Leads {business.openLeadCount} open / {business.fulfilledLeadCount} fulfilled · queued
                    notifications {business.notificationQueuedCount} · avg lead value{" "}
                    {formatCurrencyCents(business.avgLeadValueCents)}
                  </p>
                </article>
              ))}
              {systemSnapshot.businessRadar.watchlist.length === 0 ? (
                <p className="text-xs opacity-70">
                  No businesses are currently showing coverage or delivery warning signals.
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
