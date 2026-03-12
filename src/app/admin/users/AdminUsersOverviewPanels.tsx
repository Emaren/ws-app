"use client";

import type { AdminUserRecord, AdminUsersPayload } from "./adminUsersControlTowerSupport";
import {
  formatDateTime,
  roleTone,
  userInitials,
} from "./adminUsersControlTowerSupport";

type AdminUsersOverviewPanelsProps = {
  payload: AdminUsersPayload | null;
  loading: boolean;
  error: string | null;
  query: string;
  onQueryChange: (value: string) => void;
};

type AdminUsersRosterPanelProps = {
  loading: boolean;
  filteredUsers: AdminUserRecord[];
  selectedUser: AdminUserRecord | null;
  onSelectUser: (userId: string) => void;
};

export function AdminUsersOverviewPanels({
  payload,
  loading,
  error,
  query,
  onQueryChange,
}: AdminUsersOverviewPanelsProps) {
  return (
    <section className="admin-card overflow-hidden p-4 md:p-6">
      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-3">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] opacity-65">Users Atlas</p>
            <h2 className="mt-1 text-2xl font-semibold md:text-3xl">
              Deep account intelligence and visitor behavior
            </h2>
            <p className="mt-2 max-w-3xl text-sm opacity-80 md:text-base">
              See who has signed up, what they have saved, how they are using the site,
              which experience they have selected, how tokens are accumulating, and how
              anonymous visitors are moving through Wheat & Stone.
            </p>
          </div>

          <label className="block">
            <span className="text-xs uppercase tracking-[0.18em] opacity-65">
              Search users
            </span>
            <input
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="Search by name, email, role, skin, or version"
              className="admin-surface mt-2 w-full rounded-xl px-3 py-2 text-sm"
            />
          </label>
        </div>

        <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(170px,1fr))]">
          <div className="rounded-2xl border border-amber-300/25 bg-gradient-to-br from-amber-500/18 via-amber-500/4 to-transparent p-4">
            <p className="text-xs uppercase tracking-[0.18em] opacity-65">Accounts</p>
            <p className="mt-2 text-3xl font-semibold">
              {loading ? "…" : payload?.totals.localUsers ?? 0}
            </p>
            <p className="mt-1 text-sm opacity-75">
              Signed-up identities tracked locally, newest first in the roster below.
            </p>
          </div>
          <div className="rounded-2xl border border-sky-300/20 bg-gradient-to-br from-sky-500/16 via-sky-500/4 to-transparent p-4">
            <p className="text-xs uppercase tracking-[0.18em] opacity-65">Live behavior</p>
            <p className="mt-2 text-3xl font-semibold">
              {loading
                ? "…"
                : (payload?.totals.memberEventsTracked ?? 0) +
                  (payload?.totals.anonymousEventsTracked ?? 0)}
            </p>
            <p className="mt-1 text-sm opacity-75">
              Recent signed-in and anonymous events available in the activity feeds.
            </p>
          </div>
          <div className="rounded-2xl border border-emerald-300/20 bg-gradient-to-br from-emerald-500/16 via-emerald-500/4 to-transparent p-4">
            <p className="text-xs uppercase tracking-[0.18em] opacity-65">Wallet links</p>
            <p className="mt-2 text-3xl font-semibold">
              {loading ? "…" : payload?.totals.linkedWallets ?? 0}
            </p>
            <p className="mt-1 text-sm opacity-75">
              Token-ready members with an address already linked through ws-api.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <p className="text-xs uppercase tracking-[0.18em] opacity-65">Identity drift</p>
            <p className="mt-2 text-3xl font-semibold">
              {loading ? "…" : payload?.totals.wsApiOnlyUsers ?? 0}
            </p>
            <p className="mt-1 text-sm opacity-75">
              Accounts found in ws-api but not in local Prisma sync.
            </p>
          </div>
        </div>
      </div>

      {error ? (
        <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
          {error}
        </div>
      ) : null}
    </section>
  );
}

export function AdminUsersRosterPanel({
  loading,
  filteredUsers,
  selectedUser,
  onSelectUser,
}: AdminUsersRosterPanelProps) {
  return (
    <div className="admin-card p-3 md:p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] opacity-65">Roster</p>
          <h3 className="mt-1 text-lg font-semibold">Newest users first</h3>
        </div>
        <span className="text-xs opacity-70">{filteredUsers.length} shown</span>
      </div>

      <div className="mt-4 space-y-2">
        {loading ? (
          <div className="rounded-xl border border-white/10 px-4 py-5 text-sm opacity-75">
            Loading user intelligence…
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/10 px-4 py-5 text-sm opacity-75">
            No users matched this filter.
          </div>
        ) : (
          filteredUsers.map((user) => {
            const active = selectedUser?.id === user.id;

            return (
              <button
                key={user.id}
                type="button"
                onClick={() => onSelectUser(user.id)}
                className={`w-full rounded-2xl border px-4 py-4 text-left transition ${
                  active
                    ? "border-amber-400/60 bg-amber-400/10"
                    : "border-white/10 bg-white/[0.03] hover:border-amber-300/35 hover:bg-white/[0.05]"
                }`}
              >
                <div className="flex items-start gap-3">
                  {user.experience.profileImageUrl ? (
                    <img
                      src={user.experience.profileImageUrl}
                      alt={user.name}
                      className="h-12 w-12 rounded-2xl border border-white/10 object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-black/10 text-sm font-semibold">
                      {userInitials(user.name, user.email)}
                    </div>
                  )}

                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-medium">{user.name}</p>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${roleTone(user.role)}`}
                      >
                        {user.role}
                      </span>
                    </div>
                    <p className="truncate text-sm opacity-75">{user.email}</p>
                    <div className="flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.14em] opacity-65">
                      <span>{user.experience.theme}</span>
                      <span>{user.experience.skin}</span>
                      <span>{user.experience.siteVersion}</span>
                      {user.statusFlags.hasPremium ? <span>premium</span> : null}
                    </div>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 text-xs opacity-75">
                  <div className="rounded-xl border border-white/10 px-3 py-2">
                    Last login
                    <p className="mt-1 font-medium text-white/90">
                      {formatDateTime(user.lastAuthAt)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-white/10 px-3 py-2">
                    Saved
                    <p className="mt-1 font-medium text-white/90">
                      {user.counts.savedProducts}p / {user.counts.savedOffers}o
                    </p>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
