"use client";

import type { AdminUserRecord } from "./adminUsersControlTowerSupport";
import {
  buildAuthTrailEntries,
  formatDateTime,
  formatMoney,
  formatTokenAmount,
  preferenceLabel,
  roleTone,
  shortAddress,
  userInitials,
} from "./adminUsersControlTowerSupport";

type AdminUsersSelectedProfilePanelsProps = {
  selectedUser: AdminUserRecord | null;
  trackedTokens: string[];
};

export function AdminUsersSelectedProfilePanels({
  selectedUser,
  trackedTokens,
}: AdminUsersSelectedProfilePanelsProps) {
  if (!selectedUser) {
    return (
      <div className="admin-card px-4 py-10 text-center text-sm opacity-75">
        Select a user to open the full profile intelligence view.
      </div>
    );
  }

  const authTrail = buildAuthTrailEntries(selectedUser);

  return (
    <>
      <section className="admin-card overflow-hidden p-4 md:p-6">
        <div className="min-w-0 space-y-5">
          <div className="min-w-0 space-y-4">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div className="flex min-w-0 items-start gap-4">
                {selectedUser.experience.profileImageUrl ? (
                  <img
                    src={selectedUser.experience.profileImageUrl}
                    alt={selectedUser.name}
                    className="h-20 w-20 rounded-3xl border border-white/10 object-cover"
                  />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-3xl border border-white/10 bg-white/[0.04] text-xl font-semibold">
                    {userInitials(selectedUser.name, selectedUser.email)}
                  </div>
                )}

                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="break-words text-2xl font-semibold">{selectedUser.name}</h3>
                    <span
                      className={`rounded-full border px-2.5 py-1 text-xs font-medium ${roleTone(selectedUser.role)}`}
                    >
                      {selectedUser.role}
                    </span>
                    {selectedUser.statusFlags.hasPremium ? (
                      <span className="rounded-full border border-emerald-400/40 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-100">
                        Premium
                      </span>
                    ) : null}
                  </div>
                  <p className="break-all text-sm opacity-75">{selectedUser.email}</p>
                  <div className="flex flex-wrap gap-2 text-xs uppercase tracking-[0.16em] opacity-65">
                    <span>Joined {formatDateTime(selectedUser.registeredAt)}</span>
                    <span>Last seen {formatDateTime(selectedUser.experience.lastSeenAt)}</span>
                    <span>{selectedUser.experience.lastSeenPath || "No last path yet"}</span>
                  </div>
                </div>
              </div>

              <div className="grid gap-2 [grid-template-columns:repeat(auto-fit,minmax(160px,1fr))] xl:min-w-[320px] xl:max-w-[420px]">
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.16em] opacity-65">Experience now</p>
                  <p className="mt-1 break-words font-medium">
                    {selectedUser.experience.theme} / {selectedUser.experience.skin} /{" "}
                    {selectedUser.experience.siteVersion}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.16em] opacity-65">Wallet</p>
                  <p className="mt-1 font-medium">
                    {selectedUser.wallet
                      ? shortAddress(selectedUser.wallet.walletAddress)
                      : "Not linked"}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(180px,1fr))]">
              <div className="admin-surface rounded-2xl p-4">
                <p className="text-xs uppercase tracking-[0.16em] opacity-65">Last login</p>
                <p className="mt-2 text-lg font-semibold">{formatDateTime(selectedUser.lastAuthAt)}</p>
                <p className="mt-1 text-xs opacity-70">
                  {selectedUser.lastAuthProvider || "Unknown provider"}
                </p>
              </div>
              <div className="admin-surface rounded-2xl p-4">
                <p className="text-xs uppercase tracking-[0.16em] opacity-65">Saved catalog</p>
                <p className="mt-2 text-lg font-semibold">
                  {selectedUser.counts.savedProducts} products
                </p>
                <p className="mt-1 text-xs opacity-70">
                  {selectedUser.counts.savedOffers} saved offers
                </p>
              </div>
              <div className="admin-surface rounded-2xl p-4">
                <p className="text-xs uppercase tracking-[0.16em] opacity-65">Activity load</p>
                <p className="mt-2 text-lg font-semibold">
                  {selectedUser.counts.analyticsEvents} tracked events
                </p>
                <p className="mt-1 text-xs opacity-70">
                  {selectedUser.counts.deliveryLeads} delivery leads
                </p>
              </div>
              <div className="admin-surface rounded-2xl p-4">
                <p className="text-xs uppercase tracking-[0.16em] opacity-65">Contributor state</p>
                <p className="mt-2 text-lg font-semibold">
                  {selectedUser.statusFlags.isContributor ? "Contributor-ready" : "Reader-only"}
                </p>
                <p className="mt-1 text-xs opacity-70">
                  {selectedUser.counts.articles} article records
                </p>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <div className="space-y-4">
                <article className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-xs uppercase tracking-[0.16em] opacity-65">Identity</p>
                  <h4 className="mt-1 text-lg font-semibold">Account snapshot</h4>
                  <dl className="mt-4 space-y-3 text-sm">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                      <dt className="opacity-70">Registered via</dt>
                      <dd className="break-words font-medium sm:text-right">
                        {selectedUser.registeredVia}
                      </dd>
                    </div>
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                      <dt className="opacity-70">Current theme</dt>
                      <dd className="break-words font-medium sm:text-right">
                        {selectedUser.experience.theme}
                      </dd>
                    </div>
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                      <dt className="opacity-70">Current skin</dt>
                      <dd className="break-words font-medium sm:text-right">
                        {selectedUser.experience.skin}
                      </dd>
                    </div>
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                      <dt className="opacity-70">Current version</dt>
                      <dd className="break-words font-medium sm:text-right">
                        {selectedUser.experience.siteVersion}
                      </dd>
                    </div>
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                      <dt className="opacity-70">Digest mode</dt>
                      <dd className="break-words font-medium sm:text-right">
                        {selectedUser.experience.personalDigestEnabled
                          ? `On · every ${selectedUser.experience.digestCadenceHours}h`
                          : "Paused"}
                      </dd>
                    </div>
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                      <dt className="opacity-70">Subscription</dt>
                      <dd className="break-words font-medium sm:text-right">
                        {selectedUser.subscription
                          ? `${selectedUser.subscription.plan} · ${selectedUser.subscription.status}`
                          : "Free"}
                      </dd>
                    </div>
                  </dl>
                </article>

                <article className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-xs uppercase tracking-[0.16em] opacity-65">Token rail</p>
                  <h4 className="mt-1 text-lg font-semibold">Wallet and balances</h4>
                  <div className="mt-4 grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(130px,1fr))]">
                    {trackedTokens.map((token) => (
                      <div key={token} className="rounded-xl border border-white/10 px-3 py-3">
                        <p className="text-xs uppercase tracking-[0.16em] opacity-65">
                          ${token}
                        </p>
                        <p className="mt-1 text-lg font-semibold">
                          {formatTokenAmount(selectedUser.balances[token] ?? 0)}
                        </p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 rounded-xl border border-white/10 px-3 py-3 text-sm">
                    <p className="opacity-70">Address</p>
                    <p className="mt-1 break-all font-medium">
                      {selectedUser.wallet?.walletAddress || "No linked address"}
                    </p>
                    <p className="mt-2 text-xs opacity-70">
                      {selectedUser.wallet
                        ? `${selectedUser.wallet.chainType} · linked ${formatDateTime(selectedUser.wallet.linkedAt)}`
                        : "Balances still render from reward ledgers even without a linked wallet."}
                    </p>
                  </div>
                </article>
              </div>

              <div className="space-y-4">
                <article className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-xs uppercase tracking-[0.16em] opacity-65">Preference history</p>
                  <h4 className="mt-1 text-lg font-semibold">Theme, skin, version, digest changes</h4>
                  <div className="mt-4 space-y-2">
                    {selectedUser.experience.history.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-white/10 px-3 py-4 text-sm opacity-75">
                        No persisted preference changes yet.
                      </div>
                    ) : (
                      selectedUser.experience.history.map((entry) => (
                        <div
                          key={entry.id}
                          className="rounded-xl border border-white/10 px-3 py-3 text-sm"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <p className="font-medium">{preferenceLabel(entry.preferenceKey)}</p>
                            <span className="text-xs opacity-65">
                              {formatDateTime(entry.createdAt)}
                            </span>
                          </div>
                          <p className="mt-1 opacity-80">
                            {entry.previousValue ? `${entry.previousValue} -> ` : ""}
                            {entry.nextValue}
                          </p>
                          {entry.sourceContext ? (
                            <p className="mt-1 text-xs opacity-65">{entry.sourceContext}</p>
                          ) : null}
                        </div>
                      ))
                    )}
                  </div>
                </article>

                <article className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-xs uppercase tracking-[0.16em] opacity-65">Event mix</p>
                  <h4 className="mt-1 text-lg font-semibold">Interaction totals</h4>
                  <div className="mt-4 grid gap-2">
                    {Object.entries(selectedUser.analyticsSummary).map(([label, value]) => (
                      <div
                        key={label}
                        className="flex items-center justify-between rounded-xl border border-white/10 px-3 py-2 text-sm"
                      >
                        <span className="opacity-75">{label.replaceAll("_", " ")}</span>
                        <span className="font-medium">{value}</span>
                      </div>
                    ))}
                    {Object.keys(selectedUser.analyticsSummary).length === 0 ? (
                      <div className="rounded-xl border border-dashed border-white/10 px-3 py-4 text-sm opacity-75">
                        No analytics totals recorded yet.
                      </div>
                    ) : null}
                  </div>
                </article>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <article className="admin-card min-w-0 p-4 md:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] opacity-65">Saved intent</p>
              <h4 className="mt-1 text-lg font-semibold">Bookmarks and offer box</h4>
            </div>
            <span className="text-xs opacity-70">
              {selectedUser.counts.savedProducts} products · {selectedUser.counts.savedOffers} offers
            </span>
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            <div>
              <p className="text-sm font-medium">Saved products</p>
              <div className="mt-2 space-y-2">
                {selectedUser.savedProducts.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-white/10 px-3 py-4 text-sm opacity-75">
                    No saved products yet.
                  </div>
                ) : (
                  selectedUser.savedProducts.map((saved) => (
                    <div
                      key={saved.id}
                      className="rounded-xl border border-white/10 px-3 py-3 text-sm"
                    >
                      <p className="font-medium">{saved.product.name}</p>
                      <p className="mt-1 opacity-75">
                        {saved.product.category || "Organic catalog"} · saved{" "}
                        {formatDateTime(saved.createdAt)}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div>
              <p className="text-sm font-medium">Saved offers</p>
              <div className="mt-2 space-y-2">
                {selectedUser.savedOffers.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-white/10 px-3 py-4 text-sm opacity-75">
                    No saved offers yet.
                  </div>
                ) : (
                  selectedUser.savedOffers.map((saved) => (
                    <div
                      key={saved.id}
                      className="rounded-xl border border-white/10 px-3 py-3 text-sm"
                    >
                      <p className="font-medium">{saved.offer.title}</p>
                      <p className="mt-1 opacity-75">
                        {saved.offer.business.name} · {formatMoney(saved.offer.discountPriceCents)}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="mt-4">
            <p className="text-sm font-medium">Offer inbox</p>
            <div className="mt-2 grid gap-2 [grid-template-columns:repeat(auto-fit,minmax(120px,1fr))]">
              {Object.entries(selectedUser.offerInbox.counts).map(([status, count]) => (
                <div
                  key={status}
                  className="rounded-xl border border-white/10 px-3 py-3 text-sm"
                >
                  <p className="text-xs uppercase tracking-[0.16em] opacity-65">{status}</p>
                  <p className="mt-1 text-lg font-semibold">{count}</p>
                </div>
              ))}
            </div>
          </div>
        </article>

        <article className="admin-card min-w-0 p-4 md:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] opacity-65">Behavior</p>
              <h4 className="mt-1 text-lg font-semibold">Reactions, clicks, and commerce flow</h4>
            </div>
          </div>

          <div className="mt-4 grid gap-2 [grid-template-columns:repeat(auto-fit,minmax(140px,1fr))]">
            {Object.entries(selectedUser.reactionSummary.byType).map(([type, count]) => (
              <div key={type} className="rounded-xl border border-white/10 px-3 py-3 text-sm">
                <p className="text-xs uppercase tracking-[0.16em] opacity-65">{type}</p>
                <p className="mt-1 text-lg font-semibold">{count}</p>
              </div>
            ))}
            {Object.keys(selectedUser.reactionSummary.byType).length === 0 ? (
              <div className="rounded-xl border border-dashed border-white/10 px-3 py-4 text-sm opacity-75">
                No reaction totals yet.
              </div>
            ) : null}
          </div>

          <div className="mt-4 space-y-2">
            {selectedUser.recentAnalytics.slice(0, 8).map((event) => (
              <div key={event.id} className="rounded-xl border border-white/10 px-3 py-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">{event.eventType.replaceAll("_", " ")}</p>
                  <span className="text-xs opacity-65">{formatDateTime(event.createdAt)}</span>
                </div>
                <p className="mt-1 opacity-75">
                  {event.path || event.article?.title || event.offer?.title || "Tracked interaction"}
                </p>
              </div>
            ))}
            {selectedUser.recentAnalytics.length === 0 ? (
              <div className="rounded-xl border border-dashed border-white/10 px-3 py-4 text-sm opacity-75">
                No tracked analytics events yet.
              </div>
            ) : null}
          </div>
        </article>

        <div className="grid gap-4 xl:grid-cols-2">
          <article className="admin-card min-w-0 p-4 md:p-5">
            <p className="text-xs uppercase tracking-[0.16em] opacity-65">Rewards</p>
            <h4 className="mt-1 text-lg font-semibold">Recent token ledger</h4>
            <div className="mt-4 space-y-2">
              {selectedUser.recentRewards.length === 0 ? (
                <div className="rounded-xl border border-dashed border-white/10 px-3 py-4 text-sm opacity-75">
                  No reward entries yet.
                </div>
              ) : (
                selectedUser.recentRewards.map((entry) => (
                  <div key={entry.id} className="rounded-xl border border-white/10 px-3 py-3 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium">
                        {entry.direction === "DEBIT" ? "-" : "+"}
                        {formatTokenAmount(entry.amount)} {entry.token}
                      </p>
                      <span className="text-xs opacity-65">{formatDateTime(entry.createdAt)}</span>
                    </div>
                    <p className="mt-1 opacity-75">{entry.reason}</p>
                  </div>
                ))
              )}
            </div>
          </article>

          <article className="admin-card min-w-0 p-4 md:p-5">
            <p className="text-xs uppercase tracking-[0.16em] opacity-65">Delivery</p>
            <h4 className="mt-1 text-lg font-semibold">Recent commerce actions</h4>
            <div className="mt-4 space-y-2">
              {selectedUser.recentDeliveryLeads.length === 0 ? (
                <div className="rounded-xl border border-dashed border-white/10 px-3 py-4 text-sm opacity-75">
                  No delivery requests yet.
                </div>
              ) : (
                selectedUser.recentDeliveryLeads.map((lead) => (
                  <div key={lead.id} className="rounded-xl border border-white/10 px-3 py-3 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium">
                        {lead.inventoryItem?.name || lead.offer?.title || lead.business.name}
                      </p>
                      <span className="text-xs opacity-65">{lead.status}</span>
                    </div>
                    <p className="mt-1 opacity-75">
                      {lead.business.name} · {formatMoney(lead.totalCents)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </article>
        </div>

        <article className="admin-card min-w-0 p-4 md:p-5">
          <p className="text-xs uppercase tracking-[0.16em] opacity-65">Identity events</p>
          <h4 className="mt-1 text-lg font-semibold">Auth and account trail</h4>
          <div className="mt-4 space-y-2">
            {authTrail.map((event) => (
              <div key={event.id} className="rounded-xl border border-white/10 px-3 py-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">{event.title}</p>
                  <span className="text-xs opacity-65">{formatDateTime(event.createdAt)}</span>
                </div>
                <p className="mt-1 opacity-75">{event.subtitle}</p>
              </div>
            ))}
            {authTrail.length === 0 ? (
              <div className="rounded-xl border border-dashed border-white/10 px-3 py-4 text-sm opacity-75">
                No auth or account trail entries yet.
              </div>
            ) : null}
          </div>
        </article>
      </section>
    </>
  );
}
