import type { StudioPayload } from "./experienceStudioSupport";

type Props = {
  payload: StudioPayload | null;
  error: string | null;
  notice: string | null;
};

export default function ExperienceStudioOverviewPanel({
  payload,
  error,
  notice,
}: Props) {
  const publishedPreviewCount = (payload?.packs ?? []).reduce(
    (count, pack) => count + pack.previewablePageCount,
    0,
  );
  const activeSelectionCount = (payload?.packs ?? []).reduce(
    (count, pack) => count + pack.activeUserCount,
    0,
  );
  const selectablePackCount = (payload?.packs ?? []).filter((pack) => pack.isSelectable).length;

  return (
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
            <span>{publishedPreviewCount} published mockups</span>
            <span>{activeSelectionCount} active user selections</span>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
          <div className="rounded-2xl border border-amber-300/25 bg-gradient-to-br from-amber-500/16 via-amber-500/5 to-transparent p-4">
            <p className="text-xs uppercase tracking-[0.18em] opacity-65">Published previews</p>
            <p className="mt-2 text-3xl font-semibold">{publishedPreviewCount}</p>
            <p className="mt-1 text-sm opacity-75">
              Static route mockups that are already visible on production preview URLs.
            </p>
          </div>
          <div className="rounded-2xl border border-sky-300/20 bg-gradient-to-br from-sky-500/15 via-sky-500/4 to-transparent p-4">
            <p className="text-xs uppercase tracking-[0.18em] opacity-65">Selectable packs</p>
            <p className="mt-2 text-3xl font-semibold">{selectablePackCount}</p>
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
  );
}
