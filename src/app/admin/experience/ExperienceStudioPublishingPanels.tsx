"use client";

import type { ExperiencePackStatus } from "@prisma/client";
import {
  buildImmersivePreviewHref,
  formatBytes,
  formatDateTime,
  type StudioPayload,
  type UploadDraft,
} from "./experienceStudioSupport";

type Props = {
  payload: StudioPayload | null;
  isPending: boolean;
  selectedPack: StudioPayload["packs"][number] | null;
  statusCatalog: StudioPayload["statusCatalog"];
  uploadDraft: UploadDraft;
  coverUploadTarget: "draft" | "selected" | null;
  latestPreview: {
    href: string;
    label: string;
  } | null;
  pendingPreviewHref: string | null;
  uploadRoute: StudioPayload["routeCatalog"][number] | null;
  onUploadDraftChange: (next: Partial<UploadDraft>) => void;
  onUploadFileChange: (file: File | null) => void;
  onUploadMockup: () => void;
  onUpdateSelectedPack: (
    next: Partial<{
      name: string;
      description: string | null;
      coverImageUrl: string | null;
      status: ExperiencePackStatus;
      isSelectable: boolean;
    }>,
  ) => void;
  onUploadSelectedCover: (file: File) => void;
  onSaveSelectedPack: () => void;
};

export default function ExperienceStudioPublishingPanels({
  payload,
  isPending,
  selectedPack,
  statusCatalog,
  uploadDraft,
  coverUploadTarget,
  latestPreview,
  pendingPreviewHref,
  uploadRoute,
  onUploadDraftChange,
  onUploadFileChange,
  onUploadMockup,
  onUpdateSelectedPack,
  onUploadSelectedCover,
  onSaveSelectedPack,
}: Props) {
  return (
    <div className="min-w-0 space-y-4">
      <article className="admin-card p-4 md:p-5">
        <div className="max-w-3xl space-y-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] opacity-65">
                  Upload page mockup
                </p>
                <h3 className="mt-1 text-lg font-semibold">
                  Assign static art to a real route target
                </h3>
              </div>
              <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.16em] opacity-70">
                Preview-only publishing
              </span>
            </div>
            <p className="max-w-2xl text-sm opacity-75">
              This is the fast mockup lane. Upload a static concept, map it to a canonical route,
              and get a production preview URL without wiring any live functionality yet.
            </p>
          </div>

          <div className="grid gap-3">
            <label className="block">
              <span className="text-xs uppercase tracking-[0.16em] opacity-65">
                Experience pack
              </span>
              <select
                value={uploadDraft.experiencePackId}
                onChange={(event) =>
                  onUploadDraftChange({
                    experiencePackId: event.target.value,
                  })
                }
                className="admin-surface mt-2 w-full rounded-xl px-3 py-2.5"
              >
                <option value="">Select a pack</option>
                {(payload?.packs ?? []).map((pack) => (
                  <option key={pack.id} value={pack.id}>
                    {pack.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-xs uppercase tracking-[0.16em] opacity-65">Route target</span>
              <select
                value={uploadDraft.routeKey}
                onChange={(event) =>
                  onUploadDraftChange({
                    routeKey: event.target.value,
                  })
                }
                className="admin-surface mt-2 w-full rounded-xl px-3 py-2.5"
              >
                {payload?.routeCatalog.map((route) => (
                  <option key={route.key} value={route.key}>
                    {route.label} ({route.pathname})
                  </option>
                ))}
              </select>
            </label>

            <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm">
              <p className="text-xs uppercase tracking-[0.16em] opacity-60">Preview route</p>
              <div className="mt-2 space-y-2">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.16em] opacity-55">
                    Standard review view
                  </p>
                  <p className="mt-1 font-medium">
                    {pendingPreviewHref ?? "Create or select a pack to generate the preview URL"}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.16em] opacity-55">
                    Full-screen app view
                  </p>
                  <p className="mt-1 font-medium">
                    {pendingPreviewHref
                      ? buildImmersivePreviewHref(pendingPreviewHref)
                      : "Create or select a pack to generate the immersive preview URL"}
                  </p>
                </div>
              </div>
              <p className="mt-2 opacity-75">
                {!uploadRoute
                  ? "Pick a route target to see where the preview will live and which real page it represents."
                  : uploadRoute.pathname === "/"
                    ? `This mockup will preview at ${pendingPreviewHref ?? "-"} and represents the live homepage /. The route key is home, but there is no /home page.`
                    : `This mockup will preview at ${pendingPreviewHref ?? "-"} and represents the live page ${uploadRoute.pathname}. The /app version removes the explanation chrome so you can feel the page full-screen.`}
              </p>
            </div>

            <label className="block">
              <span className="text-xs uppercase tracking-[0.16em] opacity-65">Mockup title</span>
              <input
                value={uploadDraft.title}
                onChange={(event) =>
                  onUploadDraftChange({
                    title: event.target.value,
                  })
                }
                placeholder="Rustic Canada homepage"
                className="admin-surface mt-2 w-full rounded-xl px-3 py-2.5"
              />
            </label>

            <label className="block">
              <span className="text-xs uppercase tracking-[0.16em] opacity-65">Viewport</span>
              <input
                value={uploadDraft.viewportLabel}
                onChange={(event) =>
                  onUploadDraftChange({
                    viewportLabel: event.target.value,
                  })
                }
                placeholder="desktop"
                className="admin-surface mt-2 w-full rounded-xl px-3 py-2.5"
              />
            </label>

            <label className="block">
              <span className="text-xs uppercase tracking-[0.16em] opacity-65">Notes</span>
              <textarea
                value={uploadDraft.notes}
                onChange={(event) =>
                  onUploadDraftChange({
                    notes: event.target.value,
                  })
                }
                rows={4}
                placeholder="Static art-only concept for homepage hero and card treatments."
                className="admin-surface mt-2 w-full rounded-xl px-3 py-2.5"
              />
            </label>

            <label className="block">
              <span className="text-xs uppercase tracking-[0.16em] opacity-65">PNG / JPG / WEBP</span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(event) => onUploadFileChange(event.target.files?.[0] ?? null)}
                className="mt-2 block w-full text-sm opacity-80"
              />
            </label>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                onClick={onUploadMockup}
                disabled={isPending}
                className="inline-flex items-center rounded-xl border border-emerald-300/35 bg-emerald-200/12 px-4 py-2 text-sm font-medium text-emerald-100 transition hover:bg-emerald-200/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Upload mockup and publish preview
              </button>
              <span className="text-sm opacity-65">
                The uploaded image becomes a live preview page immediately.
              </span>
              {latestPreview ? (
                <>
                  <a
                    href={latestPreview.href}
                    className="inline-flex items-center rounded-xl border border-amber-300/35 bg-amber-200/12 px-4 py-2 text-sm font-medium text-amber-100 transition hover:bg-amber-200/18"
                  >
                    Open latest preview
                  </a>
                  <a
                    href={buildImmersivePreviewHref(latestPreview.href)}
                    className="inline-flex items-center rounded-xl border border-white/15 px-4 py-2 text-sm font-medium transition hover:bg-white/5"
                  >
                    Open full-screen view
                  </a>
                </>
              ) : null}
            </div>
          </div>
        </div>
      </article>

      <article className="admin-card p-4 md:p-5">
        <div className="space-y-3">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] opacity-65">How it works</p>
            <h3 className="mt-1 text-lg font-semibold">Preview-pack publishing flow</h3>
          </div>
          <div className="grid gap-3 xl:grid-cols-2">
            {[
              "Create a named pack for the overall visual direction.",
              "Upload one mockup per canonical route target.",
              "Open the generated preview URL on production.",
              "Mark the pack selectable when members should be allowed to choose it.",
            ].map((step, index) => (
              <div
                key={step}
                className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4"
              >
                <p className="text-xs uppercase tracking-[0.16em] opacity-55">
                  Step {index + 1}
                </p>
                <p className="mt-2 text-sm opacity-80">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </article>

      {selectedPack ? (
        <article className="admin-card p-4 md:p-5">
          <div className="space-y-4">
            <div className="min-w-0 space-y-3">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] opacity-65">Selected pack</p>
                <h3 className="mt-1 text-2xl font-semibold">{selectedPack.name}</h3>
                <p className="mt-1 text-sm opacity-75">{selectedPack.slug}</p>
              </div>

              <label className="block">
                <span className="text-xs uppercase tracking-[0.16em] opacity-65">Name</span>
                <input
                  value={selectedPack.name}
                  onChange={(event) => onUpdateSelectedPack({ name: event.target.value })}
                  className="admin-surface mt-2 w-full rounded-xl px-3 py-2.5"
                />
              </label>

              <label className="block">
                <span className="text-xs uppercase tracking-[0.16em] opacity-65">Description</span>
                <textarea
                  value={selectedPack.description ?? ""}
                  onChange={(event) =>
                    onUpdateSelectedPack({
                      description: event.target.value,
                    })
                  }
                  rows={3}
                  className="admin-surface mt-2 w-full rounded-xl px-3 py-2.5"
                />
              </label>

              <div className="grid gap-3 2xl:grid-cols-2">
                <label className="block">
                  <span className="text-xs uppercase tracking-[0.16em] opacity-65">Status</span>
                  <select
                    value={selectedPack.status}
                    onChange={(event) =>
                      onUpdateSelectedPack({
                        status: event.target.value as ExperiencePackStatus,
                      })
                    }
                    className="admin-surface mt-2 w-full rounded-xl px-3 py-2.5"
                  >
                    {statusCatalog.map((status) => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="block">
                  <span className="text-xs uppercase tracking-[0.16em] opacity-65">
                    Optional pack poster override
                  </span>
                  <span className="mt-2 block">
                    <label className="group block cursor-pointer">
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="sr-only"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (!file) {
                            return;
                          }
                          onUploadSelectedCover(file);
                          event.target.value = "";
                        }}
                      />
                      <span className="admin-surface flex min-h-[72px] w-full cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-3 transition group-hover:border-sky-300/35 group-hover:bg-white/[0.05]">
                        <span className="min-w-0">
                          <span className="block truncate text-sm">
                            {selectedPack.coverImageUrl ||
                              "Click to select an optional poster override"}
                          </span>
                          <span className="mt-1 block text-xs opacity-65">
                            {coverUploadTarget === "selected"
                              ? "Uploading pack poster..."
                              : "Only used as the pack thumbnail in selectors. Most of the time you can ignore this and just upload route mockups above."}
                          </span>
                        </span>
                        <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.16em] opacity-75">
                          Browse
                        </span>
                      </span>
                    </label>
                  </span>
                </div>
              </div>

              {selectedPack.coverImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={selectedPack.coverImageUrl}
                  alt={`${selectedPack.name} cover`}
                  className="h-44 w-full rounded-2xl border border-white/10 object-cover"
                />
              ) : null}

              <label className="flex items-center gap-3 rounded-xl border border-white/10 px-3 py-3">
                <input
                  type="checkbox"
                  checked={selectedPack.isSelectable}
                  onChange={(event) =>
                    onUpdateSelectedPack({
                      isSelectable: event.target.checked,
                    })
                  }
                />
                <div>
                  <p className="font-medium">Selectable in account settings</p>
                  <p className="mt-0.5 text-xs opacity-70">
                    Members can choose this pack by name.
                  </p>
                </div>
              </label>

              <button
                type="button"
                onClick={onSaveSelectedPack}
                disabled={isPending}
                className="inline-flex items-center rounded-xl border border-sky-300/35 bg-sky-200/12 px-4 py-2 text-sm font-medium text-sky-100 transition hover:bg-sky-200/18 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Save selected pack
              </button>
            </div>

            <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm">
              <p className="text-xs uppercase tracking-[0.18em] opacity-65">Pack telemetry</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-white/10 px-3 py-3">
                  <p className="text-xs uppercase tracking-[0.16em] opacity-65">Published pages</p>
                  <p className="mt-1 text-2xl font-semibold">{selectedPack.previewablePageCount}</p>
                </div>
                <div className="rounded-xl border border-white/10 px-3 py-3">
                  <p className="text-xs uppercase tracking-[0.16em] opacity-65">Active users</p>
                  <p className="mt-1 text-2xl font-semibold">{selectedPack.activeUserCount}</p>
                </div>
                <div className="rounded-xl border border-white/10 px-3 py-3">
                  <p className="text-xs uppercase tracking-[0.16em] opacity-65">Created</p>
                  <p className="mt-1 font-medium">{formatDateTime(selectedPack.createdAt)}</p>
                </div>
                <div className="rounded-xl border border-white/10 px-3 py-3">
                  <p className="text-xs uppercase tracking-[0.16em] opacity-65">Updated</p>
                  <p className="mt-1 font-medium">{formatDateTime(selectedPack.updatedAt)}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] opacity-65">Pack pages</p>
                <h4 className="mt-1 text-lg font-semibold">Published preview surfaces</h4>
              </div>
              <span className="text-xs opacity-70">{selectedPack.pages.length} page mockups</span>
            </div>

            {selectedPack.pages.length ? (
              <div className="grid gap-3 xl:grid-cols-2">
                {selectedPack.pages.map((page) => (
                  <article
                    key={page.id}
                    className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-medium">{page.title}</p>
                        <p className="mt-1 text-sm opacity-75">
                          {page.routeLabel} · {page.pathname}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <a
                          href={page.previewHref}
                          className="rounded-full border border-amber-300/35 bg-amber-200/12 px-3 py-1 text-xs font-medium text-amber-100 transition hover:bg-amber-200/20"
                        >
                          Open preview
                        </a>
                        <a
                          href={buildImmersivePreviewHref(page.previewHref)}
                          className="rounded-full border border-white/15 px-3 py-1 text-xs font-medium transition hover:bg-white/5"
                        >
                          Full screen
                        </a>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.14em] opacity-60">
                      <span>{page.viewportLabel || "desktop"}</span>
                      <span>{formatBytes(page.fileSizeBytes)}</span>
                      {page.originalFilename ? <span>{page.originalFilename}</span> : null}
                    </div>

                    {page.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={page.imageUrl}
                        alt={page.title}
                        className="mt-4 h-52 w-full rounded-2xl border border-white/10 object-cover object-top"
                      />
                    ) : null}

                    {page.notes ? <p className="mt-3 text-sm opacity-75">{page.notes}</p> : null}
                  </article>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-white/10 px-4 py-5 text-sm opacity-75">
                This pack does not have any uploaded page mockups yet.
              </div>
            )}
          </div>
        </article>
      ) : (
        <div className="admin-card px-4 py-10 text-center text-sm opacity-75">
          Select an experience pack to manage its mockup pages.
        </div>
      )}
    </div>
  );
}
