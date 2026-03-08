import Link from "next/link";
import { getPublicCommunityOverview } from "@/lib/publicCommunity";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function GetWheatPage() {
  const overview = await getPublicCommunityOverview();

  return (
    <main className="ws-container py-8 md:py-10">
      <div className="space-y-8">
        <section className="rounded-[2.25rem] border border-amber-200/15 bg-[radial-gradient(circle_at_top,_rgba(245,158,11,0.16),_rgba(10,10,10,0.96)_60%)] p-6 md:p-8">
          <div className="text-xs uppercase tracking-[0.24em] opacity-65">Token</div>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-5xl">$WHEAT</h1>
          <p className="mt-4 max-w-3xl text-base leading-7 opacity-85 md:text-lg">
            $WHEAT is the growth and operator-reward side of Wheat & Stone. It is designed to
            reward the work that expands the network: publishing trusted reviews, activating local
            routes, and converting delivery demand into real commerce.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.18em] opacity-65">WHEAT granted</p>
              <p className="mt-2 text-3xl font-semibold">{overview.wheatGranted}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.18em] opacity-65">Contributors</p>
              <p className="mt-2 text-3xl font-semibold">{overview.contributorCount}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.18em] opacity-65">Local routes</p>
              <p className="mt-2 text-3xl font-semibold">{overview.localRouteCount}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.18em] opacity-65">Completed deliveries</p>
              <p className="mt-2 text-3xl font-semibold">{overview.completedDeliveryCount}</p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link
              href="/community"
              className="inline-flex items-center rounded-lg border border-amber-400/40 bg-amber-300/20 px-3 py-2 text-sm font-semibold hover:bg-amber-300/30"
            >
              Open Community
            </Link>
            <Link
              href="/account"
              className="inline-flex items-center rounded-lg border border-white/10 px-3 py-2 text-sm font-medium transition hover:bg-white/5"
            >
              View My Balances
            </Link>
            <a
              href="https://tokentap.ca"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center rounded-lg border border-white/10 px-3 py-2 text-sm font-medium transition hover:bg-white/5"
            >
              Open TokenTap.ca
            </a>
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-2">
          <article className="rounded-[2rem] border border-white/10 bg-black/20 p-5 md:p-6">
            <div className="text-xs uppercase tracking-[0.28em] opacity-65">Live Network Role</div>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">What WHEAT is rewarding right now</h2>
            <ul className="mt-5 space-y-3 text-sm leading-6 opacity-85">
              <li>
                Contributor output: {overview.publishedReviewCount} published review
                {overview.publishedReviewCount === 1 ? "" : "s"} are now part of the public trust layer.
              </li>
              <li>
                Local activation: {overview.localRouteCount} store route
                {overview.localRouteCount === 1 ? "" : "s"} are tied into the review and product network.
              </li>
              <li>
                Commerce execution: {overview.completedDeliveryCount} delivery conversion
                {overview.completedDeliveryCount === 1 ? "" : "s"} have already moved beyond pure content.
              </li>
            </ul>
          </article>

          <article className="rounded-[2rem] border border-white/10 bg-black/20 p-5 md:p-6">
            <div className="text-xs uppercase tracking-[0.28em] opacity-65">Planned Utility</div>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">Where WHEAT goes next</h2>
            <ul className="mt-5 space-y-3 text-sm leading-6 opacity-85">
              <li>Contributor compensation for publishing trusted review coverage.</li>
              <li>Store and operator incentives tied to local-route execution and fulfillment quality.</li>
              <li>Future redemption paths anchored to measurable community and commerce outcomes.</li>
            </ul>
          </article>
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-black/20 p-5 md:p-6">
          <div className="text-xs uppercase tracking-[0.28em] opacity-65">Foundation Readiness</div>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">The infrastructure behind WHEAT is now visible</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.18em] opacity-65">Affiliate clicks</p>
              <p className="mt-2 text-3xl font-semibold">{overview.affiliateClickCount}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.18em] opacity-65">Delivery leads</p>
              <p className="mt-2 text-3xl font-semibold">{overview.deliveryLeadCount}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.18em] opacity-65">Products covered</p>
              <p className="mt-2 text-3xl font-semibold">{overview.productCoverageCount}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.18em] opacity-65">Top categories</p>
              <p className="mt-2 text-3xl font-semibold">{overview.topCategories.length}</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
