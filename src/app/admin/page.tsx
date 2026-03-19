"use client";

import { useSession } from "next-auth/react";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AdminArticleWorkflowPanels } from "./AdminArticleWorkflowPanels";
import { AdminOwnerIntelligencePanels } from "./AdminOwnerIntelligencePanels";
import type {
  Article,
  AuthProviderConfig,
  AuthProviderConfigResponse,
  AuthRegistrationStats,
  PublicSurfaceProbeHistory,
  SiteConfiguration,
  SiteDeliveryPaymentConfig,
  SystemSnapshot,
} from "./adminDashboardTypes";
import { normalizeArticleStatus } from "@/lib/articleLifecycle";
import { hasAnyRole, isStaffRole, normalizeAppRole, RBAC_ROLE_GROUPS } from "@/lib/rbac";

function buildFreshXCardUrl(homeUrl: string): string | null {
  try {
    const url = new URL(homeUrl);
    url.searchParams.set("xcard", `${Date.now()}`);
    return url.toString();
  } catch {
    return null;
  }
}

export default function AdminDashboard() {
  const { data: session } = useSession();
  const router = useRouter();
  const [articles, setArticles] = useState<Article[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [authStatsLoading, setAuthStatsLoading] = useState(false);
  const [authStats, setAuthStats] = useState<AuthRegistrationStats | null>(null);
  const [authProviderConfigLoading, setAuthProviderConfigLoading] = useState(false);
  const [authProviderConfig, setAuthProviderConfig] = useState<AuthProviderConfig[]>(
    [],
  );
  const [siteConfigurationLoading, setSiteConfigurationLoading] = useState(false);
  const [siteConfiguration, setSiteConfiguration] = useState<SiteConfiguration | null>(null);
  const [siteConfigurationSaveBusy, setSiteConfigurationSaveBusy] = useState(false);
  const [siteConfigurationNote, setSiteConfigurationNote] = useState<string | null>(null);
  const [systemSnapshotLoading, setSystemSnapshotLoading] = useState(false);
  const [systemSnapshot, setSystemSnapshot] = useState<SystemSnapshot | null>(null);
  const [publicProbeHistoryLoading, setPublicProbeHistoryLoading] = useState(false);
  const [publicProbeHistory, setPublicProbeHistory] = useState<PublicSurfaceProbeHistory | null>(
    null,
  );
  const [publicProbeError, setPublicProbeError] = useState<string | null>(null);
  const [publicProbeRunBusy, setPublicProbeRunBusy] = useState(false);
  const [healthCheckBusy, setHealthCheckBusy] = useState(false);
  const [healthCheckNote, setHealthCheckNote] = useState<string | null>(null);
  const [recrawlActionNote, setRecrawlActionNote] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const role = normalizeAppRole(session?.user?.role);
  const canDeleteAsStaff = isStaffRole(role);
  const isOwnerAdmin = hasAnyRole(role, RBAC_ROLE_GROUPS.ownerAdmin);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/articles?scope=all", { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      const data: Article[] = await res.json();
      setArticles(data ?? []);
    } catch (error) {
      console.error(error);
      alert("Failed to load articles.");
    } finally {
      setLoading(false);
    }
  }

  async function loadAuthStats() {
    if (!isOwnerAdmin) {
      setAuthStats(null);
      return;
    }

    setAuthStatsLoading(true);
    try {
      const res = await fetch("/api/admin/auth/registration-stats?days=30", {
        cache: "no-store",
      });
      if (!res.ok) {
        throw new Error(String(res.status));
      }
      const data = (await res.json()) as AuthRegistrationStats;
      setAuthStats(data);
    } catch (error) {
      console.error(error);
      setAuthStats(null);
    } finally {
      setAuthStatsLoading(false);
    }
  }

  async function loadAuthProviderConfig() {
    if (!isOwnerAdmin) {
      setAuthProviderConfig([]);
      return;
    }

    setAuthProviderConfigLoading(true);
    try {
      const res = await fetch("/api/admin/auth/provider-config", {
        cache: "no-store",
      });
      if (!res.ok) {
        throw new Error(String(res.status));
      }
      const data = (await res.json()) as AuthProviderConfigResponse;
      setAuthProviderConfig(data.providers ?? []);
    } catch (error) {
      console.error(error);
      setAuthProviderConfig([]);
    } finally {
      setAuthProviderConfigLoading(false);
    }
  }

  async function loadSiteConfiguration() {
    if (!isOwnerAdmin) {
      setSiteConfiguration(null);
      return;
    }

    setSiteConfigurationLoading(true);
    try {
      const res = await fetch("/api/admin/site-configuration", {
        cache: "no-store",
      });
      if (!res.ok) {
        throw new Error(String(res.status));
      }
      const data = (await res.json()) as SiteConfiguration;
      setSiteConfiguration(data);
    } catch (error) {
      console.error(error);
      setSiteConfiguration(null);
    } finally {
      setSiteConfigurationLoading(false);
    }
  }

  async function saveSiteConfiguration(input: {
    homePagePresetSlug?: string;
    deliveryPaymentConfig?: SiteDeliveryPaymentConfig;
  }) {
    if (!isOwnerAdmin) {
      return;
    }

    setSiteConfigurationSaveBusy(true);
    setSiteConfigurationNote(null);
    try {
      const res = await fetch("/api/admin/site-configuration", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(input),
      });
      const data = (await res.json().catch(() => null)) as
        | SiteConfiguration
        | { message?: string }
        | null;
      if (!res.ok) {
        const message =
          data && typeof data === "object" && "message" in data && data.message
            ? String(data.message)
            : `Request failed (${res.status})`;
        throw new Error(message);
      }
      setSiteConfiguration(data as SiteConfiguration);
      const nextConfig = data as SiteConfiguration;
      setSiteConfigurationNote(
        input.deliveryPaymentConfig
          ? "Site settings updated. Delivery crypto and hybrid payment details are live."
          : `Homepage preset updated to ${nextConfig.homePagePresetLabel}.`,
      );
    } catch (error) {
      console.error(error);
      setSiteConfigurationNote(
        error instanceof Error ? error.message : "Could not update site settings.",
      );
    } finally {
      setSiteConfigurationSaveBusy(false);
    }
  }

  async function loadSystemSnapshot() {
    if (!isOwnerAdmin) {
      setSystemSnapshot(null);
      return;
    }

    setSystemSnapshotLoading(true);
    try {
      const res = await fetch("/api/admin/system/snapshot", {
        cache: "no-store",
      });
      if (!res.ok) {
        throw new Error(String(res.status));
      }
      const data = (await res.json()) as SystemSnapshot;
      setSystemSnapshot(data);
    } catch (error) {
      console.error(error);
      setSystemSnapshot(null);
    } finally {
      setSystemSnapshotLoading(false);
    }
  }

  async function loadPublicProbeHistory() {
    if (!isOwnerAdmin) {
      setPublicProbeHistory(null);
      return;
    }

    setPublicProbeHistoryLoading(true);
    setPublicProbeError(null);
    try {
      const res = await fetch("/api/admin/system/public-surface?page=1&pageSize=8", {
        cache: "no-store",
      });
      if (!res.ok) {
        throw new Error(String(res.status));
      }
      const data = (await res.json()) as PublicSurfaceProbeHistory;
      setPublicProbeHistory(data);
    } catch (error) {
      console.error(error);
      setPublicProbeHistory(null);
      setPublicProbeError(error instanceof Error ? error.message : String(error));
    } finally {
      setPublicProbeHistoryLoading(false);
    }
  }

  async function runPublicProbeNow() {
    if (!isOwnerAdmin) return;
    setPublicProbeRunBusy(true);
    setPublicProbeError(null);
    try {
      const res = await fetch("/api/admin/system/public-surface", {
        method: "POST",
      });
      if (!res.ok) {
        throw new Error(String(res.status));
      }

      await Promise.all([loadSystemSnapshot(), loadPublicProbeHistory()]);
    } catch (error) {
      console.error(error);
      setPublicProbeError(error instanceof Error ? error.message : String(error));
    } finally {
      setPublicProbeRunBusy(false);
    }
  }

  async function runSystemHealthCheck() {
    if (!isOwnerAdmin) return;
    setHealthCheckBusy(true);
    setHealthCheckNote(null);
    setPublicProbeError(null);
    try {
      const res = await fetch("/api/admin/system/health-check", {
        method: "POST",
      });
      if (!res.ok) {
        throw new Error(String(res.status));
      }
      const payload = (await res.json()) as {
        identitySummary?: {
          roleMismatchCount: number;
          localOnlyCount: number;
          wsApiOnlyCount: number;
        };
        warnings?: string[];
      };
      const summary = payload.identitySummary;
      setHealthCheckNote(
        summary
          ? `Health check complete: mismatch=${summary.roleMismatchCount}, localOnly=${summary.localOnlyCount}, wsOnly=${summary.wsApiOnlyCount}`
          : "Health check complete.",
      );
      await Promise.all([
        loadSystemSnapshot(),
        loadPublicProbeHistory(),
      ]);
    } catch (error) {
      console.error(error);
      setPublicProbeError(error instanceof Error ? error.message : String(error));
    } finally {
      setHealthCheckBusy(false);
    }
  }

  function openFreshXCardUrl() {
    if (!systemSnapshot) return;
    const freshUrl = buildFreshXCardUrl(systemSnapshot.publicSurface.homeUrl);
    if (!freshUrl) {
      setRecrawlActionNote("Could not generate fresh X-card URL.");
      return;
    }
    window.open(freshUrl, "_blank", "noopener,noreferrer");
    setRecrawlActionNote(`Opened fresh X-card URL: ${freshUrl}`);
  }

  async function copyFreshXCardUrl() {
    if (!systemSnapshot) return;
    const freshUrl = buildFreshXCardUrl(systemSnapshot.publicSurface.homeUrl);
    if (!freshUrl) {
      setRecrawlActionNote("Could not generate fresh X-card URL.");
      return;
    }
    try {
      await navigator.clipboard.writeText(freshUrl);
      setRecrawlActionNote(`Copied fresh X-card URL: ${freshUrl}`);
    } catch {
      setRecrawlActionNote("Clipboard permission blocked. Copy manually from Open Home.");
    }
  }

  async function reloadAll() {
    await Promise.all([
      load(),
      loadAuthStats(),
      loadAuthProviderConfig(),
      loadSiteConfiguration(),
      loadSystemSnapshot(),
      loadPublicProbeHistory(),
    ]);
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    void loadAuthStats();
  }, [isOwnerAdmin]);

  useEffect(() => {
    void loadAuthProviderConfig();
  }, [isOwnerAdmin]);

  useEffect(() => {
    void loadSiteConfiguration();
  }, [isOwnerAdmin]);

  useEffect(() => {
    void loadSystemSnapshot();
  }, [isOwnerAdmin]);

  useEffect(() => {
    void loadPublicProbeHistory();
  }, [isOwnerAdmin]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return articles;
    return articles.filter(
      (article) =>
        article.title.toLowerCase().includes(q) ||
        article.slug.toLowerCase().includes(q),
    );
  }, [articles, query]);

  const dashboard = useMemo(() => {
    const draft = articles.filter((article) => {
      const status = normalizeArticleStatus(article.status);
      return status === "DRAFT" || status === "REVIEW";
    }).length;
    const published = articles.filter(
      (article) => normalizeArticleStatus(article.status) === "PUBLISHED",
    ).length;
    const archived = articles.filter(
      (article) => normalizeArticleStatus(article.status) === "ARCHIVED",
    ).length;
    const latest = [...articles]
      .map((article) => article.updatedAt || article.createdAt)
      .sort((a, b) => Date.parse(b) - Date.parse(a))[0];

    return {
      total: articles.length,
      draft,
      published,
      archived,
      latest:
        latest && Number.isFinite(Date.parse(latest))
          ? new Date(latest).toLocaleDateString()
          : "n/a",
    };
  }, [articles]);

  async function handleDelete(slug: string) {
    if (!confirm("Delete this article? This cannot be undone.")) return;
    try {
      const res = await fetch(`/api/articles/${encodeURIComponent(slug)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(String(res.status));
      startTransition(() => {
        setArticles((prev) => prev.filter((article) => article.slug !== slug));
      });
    } catch (error) {
      console.error(error);
      alert("Delete failed.");
    }
  }

  return (
    <section className="space-y-4 md:space-y-5">
      <AdminArticleWorkflowPanels
        articles={articles}
        filteredArticles={filtered}
        query={query}
        loading={loading}
        reloadBusy={
          loading ||
          authStatsLoading ||
          authProviderConfigLoading ||
          siteConfigurationLoading ||
          siteConfigurationSaveBusy ||
          systemSnapshotLoading ||
          publicProbeHistoryLoading ||
          isPending
        }
        canDeleteAsStaff={canDeleteAsStaff}
        isOwnerAdmin={isOwnerAdmin}
        role={role}
        sessionUserId={session?.user?.id}
        dashboard={dashboard}
        onQueryChange={setQuery}
        onReload={reloadAll}
        onNavigate={(href) => router.push(href)}
        onDeleteArticle={handleDelete}
      />

      {isOwnerAdmin ? (
        <AdminOwnerIntelligencePanels
          systemSnapshotLoading={systemSnapshotLoading}
          systemSnapshot={systemSnapshot}
          authProviderConfigLoading={authProviderConfigLoading}
          authProviderConfig={authProviderConfig}
          siteConfigurationLoading={siteConfigurationLoading}
          siteConfiguration={siteConfiguration}
          siteConfigurationSaveBusy={siteConfigurationSaveBusy}
          siteConfigurationNote={siteConfigurationNote}
          authStatsLoading={authStatsLoading}
          authStats={authStats}
          publicProbeHistoryLoading={publicProbeHistoryLoading}
          publicProbeHistory={publicProbeHistory}
          publicProbeError={publicProbeError}
          publicProbeRunBusy={publicProbeRunBusy}
          healthCheckBusy={healthCheckBusy}
          healthCheckNote={healthCheckNote}
          recrawlActionNote={recrawlActionNote}
          onNavigate={(href) => router.push(href)}
          onSaveSiteConfiguration={saveSiteConfiguration}
          onRunPublicProbeNow={runPublicProbeNow}
          onRunSystemHealthCheck={runSystemHealthCheck}
          onOpenFreshXCardUrl={openFreshXCardUrl}
          onCopyFreshXCardUrl={copyFreshXCardUrl}
        />
      ) : null}
    </section>
  );
}
