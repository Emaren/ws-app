import Link from "next/link";
import { notFound } from "next/navigation";
import ExperiencePreviewSurface from "@/components/experience/ExperiencePreviewSurface";
import { getExperiencePageOption, getExperiencePreset } from "@/lib/experienceSystem";
import { findExperiencePreviewByPackAndRoute } from "@/lib/experienceStudioServer";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default async function ExperiencePreviewPage(
  props: { params: Promise<{ packSlug: string; routeKey: string }> },
) {
  const { packSlug, routeKey } = await props.params;
  const preset = getExperiencePreset(packSlug);
  const experiencePage = getExperiencePageOption(routeKey);

  if (preset && experiencePage) {
    const params = new URLSearchParams({
      "ws-preview": "1",
      "ws-theme": preset.theme,
      "ws-edition": preset.edition,
      "ws-layout": preset.layout,
      "ws-preset": preset.slug,
    });
    const previewHref = `${experiencePage.pathname}${
      experiencePage.pathname.includes("?") ? "&" : "?"
    }${params.toString()}`;

    return (
      <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
        <div className="mx-auto flex max-w-[1800px] flex-col gap-5 px-4 py-4 md:px-6 md:py-6">
          <section className="rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(0,0,0,0.24)_55%)] px-5 py-4 md:px-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.28em] opacity-65">Preset Preview</p>
                <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
                  {preset.name} · {experiencePage.label}
                </h1>
                <p className="max-w-3xl text-sm leading-6 opacity-80 md:text-base">
                  Live-route scaffold for the curated experience system. This keeps the canonical
                  route intact while letting us preview a preset directly against a real Wheat &
                  Stone surface.
                </p>
              </div>

              <div className="flex flex-wrap gap-3 text-sm">
                <Link
                  href={previewHref}
                  className="inline-flex items-center rounded-xl border border-amber-300/35 bg-amber-200/12 px-4 py-2 text-amber-100 transition hover:bg-amber-200/18"
                >
                  Open live route
                </Link>
                <Link
                  href={experiencePage.pathname}
                  className="inline-flex items-center rounded-xl border border-white/15 px-4 py-2 transition hover:bg-white/5"
                >
                  Open canonical page
                </Link>
                <Link
                  href="/admin/experience"
                  className="inline-flex items-center rounded-xl border border-white/15 px-4 py-2 transition hover:bg-white/5"
                >
                  Experience Studio
                </Link>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-3 text-xs uppercase tracking-[0.18em] opacity-70">
              <span>{preset.slug}</span>
              <span>{preset.theme}</span>
              <span>{preset.edition}</span>
              <span>{preset.layout}</span>
              <span>{experiencePage.pathname}</span>
            </div>
          </section>

          <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-black/40 shadow-[0_40px_120px_rgba(0,0,0,0.45)]">
            <iframe
              title={`${preset.name} ${experiencePage.label} preview`}
              src={previewHref}
              className="block h-[min(82vh,1280px)] w-full border-0 bg-[var(--background)]"
            />
          </section>
        </div>
      </main>
    );
  }

  const preview = await findExperiencePreviewByPackAndRoute({ packSlug, routeKey });

  if (!preview) {
    notFound();
  }

  return <ExperiencePreviewSurface preview={preview} routeKey={routeKey} mode="framed" />;
}
