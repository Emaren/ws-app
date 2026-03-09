"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import type { ExperiencePackStatus } from "@prisma/client";

type StudioPayload = {
  packs: Array<{
    id: string;
    slug: string;
    name: string;
    description: string | null;
    coverImageUrl: string | null;
    status: ExperiencePackStatus;
    isSelectable: boolean;
    sortOrder: number;
    previewablePageCount: number;
    activeUserCount: number;
    createdAt: string;
    updatedAt: string;
    pages: Array<{
      id: string;
      routeKey: string;
      title: string;
      notes: string | null;
      viewportLabel: string | null;
      imageUrl: string;
      originalFilename: string | null;
      fileSizeBytes: number | null;
      isPublished: boolean;
      previewHref: string;
      routeLabel: string;
      pathname: string;
      updatedAt: string;
    }>;
  }>;
  routeCatalog: Array<{
    key: string;
    label: string;
    pathname: string;
    summary: string;
  }>;
  statusCatalog: Array<{
    value: ExperiencePackStatus;
    label: string;
    summary: string;
  }>;
};

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "-";
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) ? parsed.toLocaleString() : "-";
}

function formatBytes(value: number | null | undefined): string {
  if (!value || !Number.isFinite(value)) return "-";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

async function requestJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "message" in payload
        ? String(payload.message)
        : `Request failed (${response.status})`;
    throw new Error(message);
  }
  return payload as T;
}

export default function AdminExperienceStudio() {
  const [payload, setPayload] = useState<StudioPayload | null>(null);
  const [selectedPackId, setSelectedPackId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [packDraft, setPackDraft] = useState({
    name: "",
    slug: "",
    description: "",
    status: "DRAFT" as ExperiencePackStatus,
    isSelectable: false,
    coverImageUrl: "",
  });
  const [uploadDraft, setUploadDraft] = useState({
    experiencePackId: "",
    routeKey: "home",
    title: "",
    notes: "",
    viewportLabel: "desktop",
  });
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [coverUploadTarget, setCoverUploadTarget] = useState<"draft" | "selected" | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await requestJson<StudioPayload>("/api/admin/experience/studio", {
        method: "GET",
        cache: "no-store",
      });
      setPayload(data);
      setSelectedPackId((current) => current ?? data.packs[0]?.id ?? null);
      setUploadDraft((current) => ({
        ...current,
        experiencePackId: current.experiencePackId || data.packs[0]?.id || "",
      }));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : String(loadError));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const selectedPack = useMemo(
    () => payload?.packs.find((pack) => pack.id === selectedPackId) ?? null,
    [payload, selectedPackId],
  );

  const routeCatalog = payload?.routeCatalog ?? [];
  const statusCatalog = payload?.statusCatalog ?? [];

  const updateSelectedPack = (next: Partial<typeof packDraft>) => {
    if (!selectedPack) {
      return;
    }
    setPayload((current) =>
      current
        ? {
            ...current,
            packs: current.packs.map((pack) =>
              pack.id === selectedPack.id ? { ...pack, ...next } : pack,
            ),
          }
        : current,
    );
  };

  const createPack = () => {
    startTransition(async () => {
      try {
        setError(null);
        setNotice(null);
        await requestJson("/api/admin/experience/packs", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(packDraft),
        });
        setNotice("Experience pack created.");
        setPackDraft({
          name: "",
          slug: "",
          description: "",
          status: "DRAFT",
          isSelectable: false,
          coverImageUrl: "",
        });
        await load();
      } catch (createError) {
        setError(createError instanceof Error ? createError.message : String(createError));
      }
    });
  };

  const uploadCoverImage = (file: File, target: "draft" | "selected") => {
    startTransition(async () => {
      try {
        setError(null);
        setNotice(null);
        setCoverUploadTarget(target);

        const formData = new FormData();
        formData.set("packSlug", target === "draft" ? packDraft.slug || packDraft.name : selectedPack?.slug || selectedPack?.name || "");
        formData.set("file", file);

        const uploaded = await requestJson<{
          imageUrl: string;
          originalFilename: string | null;
          fileSizeBytes: number;
        }>("/api/admin/experience/assets", {
          method: "POST",
          body: formData,
        });

        if (target === "draft") {
          setPackDraft((current) => ({
            ...current,
            coverImageUrl: uploaded.imageUrl,
          }));
        } else {
          updateSelectedPack({
            coverImageUrl: uploaded.imageUrl,
          });
        }

        setNotice("Cover image uploaded.");
      } catch (uploadError) {
        setError(uploadError instanceof Error ? uploadError.message : String(uploadError));
      } finally {
        setCoverUploadTarget(null);
      }
    });
  };

  const saveSelectedPack = () => {
    if (!selectedPack) {
      return;
    }

    startTransition(async () => {
      try {
        setError(null);
        setNotice(null);
        const currentPack = payload?.packs.find((pack) => pack.id === selectedPack.id);
        if (!currentPack) {
          return;
        }

        await requestJson(`/api/admin/experience/packs/${selectedPack.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            name: currentPack.name,
            description: currentPack.description ?? "",
            coverImageUrl: currentPack.coverImageUrl ?? "",
            status: currentPack.status,
            isSelectable: currentPack.isSelectable,
          }),
        });
        setNotice("Experience pack updated.");
        await load();
      } catch (saveError) {
        setError(saveError instanceof Error ? saveError.message : String(saveError));
      }
    });
  };

  const uploadMockup = () => {
    if (!uploadDraft.experiencePackId || !uploadFile) {
      setError("Choose a pack and a PNG/JPG/WEBP file first.");
      return;
    }

    startTransition(async () => {
      try {
        setError(null);
        setNotice(null);

        const formData = new FormData();
        formData.set("experiencePackId", uploadDraft.experiencePackId);
        formData.set("routeKey", uploadDraft.routeKey);
        formData.set("title", uploadDraft.title || uploadDraft.routeKey);
        formData.set("notes", uploadDraft.notes);
        formData.set("viewportLabel", uploadDraft.viewportLabel);
        formData.set("file", uploadFile);

        await requestJson("/api/admin/experience/pages", {
          method: "POST",
          body: formData,
        });

        setNotice("Mockup uploaded and preview route published.");
        setUploadFile(null);
        setUploadDraft((current) => ({
          ...current,
          title: "",
          notes: "",
        }));
        await load();
      } catch (uploadError) {
        setError(uploadError instanceof Error ? uploadError.message : String(uploadError));
      }
    });
  };

  return (
    <div className="space-y-4">
      <section className="admin-card overflow-hidden p-4 md:p-6">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.05fr)_360px]">
          <div className="space-y-3">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] opacity-65">Experience Studio</p>
              <h2 className="mt-1 text-2xl font-semibold md:text-3xl">
                Upload alternate page mockups and ship preview packs
              </h2>
              <p className="mt-2 max-w-3xl text-sm opacity-80 md:text-base">
                Create named front-end packs, upload static mockups for specific route targets,
                publish dedicated preview URLs, and let members choose a pack in account settings
                before any of those pages are functionally wired in.
              </p>
            </div>

            <div className="flex flex-wrap gap-3 text-xs uppercase tracking-[0.16em] opacity-65">
              <span>{payload?.packs.length ?? 0} packs</span>
              <span>
                {(payload?.packs ?? []).reduce((count, pack) => count + pack.previewablePageCount, 0)}{" "}
                published mockups
              </span>
              <span>
                {(payload?.packs ?? []).reduce((count, pack) => count + pack.activeUserCount, 0)} active user
                selections
              </span>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <div className="rounded-2xl border border-amber-300/25 bg-gradient-to-br from-amber-500/16 via-amber-500/5 to-transparent p-4">
              <p className="text-xs uppercase tracking-[0.18em] opacity-65">Published previews</p>
              <p className="mt-2 text-3xl font-semibold">
                {(payload?.packs ?? []).reduce((count, pack) => count + pack.previewablePageCount, 0)}
              </p>
              <p className="mt-1 text-sm opacity-75">
                Static route mockups that are already visible on production preview URLs.
              </p>
            </div>
            <div className="rounded-2xl border border-sky-300/20 bg-gradient-to-br from-sky-500/15 via-sky-500/4 to-transparent p-4">
              <p className="text-xs uppercase tracking-[0.18em] opacity-65">Selectable packs</p>
              <p className="mt-2 text-3xl font-semibold">
                {(payload?.packs ?? []).filter((pack) => pack.isSelectable).length}
              </p>
              <p className="mt-1 text-sm opacity-75">
                Packs that are already available in the account experience selector.
              </p>
            </div>
          </div>
        </div>

        {error ? (
          <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
            {error}
          </div>
        ) : null}

        {notice ? (
          <div className="mt-4 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
            {notice}
          </div>
        ) : null}
      </section>

      <section className="grid gap-4 2xl:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
        <div className="space-y-4">
          <article className="admin-card p-4 md:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] opacity-65">Create pack</p>
                <h3 className="mt-1 text-lg font-semibold">New experience package</h3>
              </div>
              <span className="text-xs opacity-70">{isPending ? "Saving…" : "Ready"}</span>
            </div>

            <div className="mt-4 space-y-3 text-sm">
              <label className="block">
                <span className="text-xs uppercase tracking-[0.16em] opacity-65">Pack name</span>
                <input
                  value={packDraft.name}
                  onChange={(event) =>
                    setPackDraft((current) => ({ ...current, name: event.target.value }))
                  }
                  placeholder="Rustic Canada"
                  className="admin-surface mt-2 w-full rounded-xl px-3 py-2.5"
                />
              </label>

              <label className="block">
                <span className="text-xs uppercase tracking-[0.16em] opacity-65">Slug</span>
                <input
                  value={packDraft.slug}
                  onChange={(event) =>
                    setPackDraft((current) => ({ ...current, slug: event.target.value }))
                  }
                  placeholder="rustic-canada-v1"
                  className="admin-surface mt-2 w-full rounded-xl px-3 py-2.5"
                />
              </label>

              <label className="block">
                <span className="text-xs uppercase tracking-[0.16em] opacity-65">Description</span>
                <textarea
                  value={packDraft.description}
                  onChange={(event) =>
                    setPackDraft((current) => ({ ...current, description: event.target.value }))
                  }
                  rows={4}
                  placeholder="Warm, heritage-driven marketplace concept."
                  className="admin-surface mt-2 w-full rounded-xl px-3 py-2.5"
                />
              </label>

              <div className="block">
                <span className="text-xs uppercase tracking-[0.16em] opacity-65">Cover image</span>
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
                        uploadCoverImage(file, "draft");
                        event.target.value = "";
                      }}
                    />
                    <span className="admin-surface flex min-h-[72px] w-full cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-3 transition group-hover:border-amber-300/35 group-hover:bg-white/[0.05]">
                      <span className="min-w-0">
                        <span className="block truncate text-sm">
                          {packDraft.coverImageUrl || "Click to select a cover image"}
                        </span>
                        <span className="mt-1 block text-xs opacity-65">
                          {coverUploadTarget === "draft"
                            ? "Uploading cover image…"
                            : "PNG, JPG, or WEBP. Click anywhere in this field to browse files."}
                        </span>
                      </span>
                      <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.16em] opacity-75">
                        Browse
                      </span>
                    </span>
                  </label>
                </span>
              </div>

              {packDraft.coverImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={packDraft.coverImageUrl}
                  alt="Draft pack cover"
                  className="h-40 w-full rounded-2xl border border-white/10 object-cover"
                />
              ) : null}

              <label className="block">
                <span className="text-xs uppercase tracking-[0.16em] opacity-65">Status</span>
                <select
                  value={packDraft.status}
                  onChange={(event) =>
                    setPackDraft((current) => ({
                      ...current,
                      status: event.target.value as ExperiencePackStatus,
                    }))
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

              <label className="flex items-center gap-3 rounded-xl border border-white/10 px-3 py-3">
                <input
                  type="checkbox"
                  checked={packDraft.isSelectable}
                  onChange={(event) =>
                    setPackDraft((current) => ({
                      ...current,
                      isSelectable: event.target.checked,
                    }))
                  }
                />
                <div>
                  <p className="font-medium">Selectable in account settings</p>
                  <p className="mt-0.5 text-xs opacity-70">
                    Turn this on when you want members to choose the pack.
                  </p>
                </div>
              </label>

              <button
                type="button"
                onClick={createPack}
                disabled={isPending}
                className="inline-flex items-center rounded-xl border border-amber-300/35 bg-amber-200/12 px-4 py-2 text-sm font-medium text-amber-100 transition hover:bg-amber-200/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Create experience pack
              </button>
            </div>
          </article>

          <article className="admin-card p-4 md:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] opacity-65">Pack roster</p>
                <h3 className="mt-1 text-lg font-semibold">All experience packs</h3>
              </div>
              <span className="text-xs opacity-70">{payload?.packs.length ?? 0} total</span>
            </div>

            <div className="mt-4 space-y-2">
              {loading ? (
                <div className="rounded-xl border border-white/10 px-4 py-5 text-sm opacity-75">
                  Loading experience studio…
                </div>
              ) : payload?.packs.length ? (
                payload.packs.map((pack) => {
                  const active = pack.id === selectedPackId;
                  return (
                    <button
                      key={pack.id}
                      type="button"
                      onClick={() => {
                        setSelectedPackId(pack.id);
                        setUploadDraft((current) => ({
                          ...current,
                          experiencePackId: pack.id,
                        }));
                      }}
                      className={`w-full rounded-2xl border px-4 py-4 text-left transition ${
                        active
                          ? "border-amber-400/60 bg-amber-400/10"
                          : "border-white/10 bg-white/[0.03] hover:border-amber-300/35 hover:bg-white/[0.05]"
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-medium">{pack.name}</p>
                        <span className="text-xs uppercase tracking-[0.16em] opacity-65">
                          {pack.status}
                        </span>
                      </div>
                      <p className="mt-1 text-sm opacity-75">{pack.slug}</p>
                      <div className="mt-2 flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.14em] opacity-60">
                        <span>{pack.previewablePageCount} pages</span>
                        <span>{pack.activeUserCount} active users</span>
                        {pack.isSelectable ? <span>selectable</span> : <span>admin preview only</span>}
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="rounded-xl border border-dashed border-white/10 px-4 py-5 text-sm opacity-75">
                  No experience packs yet.
                </div>
              )}
            </div>
          </article>
        </div>

        <div className="min-w-0 space-y-4">
          <article className="admin-card p-4 md:p-5">
            <div className="max-w-3xl space-y-4">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] opacity-65">Upload mockup</p>
                    <h3 className="mt-1 text-lg font-semibold">Assign static art to a real route target</h3>
                  </div>
                  <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.16em] opacity-70">
                    Preview-only publishing
                  </span>
                </div>
                <p className="max-w-2xl text-sm opacity-75">
                  This is the fast mockup lane. Upload a static concept, map it to a canonical
                  route, and get a production preview URL without wiring any live functionality yet.
                </p>
              </div>

              <div className="grid gap-3">
                <label className="block">
                  <span className="text-xs uppercase tracking-[0.16em] opacity-65">Experience pack</span>
                  <select
                    value={uploadDraft.experiencePackId}
                    onChange={(event) =>
                      setUploadDraft((current) => ({
                        ...current,
                        experiencePackId: event.target.value,
                      }))
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
                      setUploadDraft((current) => ({
                        ...current,
                        routeKey: event.target.value,
                      }))
                    }
                    className="admin-surface mt-2 w-full rounded-xl px-3 py-2.5"
                  >
                    {routeCatalog.map((route) => (
                      <option key={route.key} value={route.key}>
                        {route.label} ({route.pathname})
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="text-xs uppercase tracking-[0.16em] opacity-65">Mockup title</span>
                  <input
                    value={uploadDraft.title}
                    onChange={(event) =>
                      setUploadDraft((current) => ({ ...current, title: event.target.value }))
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
                      setUploadDraft((current) => ({
                        ...current,
                        viewportLabel: event.target.value,
                      }))
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
                      setUploadDraft((current) => ({ ...current, notes: event.target.value }))
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
                    onChange={(event) => setUploadFile(event.target.files?.[0] ?? null)}
                    className="mt-2 block w-full text-sm opacity-80"
                  />
                </label>

                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={uploadMockup}
                    disabled={isPending}
                    className="inline-flex items-center rounded-xl border border-emerald-300/35 bg-emerald-200/12 px-4 py-2 text-sm font-medium text-emerald-100 transition hover:bg-emerald-200/20 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Upload mockup and publish preview
                  </button>
                  <span className="text-sm opacity-65">
                    The uploaded image becomes a live preview page immediately.
                  </span>
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
                      onChange={(event) =>
                        updateSelectedPack({ name: event.target.value })
                      }
                      className="admin-surface mt-2 w-full rounded-xl px-3 py-2.5"
                    />
                  </label>

                  <label className="block">
                    <span className="text-xs uppercase tracking-[0.16em] opacity-65">Description</span>
                    <textarea
                      value={selectedPack.description ?? ""}
                      onChange={(event) =>
                        updateSelectedPack({ description: event.target.value })
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
                          updateSelectedPack({
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
                      <span className="text-xs uppercase tracking-[0.16em] opacity-65">Cover image</span>
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
                              uploadCoverImage(file, "selected");
                              event.target.value = "";
                            }}
                          />
                          <span className="admin-surface flex min-h-[72px] w-full cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-3 transition group-hover:border-sky-300/35 group-hover:bg-white/[0.05]">
                            <span className="min-w-0">
                              <span className="block truncate text-sm">
                                {selectedPack.coverImageUrl || "Click to select a cover image"}
                              </span>
                              <span className="mt-1 block text-xs opacity-65">
                                {coverUploadTarget === "selected"
                                  ? "Uploading cover image…"
                                  : "PNG, JPG, or WEBP. Click anywhere in this field to browse files."}
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
                        updateSelectedPack({ isSelectable: event.target.checked })
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
                    onClick={saveSelectedPack}
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
                          <a
                            href={page.previewHref}
                            className="rounded-full border border-amber-300/35 bg-amber-200/12 px-3 py-1 text-xs font-medium text-amber-100 transition hover:bg-amber-200/20"
                          >
                            Open preview
                          </a>
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

                        {page.notes ? (
                          <p className="mt-3 text-sm opacity-75">{page.notes}</p>
                        ) : null}
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
      </section>
    </div>
  );
}
