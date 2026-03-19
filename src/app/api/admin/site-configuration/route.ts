import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { getApiAuthContext } from "@/lib/apiAuth";
import { hasAnyRole, RBAC_ROLE_GROUPS } from "@/lib/rbac";
import {
  getSiteConfigurationSnapshot,
  updateSiteConfiguration,
} from "@/lib/siteConfiguration";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function requireOwnerAdmin(req: NextRequest) {
  const auth = await getApiAuthContext(req);
  if (!auth.token || !hasAnyRole(auth.role, RBAC_ROLE_GROUPS.ownerAdmin)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  return null;
}

export async function GET(req: NextRequest) {
  const forbidden = await requireOwnerAdmin(req);
  if (forbidden) {
    return forbidden;
  }

  const snapshot = await getSiteConfigurationSnapshot();
  return NextResponse.json(snapshot);
}

export async function PATCH(req: NextRequest) {
  const forbidden = await requireOwnerAdmin(req);
  if (forbidden) {
    return forbidden;
  }

  const body = (await req.json().catch(() => null)) as
    | {
        homePagePresetSlug?: unknown;
        deliveryPaymentConfig?: unknown;
      }
    | null;

  try {
    const snapshot = await updateSiteConfiguration({
      homePagePresetSlug:
        body && "homePagePresetSlug" in body && typeof body.homePagePresetSlug === "string"
          ? body.homePagePresetSlug
          : body && "homePagePresetSlug" in body
            ? null
            : undefined,
      deliveryPaymentConfig:
        body && "deliveryPaymentConfig" in body ? body.deliveryPaymentConfig : undefined,
    });

    revalidatePath("/");
    revalidatePath("/admin");
    revalidatePath("/admin/experience");

    return NextResponse.json(snapshot);
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "Could not update site configuration",
      },
      { status: 400 },
    );
  }
}
