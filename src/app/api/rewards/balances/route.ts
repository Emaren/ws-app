import { NextResponse, type NextRequest } from "next/server";
import { getApiAuthContext } from "@/lib/apiAuth";
import { listLocalRewardBalancesForUser } from "@/lib/localRewards";
import { hasAnyRole, RBAC_ROLE_GROUPS } from "@/lib/rbac";
import { getWsApiBaseUrl } from "@/lib/wsApiBaseUrl";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const WS_API_TIMEOUT_MS = 8_000;

type RewardLikeEntry = {
  token?: unknown;
  amount?: unknown;
  payoutStatus?: unknown;
  [key: string]: unknown;
};

function normalizeToken(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const token = value.trim().toUpperCase();
  return /^[A-Z0-9_]{2,12}$/.test(token) ? token : null;
}

function normalizeAmount(value: unknown): number {
  if (typeof value === "object" && value !== null) {
    return Number(String(value));
  }
  return Number(value);
}

function mergeBalances(
  localBalances: Array<{ token: string; balance: number }>,
  remoteEntries: RewardLikeEntry[],
) {
  const totals = new Map<string, number>();

  for (const balance of localBalances) {
    totals.set(balance.token, (totals.get(balance.token) ?? 0) + balance.balance);
  }

  for (const entry of remoteEntries) {
    const token = normalizeToken(entry.token);
    if (!token) {
      continue;
    }

    const payoutStatus =
      typeof entry.payoutStatus === "string"
        ? entry.payoutStatus.trim().toUpperCase()
        : "";
    if (payoutStatus === "VOID") {
      continue;
    }

    const amount = normalizeAmount(entry.amount);
    if (!Number.isFinite(amount)) {
      continue;
    }

    totals.set(token, (totals.get(token) ?? 0) + amount);
  }

  const orderedTokens = [
    "WHEAT",
    "STONE",
    ...[...totals.keys()].filter((token) => token !== "WHEAT" && token !== "STONE"),
  ];

  return [...new Set(orderedTokens)].map((token) => ({
    token,
    balance: totals.get(token) ?? 0,
  }));
}

async function fetchRemoteRewardEntries(
  accessToken: string,
  requestedUserId: string,
): Promise<RewardLikeEntry[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), WS_API_TIMEOUT_MS);

  try {
    const response = await fetch(
      `${getWsApiBaseUrl()}/rewards/ledger?userId=${encodeURIComponent(requestedUserId)}`,
      {
        method: "GET",
        cache: "no-store",
        signal: controller.signal,
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    const payload = await response.json().catch(() => null);
    if (!response.ok || !Array.isArray(payload)) {
      return [];
    }

    return payload as RewardLikeEntry[];
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

export async function GET(req: NextRequest) {
  const auth = await getApiAuthContext(req);
  if (!auth.token || !auth.userId) {
    return NextResponse.json({ message: "Authentication required" }, { status: 401 });
  }

  const requestedUserId = req.nextUrl.searchParams.get("userId")?.trim() || auth.userId;
  const isOwnerAdmin = hasAnyRole(auth.role, RBAC_ROLE_GROUPS.ownerAdmin);
  if (!isOwnerAdmin && requestedUserId !== auth.userId) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const payload = await listLocalRewardBalancesForUser(requestedUserId);
  const accessToken =
    typeof auth.token.wsApiAccessToken === "string" ? auth.token.wsApiAccessToken.trim() : "";
  const remoteEntries = accessToken
    ? await fetchRemoteRewardEntries(accessToken, requestedUserId)
    : [];

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    userId: requestedUserId,
    entries: [...payload.entries, ...remoteEntries],
    balances: mergeBalances(payload.balances, remoteEntries),
  });
}
