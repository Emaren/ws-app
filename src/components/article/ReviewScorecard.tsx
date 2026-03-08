import type { ReviewProfile } from "@prisma/client";

function scoreLabel(score: number | null): string {
  if (score === null) return "Awaiting score";
  if (score >= 90) return "Elite organic pick";
  if (score >= 80) return "Strong buy";
  if (score >= 70) return "Worth considering";
  if (score >= 60) return "Mixed result";
  return "Needs work";
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  if (!value) return null;

  return (
    <div className="rounded-2xl border border-neutral-800/80 bg-black/25 p-4">
      <div className="text-xs uppercase tracking-[0.2em] opacity-60">{label}</div>
      <p className="mt-2 text-sm leading-6 opacity-90">{value}</p>
    </div>
  );
}

export default function ReviewScorecard({
  profile,
}: {
  profile?: ReviewProfile | null;
}) {
  if (!profile) return null;

  const score = typeof profile.reviewScore === "number" ? profile.reviewScore : null;

  return (
    <section className="mb-8 md:mb-10 rounded-[2rem] border border-amber-200/15 bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.18),_rgba(10,10,10,0.96)_58%)] p-6 md:p-8">
      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          <div className="text-xs uppercase tracking-[0.35em] opacity-65">Review Snapshot</div>
          <div className="space-y-3">
            <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
              {profile.productName}
            </h2>
            <p className="max-w-3xl text-base leading-7 opacity-85 md:text-lg">
              {profile.verdict ||
                "This review now carries structured product guidance, which means Wheat & Stone can reuse it across search, comparisons, offers, and local commerce."}
            </p>
          </div>

          <div className="flex flex-wrap gap-2 text-xs uppercase tracking-[0.18em] opacity-75">
            {profile.brandName && (
              <span className="rounded-full border border-neutral-700 px-3 py-1">
                Brand: {profile.brandName}
              </span>
            )}
            {profile.category && (
              <span className="rounded-full border border-neutral-700 px-3 py-1">
                {profile.category}
              </span>
            )}
            {profile.organicStatus && (
              <span className="rounded-full border border-amber-200/30 bg-amber-200/10 px-3 py-1 text-amber-100">
                {profile.organicStatus}
              </span>
            )}
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-amber-200/20 bg-black/35 p-5">
          <div className="text-xs uppercase tracking-[0.3em] opacity-60">Wheat & Stone Score</div>
          <div className="mt-3 flex items-end gap-3">
            <div className="text-5xl font-semibold tracking-tight">{score ?? "--"}</div>
            <div className="pb-1 text-sm opacity-65">/100</div>
          </div>
          <div className="mt-2 text-sm font-medium text-amber-100">{scoreLabel(score)}</div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <DetailRow label="Best For" value={profile.recommendedFor} />
        <DetailRow label="Skip If" value={profile.avoidFor} />
        <DetailRow label="Local Buy Note" value={profile.localAvailability} />
      </div>
    </section>
  );
}
