import Link from "next/link";
import { notFound } from "next/navigation";
import { findExperiencePreviewByPackAndRoute } from "@/lib/experienceStudioServer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ExperiencePreviewPage(
  props: { params: Promise<{ packSlug: string; routeKey: string }> },
) {
  const { packSlug, routeKey } = await props.params;
  const preview = await findExperiencePreviewByPackAndRoute({ packSlug, routeKey });

  if (!preview) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[#110c09] text-[#f6ead8]">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-5 px-4 py-4 md:px-6 md:py-6">
        <section className="rounded-[2rem] border border-amber-200/20 bg-[linear-gradient(135deg,rgba(250,204,21,0.12),rgba(18,12,9,0.92)_55%)] px-5 py-4 md:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.28em] text-amber-100/70">
                Experience Preview
              </p>
              <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
                {preview.page.experiencePack.name} · {preview.page.title}
              </h1>
              <p className="max-w-3xl text-sm leading-6 text-amber-50/75 md:text-base">
                Static uploaded mockup for the <strong>{preview.route?.label ?? routeKey}</strong>{" "}
                surface. This page is intentionally non-functional so you can review the visual
                direction before wiring it into the live front end.
              </p>
            </div>

            <div className="flex flex-wrap gap-3 text-sm">
              <Link
                href={preview.route?.pathname ?? "/"}
                className="inline-flex items-center rounded-xl border border-white/15 px-4 py-2 transition hover:bg-white/5"
              >
                Open live page
              </Link>
              <Link
                href="/account"
                className="inline-flex items-center rounded-xl border border-amber-300/35 bg-amber-200/12 px-4 py-2 text-amber-100 transition hover:bg-amber-200/18"
              >
                Change pack in account
              </Link>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-3 text-xs uppercase tracking-[0.18em] text-amber-50/65">
            <span>{preview.page.experiencePack.slug}</span>
            <span>{preview.route?.pathname ?? "/"}</span>
            <span>{preview.page.viewportLabel || "desktop mockup"}</span>
            {preview.page.originalFilename ? <span>{preview.page.originalFilename}</span> : null}
          </div>
        </section>

        <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-black/30 shadow-[0_40px_120px_rgba(0,0,0,0.45)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview.page.imageUrl}
            alt={`${preview.page.title} mockup`}
            className="block w-full"
          />
        </section>
      </div>
    </main>
  );
}
