import Link from "next/link";
import { contributorRoleLabel, getPublicCommunityOverview } from "@/lib/publicCommunity";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function tokenTone(token: "WHEAT" | "STONE" | null) {
  if (token === "WHEAT") {
    return "border-amber-300/30 bg-amber-200/10 text-amber-100";
  }
  if (token === "STONE") {
    return "border-sky-300/30 bg-sky-200/10 text-sky-100";
  }
  return "border-white/10";
}

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

export default async function CommunityPage() {
  const overview = await getPublicCommunityOverview();

  return (
    <main className="ws-container py-8 md:py-10">
      <div className="space-y-8">
        <section className="rounded-[2.25rem] border border-amber-200/15 bg-[radial-gradient(circle_at_top,_rgba(245,158,11,0.14),_rgba(10,10,10,0.96)_60%)] p-6 md:p-8">
          <div className="text-xs uppercase tracking-[0.3em] opacity-65">Community</div>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-5xl">
            Contributors, reputation, and momentum are now public
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 opacity-85 md:text-lg">
            Wheat & Stone now exposes the human side of trust. Readers can see who is publishing,
            how much coverage exists, how much local activation is happening, and where token
            rewards are beginning to show real participation.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.18em] opacity-65">Contributors</p>
              <p className="mt-2 text-3xl font-semibold">{overview.contributorCount}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.18em] opacity-65">Published reviews</p>
              <p className="mt-2 text-3xl font-semibold">{overview.publishedReviewCount}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.18em] opacity-65">Community reactions</p>
              <p className="mt-2 text-3xl font-semibold">{overview.reactionCount}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.18em] opacity-65">Local buy requests</p>
              <p className="mt-2 text-3xl font-semibold">{overview.deliveryLeadCount}</p>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.18em] opacity-65">Products covered</p>
              <p className="mt-2 text-3xl font-semibold">{overview.productCoverageCount}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.18em] opacity-65">Local routes authored</p>
              <p className="mt-2 text-3xl font-semibold">{overview.localRouteCount}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.18em] opacity-65">WHEAT granted</p>
              <p className="mt-2 text-3xl font-semibold">{overview.wheatGranted}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.18em] opacity-65">STONE granted</p>
              <p className="mt-2 text-3xl font-semibold">{overview.stoneGranted}</p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/community/contributors"
              className="inline-flex items-center rounded-xl border border-amber-300/35 bg-amber-200/12 px-4 py-2 text-sm font-medium text-amber-100 transition hover:bg-amber-200/20"
            >
              Browse contributors
            </Link>
            <Link
              href="/get-wheat"
              className="inline-flex items-center rounded-xl border border-white/10 px-4 py-2 text-sm font-medium transition hover:bg-white/5"
            >
              Explore WHEAT
            </Link>
            <Link
              href="/get-stone"
              className="inline-flex items-center rounded-xl border border-white/10 px-4 py-2 text-sm font-medium transition hover:bg-white/5"
            >
              Explore STONE
            </Link>
          </div>
        </section>

        {overview.topCategories.length > 0 && (
          <section className="rounded-[2rem] border border-white/10 bg-black/20 p-5 md:p-6">
            <div className="text-xs uppercase tracking-[0.28em] opacity-65">Coverage Map</div>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">Where community energy is concentrating</h2>
            <div className="mt-5 flex flex-wrap gap-2">
              {overview.topCategories.map((category) => (
                <Link
                  key={category.name}
                  href={`/products?category=${encodeURIComponent(category.name)}`}
                  className="rounded-full border border-white/10 px-4 py-2 text-sm transition hover:bg-white/5"
                >
                  {category.name} ({category.count})
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className="space-y-4">
          <div className="space-y-1">
            <div className="text-xs uppercase tracking-[0.28em] opacity-65">Featured Contributors</div>
            <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
              Public trust signals now have faces
            </h2>
          </div>

          {overview.featuredContributors.length > 0 ? (
            <div className="grid gap-5 xl:grid-cols-2">
              {overview.featuredContributors.map((contributor) => (
                <article
                  key={contributor.id}
                  className="rounded-[2rem] border border-neutral-800 bg-black/35 p-5 md:p-6"
                >
                  <div className="flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.18em] opacity-75">
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
                    <h3 className="text-2xl font-semibold tracking-tight">{contributor.name}</h3>
                    <p className="text-sm leading-6 opacity-80">{contributor.summary}</p>
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

                  <div className="mt-5 grid gap-3 rounded-2xl border border-neutral-800/80 bg-black/20 p-4 sm:grid-cols-4">
                    <div>
                      <div className="text-xs uppercase tracking-[0.18em] opacity-60">Reviews</div>
                      <div className="mt-1 text-lg font-semibold">{contributor.publishedReviewCount}</div>
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-[0.18em] opacity-60">Products</div>
                      <div className="mt-1 text-lg font-semibold">{contributor.productCount}</div>
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-[0.18em] opacity-60">Routes</div>
                      <div className="mt-1 text-lg font-semibold">{contributor.localRouteCount}</div>
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-[0.18em] opacity-60">WHEAT</div>
                      <div className="mt-1 text-lg font-semibold">{contributor.wheatBalance}</div>
                    </div>
                  </div>

                  {contributor.latestReview && (
                    <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                      <div className="text-xs uppercase tracking-[0.18em] opacity-65">Latest review</div>
                      <p className="mt-2 font-medium">{contributor.latestReview.title}</p>
                      <p className="mt-2 text-sm leading-6 opacity-80">
                        {contributor.latestReview.verdict ||
                          contributor.latestReview.excerpt ||
                          "Latest review is live now."}
                      </p>
                    </div>
                  )}

                  <div className="mt-5 flex flex-wrap gap-3">
                    <Link
                      href={`/community/contributors/${contributor.slug}`}
                      className="inline-flex items-center rounded-xl border border-amber-300/35 bg-amber-200/12 px-4 py-2 text-sm font-medium text-amber-100 transition hover:bg-amber-200/20"
                    >
                      Open contributor page
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
            </div>
          ) : (
            <section className="rounded-[2rem] border border-dashed border-white/10 bg-black/10 px-6 py-12 text-center">
              <h2 className="text-2xl font-semibold">Contributor profiles will appear here soon</h2>
              <p className="mt-3 text-sm opacity-75">
                Publish public reviews to begin building the public reputation layer.
              </p>
            </section>
          )}
        </section>

        {overview.recentActivity.length > 0 && (
          <section className="space-y-4">
            <div className="space-y-1">
              <div className="text-xs uppercase tracking-[0.28em] opacity-65">Momentum Board</div>
              <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
                Recent community activity
              </h2>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              {overview.recentActivity.map((activity) => (
                <article
                  key={activity.id}
                  className="rounded-[1.8rem] border border-neutral-800 bg-black/30 p-5"
                >
                  <div className="flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.18em] opacity-75">
                    <span className={`rounded-full border px-3 py-1 ${tokenTone(activity.token)}`}>
                      {activity.kind === "ARTICLE_PUBLISHED" ? "Review published" : "Token granted"}
                    </span>
                    <Link
                      href={`/community/contributors/${activity.contributor.slug}`}
                      className="rounded-full border border-white/10 px-3 py-1 transition hover:bg-white/5"
                    >
                      {activity.contributor.name}
                    </Link>
                  </div>

                  <div className="mt-3 space-y-2">
                    <h3 className="text-xl font-semibold tracking-tight">{activity.title}</h3>
                    <p className="text-sm leading-6 opacity-80">{activity.description}</p>
                  </div>

                  <div className="mt-5 flex flex-wrap items-center gap-3">
                    <Link
                      href={activity.href}
                      className="inline-flex items-center rounded-xl border border-white/10 px-4 py-2 text-sm font-medium transition hover:bg-white/5"
                    >
                      Open activity
                    </Link>
                    <span className="text-sm opacity-60">
                      {activity.occurredAt.toLocaleDateString()}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
