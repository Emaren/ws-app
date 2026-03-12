import { NextResponse, type NextRequest } from "next/server";
import { getApiAuthContext } from "@/lib/apiAuth";
import {
  hasAnyRole,
  normalizeAppRole,
  RBAC_ROLE_GROUPS,
  type AppRole,
} from "@/lib/rbac";
import {
  listWsApiBusinesses,
  listWsApiUsers,
  type WsApiBusiness,
  type WsApiUser,
} from "@/lib/wsApiClient";

export type OffersManagerAuthContext = {
  accessToken: string;
  role: AppRole;
  actorExternalId: string | null;
  actorEmail: string | null;
  isOwnerAdmin: boolean;
  managedBusinessIds: string[] | null;
};

export { listWsApiBusinesses, listWsApiUsers, type WsApiBusiness, type WsApiUser };

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
