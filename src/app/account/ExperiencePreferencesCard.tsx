"use client";

import { useEffect, useState } from "react";
import ThemeCircles from "@/components/header/ThemeCircles";
import {
  SITE_SKIN_OPTIONS,
  SITE_VERSION_OPTIONS,
  applyExperienceToDocument,
  persistExperienceSnapshot,
  type SiteSkin,
  type SiteVersion,
} from "@/lib/experiencePreferences";
import { type ThemeMode } from "@/lib/theme";

type PreferencesPayload = {
  profile: {
    theme: ThemeMode;
    skin: SiteSkin;
    siteVersion: SiteVersion;
    experiencePackId: string | null;
    personalDigestEnabled: boolean;
    digestCadenceHours: number;
  };
  activeExperiencePack: {
    id: string;
    slug: string;
    name: string;
    description: string | null;
    pages: Array<{
      id: string;
      routeKey: string;
      title: string;
      previewHref: string;
      routeLabel: string;
    }>;
  } | null;
  experiencePackCatalog: Array<{
    id: string;
    slug: string;
    name: string;
    description: string | null;
    status: string;
    previewablePageCount: number;
    pages: Array<{
      id: string;
      routeKey: string;
      title: string;
      previewHref: string;
      routeLabel: string;
    }>;
  }>;
  history: Array<{
    id: string;
    preferenceKey: string;
    previousValue: string | null;
    nextValue: string;
    sourceContext: string | null;
    createdAt: string;
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

function preferenceLabel(key: string): string {
  if (key === "siteVersion") return "Site version";
  if (key === "experiencePack") return "Experience pack";
  if (key === "personalDigestEnabled") return "Digest";
  if (key === "digestCadenceHours") return "Digest cadence";
  if (key === "profileImageUrl") return "Profile image";
  return key.charAt(0).toUpperCase() + key.slice(1);
}

export default function ExperiencePreferencesCard() {
  const [theme, setTheme] = useState<ThemeMode>("gray");
  const [skin, setSkin] = useState<SiteSkin>("editorial");
  const [siteVersion, setSiteVersion] = useState<SiteVersion>("v1");
  const [experiencePackId, setExperiencePackId] = useState<string | null>(null);
  const [experiencePackCatalog, setExperiencePackCatalog] = useState<
    PreferencesPayload["experiencePackCatalog"]
  >([]);
  const [personalDigestEnabled, setPersonalDigestEnabled] = useState(true);
  const [digestCadenceHours, setDigestCadenceHours] = useState(168);
  const [history, setHistory] = useState<PreferencesPayload["history"]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/account/preferences", {
          method: "GET",
          cache: "no-store",
        });
        const payload = (await response.json().catch(() => null)) as PreferencesPayload | null;

        if (!active || !response.ok || !payload) {
          return;
        }

        setTheme(payload.profile.theme);
        setSkin(payload.profile.skin);
        setSiteVersion(payload.profile.siteVersion);
        setExperiencePackId(payload.profile.experiencePackId);
        setExperiencePackCatalog(payload.experiencePackCatalog);
        setPersonalDigestEnabled(payload.profile.personalDigestEnabled);
        setDigestCadenceHours(payload.profile.digestCadenceHours);
        setHistory(payload.history);
        applyExperienceToDocument({
          theme: payload.profile.theme,
          skin: payload.profile.skin,
          siteVersion: payload.profile.siteVersion,
        });
        persistExperienceSnapshot({
          theme: payload.profile.theme,
          skin: payload.profile.skin,
          siteVersion: payload.profile.siteVersion,
        });
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

  const persist = async (
    next: Partial<{
      theme: ThemeMode;
      skin: SiteSkin;
      siteVersion: SiteVersion;
      experiencePackId: string | null;
      personalDigestEnabled: boolean;
      digestCadenceHours: number;
    }>,
    sourceContext: string,
  ) => {
    try {
      setSaving(true);
      setError(null);
      const response = await fetch("/api/account/preferences", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          ...next,
          sourceContext,
        }),
      });

      const payload = (await response.json().catch(() => null)) as PreferencesPayload | null;
      if (!response.ok || !payload) {
        throw new Error("Could not save preferences");
      }

      setTheme(payload.profile.theme);
      setSkin(payload.profile.skin);
      setSiteVersion(payload.profile.siteVersion);
      setExperiencePackId(payload.profile.experiencePackId);
      setExperiencePackCatalog(payload.experiencePackCatalog);
      setPersonalDigestEnabled(payload.profile.personalDigestEnabled);
      setDigestCadenceHours(payload.profile.digestCadenceHours);
      setHistory(payload.history);
      applyExperienceToDocument({
        theme: payload.profile.theme,
        skin: payload.profile.skin,
        siteVersion: payload.profile.siteVersion,
      });
      persistExperienceSnapshot({
        theme: payload.profile.theme,
        skin: payload.profile.skin,
        siteVersion: payload.profile.siteVersion,
      });
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : String(saveError));
    } finally {
      setSaving(false);
    }
  };

  const activeExperiencePack =
    experiencePackCatalog.find((pack) => pack.id === experiencePackId) ?? null;

  return (
    <section className="rounded-xl border border-black/10 bg-black/[0.02] p-4 dark:border-white/15 dark:bg-white/[0.03] md:p-5">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] opacity-70">Experience</p>
          <h2 className="mt-1 text-base font-semibold md:text-lg">Theme, skin, and version memory</h2>
          <p className="mt-1 text-sm opacity-75">
            Your account now remembers how you prefer Wheat & Stone to look, and this
            is the foundation for future alternate front-end skins.
          </p>
        </div>
        <div className="text-sm opacity-70">{saving ? "Saving…" : loading ? "Loading…" : "Synced"}</div>
      </div>

      {error ? (
        <div className="mt-4 rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-3 text-sm text-amber-100">
          {error}
        </div>
      ) : null}

      <div className="mt-5 grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-4">
          <div className="rounded-lg border border-black/10 px-3 py-4 dark:border-white/15">
            <p className="text-xs uppercase tracking-[0.18em] opacity-65">Theme</p>
            <div className="mt-3">
              <ThemeCircles
                value={theme}
                onChange={(nextTheme) => {
                  setTheme(nextTheme);
                  applyExperienceToDocument({ theme: nextTheme });
                  persistExperienceSnapshot({ theme: nextTheme, skin, siteVersion });
                  void persist({ theme: nextTheme }, "account_theme_selector");
                }}
              />
            </div>
          </div>

          <div className="rounded-lg border border-black/10 px-3 py-4 dark:border-white/15">
            <p className="text-xs uppercase tracking-[0.18em] opacity-65">Skin</p>
            <div className="mt-3 grid gap-2">
              {SITE_SKIN_OPTIONS.map((option) => {
                const active = option.value === skin;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      setSkin(option.value);
                      applyExperienceToDocument({ skin: option.value });
                      persistExperienceSnapshot({ theme, skin: option.value, siteVersion });
                      void persist({ skin: option.value }, "account_skin_selector");
                    }}
                    className={`rounded-xl border px-3 py-3 text-left transition ${
                      active
                        ? "border-amber-400/60 bg-amber-400/12"
                        : "border-black/10 dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/5"
                    }`}
                  >
                    <p className="font-medium">{option.label}</p>
                    <p className="mt-1 text-sm opacity-75">{option.summary}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-lg border border-black/10 px-3 py-4 dark:border-white/15">
            <p className="text-xs uppercase tracking-[0.18em] opacity-65">Experience pack</p>
            <div className="mt-3 grid gap-2">
              <button
                type="button"
                onClick={() => {
                  setExperiencePackId(null);
                  void persist(
                    { experiencePackId: null },
                    "account_experience_pack_selector",
                  );
                }}
                className={`rounded-xl border px-3 py-3 text-left transition ${
                  experiencePackId === null
                    ? "border-amber-400/60 bg-amber-400/12"
                    : "border-black/10 dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/5"
                }`}
              >
                <p className="font-medium">Flagship Live Site</p>
                <p className="mt-1 text-sm opacity-75">
                  Stay on the currently wired production experience.
                </p>
              </button>

              {experiencePackCatalog.map((pack) => {
                const active = pack.id === experiencePackId;
                return (
                  <button
                    key={pack.id}
                    type="button"
                    onClick={() => {
                      setExperiencePackId(pack.id);
                      void persist(
                        { experiencePackId: pack.id },
                        "account_experience_pack_selector",
                      );
                    }}
                    className={`rounded-xl border px-3 py-3 text-left transition ${
                      active
                        ? "border-amber-400/60 bg-amber-400/12"
                        : "border-black/10 dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/5"
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium">{pack.name}</p>
                      <span className="text-xs uppercase tracking-[0.16em] opacity-65">
                        {pack.previewablePageCount} pages
                      </span>
                    </div>
                    <p className="mt-1 text-sm opacity-75">
                      {pack.description || "Static preview pack for alternate route mockups."}
                    </p>
                  </button>
                );
              })}

              {experiencePackCatalog.length === 0 ? (
                <div className="rounded-xl border border-dashed border-black/10 px-3 py-4 text-sm opacity-70 dark:border-white/15">
                  No selectable experience packs are live yet.
                </div>
              ) : null}
            </div>

            {activeExperiencePack ? (
              <div className="mt-4 rounded-xl border border-black/10 px-3 py-3 text-sm dark:border-white/15">
                <p className="text-xs uppercase tracking-[0.16em] opacity-65">Pack preview links</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {activeExperiencePack.pages.map((page) => (
                    <a
                      key={page.id}
                      href={page.previewHref}
                      className="rounded-full border border-black/10 px-3 py-1.5 text-xs font-medium transition hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/5"
                    >
                      {page.routeLabel}
                    </a>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <div className="rounded-lg border border-black/10 px-3 py-4 dark:border-white/15">
            <p className="text-xs uppercase tracking-[0.18em] opacity-65">Core version track</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {SITE_VERSION_OPTIONS.map((option) => {
                const active = option.value === siteVersion;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      setSiteVersion(option.value);
                      applyExperienceToDocument({ siteVersion: option.value });
                      persistExperienceSnapshot({ theme, skin, siteVersion: option.value });
                      void persist(
                        { siteVersion: option.value },
                        "account_site_version_selector",
                      );
                    }}
                    className={`rounded-xl border px-3 py-3 text-left transition ${
                      active
                        ? "border-sky-400/50 bg-sky-500/10"
                        : "border-black/10 dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/5"
                    }`}
                  >
                    <p className="font-medium">{option.label}</p>
                    <p className="mt-1 text-sm opacity-75">{option.summary}</p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border border-black/10 px-3 py-4 dark:border-white/15">
            <p className="text-xs uppercase tracking-[0.18em] opacity-65">Personal digest</p>
            <div className="mt-3 space-y-3">
              <label className="flex items-center justify-between gap-3 text-sm">
                <span className="opacity-80">Saved-product digest loop</span>
                <input
                  type="checkbox"
                  checked={personalDigestEnabled}
                  onChange={(event) => {
                    const checked = event.target.checked;
                    setPersonalDigestEnabled(checked);
                    void persist(
                      { personalDigestEnabled: checked },
                      "account_digest_toggle",
                    );
                  }}
                />
              </label>
              <label className="block text-sm">
                <span className="opacity-80">Digest cadence (hours)</span>
                <input
                  type="number"
                  min={6}
                  max={336}
                  step={6}
                  value={digestCadenceHours}
                  onChange={(event) => setDigestCadenceHours(Number(event.target.value || 168))}
                  onBlur={() =>
                    void persist(
                      { digestCadenceHours: Math.max(6, Math.min(336, digestCadenceHours)) },
                      "account_digest_cadence",
                    )
                  }
                  className="mt-2 w-full rounded-xl border border-black/10 bg-transparent px-3 py-2 dark:border-white/15"
                />
              </label>
            </div>
          </div>

          <div className="rounded-lg border border-black/10 px-3 py-4 dark:border-white/15">
            <p className="text-xs uppercase tracking-[0.18em] opacity-65">Recent changes</p>
            <div className="mt-3 space-y-2">
              {history.length === 0 ? (
                <div className="rounded-lg border border-dashed border-black/15 px-3 py-4 text-sm opacity-75 dark:border-white/15">
                  No saved experience changes yet.
                </div>
              ) : (
                history.slice(0, 8).map((entry) => (
                  <div
                    key={entry.id}
                    className="rounded-lg border border-black/10 px-3 py-3 text-sm dark:border-white/15"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium">{entry.nextValue}</p>
                      <span className="text-xs opacity-65">{formatDateTime(entry.createdAt)}</span>
                    </div>
                    <p className="mt-1 opacity-75">
                      {preferenceLabel(entry.preferenceKey)}
                      {entry.previousValue ? ` · from ${entry.previousValue}` : ""}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
