import Link from "next/link";
import { getPublicCommunityOverview } from "@/lib/publicCommunity";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function GetStonePage() {
  const overview = await getPublicCommunityOverview();

  return (
    <main className="ws-container py-8 md:py-10">
      <div className="space-y-8">
        <section className="rounded-[2.25rem] border border-sky-200/15 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.16),_rgba(10,10,10,0.96)_60%)] p-6 md:p-8">
          <div className="text-xs uppercase tracking-[0.24em] opacity-65">Token</div>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-5xl">$STONE</h1>
          <p className="mt-4 max-w-3xl text-base leading-7 opacity-85 md:text-lg">
            $STONE is the reputation and member-participation side of Wheat & Stone. It is meant to
            reward meaningful interaction: readers saving products, tracking offers, reacting to
            reviews, and building durable trust signals around the catalog.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.18em] opacity-65">STONE granted</p>
              <p className="mt-2 text-3xl font-semibold">{overview.stoneGranted}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.18em] opacity-65">Engaged members</p>
              <p className="mt-2 text-3xl font-semibold">{overview.engagedMemberCount}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.18em] opacity-65">Total saves</p>
              <p className="mt-2 text-3xl font-semibold">{overview.memberSaveCount}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.18em] opacity-65">Community reactions</p>
              <p className="mt-2 text-3xl font-semibold">{overview.reactionCount}</p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link
              href="/products"
              className="inline-flex items-center rounded-lg border border-sky-400/40 bg-sky-300/20 px-3 py-2 text-sm font-semibold hover:bg-sky-300/30"
            >
              Browse Products
            </Link>
            <Link
              href="/offers"
              className="inline-flex items-center rounded-lg border border-white/10 px-3 py-2 text-sm font-medium transition hover:bg-white/5"
            >
              Browse Offers
            </Link>
            <Link
              href="/account"
              className="inline-flex items-center rounded-lg border border-white/10 px-3 py-2 text-sm font-medium transition hover:bg-white/5"
            >
              View My Balances
            </Link>
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-2">
          <article className="rounded-[2rem] border border-white/10 bg-black/20 p-5 md:p-6">
            <div className="text-xs uppercase tracking-[0.28em] opacity-65">Live Network Role</div>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">What STONE is measuring already</h2>
            <ul className="mt-5 space-y-3 text-sm leading-6 opacity-85">
              <li>
                Product intent: {overview.savedProductCount} saved product
                {overview.savedProductCount === 1 ? "" : "s"} now exist as durable demand signals.
              </li>
              <li>
                Offer follow-through: {overview.savedOfferCount} saved offer
                {overview.savedOfferCount === 1 ? "" : "s"} are building a real shortlist behavior loop.
              </li>
              <li>
                Public engagement: {overview.reactionCount} community reaction
                {overview.reactionCount === 1 ? "" : "s"} reinforce which coverage resonates.
              </li>
            </ul>
          </article>

          <article className="rounded-[2rem] border border-white/10 bg-black/20 p-5 md:p-6">
            <div className="text-xs uppercase tracking-[0.28em] opacity-65">Planned Utility</div>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">Where STONE goes next</h2>
            <ul className="mt-5 space-y-3 text-sm leading-6 opacity-85">
              <li>Reader participation rewards tied to saved intent, reactions, and verified engagement.</li>
              <li>Reputation-weighted community surfaces for trusted members and repeat contributors.</li>
              <li>Future access controls for premium actions, curated offers, and token-aware discovery.</li>
            </ul>
          </article>
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-black/20 p-5 md:p-6">
          <div className="text-xs uppercase tracking-[0.28em] opacity-65">Member Momentum</div>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">The retention layer is now part of the product</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.18em] opacity-65">Contributors</p>
              <p className="mt-2 text-3xl font-semibold">{overview.contributorCount}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.18em] opacity-65">Published reviews</p>
              <p className="mt-2 text-3xl font-semibold">{overview.publishedReviewCount}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.18em] opacity-65">Products covered</p>
              <p className="mt-2 text-3xl font-semibold">{overview.productCoverageCount}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.18em] opacity-65">Offer-ready routes</p>
              <p className="mt-2 text-3xl font-semibold">{overview.localRouteCount}</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
