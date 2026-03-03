import { NextResponse, type NextRequest } from "next/server";
import { getApiAuthContext } from "@/lib/apiAuth";
import { hasAnyRole, RBAC_ROLE_GROUPS } from "@/lib/rbac";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type ProviderDefinition = {
  id: string;
  label: string;
  requiredEnv: string[];
};

const PROVIDERS: ProviderDefinition[] = [
  {
    id: "google",
    label: "Google",
    requiredEnv: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"],
  },
  {
    id: "apple",
    label: "Apple",
    requiredEnv: ["APPLE_CLIENT_ID|APPLE_ID", "APPLE_CLIENT_SECRET"],
  },
  {
    id: "facebook",
    label: "Facebook",
    requiredEnv: ["FACEBOOK_CLIENT_ID", "FACEBOOK_CLIENT_SECRET"],
  },
  {
    id: "instagram",
    label: "Instagram",
    requiredEnv: ["INSTAGRAM_CLIENT_ID", "INSTAGRAM_CLIENT_SECRET"],
  },
  {
    id: "azure-ad",
    label: "Microsoft",
    requiredEnv: [
      "MICROSOFT_CLIENT_ID",
      "MICROSOFT_CLIENT_SECRET",
      "MICROSOFT_TENANT_ID",
    ],
  },
  {
    id: "github",
    label: "GitHub",
    requiredEnv: ["GITHUB_CLIENT_ID", "GITHUB_CLIENT_SECRET"],
  },
];

function normalizeOrigin(raw?: string): string {
  const fallback = "https://wheatandstone.ca";
  const value = raw?.trim();
  if (!value) return fallback;
  const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  try {
    const parsed = new URL(withProtocol);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return fallback;
  }
}

function hasEnvToken(token: string): boolean {
  if (token.includes("|")) {
    return token
      .split("|")
      .some((part) => Boolean(process.env[part.trim()]?.trim()));
  }
  return Boolean(process.env[token]?.trim());
}

export async function GET(req: NextRequest) {
  const auth = await getApiAuthContext(req);
  if (!auth.token || !hasAnyRole(auth.role, RBAC_ROLE_GROUPS.ownerAdmin)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const origin = normalizeOrigin(
    process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_SITE_ORIGIN,
  );

  const providers = PROVIDERS.map((provider) => {
    const missing = provider.requiredEnv.filter((token) => !hasEnvToken(token));
    return {
      id: provider.id,
      label: provider.label,
      enabled: missing.length === 0,
      missingEnv: missing,
      callbackUrl: `${origin}/api/auth/callback/${provider.id}`,
    };
  });

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    providers,
  });
}
