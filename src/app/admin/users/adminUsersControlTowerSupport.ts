"use client";

export type AdminUserRecord = {
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
};

export type RecentRegistrationAttempt = {
  id: string;
  userId: string | null;
  email: string | null;
  method: string;
  status: string;
  failureCode: string | null;
  failureMessage: string | null;
  createdAt: string;
};

export type MemberActivityEvent = {
  id: string;
  eventType: string;
  path: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
  } | null;
};

export type AnonymousActivityEvent = {
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
};

export type AdminUsersPayload = {
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
  users: AdminUserRecord[];
  wsApiOnlyUsers: Array<{
    id: string;
    email: string;
    name: string;
    role: string;
  }>;
  recentRegistrationAttempts: RecentRegistrationAttempt[];
  recentRegistrationFailures: RecentRegistrationAttempt[];
  recentMemberActivity: MemberActivityEvent[];
  anonymousActivity: AnonymousActivityEvent[];
};

export type AuthTrailEntry = {
  id: string;
  title: string;
  subtitle: string;
  createdAt: string;
};

export function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return "-";
  }

  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) {
    return "-";
  }

  return parsed.toLocaleString();
}

export function formatMoney(cents: number | null | undefined): string {
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

export function formatTokenAmount(value: number): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
  }).format(value);
}

export function userInitials(name: string, email: string): string {
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

export function shortAddress(value: string | null | undefined): string {
  if (!value) {
    return "-";
  }
  if (value.length <= 20) {
    return value;
  }
  return `${value.slice(0, 10)}...${value.slice(-8)}`;
}

export function preferenceLabel(key: string): string {
  if (key === "siteVersion" || key === "edition") return "Edition";
  if (key === "skin" || key === "layout") return "Layout";
  if (key === "experiencePack") return "Experience pack";
  if (key === "profileImageUrl") return "Profile image";
  if (key === "personalDigestEnabled") return "Digest";
  if (key === "digestCadenceHours") return "Digest cadence";
  return key.charAt(0).toUpperCase() + key.slice(1);
}

export function roleTone(role: string): string {
  if (role === "OWNER") return "border-amber-400/40 bg-amber-500/10 text-amber-100";
  if (role === "ADMIN") return "border-sky-400/40 bg-sky-500/10 text-sky-100";
  if (role === "EDITOR") return "border-emerald-400/40 bg-emerald-500/10 text-emerald-100";
  if (role === "CONTRIBUTOR") return "border-violet-400/40 bg-violet-500/10 text-violet-100";
  return "border-white/10 bg-white/5 text-white/80";
}

export function matchesUsersAtlasQuery(user: AdminUserRecord, rawQuery: string): boolean {
  const term = rawQuery.trim().toLowerCase();
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
}

export function buildAuthTrailEntries(
  user: AdminUserRecord,
  limit = 8,
): AuthTrailEntry[] {
  const registrations = user.authHistory.registrations.map((event) => ({
    id: `registration-${event.id}`,
    title: event.status,
    subtitle: [
      event.method,
      event.failureCode,
      event.failureMessage,
    ]
      .filter(Boolean)
      .join(" · ") || "Unknown method",
    createdAt: event.createdAt,
  }));

  const funnel = user.authHistory.funnel.map((event) => ({
    id: `funnel-${event.id}`,
    title: event.stage,
    subtitle: [event.method, event.sourceContext].filter(Boolean).join(" · ") || "Unknown method",
    createdAt: event.createdAt,
  }));

  return [...registrations, ...funnel]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
}

export async function requestJson<T>(url: string): Promise<T> {
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
