import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { contributorRoleLabel, getPublicContributorBySlug } from "@/lib/publicCommunity";

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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const contributor = await getPublicContributorBySlug(slug);

  if (!contributor) {
    return {
      title: "Contributor not found | Wheat & Stone",
      robots: { index: false, follow: false },
    };
  }

  const title = `${contributor.name} | Wheat & Stone`;
  const description = contributor.summary;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "profile",
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

export default async function CommunityContributorPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const contributor = await getPublicContributorBySlug(slug);

  if (!contributor) {
    notFound();
  }

  return (
    <main className="ws-container py-8 md:py-10">
      <div className="space-y-8">
        <section className="rounded-[2.25rem] border border-amber-200/15 bg-[radial-gradient(circle_at_top,_rgba(245,158,11,0.16),_rgba(10,10,10,0.96)_60%)] p-6 md:p-8">
          <div className="flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.2em] opacity-75">
            <span className="rounded-full border border-sky-300/30 bg-sky-200/10 px-3 py-1 text-sky-100">
              Rank score {contributor.communityRank}
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

          <div className="mt-4 space-y-3">
            <h1 className="text-3xl font-semibold tracking-tight md:text-5xl">
              {contributor.name}
            </h1>
            <p className="max-w-3xl text-base leading-7 opacity-85 md:text-lg">
              {contributor.summary}
            </p>
          </div>

          {contributor.badges.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.18em] opacity-80">
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

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.18em] opacity-65">Published reviews</p>
              <p className="mt-2 text-3xl font-semibold">{contributor.publishedReviewCount}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.18em] opacity-65">Products covered</p>
              <p className="mt-2 text-3xl font-semibold">{contributor.productCount}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.18em] opacity-65">Audience reactions</p>
              <p className="mt-2 text-3xl font-semibold">{contributor.reactionCount}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.18em] opacity-65">Local routes</p>
              <p className="mt-2 text-3xl font-semibold">{contributor.localRouteCount}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.18em] opacity-65">Member saves</p>
              <p className="mt-2 text-3xl font-semibold">{contributor.memberSaveCount}</p>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.18em] opacity-65">Recorded WHEAT</p>
              <p className="mt-2 text-3xl font-semibold">{contributor.wheatBalance}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.18em] opacity-65">Recorded STONE</p>
              <p className="mt-2 text-3xl font-semibold">{contributor.stoneBalance}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.18em] opacity-65">Affiliate clicks</p>
              <p className="mt-2 text-3xl font-semibold">{contributor.affiliateClickCount}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.18em] opacity-65">Categories</p>
              <p className="mt-2 text-3xl font-semibold">{contributor.categoryCount}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.18em] opacity-65">Rank score</p>
              <p className="mt-2 text-3xl font-semibold">{contributor.communityRank}</p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/community/contributors"
              className="inline-flex items-center rounded-xl border border-amber-300/35 bg-amber-200/12 px-4 py-2 text-sm font-medium text-amber-100 transition hover:bg-amber-200/20"
            >
              Back to contributors
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
        </section>

        {contributor.products.length > 0 && (
          <section className="rounded-[2rem] border border-white/10 bg-black/20 p-5 md:p-6">
            <div className="text-xs uppercase tracking-[0.28em] opacity-65">Coverage</div>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">Products this contributor has covered</h2>
            <div className="mt-5 flex flex-wrap gap-2">
              {contributor.products.map((product) =>
                product.slug ? (
                  <Link
                    key={product.slug}
                    href={`/products/${product.slug}`}
                    className="rounded-full border border-white/10 px-4 py-2 text-sm transition hover:bg-white/5"
                  >
                    {product.name} ({product.count})
                    {product.savedCount > 0 ? ` · ${product.savedCount} saves` : ""}
                  </Link>
                ) : (
                  <span
                    key={product.name}
                    className="rounded-full border border-white/10 px-4 py-2 text-sm opacity-75"
                  >
                    {product.name} ({product.count})
                    {product.savedCount > 0 ? ` · ${product.savedCount} saves` : ""}
                  </span>
                ),
              )}
            </div>
          </section>
        )}

        <section className="space-y-4">
          <div className="space-y-1">
            <div className="text-xs uppercase tracking-[0.28em] opacity-65">Reviews</div>
            <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
              Published Wheat & Stone reviews
            </h2>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            {contributor.reviews.map((review) => (
              <article
                key={review.id}
                className="rounded-[1.9rem] border border-neutral-800 bg-black/30 p-5"
              >
                <div className="flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.18em] opacity-75">
                  {typeof review.score === "number" && (
                    <span className="rounded-full border border-amber-300/30 bg-amber-200/10 px-3 py-1 text-amber-100">
                      {review.score}/100
                    </span>
                  )}
                  {review.category && (
                    <span className="rounded-full border border-white/10 px-3 py-1">
                      {review.category}
                    </span>
                  )}
                  <span className="rounded-full border border-white/10 px-3 py-1">
                    {review.reactionCount} reactions
                  </span>
                </div>

                <div className="mt-3 space-y-3">
                  <h3 className="text-2xl font-semibold tracking-tight">{review.title}</h3>
                  <p className="text-sm leading-6 opacity-80">
                    {review.verdict || review.excerpt || "Review is live now."}
                  </p>
                </div>

                <div className="mt-4 flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.18em] opacity-75">
                  {review.productSlug && review.productName ? (
                    <Link
                      href={`/products/${review.productSlug}`}
                      className="rounded-full border border-white/10 px-3 py-1 transition hover:bg-white/5"
                    >
                      {review.productName}
                    </Link>
                  ) : review.productName ? (
                    <span className="rounded-full border border-white/10 px-3 py-1">
                      {review.productName}
                    </span>
                  ) : null}
                  <span className="rounded-full border border-white/10 px-3 py-1">
                    {review.affiliateClicks} affiliate clicks
                  </span>
                  <span className="rounded-full border border-white/10 px-3 py-1">
                    {review.commerceModuleCount} local module{review.commerceModuleCount === 1 ? "" : "s"}
                  </span>
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <Link
                    href={`/articles/${review.slug}`}
                    className="inline-flex items-center rounded-xl border border-amber-300/35 bg-amber-200/12 px-4 py-2 text-sm font-medium text-amber-100 transition hover:bg-amber-200/20"
                  >
                    Open review
                  </Link>
                  {review.productSlug && (
                    <Link
                      href={`/products/${review.productSlug}`}
                      className="inline-flex items-center rounded-xl border border-white/10 px-4 py-2 text-sm font-medium transition hover:bg-white/5"
                    >
                      Open product
                    </Link>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>

        {contributor.recentRewards.length > 0 && (
          <section className="space-y-4">
            <div className="space-y-1">
              <div className="text-xs uppercase tracking-[0.28em] opacity-65">Reward Activity</div>
              <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
                Recent token movement
              </h2>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              {contributor.recentRewards.map((reward) => (
                <article
                  key={reward.id}
                  className="rounded-[1.8rem] border border-neutral-800 bg-black/30 p-5"
                >
                  <div className="flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.18em] opacity-75">
                    <span
                      className={`rounded-full border px-3 py-1 ${
                        reward.token === "WHEAT"
                          ? "border-amber-300/30 bg-amber-200/10 text-amber-100"
                          : "border-sky-300/30 bg-sky-200/10 text-sky-100"
                      }`}
                    >
                      {reward.token}
                    </span>
                    <span className="rounded-full border border-white/10 px-3 py-1">
                      {reward.direction === "DEBIT" ? "Debit" : "Credit"}
                    </span>
                  </div>

                  <div className="mt-3 space-y-2">
                    <h3 className="text-2xl font-semibold tracking-tight">
                      {reward.amount > 0 ? "+" : ""}
                      {reward.amount} {reward.token}
                    </h3>
                    <p className="text-sm leading-6 opacity-80">{reward.reasonLabel}</p>
                  </div>

                  <div className="mt-4 text-sm opacity-60">
                    {reward.createdAt.toLocaleString()}
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
