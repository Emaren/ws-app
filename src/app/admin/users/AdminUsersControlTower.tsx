"use client";

import { useEffect, useDeferredValue, useState } from "react";

type AdminUsersPayload = {
  generatedAt: string;
  totals: {
    localUsers: number;
    usersInView: number;
    anonymousEventsTracked: number;
    memberEventsTracked: number;
    registrationAttempts: number;
    registrationFailures: number;
    wsApiUsers: number;
    wsApiOnlyUsers: number;
    linkedWallets: number;
  };
  preferenceCatalog: {
    trackedTokens: string[];
  };
  users: Array<{
    id: string;
    email: string;
    name: string;
    role: string;
    registeredVia: string;
    registeredAt: string;
    lastAuthProvider: string | null;
    lastAuthAt: string | null;
    createdAt: string;
    experience: {
      profileImageUrl: string | null;
      theme: string;
      skin: string;
      siteVersion: string;
      personalDigestEnabled: boolean;
      digestCadenceHours: number;
      lastDigestAt: string | null;
      lastSeenAt: string | null;
      lastSeenPath: string | null;
      history: Array<{
        id: string;
        preferenceKey: string;
        previousValue: string | null;
        nextValue: string;
        sourceContext: string | null;
        createdAt: string;
      }>;
    };
    wallet: {
      walletAddress: string;
      chainType: string;
      linkedAt: string;
      lastVerifiedAt: string;
    } | null;
    balances: Record<string, number>;
    subscription: {
      plan: string;
      status: string;
      currentPeriodEnd: string | null;
    } | null;
    statusFlags: {
      isContributor: boolean;
      ownsBusinesses: boolean;
      hasWalletLinked: boolean;
      hasPremium: boolean;
    };
    counts: {
      articles: number;
      comments: number;
      reactions: number;
      analyticsEvents: number;
      rewardEntries: number;
      savedProducts: number;
      savedOffers: number;
      deliveryLeads: number;
      businessesOwned: number;
      offerInbox: number;
    };
    analyticsSummary: Record<string, number>;
    reactionSummary: {
      byType: Record<string, number>;
      byScope: Record<string, number>;
    };
    authoredArticles: Array<{
      id: string;
      slug: string;
      title: string;
      status: string;
      publishedAt: string | null;
    }>;
    recentComments: Array<{
      id: string;
      body: string;
      createdAt: string;
      article: {
        slug: string;
        title: string;
      };
    }>;
    savedProducts: Array<{
      id: string;
      createdAt: string;
      product: {
        id: string;
        slug: string;
        name: string;
        category: string | null;
        summary: string | null;
      };
    }>;
    savedOffers: Array<{
      id: string;
      createdAt: string;
      offer: {
        id: string;
        title: string;
        badgeText: string | null;
        discountPriceCents: number | null;
        business: {
          slug: string;
          name: string;
        };
        product: {
          slug: string;
          name: string;
        } | null;
      };
    }>;
    recentReactions: Array<{
      id: string;
      type: string;
      scope: string;
      productSlug: string | null;
      createdAt: string;
      article: {
        slug: string;
        title: string;
      };
    }>;
    recentAnalytics: Array<{
      id: string;
      eventType: string;
      path: string | null;
      destinationUrl: string | null;
      createdAt: string;
      article: {
        slug: string;
        title: string;
      } | null;
      business: {
        slug: string;
        name: string;
      } | null;
      offer: {
        id: string;
        title: string;
      } | null;
    }>;
    recentRewards: Array<{
      id: string;
      token: string;
      direction: string;
      amount: number;
      reason: string;
      createdAt: string;
      business: {
        slug: string;
        name: string;
      } | null;
    }>;
    recentDeliveryLeads: Array<{
      id: string;
      status: string;
      source: string;
      totalCents: number | null;
      requestedAt: string;
      updatedAt: string;
      business: {
        slug: string;
        name: string;
      };
      offer: {
        title: string;
      } | null;
      inventoryItem: {
        name: string;
      } | null;
    }>;
    authHistory: {
      registrations: Array<{
        id: string;
        userId: string | null;
        email: string | null;
        method: string;
        status: string;
        failureCode: string | null;
        failureMessage: string | null;
        createdAt: string;
      }>;
      funnel: Array<{
        id: string;
        stage: string;
        method: string | null;
        sourceContext: string | null;
        createdAt: string;
      }>;
    };
    businessesOwned: Array<{
      id: string;
      slug: string;
      name: string;
      status: string;
      createdAt: string;
    }>;
    offerInbox: {
      counts: Record<string, number>;
      recent: Array<{
        id: string;
        status: string;
        assignedAt: string;
        expiresAt: string | null;
        offer: {
          id: string;
          title: string;
        };
        business: {
          slug: string;
          name: string;
        };
      }>;
    };
  }>;
  wsApiOnlyUsers: Array<{
    id: string;
    email: string;
    name: string;
    role: string;
  }>;
  recentRegistrationAttempts: Array<{
    id: string;
    userId: string | null;
    email: string | null;
    method: string;
    status: string;
    failureCode: string | null;
    failureMessage: string | null;
    createdAt: string;
  }>;
  recentRegistrationFailures: Array<{
    id: string;
    userId: string | null;
    email: string | null;
    method: string;
    status: string;
    failureCode: string | null;
    failureMessage: string | null;
    createdAt: string;
  }>;
  recentMemberActivity: Array<{
    id: string;
    eventType: string;
    path: string | null;
    createdAt: string;
    user: {
      id: string;
      name: string;
      email: string;
    } | null;
  }>;
  anonymousActivity: Array<{
    id: string;
    eventType: string;
    path: string | null;
    createdAt: string;
    sessionId: string | null;
    ipHash: string | null;
    referrerUrl: string | null;
    article: {
      slug: string;
      title: string;
    } | null;
    business: {
      slug: string;
      name: string;
    } | null;
    offer: {
      id: string;
      title: string;
    } | null;
  }>;
};

function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return "-";
  }

  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) {
    return "-";
  }

  return parsed.toLocaleString();
}

function formatMoney(cents: number | null | undefined): string {
  if (cents === null || cents === undefined || !Number.isFinite(cents)) {
    return "-";
  }

  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

function formatTokenAmount(value: number): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
  }).format(value);
}

function userInitials(name: string, email: string): string {
  const source = name.trim() || email.trim();
  const tokens = source.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) {
    return "WS";
  }

  return tokens
    .slice(0, 2)
    .map((token) => token[0]?.toUpperCase() ?? "")
    .join("");
}

function shortAddress(value: string | null | undefined): string {
  if (!value) {
    return "-";
  }
  if (value.length <= 20) {
    return value;
  }
  return `${value.slice(0, 10)}...${value.slice(-8)}`;
}

function preferenceLabel(key: string): string {
  if (key === "siteVersion") return "Site version";
  if (key === "profileImageUrl") return "Profile image";
  if (key === "personalDigestEnabled") return "Digest";
  if (key === "digestCadenceHours") return "Digest cadence";
  return key.charAt(0).toUpperCase() + key.slice(1);
}

function roleTone(role: string): string {
  if (role === "OWNER") return "border-amber-400/40 bg-amber-500/10 text-amber-100";
  if (role === "ADMIN") return "border-sky-400/40 bg-sky-500/10 text-sky-100";
  if (role === "EDITOR") return "border-emerald-400/40 bg-emerald-500/10 text-emerald-100";
  if (role === "CONTRIBUTOR") return "border-violet-400/40 bg-violet-500/10 text-violet-100";
  return "border-white/10 bg-white/5 text-white/80";
}

async function requestJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    method: "GET",
    cache: "no-store",
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "message" in payload
        ? String(payload.message)
        : `Request failed (${response.status})`;
    throw new Error(message);
  }

  return payload as T;
}

export default function AdminUsersControlTower() {
  const [payload, setPayload] = useState<AdminUsersPayload | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const deferredQuery = useDeferredValue(query);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await requestJson<AdminUsersPayload>("/api/admin/users/intelligence");
        if (!active) {
          return;
        }
        setPayload(data);
        setSelectedUserId((current) => current ?? data.users[0]?.id ?? null);
      } catch (loadError) {
        if (!active) {
          return;
        }
        setError(loadError instanceof Error ? loadError.message : String(loadError));
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, []);

  const filteredUsers =
    payload?.users.filter((user) => {
      const term = deferredQuery.trim().toLowerCase();
      if (!term) {
        return true;
      }

      return (
        user.name.toLowerCase().includes(term) ||
        user.email.toLowerCase().includes(term) ||
        user.role.toLowerCase().includes(term) ||
        user.experience.skin.toLowerCase().includes(term) ||
        user.experience.siteVersion.toLowerCase().includes(term)
      );
    }) ?? [];

  const selectedUser =
    filteredUsers.find((user) => user.id === selectedUserId) ?? filteredUsers[0] ?? null;

  useEffect(() => {
    if (!selectedUser && filteredUsers.length > 0) {
      setSelectedUserId(filteredUsers[0].id);
    }
  }, [filteredUsers, selectedUser]);

  return (
    <div className="space-y-4">
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
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by name, email, role, skin, or version"
                className="admin-surface mt-2 w-full rounded-xl px-3 py-2 text-sm"
              />
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
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

      <section className="grid gap-4 xl:grid-cols-[340px_minmax(0,1fr)]">
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
                    onClick={() => setSelectedUserId(user.id)}
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

        <div className="min-w-0 space-y-4">
          {selectedUser ? (
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
                            <h3 className="break-words text-2xl font-semibold">
                              {selectedUser.name}
                            </h3>
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

                      <div className="grid gap-2 text-sm sm:grid-cols-2 xl:min-w-[320px] xl:max-w-[360px]">
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
                            {selectedUser.wallet ? shortAddress(selectedUser.wallet.walletAddress) : "Not linked"}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-3 xl:grid-cols-2">
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
                      <article className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-xs uppercase tracking-[0.16em] opacity-65">Identity</p>
                            <h4 className="mt-1 text-lg font-semibold">Account snapshot</h4>
                          </div>
                        </div>
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
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-xs uppercase tracking-[0.16em] opacity-65">Token rail</p>
                            <h4 className="mt-1 text-lg font-semibold">Wallet and balances</h4>
                          </div>
                        </div>
                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                          {payload?.preferenceCatalog.trackedTokens.map((token) => (
                            <div
                              key={token}
                              className="rounded-xl border border-white/10 px-3 py-3"
                            >
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
                          <p className="mt-1 font-medium break-all">
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
                  </div>

                  <div className="grid gap-4 xl:grid-cols-2">
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
                      </div>
                    </article>
                  </div>
                </div>
              </section>

              <section className="grid gap-4 xl:grid-cols-2">
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

                  <div className="mt-4 space-y-4">
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

                    <div>
                      <p className="text-sm font-medium">Offer inbox</p>
                      <div className="mt-2 grid gap-2 sm:grid-cols-3">
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
                  </div>
                </article>

                <article className="admin-card min-w-0 p-4 md:p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] opacity-65">Behavior</p>
                      <h4 className="mt-1 text-lg font-semibold">Reactions, clicks, and commerce flow</h4>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    {Object.entries(selectedUser.reactionSummary.byType).map(([type, count]) => (
                      <div
                        key={type}
                        className="rounded-xl border border-white/10 px-3 py-3 text-sm"
                      >
                        <p className="text-xs uppercase tracking-[0.16em] opacity-65">{type}</p>
                        <p className="mt-1 text-lg font-semibold">{count}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 space-y-2">
                    {selectedUser.recentAnalytics.slice(0, 8).map((event) => (
                      <div
                        key={event.id}
                        className="rounded-xl border border-white/10 px-3 py-3 text-sm"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-medium">{event.eventType.replaceAll("_", " ")}</p>
                          <span className="text-xs opacity-65">
                            {formatDateTime(event.createdAt)}
                          </span>
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
              </section>

              <section className="grid gap-4 xl:grid-cols-2">
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
                        <div
                          key={entry.id}
                          className="rounded-xl border border-white/10 px-3 py-3 text-sm"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <p className="font-medium">
                              {entry.direction === "DEBIT" ? "-" : "+"}
                              {formatTokenAmount(entry.amount)} {entry.token}
                            </p>
                            <span className="text-xs opacity-65">
                              {formatDateTime(entry.createdAt)}
                            </span>
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
                        <div
                          key={lead.id}
                          className="rounded-xl border border-white/10 px-3 py-3 text-sm"
                        >
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

                <article className="admin-card min-w-0 p-4 md:p-5">
                  <p className="text-xs uppercase tracking-[0.16em] opacity-65">Identity events</p>
                  <h4 className="mt-1 text-lg font-semibold">Auth and account trail</h4>
                  <div className="mt-4 space-y-2">
                    {[...selectedUser.authHistory.registrations, ...selectedUser.authHistory.funnel]
                      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
                      .slice(0, 8)
                      .map((event) => (
                        <div
                          key={event.id}
                          className="rounded-xl border border-white/10 px-3 py-3 text-sm"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <p className="font-medium">
                              {"status" in event ? event.status : event.stage}
                            </p>
                            <span className="text-xs opacity-65">
                              {formatDateTime(event.createdAt)}
                            </span>
                          </div>
                          <p className="mt-1 opacity-75">
                            {"method" in event && event.method ? event.method : "Unknown method"}
                          </p>
                        </div>
                      ))}
                  </div>
                </article>
              </section>
            </>
          ) : (
            <div className="admin-card px-4 py-10 text-center text-sm opacity-75">
              Select a user to open the full profile intelligence view.
            </div>
          )}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <article className="admin-card min-w-0 p-4 md:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] opacity-65">Signup attempts</p>
              <h4 className="mt-1 text-lg font-semibold">Recent registration history</h4>
            </div>
            <span className="text-xs opacity-70">
              {payload?.totals.registrationAttempts ?? 0} attempts ·{" "}
              {payload?.totals.registrationFailures ?? 0} failures
            </span>
          </div>
          <div className="mt-4 space-y-2">
            {payload?.recentRegistrationAttempts.length ? (
              payload.recentRegistrationAttempts.map((event) => (
                <div
                  key={event.id}
                  className={`rounded-xl border px-3 py-3 text-sm ${
                    event.status === "FAILURE"
                      ? "border-rose-500/25 bg-rose-500/10"
                      : "border-emerald-500/20 bg-emerald-500/5"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium">
                      {event.email || "Unknown email"} · {event.method}
                    </p>
                    <span className="text-xs opacity-65">{formatDateTime(event.createdAt)}</span>
                  </div>
                  <p className="mt-1 opacity-75">
                    {event.status}
                    {event.failureCode ? ` · ${event.failureCode}` : ""}
                    {event.failureMessage ? ` · ${event.failureMessage}` : ""}
                  </p>
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-white/10 px-3 py-4 text-sm opacity-75">
                No registration attempts are in view yet.
              </div>
            )}
          </div>
        </article>

        <article className="admin-card min-w-0 p-4 md:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] opacity-65">Member activity</p>
              <h4 className="mt-1 text-lg font-semibold">Signed-in event feed</h4>
            </div>
            <span className="text-xs opacity-70">
              {payload?.recentMemberActivity.length ?? 0} recent events
            </span>
          </div>
          <div className="mt-4 space-y-2">
            {payload?.recentMemberActivity.map((event) => (
              <div
                key={event.id}
                className="rounded-xl border border-white/10 px-3 py-3 text-sm"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">
                    {event.user?.name || event.user?.email || "Member"} ·{" "}
                    {event.eventType.replaceAll("_", " ")}
                  </p>
                  <span className="text-xs opacity-65">{formatDateTime(event.createdAt)}</span>
                </div>
                <p className="mt-1 opacity-75">{event.path || "No path recorded"}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="admin-card min-w-0 p-4 md:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] opacity-65">Visitor stream</p>
              <h4 className="mt-1 text-lg font-semibold">Anonymous and unregistered behavior</h4>
            </div>
            <span className="text-xs opacity-70">
              {payload?.anonymousActivity.length ?? 0} recent events
            </span>
          </div>
          <div className="mt-4 space-y-2">
            {payload?.anonymousActivity.map((event) => (
              <div
                key={event.id}
                className="rounded-xl border border-white/10 px-3 py-3 text-sm"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">{event.eventType.replaceAll("_", " ")}</p>
                  <span className="text-xs opacity-65">{formatDateTime(event.createdAt)}</span>
                </div>
                <p className="mt-1 opacity-75">{event.path || "No path recorded"}</p>
                <div className="mt-2 flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.14em] opacity-60">
                  {event.sessionId ? <span>session {event.sessionId.slice(0, 8)}</span> : null}
                  {event.ipHash ? <span>ip {event.ipHash.slice(0, 8)}</span> : null}
                  {event.article?.title ? <span>{event.article.title}</span> : null}
                  {event.business?.name ? <span>{event.business.name}</span> : null}
                  {event.offer?.title ? <span>{event.offer.title}</span> : null}
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}
