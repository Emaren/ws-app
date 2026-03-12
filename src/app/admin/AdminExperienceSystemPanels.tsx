"use client";

import {
  EXPERIENCE_EDITION_OPTIONS,
  EXPERIENCE_LAYOUT_OPTIONS,
  EXPERIENCE_PAGE_DEFAULT_PRESETS,
  EXPERIENCE_PRESET_OPTIONS,
  getEditionLabel,
  getExperiencePageOption,
  getExperiencePreset,
  getLayoutLabel,
} from "@/lib/experienceSystem";
import { getThemeLabel } from "@/lib/theme";

export function AdminExperienceSystemPanels({ compact = false }: { compact?: boolean }) {
  return (
    <section className="admin-surface space-y-4 rounded-xl p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">Experience System</p>
          <p className="text-xs opacity-75">
            Curated `Theme / Edition / Layout / Preset` registry for the next Wheat & Stone front
            door.
          </p>
        </div>
        <span className="rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] uppercase tracking-[0.16em] opacity-80">
          {EXPERIENCE_PRESET_OPTIONS.length} presets
        </span>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-white/10 p-3">
          <p className="text-xs uppercase tracking-[0.18em] opacity-60">Editions</p>
          <div className="mt-2 space-y-2">
            {EXPERIENCE_EDITION_OPTIONS.map((option) => (
              <div key={option.value}>
                <p className="text-sm font-medium">{option.label}</p>
                <p className="text-xs opacity-70">{option.summary}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-white/10 p-3">
          <p className="text-xs uppercase tracking-[0.18em] opacity-60">Layouts</p>
          <div className="mt-2 space-y-2">
            {EXPERIENCE_LAYOUT_OPTIONS.map((option) => (
              <div key={option.value}>
                <p className="text-sm font-medium">{option.label}</p>
                <p className="text-xs opacity-70">{option.summary}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-white/10 p-3">
          <p className="text-xs uppercase tracking-[0.18em] opacity-60">Page Defaults</p>
          <div className="mt-2 space-y-2">
            {Object.entries(EXPERIENCE_PAGE_DEFAULT_PRESETS).map(([pageKey, presetSlug]) => {
              const preset = getExperiencePreset(presetSlug);
              return (
                <div key={pageKey} className="text-sm">
                  <p className="font-medium">{getExperiencePageOption(pageKey)?.label ?? pageKey}</p>
                  <p className="text-xs opacity-70">{preset?.name ?? presetSlug}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        {EXPERIENCE_PRESET_OPTIONS.map((preset) => (
          <article key={preset.value} className="rounded-xl border border-white/10 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold">{preset.label}</p>
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[11px] uppercase tracking-[0.14em] opacity-70">
                {preset.status}
              </span>
            </div>
            <p className="mt-1 text-sm opacity-80">{preset.summary}</p>
            <p className="mt-2 text-xs uppercase tracking-[0.16em] opacity-60">
              {getThemeLabel(preset.theme)} · {getEditionLabel(preset.edition)} ·{" "}
              {getLayoutLabel(preset.layout)}
            </p>
            <div className={`mt-3 flex flex-wrap gap-2 ${compact ? "" : "max-w-2xl"}`}>
              {preset.supportedPages.map((pageKey) => (
                <span
                  key={`${preset.value}-${pageKey}`}
                  className="rounded-full border border-white/10 bg-black/20 px-2 py-1 text-[11px] opacity-75"
                >
                  {getExperiencePageOption(pageKey)?.label ?? pageKey}
                </span>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
