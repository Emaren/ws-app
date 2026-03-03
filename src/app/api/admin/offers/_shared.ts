import { NextResponse, type NextRequest } from "next/server";
import { getApiAuthContext } from "@/lib/apiAuth";
import {
  hasAnyRole,
  normalizeAppRole,
  RBAC_ROLE_GROUPS,
  type AppRole,
} from "@/lib/rbac";
import { getWsApiBaseUrl } from "@/lib/wsApiBaseUrl";

const WS_API_TIMEOUT_MS = 10_000;

export type WsApiUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
  updatedAt: string;
};

export type WsApiBusiness = {
  id: string;
  slug: string;
  name: string;
  ownerUserId: string | null;
  contactEmail: string | null;
  status: string;
  isVerified: boolean;
};

export type OffersManagerAuthContext = {
  accessToken: string;
  role: AppRole;
  actorExternalId: string | null;
  actorEmail: string | null;
  isOwnerAdmin: boolean;
  managedBusinessIds: string[] | null;
};

function invalidWsApiResponse(message: string) {
  return new Error(`ws-api users request failed: ${message}`);
}

function unknownPayloadToMessage(payload: unknown): string {
  if (!payload) return "unknown error";
  if (typeof payload === "string") return payload;
  if (typeof payload === "object" && payload !== null) {
    const maybeMessage = (payload as { message?: unknown }).message;
    if (typeof maybeMessage === "string" && maybeMessage.trim()) {
      return maybeMessage;
    }
  }
  return "unknown error";
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export async function requireOwnerAdminWsToken(
  req: NextRequest,
): Promise<
  | {
      accessToken: string;
      actorExternalId: string | null;
      actorEmail: string | null;
    }
  | NextResponse
> {
  const auth = await getApiAuthContext(req);
  if (!auth.token || !hasAnyRole(auth.role, RBAC_ROLE_GROUPS.ownerAdmin)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const accessToken =
    typeof auth.token.wsApiAccessToken === "string"
      ? auth.token.wsApiAccessToken.trim()
      : "";

  if (!accessToken) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  return {
    accessToken,
    actorExternalId: auth.userId ?? null,
    actorEmail: auth.email ?? null,
  };
}

export async function requireOffersManagerWsToken(
  req: NextRequest,
): Promise<OffersManagerAuthContext | NextResponse> {
  const auth = await getApiAuthContext(req);
  if (!auth.token || !hasAnyRole(auth.role, RBAC_ROLE_GROUPS.staff)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const accessToken =
    typeof auth.token.wsApiAccessToken === "string"
      ? auth.token.wsApiAccessToken.trim()
      : "";

  if (!accessToken) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const role = normalizeAppRole(auth.role);
  if (!role) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const actorExternalId = auth.userId ?? null;
  const actorEmail = auth.email ?? null;
  const isOwnerAdmin = hasAnyRole(role, RBAC_ROLE_GROUPS.ownerAdmin);

  if (isOwnerAdmin) {
    return {
      accessToken,
      role,
      actorExternalId,
      actorEmail,
      isOwnerAdmin: true,
      managedBusinessIds: null,
    };
  }

  if (!actorExternalId) {
    return NextResponse.json(
      { message: "Missing actor identity for business-scoped access" },
      { status: 403 },
    );
  }

  const businesses = await listWsApiBusinesses(accessToken);
  const managedBusinessIds = businesses
    .filter((business) => business.ownerUserId === actorExternalId)
    .map((business) => business.id);

  return {
    accessToken,
    role,
    actorExternalId,
    actorEmail,
    isOwnerAdmin: false,
    managedBusinessIds,
  };
}

export async function listWsApiUsers(accessToken: string): Promise<WsApiUser[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), WS_API_TIMEOUT_MS);

  try {
    const response = await fetch(`${getWsApiBaseUrl()}/users`, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const payload = await response
      .json()
      .catch(async () => response.text().catch(() => ""));

    if (!response.ok) {
      throw invalidWsApiResponse(
        `${response.status} ${unknownPayloadToMessage(payload)}`,
      );
    }

    if (!Array.isArray(payload)) {
      throw invalidWsApiResponse("users payload was not an array");
    }

    return payload
      .filter((value): value is WsApiUser => {
        if (!value || typeof value !== "object") return false;
        const row = value as Partial<WsApiUser>;
        return (
          typeof row.id === "string" &&
          typeof row.email === "string" &&
          typeof row.name === "string" &&
          typeof row.role === "string"
        );
      })
      .sort((a, b) => a.email.localeCompare(b.email));
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("ws-api users request timed out");
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export async function listWsApiBusinesses(
  accessToken: string,
): Promise<WsApiBusiness[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), WS_API_TIMEOUT_MS);

  try {
    const response = await fetch(`${getWsApiBaseUrl()}/ops/businesses`, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const payload = await response
      .json()
      .catch(async () => response.text().catch(() => ""));

    if (!response.ok) {
      throw invalidWsApiResponse(
        `${response.status} ${unknownPayloadToMessage(payload)}`,
      );
    }

    if (!Array.isArray(payload)) {
      throw invalidWsApiResponse("businesses payload was not an array");
    }

    const rows: WsApiBusiness[] = [];
    for (const value of payload) {
      if (!isObjectRecord(value)) {
        continue;
      }

      const id = typeof value.id === "string" ? value.id.trim() : "";
      const name = typeof value.name === "string" ? value.name.trim() : "";
      if (!id || !name) {
        continue;
      }

      const slug =
        typeof value.slug === "string" && value.slug.trim()
          ? value.slug.trim()
          : id.toLowerCase();
      const ownerUserId =
        typeof value.ownerUserId === "string" && value.ownerUserId.trim()
          ? value.ownerUserId.trim()
          : null;
      const contactEmail =
        typeof value.contactEmail === "string" && value.contactEmail.trim()
          ? value.contactEmail.trim()
          : null;
      const status =
        typeof value.status === "string" && value.status.trim()
          ? value.status.trim().toUpperCase()
          : "ACTIVE";
      const isVerified = Boolean(value.isVerified);

      rows.push({
        id,
        slug,
        name,
        ownerUserId,
        contactEmail,
        status,
        isVerified,
      });
    }

    rows.sort((a, b) => a.name.localeCompare(b.name));
    return rows;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("ws-api businesses request timed out");
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
