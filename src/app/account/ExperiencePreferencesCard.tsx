"use client";

import { useEffect, useMemo, useState } from "react";
import ThemeCircles from "@/components/header/ThemeCircles";
import {
  SITE_EDITION_OPTIONS,
  SITE_LAYOUT_OPTIONS,
  SITE_PRESET_OPTIONS,
  applyExperienceToDocument,
  persistExperienceSnapshot,
  type SiteLayout,
  type SiteVersion,
} from "@/lib/experiencePreferences";
import {
  buildExperiencePresetName,
  getEditionLabel,
  getExperiencePageOption,
  getLayoutLabel,
  resolveExperienceSelection,
  type ExperiencePresetOption,
} from "@/lib/experienceSystem";
import { getThemeLabel, type ThemeMode } from "@/lib/theme";

type PreferencesPayload = {
  profile: {
    theme: ThemeMode;
    layout: SiteLayout;
    edition: SiteVersion;
    preset: string;
    skin: SiteLayout;
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
  userPresetCatalog: ExperiencePresetOption[];
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
  if (key === "siteVersion" || key === "edition") return "Edition";
  if (key === "skin" || key === "layout") return "Layout";
  if (key === "preset") return "Preset";
  if (key === "savedPreset") return "Saved preset";
  if (key === "experiencePack") return "Experience pack";
  if (key === "personalDigestEnabled") return "Digest";
  if (key === "digestCadenceHours") return "Digest cadence";
  if (key === "profileImageUrl") return "Profile image";
  return key.charAt(0).toUpperCase() + key.slice(1);
}

function statusTone(status: string) {
  if (status === "flagship") return "border-amber-400/55 bg-amber-400/12 text-amber-50";
  if (status === "active") return "border-emerald-400/40 bg-emerald-500/10 text-emerald-50";
  if (status === "saved") return "border-sky-400/45 bg-sky-500/10 text-sky-50";
  return "border-white/15 bg-white/5 text-white/80";
}

export default function ExperiencePreferencesCard() {
  const [theme, setTheme] = useState<ThemeMode>("black");
  const [layout, setLayout] = useState<SiteLayout>("editorial");
  const [edition, setEdition] = useState<SiteVersion>("classic");
  const [preset, setPreset] = useState("black-classic-editorial");
  const [userPresetCatalog, setUserPresetCatalog] = useState<ExperiencePresetOption[]>([]);
  const [experiencePackId, setExperiencePackId] = useState<string | null>(null);
  const [experiencePackCatalog, setExperiencePackCatalog] = useState<
    PreferencesPayload["experiencePackCatalog"]
  >([]);
  const [personalDigestEnabled, setPersonalDigestEnabled] = useState(true);
  const [digestCadenceHours, setDigestCadenceHours] = useState(168);
  const [history, setHistory] = useState<PreferencesPayload["history"]>([]);
  const [newPresetName, setNewPresetName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hydrate = (payload: PreferencesPayload) => {
    setTheme(payload.profile.theme);
    setLayout(payload.profile.layout ?? payload.profile.skin);
    setEdition(payload.profile.edition ?? payload.profile.siteVersion);
    setPreset(payload.profile.preset);
    setUserPresetCatalog(payload.userPresetCatalog);
    setExperiencePackId(payload.profile.experiencePackId);
    setExperiencePackCatalog(payload.experiencePackCatalog);
    setPersonalDigestEnabled(payload.profile.personalDigestEnabled);
    setDigestCadenceHours(payload.profile.digestCadenceHours);
    setHistory(payload.history);
    applyExperienceToDocument({
      theme: payload.profile.theme,
      layout: payload.profile.layout ?? payload.profile.skin,
      edition: payload.profile.edition ?? payload.profile.siteVersion,
      preset: payload.profile.preset,
      skin: payload.profile.layout ?? payload.profile.skin,
      siteVersion: payload.profile.edition ?? payload.profile.siteVersion,
    });
    persistExperienceSnapshot({
      theme: payload.profile.theme,
      layout: payload.profile.layout ?? payload.profile.skin,
      edition: payload.profile.edition ?? payload.profile.siteVersion,
      preset: payload.profile.preset,
      skin: payload.profile.layout ?? payload.profile.skin,
      siteVersion: payload.profile.edition ?? payload.profile.siteVersion,
    });
  };

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

        hydrate(payload);
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
      layout: SiteLayout;
      edition: SiteVersion;
      preset: string | null;
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

      hydrate(payload);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : String(saveError));
    } finally {
      setSaving(false);
    }
  };

  const activeExperiencePack =
    experiencePackCatalog.find((pack) => pack.id === experiencePackId) ?? null;
  const mergedPresetCatalog = useMemo(
    () => [...userPresetCatalog, ...SITE_PRESET_OPTIONS],
    [userPresetCatalog],
  );
  const customPresetRegistry = useMemo(
    () =>
      userPresetCatalog.map((option) => ({
        slug: option.value,
        name: option.label,
        summary: option.summary,
        status: option.status,
        theme: option.theme,
        edition: option.edition,
        layout: option.layout,
        supportedPages: option.supportedPages,
      })),
    [userPresetCatalog],
  );
  const suggestedPresetName = useMemo(
    () =>
      buildExperiencePresetName({
        theme,
        edition,
        layout,
      }),
    [edition, layout, theme],
  );

  const selectedPreset = useMemo(
    () =>
      mergedPresetCatalog.find(
        (option) =>
          option.value === preset &&
          option.theme === theme &&
          option.edition === edition &&
          option.layout === layout,
      ) ?? null,
    [edition, layout, mergedPresetCatalog, preset, theme],
  );

  const applySelection = (
    next: Partial<{
      theme: ThemeMode;
      layout: SiteLayout;
      edition: SiteVersion;
      preset: string | null;
    }>,
    sourceContext: string,
  ) => {
    const resolved = resolveExperienceSelection(
      {
        theme: next.theme ?? theme,
        layout: next.layout ?? layout,
        edition: next.edition ?? edition,
        preset: next.preset ?? preset,
      },
      { customPresets: customPresetRegistry },
    );

    setTheme(resolved.theme);
    setLayout(resolved.layout);
    setEdition(resolved.edition);
    setPreset(resolved.preset);
    applyExperienceToDocument(resolved);
    persistExperienceSnapshot({
      theme: resolved.theme,
      layout: resolved.layout,
      edition: resolved.edition,
      preset: resolved.preset,
      skin: resolved.layout,
      siteVersion: resolved.edition,
    });
    void persist(
      {
        theme: resolved.theme,
        layout: resolved.layout,
        edition: resolved.edition,
        preset: next.preset ?? resolved.preset,
      },
      sourceContext,
    );
  };

  const saveCurrentSelectionAsPreset = async () => {
    const presetName = newPresetName.trim() || suggestedPresetName;

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
          savePresetName: presetName,
          sourceContext: "account_save_current_preset",
        }),
      });

      const payload = (await response.json().catch(() => null)) as PreferencesPayload | null;
      if (!response.ok || !payload) {
        throw new Error("Could not save current selection as a preset");
      }

      setNewPresetName("");
      hydrate(payload);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : String(saveError));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-xl border border-black/10 bg-black/[0.02] p-4 dark:border-white/15 dark:bg-white/[0.03] md:p-5">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] opacity-70">Experience System</p>
          <h2 className="mt-1 text-base font-semibold md:text-lg">
            Theme, edition, layout, and preset memory
          </h2>
          <p className="mt-1 text-sm opacity-75">
            Wheat & Stone now has a curated experience system. Theme controls the material feel,
            edition controls the art direction, layout controls the page choreography, and presets
            bundle the strongest combinations together.
          </p>
        </div>
        <div className="text-sm opacity-70">{saving ? "Saving…" : loading ? "Loading…" : "Synced"}</div>
      </div>

      {error ? (
        <div className="mt-4 rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-3 text-sm text-amber-100">
          {error}
        </div>
      ) : null}

      <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <div className="min-w-0 space-y-4">
          <div className="rounded-lg border border-black/10 px-3 py-4 dark:border-white/15">
            <p className="text-xs uppercase tracking-[0.18em] opacity-65">Theme</p>
            <div className="mt-3">
              <ThemeCircles
                value={theme}
                onChange={(nextTheme) =>
                  applySelection({ theme: nextTheme }, "account_theme_selector")
                }
              />
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <div className="min-w-0 rounded-lg border border-black/10 px-3 py-4 dark:border-white/15">
              <p className="text-xs uppercase tracking-[0.18em] opacity-65">Layout</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                {SITE_LAYOUT_OPTIONS.map((option) => {
                  const active = option.value === layout;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() =>
                        applySelection({ layout: option.value }, "account_layout_selector")
                      }
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

            <div className="min-w-0 rounded-lg border border-black/10 px-3 py-4 dark:border-white/15">
              <p className="text-xs uppercase tracking-[0.18em] opacity-65">Edition</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                {SITE_EDITION_OPTIONS.map((option) => {
                  const active = option.value === edition;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() =>
                        applySelection({ edition: option.value }, "account_edition_selector")
                      }
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

          <div className="rounded-lg border border-black/10 px-3 py-4 dark:border-white/15">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
              <div className="min-w-0 flex-1">
                <p className="text-xs uppercase tracking-[0.18em] opacity-65">
                  Save current selection as preset
                </p>
                <p className="mt-1 text-sm opacity-75">
                  Freeze this `Theme / Edition / Layout` blend into a reusable preset without
                  losing the curated system around it.
                </p>
                <input
                  type="text"
                  value={newPresetName}
                  onChange={(event) => setNewPresetName(event.target.value)}
                  placeholder={suggestedPresetName}
                  className="mt-3 w-full rounded-xl border border-black/10 bg-transparent px-3 py-2 text-sm dark:border-white/15"
                />
              </div>
              <button
                type="button"
                onClick={() => void saveCurrentSelectionAsPreset()}
                disabled={saving}
                className="inline-flex items-center justify-center rounded-xl border border-amber-400/50 bg-amber-400/12 px-4 py-2 text-sm font-medium transition hover:bg-amber-400/18 disabled:opacity-60"
              >
                Save current selection
              </button>
            </div>
          </div>

          <div className="rounded-lg border border-black/10 px-3 py-4 dark:border-white/15">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] opacity-65">Preset</p>
                <p className="mt-1 text-sm opacity-75">
                  Layout and edition lead the system. Presets are the reusable blends you keep.
                </p>
              </div>
              {selectedPreset ? (
                <span
                  className={`rounded-full border px-2 py-1 text-[11px] uppercase tracking-[0.14em] ${statusTone(
                    selectedPreset.status,
                  )}`}
                >
                  {selectedPreset.status}
                </span>
              ) : null}
            </div>

            {userPresetCatalog.length > 0 ? (
              <div className="mt-4">
                <p className="text-xs uppercase tracking-[0.16em] opacity-60">Saved presets</p>
                <div className="mt-2 grid gap-2">
                  {userPresetCatalog.map((option) => {
                    const active =
                      option.value === preset &&
                      option.theme === theme &&
                      option.edition === edition &&
                      option.layout === layout;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() =>
                          applySelection({ preset: option.value }, "account_saved_preset_selector")
                        }
                        className={`min-w-0 rounded-xl border px-3 py-3 text-left transition ${
                          active
                            ? "border-sky-400/55 bg-sky-500/10"
                            : "border-black/10 dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/5"
                        }`}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <p className="min-w-0 break-words font-medium">{option.label}</p>
                          <span className="text-[11px] uppercase tracking-[0.14em] opacity-60">
                            {getThemeLabel(option.theme)} · {getEditionLabel(option.edition)} ·{" "}
                            {getLayoutLabel(option.layout)}
                          </span>
                        </div>
                        <p className="mt-1 text-sm opacity-75">{option.summary}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            <div className="mt-4">
              <p className="text-xs uppercase tracking-[0.16em] opacity-60">Curated presets</p>
              <div className="mt-2 grid gap-2">
                {SITE_PRESET_OPTIONS.map((option) => {
                  const active =
                    option.value === preset &&
                    option.theme === theme &&
                    option.edition === edition &&
                    option.layout === layout;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() =>
                        applySelection({ preset: option.value }, "account_preset_selector")
                      }
                      className={`min-w-0 rounded-xl border px-3 py-3 text-left transition ${
                        active
                          ? "border-amber-400/60 bg-amber-400/12"
                          : "border-black/10 dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/5"
                      }`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <p className="min-w-0 break-words font-medium">{option.label}</p>
                        <span className="text-[11px] uppercase tracking-[0.14em] opacity-60">
                          {getThemeLabel(option.theme)} · {getEditionLabel(option.edition)} ·{" "}
                          {getLayoutLabel(option.layout)}
                        </span>
                      </div>
                      <p className="mt-1 text-sm opacity-75">{option.summary}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {option.supportedPages.slice(0, 4).map((page) => (
                          <span
                            key={page}
                            className="rounded-full border border-black/10 px-2 py-1 text-[11px] opacity-75 dark:border-white/15"
                          >
                            {getExperiencePageOption(page)?.label ?? page}
                          </span>
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-black/10 px-3 py-4 dark:border-white/15">
            <p className="text-xs uppercase tracking-[0.18em] opacity-65">Experience pack</p>
            <p className="mt-1 text-sm opacity-75">
              Separate from presets. Packs are alternate mockup families and preview routes we can
              publish as living design experiments.
            </p>
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
                <p className="font-medium">Flagship live site</p>
                <p className="mt-1 text-sm opacity-75">
                  Stay on the production experience rather than an alternate mockup pack.
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
        </div>

        <div className="min-w-0 space-y-4">
          <div className="min-w-0 rounded-lg border border-black/10 px-3 py-4 dark:border-white/15">
            <p className="text-xs uppercase tracking-[0.18em] opacity-65">Current selection</p>
            <div className="mt-3 space-y-3">
              <div className="rounded-xl border border-black/10 px-3 py-3 dark:border-white/15">
                <p className="text-sm font-semibold break-words">
                  {selectedPreset?.label ??
                    `${getThemeLabel(theme)} / ${getEditionLabel(edition)} / ${getLayoutLabel(layout)}`}
                </p>
                <p className="mt-1 text-sm leading-relaxed opacity-75">
                  {selectedPreset?.summary ??
                    "Custom blend built from your current theme, edition, and layout."}
                </p>
              </div>
              <div className="grid gap-2 sm:grid-cols-3">
                {[
                  ["Theme", getThemeLabel(theme)],
                  ["Edition", getEditionLabel(edition)],
                  ["Layout", getLayoutLabel(layout)],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-lg border border-black/10 px-3 py-3 dark:border-white/15"
                  >
                    <p className="text-xs uppercase tracking-[0.16em] opacity-60">{label}</p>
                    <p className="mt-1 font-medium break-words">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="min-w-0 rounded-lg border border-black/10 px-3 py-4 dark:border-white/15">
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

          <div className="min-w-0 rounded-lg border border-black/10 px-3 py-4 dark:border-white/15">
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
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                      <p className="min-w-0 break-words font-medium">{entry.nextValue}</p>
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
