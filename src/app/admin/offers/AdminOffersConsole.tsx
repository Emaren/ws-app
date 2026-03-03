"use client";

import { useEffect, useMemo, useState } from "react";

type BusinessRecord = {
  id: string;
  slug: string;
  name: string;
  status: string;
};

type OfferRecord = {
  id: string;
  businessId: string;
  title: string;
  status: string;
  startsAt: string | null;
  endsAt: string | null;
  featured: boolean;
  discountPriceCents: number | null;
  badgeText: string | null;
};

type UserCoverage = {
  id: string;
  email: string;
  name: string;
  role: string;
  offerBadgeCount: number;
  hasOffers: boolean;
  lastAssignedAt: string | null;
};

type CoverageScope = {
  mode: "GLOBAL" | "BUSINESS";
  managedBusinessIds: string[];
};

type CoverageResponse = {
  generatedAt: string;
  scope: CoverageScope;
  businesses: BusinessRecord[];
  offers: OfferRecord[];
  users: UserCoverage[];
  summary: {
    totalUsers: number;
    usersWithOffers: number;
    zeroOfferUsers: number;
    activeBadgeTotal: number;
  };
};

type AssignmentMode = "USERS" | "EMAILS" | "ALL" | "ZERO_OFFER";

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    cache: "no-store",
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers ?? {}),
    },
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      (payload && typeof payload.message === "string" && payload.message) ||
      `Request failed (${response.status})`;
    throw new Error(message);
  }

  return payload as T;
}

function money(cents: number | null): string {
  if (cents === null || !Number.isFinite(cents)) {
    return "-";
  }
  return `$${(cents / 100).toFixed(2)}`;
}

function localDate(iso: string | null): string {
  if (!iso) return "-";
  const parsed = new Date(iso);
  if (!Number.isFinite(parsed.getTime())) return "-";
  return parsed.toLocaleString();
}

export default function AdminOffersConsole() {
  const [coverage, setCoverage] = useState<CoverageResponse | null>(null);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string>("");
  const [selectedOfferId, setSelectedOfferId] = useState<string>("");
  const [mode, setMode] = useState<AssignmentMode>("USERS");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [emailTargetsRaw, setEmailTargetsRaw] = useState("");
  const [newOfferBusinessId, setNewOfferBusinessId] = useState("");
  const [newOfferTitle, setNewOfferTitle] = useState("");
  const [newOfferDescription, setNewOfferDescription] = useState("");
  const [newOfferBadge, setNewOfferBadge] = useState("Fresh Offer");
  const [newOfferPriceCents, setNewOfferPriceCents] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const offers = coverage?.offers ?? [];
  const users = coverage?.users ?? [];

  const offersByBusiness = useMemo(() => {
    if (!selectedBusinessId) return offers;
    return offers.filter((offer) => offer.businessId === selectedBusinessId);
  }, [offers, selectedBusinessId]);

  const zeroOfferUsers = useMemo(
    () => users.filter((user) => user.offerBadgeCount === 0),
    [users],
  );
  const isBusinessScoped = coverage?.scope.mode === "BUSINESS";

  async function loadCoverage(nextBusinessId = selectedBusinessId) {
    setLoading(true);
    setError(null);

    try {
      const query = new URLSearchParams();
      if (nextBusinessId) {
        query.set("businessId", nextBusinessId);
      }
      const suffix = query.toString();
      const data = await requestJson<CoverageResponse>(
        `/api/admin/offers/coverage${suffix ? `?${suffix}` : ""}`,
      );
      setCoverage(data);

      if (data.scope.mode === "BUSINESS" && !nextBusinessId && data.businesses.length > 0) {
        const defaultBusinessId = data.businesses[0]?.id ?? "";
        if (defaultBusinessId && defaultBusinessId !== selectedBusinessId) {
          setSelectedBusinessId(defaultBusinessId);
          await loadCoverage(defaultBusinessId);
          return;
        }
      }

      const nextOffers = !nextBusinessId
        ? data.offers
        : data.offers.filter((offer) => offer.businessId === nextBusinessId);
      if (!selectedOfferId || !nextOffers.some((offer) => offer.id === selectedOfferId)) {
        setSelectedOfferId(nextOffers[0]?.id ?? "");
      }

      const preferredBusinessId =
        nextBusinessId || data.businesses[0]?.id || "";
      setNewOfferBusinessId(preferredBusinessId);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : String(loadError));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadCoverage("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!coverage) {
      return;
    }

    const scopedOffers = !selectedBusinessId
      ? coverage.offers
      : coverage.offers.filter((offer) => offer.businessId === selectedBusinessId);

    if (!scopedOffers.some((offer) => offer.id === selectedOfferId)) {
      setSelectedOfferId(scopedOffers[0]?.id ?? "");
    }
  }, [coverage, selectedBusinessId, selectedOfferId]);

  async function runAssignment(nextMode: AssignmentMode) {
    if (!selectedOfferId) {
      setError("Select an offer first.");
      return;
    }

    const emailTargets = emailTargetsRaw
      .split(/[\n,]/g)
      .map((entry) => entry.trim())
      .filter(Boolean);

    if (nextMode === "USERS" && selectedUserIds.length === 0) {
      setError("Pick at least one user.");
      return;
    }

    if (nextMode === "EMAILS" && emailTargets.length === 0) {
      setError("Add at least one email target.");
      return;
    }

    setError(null);
    setNotice(null);
    setBusyAction(`assign-${nextMode}`);

    try {
      const result = await requestJson<{
        targetCount: number;
        created: number;
        updated: number;
        unmatchedEmails: string[];
      }>("/api/admin/offers/assign", {
        method: "POST",
        body: JSON.stringify({
          offerId: selectedOfferId,
          mode: nextMode,
          userIds: nextMode === "USERS" ? selectedUserIds : [],
          emails: nextMode === "EMAILS" ? emailTargets : [],
        }),
      });

      const unmatched = result.unmatchedEmails.length
        ? ` Unmatched: ${result.unmatchedEmails.join(", ")}.`
        : "";

      setNotice(
        `Assigned to ${result.targetCount} users (${result.created} created, ${result.updated} refreshed).${unmatched}`,
      );

      if (nextMode === "USERS") {
        setSelectedUserIds([]);
      }
      if (nextMode === "EMAILS") {
        setEmailTargetsRaw("");
      }

      await loadCoverage(selectedBusinessId);
    } catch (assignError) {
      setError(assignError instanceof Error ? assignError.message : String(assignError));
    } finally {
      setBusyAction(null);
    }
  }

  async function createOffer() {
    if (!newOfferBusinessId) {
      setError("Select a business for the new offer.");
      return;
    }
    if (!newOfferTitle.trim()) {
      setError("Offer title is required.");
      return;
    }

    setError(null);
    setNotice(null);
    setBusyAction("create-offer");

    try {
      const payload = {
        businessId: newOfferBusinessId,
        title: newOfferTitle.trim(),
        description: newOfferDescription.trim() || null,
        badgeText: newOfferBadge.trim() || null,
        discountPriceCents: newOfferPriceCents.trim()
          ? Number.parseInt(newOfferPriceCents.trim(), 10)
          : null,
        status: "LIVE",
        featured: false,
      };

      const result = await requestJson<{
        offer?: { id: string; title: string };
      }>("/api/admin/offers/create", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setNotice(
        `Created offer "${result.offer?.title ?? newOfferTitle.trim()}" and set it live.`,
      );

      setNewOfferTitle("");
      setNewOfferDescription("");
      setNewOfferPriceCents("");
      setNewOfferBadge("Fresh Offer");

      await loadCoverage(newOfferBusinessId);
      if (result.offer?.id) {
        setSelectedOfferId(result.offer.id);
      }
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : String(createError));
    } finally {
      setBusyAction(null);
    }
  }

  const bulkBusy = Boolean(busyAction);

  return (
    <section className="space-y-4">
      <div className="admin-card p-4 md:p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-xl font-semibold md:text-2xl">Offers Badge Command Center</h2>
            <p className="mt-1 text-sm opacity-75">
              Assign offers by user, email list, or to everyone. Backfill users with zero offers in one click.
            </p>
            {isBusinessScoped ? (
              <p className="mt-1 text-xs text-amber-200/90">
                Business-scoped mode: you can manage offers only for your authorized company dashboard(s).
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <select
              value={selectedBusinessId}
              onChange={(event) => {
                const nextBusinessId = event.target.value;
                setSelectedBusinessId(nextBusinessId);
                void loadCoverage(nextBusinessId);
              }}
              className="admin-surface rounded-xl px-3 py-2 text-sm"
              disabled={loading || (isBusinessScoped && (coverage?.businesses.length ?? 0) <= 1)}
            >
              {isBusinessScoped ? (
                <option value="">My businesses</option>
              ) : (
                <option value="">All businesses</option>
              )}
              {(coverage?.businesses ?? []).map((business) => (
                <option key={business.id} value={business.id}>
                  {business.name}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => void loadCoverage(selectedBusinessId)}
              className="rounded-xl border px-3 py-2 text-sm transition hover:bg-white/5 disabled:opacity-60"
              disabled={loading || bulkBusy}
            >
              {loading ? "Loading..." : "Reload"}
            </button>
          </div>
        </div>

        {error ? (
          <p className="mt-3 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        ) : null}
        {notice ? (
          <p className="mt-3 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
            {notice}
          </p>
        ) : null}
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <article className="admin-card rounded-xl p-4">
          <p className="text-xs uppercase tracking-wide opacity-70">Users</p>
          <p className="mt-1 text-2xl font-semibold">{coverage?.summary.totalUsers ?? 0}</p>
        </article>
        <article className="admin-card rounded-xl p-4">
          <p className="text-xs uppercase tracking-wide opacity-70">Users With Offers</p>
          <p className="mt-1 text-2xl font-semibold">{coverage?.summary.usersWithOffers ?? 0}</p>
        </article>
        <article className="admin-card rounded-xl p-4">
          <p className="text-xs uppercase tracking-wide opacity-70">Users Missing Offers</p>
          <p className="mt-1 text-2xl font-semibold text-red-300">
            {coverage?.summary.zeroOfferUsers ?? 0}
          </p>
        </article>
        <article className="admin-card rounded-xl p-4">
          <p className="text-xs uppercase tracking-wide opacity-70">Total Badge Count</p>
          <p className="mt-1 text-2xl font-semibold">{coverage?.summary.activeBadgeTotal ?? 0}</p>
        </article>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_1fr]">
        <div className="admin-card space-y-4 p-4 md:p-5">
          <div className="space-y-2 rounded-xl border border-white/10 p-3">
            <h3 className="text-base font-semibold">Create Live Offer</h3>
            <p className="text-xs opacity-75">
              Spin up a live offer instantly, then assign it to users.
            </p>

            <label className="space-y-1 text-sm block">
              <span>Business</span>
              <select
                value={newOfferBusinessId}
                onChange={(event) => setNewOfferBusinessId(event.target.value)}
                className="admin-surface w-full rounded-xl px-3 py-2"
                disabled={loading || (isBusinessScoped && (coverage?.businesses.length ?? 0) <= 1)}
              >
                <option value="">Select business</option>
                {(coverage?.businesses ?? []).map((business) => (
                  <option key={business.id} value={business.id}>
                    {business.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1 text-sm block">
              <span>Title</span>
              <input
                value={newOfferTitle}
                onChange={(event) => setNewOfferTitle(event.target.value)}
                className="admin-surface w-full rounded-xl px-3 py-2"
                placeholder="Homesteader Weekend Special"
              />
            </label>

            <div className="grid gap-2 sm:grid-cols-2">
              <label className="space-y-1 text-sm block">
                <span>Badge Text</span>
                <input
                  value={newOfferBadge}
                  onChange={(event) => setNewOfferBadge(event.target.value)}
                  className="admin-surface w-full rounded-xl px-3 py-2"
                />
              </label>
              <label className="space-y-1 text-sm block">
                <span>Price (cents)</span>
                <input
                  value={newOfferPriceCents}
                  onChange={(event) => setNewOfferPriceCents(event.target.value)}
                  className="admin-surface w-full rounded-xl px-3 py-2"
                  placeholder="799"
                />
              </label>
            </div>

            <label className="space-y-1 text-sm block">
              <span>Description</span>
              <textarea
                value={newOfferDescription}
                onChange={(event) => setNewOfferDescription(event.target.value)}
                rows={3}
                className="admin-surface w-full rounded-xl px-3 py-2"
                placeholder="Limited-run local offer."
              />
            </label>

            <button
              type="button"
              onClick={() => void createOffer()}
              disabled={bulkBusy || !newOfferBusinessId || !newOfferTitle.trim()}
              className="w-full rounded-xl border border-emerald-400/40 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-100 transition hover:bg-emerald-500/20 disabled:opacity-60"
            >
              {busyAction === "create-offer" ? "Creating..." : "Create Offer"}
            </button>
          </div>

          <h3 className="text-base font-semibold">Assign Offers</h3>

          <label className="space-y-1 text-sm block">
            <span>Offer</span>
            <select
              value={selectedOfferId}
              onChange={(event) => setSelectedOfferId(event.target.value)}
              className="admin-surface w-full rounded-xl px-3 py-2"
              disabled={offersByBusiness.length === 0}
            >
              {offersByBusiness.length === 0 ? (
                <option value="">No offers available</option>
              ) : null}
              {offersByBusiness.map((offer) => (
                <option key={offer.id} value={offer.id}>
                  {offer.title} · {offer.status} · {money(offer.discountPriceCents)}
                </option>
              ))}
            </select>
          </label>

          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setMode("USERS")}
              className={`rounded-xl border px-3 py-2 text-sm text-left transition ${
                mode === "USERS" ? "border-amber-400/70 bg-amber-300/10" : "hover:bg-white/5"
              }`}
            >
              Specific Users
            </button>
            <button
              type="button"
              onClick={() => setMode("EMAILS")}
              className={`rounded-xl border px-3 py-2 text-sm text-left transition ${
                mode === "EMAILS" ? "border-amber-400/70 bg-amber-300/10" : "hover:bg-white/5"
              }`}
            >
              Email Segment
            </button>
            <button
              type="button"
              onClick={() => setMode("ALL")}
              className={`rounded-xl border px-3 py-2 text-sm text-left transition ${
                mode === "ALL" ? "border-amber-400/70 bg-amber-300/10" : "hover:bg-white/5"
              }`}
            >
              Everyone
            </button>
            <button
              type="button"
              onClick={() => setMode("ZERO_OFFER")}
              className={`rounded-xl border px-3 py-2 text-sm text-left transition ${
                mode === "ZERO_OFFER" ? "border-amber-400/70 bg-amber-300/10" : "hover:bg-white/5"
              }`}
            >
              Backfill Zero-Offer Users
            </button>
          </div>

          {mode === "USERS" ? (
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wide opacity-70">Pick Users</p>
              <div className="max-h-60 overflow-auto rounded-xl border border-white/10 p-2">
                {users.length === 0 ? (
                  <p className="px-2 py-1 text-sm opacity-70">No users available.</p>
                ) : (
                  users.map((user) => {
                    const checked = selectedUserIds.includes(user.id);
                    return (
                      <label
                        key={user.id}
                        className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-white/5"
                      >
                        <span className="truncate">
                          {user.email} <span className="opacity-60">({user.role})</span>
                        </span>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(event) => {
                            setSelectedUserIds((prev) => {
                              if (event.target.checked) {
                                return [...prev, user.id];
                              }
                              return prev.filter((id) => id !== user.id);
                            });
                          }}
                        />
                      </label>
                    );
                  })
                )}
              </div>
            </div>
          ) : null}

          {mode === "EMAILS" ? (
            <label className="space-y-1 text-sm block">
              <span>Email list (comma or newline separated)</span>
              <textarea
                value={emailTargetsRaw}
                onChange={(event) => setEmailTargetsRaw(event.target.value)}
                rows={5}
                className="admin-surface w-full rounded-xl px-3 py-2"
                placeholder="user1@example.com\nuser2@example.com"
              />
            </label>
          ) : null}

          <button
            type="button"
            onClick={() => void runAssignment(mode)}
            disabled={bulkBusy || !selectedOfferId}
            className="w-full rounded-xl border border-amber-300/40 bg-amber-200/20 px-4 py-2 text-sm font-medium transition hover:bg-amber-200/30 disabled:opacity-60"
          >
            {busyAction ? "Assigning..." : "Run Assignment"}
          </button>

          <button
            type="button"
            onClick={() => void runAssignment("ZERO_OFFER")}
            disabled={bulkBusy || !selectedOfferId || zeroOfferUsers.length === 0}
            className="w-full rounded-xl border border-red-400/40 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-200 transition hover:bg-red-500/20 disabled:opacity-60"
          >
            {busyAction === "assign-ZERO_OFFER"
              ? "Backfilling..."
              : `Backfill ${zeroOfferUsers.length} Zero-Offer Users`}
          </button>
        </div>

        <div className="admin-card space-y-3 p-4 md:p-5">
          <h3 className="text-base font-semibold">User Offer Coverage</h3>
          <div className="max-h-[32rem] overflow-auto rounded-xl border border-white/10">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-black/30">
                <tr className="text-left">
                  <th className="px-3 py-2">User</th>
                  <th className="px-3 py-2">Role</th>
                  <th className="px-3 py-2">Badge</th>
                  <th className="px-3 py-2">Last Assigned</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr
                    key={user.id}
                    className={`border-t border-white/10 ${
                      user.offerBadgeCount === 0 ? "bg-red-500/5" : ""
                    }`}
                  >
                    <td className="px-3 py-2">
                      <p className="font-medium leading-tight">{user.email}</p>
                      <p className="text-xs opacity-65">{user.name}</p>
                    </td>
                    <td className="px-3 py-2">{user.role}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex min-w-7 items-center justify-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                          user.offerBadgeCount > 0
                            ? "bg-red-600 text-white"
                            : "bg-white/10 text-white/70"
                        }`}
                      >
                        {user.offerBadgeCount}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs opacity-75">{localDate(user.lastAssignedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="admin-card p-4 md:p-5">
        <h3 className="text-base font-semibold">Live Offer Ledger</h3>
        <div className="mt-3 max-h-72 overflow-auto rounded-xl border border-white/10">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-black/30">
              <tr className="text-left">
                <th className="px-3 py-2">Offer</th>
                <th className="px-3 py-2">Business</th>
                <th className="px-3 py-2">Price</th>
                <th className="px-3 py-2">Window</th>
              </tr>
            </thead>
            <tbody>
              {offersByBusiness.map((offer) => (
                <tr key={offer.id} className="border-t border-white/10">
                  <td className="px-3 py-2">
                    <p className="font-medium">{offer.title}</p>
                    <p className="text-xs opacity-65">{offer.badgeText ?? offer.status}</p>
                  </td>
                  <td className="px-3 py-2 text-xs opacity-80">{offer.businessId}</td>
                  <td className="px-3 py-2">{money(offer.discountPriceCents)}</td>
                  <td className="px-3 py-2 text-xs opacity-75">
                    {localDate(offer.startsAt)}
                    {" -> "}
                    {localDate(offer.endsAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
