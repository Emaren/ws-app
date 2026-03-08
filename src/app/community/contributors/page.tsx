import Link from "next/link";
import { contributorRoleLabel, listPublicContributors } from "@/lib/publicCommunity";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function badgeTone(tone: "amber" | "emerald" | "sky" | "neutral") {
  switch (tone) {
    case "amber":
      return "border-amber-300/30 bg-amber-200/10 text-amber-100";
    case "emerald":
      return "border-emerald-300/30 bg-emerald-200/10 text-emerald-100";
    case "sky":
      return "border-sky-300/30 bg-sky-200/10 text-sky-100";
    default:
      return "border-white/10";
  }
}

export default async function CommunityContributorsPage() {
  const contributors = await listPublicContributors();
  const totalReviews = contributors.reduce(
    (sum, contributor) => sum + contributor.publishedReviewCount,
    0,
  );
  const totalMemberSaves = contributors.reduce(
    (sum, contributor) => sum + contributor.memberSaveCount,
    0,
  );
  const totalRoutes = contributors.reduce(
    (sum, contributor) => sum + contributor.localRouteCount,
    0,
  );
  const totalWheat = contributors.reduce(
    (sum, contributor) => sum + contributor.wheatBalance,
    0,
  );

  return (
    <main className="ws-container py-8 md:py-10">
      <div className="space-y-8">
        <section className="rounded-[2.25rem] border border-amber-200/15 bg-[radial-gradient(circle_at_top,_rgba(245,158,11,0.12),_rgba(10,10,10,0.96)_60%)] p-6 md:p-8">
          <div className="text-xs uppercase tracking-[0.3em] opacity-65">Contributors</div>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-5xl">
            Meet the public voices behind Wheat & Stone
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 opacity-85 md:text-lg">
            This directory turns authors into trusted public entities. Every contributor card now
            carries review coverage, reaction momentum, member save demand, local route activation,
            and recorded token activity.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.18em] opacity-65">Contributors</p>
              <p className="mt-2 text-3xl font-semibold">{contributors.length}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.18em] opacity-65">Published reviews</p>
              <p className="mt-2 text-3xl font-semibold">{totalReviews}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.18em] opacity-65">Member saves</p>
              <p className="mt-2 text-3xl font-semibold">{totalMemberSaves}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.18em] opacity-65">Local routes</p>
              <p className="mt-2 text-3xl font-semibold">{totalRoutes}</p>
              <p className="mt-1 text-xs opacity-60">{totalWheat} WHEAT recorded</p>
            </div>
          </div>
        </section>

        {contributors.length === 0 ? (
          <section className="rounded-[2rem] border border-dashed border-white/10 bg-black/10 px-6 py-12 text-center">
            <h2 className="text-2xl font-semibold">No public contributors yet</h2>
            <p className="mt-3 text-sm opacity-75">
              Publish reviews to begin building the contributor directory.
            </p>
          </section>
        ) : (
          <section className="grid gap-5 xl:grid-cols-2">
            {contributors.map((contributor, index) => (
              <article
                key={contributor.id}
                className="rounded-[2rem] border border-neutral-800 bg-black/35 p-5 md:p-6"
              >
                <div className="flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.18em] opacity-75">
                  <span className="rounded-full border border-sky-300/30 bg-sky-200/10 px-3 py-1 text-sky-100">
                    Rank #{index + 1}
                  </span>
                  <span className="rounded-full border border-white/10 px-3 py-1">
                    {contributorRoleLabel(contributor.role)}
                  </span>
                  {typeof contributor.averageScore === "number" && (
                    <span className="rounded-full border border-amber-300/30 bg-amber-200/10 px-3 py-1 text-amber-100">
                      Avg {contributor.averageScore}/100
                    </span>
                  )}
                </div>

                <div className="mt-4 space-y-2">
                  <h2 className="text-2xl font-semibold tracking-tight">{contributor.name}</h2>
                  <p className="text-sm leading-6 opacity-80">{contributor.summary}</p>
                  {contributor.memberSaveCount > 0 && (
                    <p className="text-sm text-sky-100/85">
                      Member demand is clustering around {contributor.memberSaveCount} saved product
                      {contributor.memberSaveCount === 1 ? "" : "s"} in this profile.
                    </p>
                  )}
                </div>

                {contributor.badges.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.18em] opacity-80">
                    {contributor.badges.map((badge) => (
                      <span
                        key={badge.label}
                        className={`rounded-full border px-3 py-1 ${badgeTone(badge.tone)}`}
                      >
                        {badge.label}
                      </span>
                    ))}
                  </div>
                )}

                <div className="mt-5 grid gap-3 rounded-2xl border border-neutral-800/80 bg-black/20 p-4 sm:grid-cols-5">
                  <div>
                    <div className="text-xs uppercase tracking-[0.18em] opacity-60">Reviews</div>
                    <div className="mt-1 text-lg font-semibold">{contributor.publishedReviewCount}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-[0.18em] opacity-60">Products</div>
                    <div className="mt-1 text-lg font-semibold">{contributor.productCount}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-[0.18em] opacity-60">Saves</div>
                    <div className="mt-1 text-lg font-semibold">{contributor.memberSaveCount}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-[0.18em] opacity-60">Reactions</div>
                    <div className="mt-1 text-lg font-semibold">{contributor.reactionCount}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-[0.18em] opacity-60">WHEAT</div>
                    <div className="mt-1 text-lg font-semibold">{contributor.wheatBalance}</div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {contributor.products.slice(0, 3).map((product) =>
                    product.slug ? (
                      <Link
                        key={`${contributor.id}-${product.slug}`}
                        href={`/products/${product.slug}`}
                        className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-[0.18em] opacity-75 transition hover:bg-white/5"
                      >
                        {product.name}
                        {product.savedCount > 0 ? ` · ${product.savedCount} saves` : ""}
                      </Link>
                    ) : (
                      <span
                        key={`${contributor.id}-${product.name}`}
                        className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-[0.18em] opacity-75"
                      >
                        {product.name}
                        {product.savedCount > 0 ? ` · ${product.savedCount} saves` : ""}
                      </span>
                    ),
                  )}
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <Link
                    href={`/community/contributors/${contributor.slug}`}
                    className="inline-flex items-center rounded-xl border border-amber-300/35 bg-amber-200/12 px-4 py-2 text-sm font-medium text-amber-100 transition hover:bg-amber-200/20"
                  >
                    Open profile
                  </Link>
                  {contributor.latestReview && (
                    <Link
                      href={`/articles/${contributor.latestReview.slug}`}
                      className="inline-flex items-center rounded-xl border border-white/10 px-4 py-2 text-sm font-medium transition hover:bg-white/5"
                    >
                      Read latest review
                    </Link>
                  )}
                </div>
              </article>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
