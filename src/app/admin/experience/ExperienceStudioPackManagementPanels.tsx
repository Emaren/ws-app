import type { PackDraft, StudioPayload } from "./experienceStudioSupport";

type Props = {
  payload: StudioPayload | null;
  loading: boolean;
  isPending: boolean;
  selectedPackId: string | null;
  packDraft: PackDraft;
  statusCatalog: StudioPayload["statusCatalog"];
  onPackDraftChange: (next: Partial<PackDraft>) => void;
  onCreatePack: () => void;
  onSelectPack: (packId: string) => void;
};

export default function ExperienceStudioPackManagementPanels({
  payload,
  loading,
  isPending,
  selectedPackId,
  packDraft,
  statusCatalog,
  onPackDraftChange,
  onCreatePack,
  onSelectPack,
}: Props) {
  return (
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
              onChange={(event) => onPackDraftChange({ name: event.target.value })}
              placeholder="Rustic Canada"
              className="admin-surface mt-2 w-full rounded-xl px-3 py-2.5"
            />
          </label>

          <label className="block">
            <span className="text-xs uppercase tracking-[0.16em] opacity-65">Slug</span>
            <input
              value={packDraft.slug}
              onChange={(event) => onPackDraftChange({ slug: event.target.value })}
              placeholder="rustic-canada-v1"
              className="admin-surface mt-2 w-full rounded-xl px-3 py-2.5"
            />
          </label>

          <label className="block">
            <span className="text-xs uppercase tracking-[0.16em] opacity-65">Description</span>
            <textarea
              value={packDraft.description}
              onChange={(event) => onPackDraftChange({ description: event.target.value })}
              rows={4}
              placeholder="Warm, heritage-driven marketplace concept."
              className="admin-surface mt-2 w-full rounded-xl px-3 py-2.5"
            />
          </label>

          <label className="block">
            <span className="text-xs uppercase tracking-[0.16em] opacity-65">Status</span>
            <select
              value={packDraft.status}
              onChange={(event) =>
                onPackDraftChange({
                  status: event.target.value as PackDraft["status"],
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

          <label className="flex items-center gap-3 rounded-xl border border-white/10 px-3 py-3">
            <input
              type="checkbox"
              checked={packDraft.isSelectable}
              onChange={(event) => onPackDraftChange({ isSelectable: event.target.checked })}
            />
            <div>
              <p className="font-medium">Selectable in account settings</p>
              <p className="mt-0.5 text-xs opacity-70">
                Turn this on when you want members to choose the pack.
              </p>
            </div>
          </label>

          <div className="rounded-xl border border-dashed border-white/10 px-3 py-3 text-sm opacity-75">
            Create the pack first, then upload the actual page mockup on the right. The first page
            mockup automatically becomes the pack poster unless you override it later.
          </div>

          <button
            type="button"
            onClick={onCreatePack}
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
                  onClick={() => onSelectPack(pack.id)}
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
  );
}
