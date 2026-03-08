import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { notFound } from "next/navigation";
import DeliveryCheckoutNotice from "@/components/commerce/DeliveryCheckoutNotice";
import ArticleCommerceModuleView from "@/components/article/ArticleCommerceModuleView";
import SaveToggleButton from "@/components/community/SaveToggleButton";
import { authOptions } from "@/lib/authOptions";
import {
  resolveContributorDisplayName,
  resolveContributorPublicSlug,
} from "@/lib/contributorIdentity";
import { getPublicProductBySlug } from "@/lib/publicProducts";
import { listSavedProductIdsForUser } from "@/lib/savedCollections";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function money(cents: number | null): string {
  if (cents === null || !Number.isFinite(cents)) return "-";
  return `$${(cents / 100).toFixed(2)}`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getPublicProductBySlug(slug);

  if (!product) {
    return {
      title: "Product not found | Wheat & Stone",
      robots: { index: false, follow: false },
    };
  }

  const title = `${product.name} | Wheat & Stone`;
  const description =
    product.summary || "Browse a canonical Wheat & Stone product page.";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      images: product.heroImageUrl ? [{ url: product.heroImageUrl, alt: product.name }] : [],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: product.heroImageUrl ? [product.heroImageUrl] : [],
    },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [product, session] = await Promise.all([
    getPublicProductBySlug(slug),
    getServerSession(authOptions),
  ]);

  if (!product) {
    notFound();
  }

  const savedProductIds =
    session?.user?.id ? await listSavedProductIdsForUser(session.user.id) : new Set<string>();
  const isAuthenticated = Boolean(session?.user?.id);
  const loginHref = `/login?callbackUrl=${encodeURIComponent(`/products/${product.slug}`)}`;

  return (
    <main className="ws-container py-8 md:py-10">
      <div className="space-y-8">
        <DeliveryCheckoutNotice />

        <section className="overflow-hidden rounded-[2.25rem] border border-amber-200/15 bg-[radial-gradient(circle_at_top,_rgba(245,158,11,0.16),_rgba(10,10,10,0.96)_58%)]">
          {product.heroImageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.heroImageUrl}
              alt={product.name}
              className="h-64 w-full object-cover md:h-80"
            />
          )}

          <div className="space-y-5 p-6 md:p-8">
            <div className="flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.2em] opacity-75">
              {typeof product.latestReview.score === "number" && (
                <span className="rounded-full border border-amber-300/30 bg-amber-200/10 px-3 py-1 text-amber-100">
                  {product.latestReview.score}/100
                </span>
              )}
              {product.brandName && (
                <span className="rounded-full border border-neutral-700 px-3 py-1">
                  {product.brandName}
                </span>
              )}
              {product.category && (
                <span className="rounded-full border border-neutral-700 px-3 py-1">
                  {product.category}
                </span>
              )}
              {product.organicStatus && (
                <span className="rounded-full border border-neutral-700 px-3 py-1">
                  {product.organicStatus}
                </span>
              )}
              {product.buyOptions.length > 0 && (
                <span className="rounded-full border border-emerald-300/30 bg-emerald-200/10 px-3 py-1 text-emerald-100">
                  {product.buyOptions.length} live buy route{product.buyOptions.length === 1 ? "" : "s"}
                </span>
              )}
            </div>

            <div className="space-y-3">
              <h1 className="text-3xl font-semibold tracking-tight md:text-5xl">{product.name}</h1>
              <p className="max-w-3xl text-base leading-7 opacity-85 md:text-lg">
                {product.summary ||
                  "This canonical product page ties together reviews, commerce modules, and discovery surfaces."}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href={`/articles/${product.latestReview.article.slug}`}
                className="inline-flex items-center rounded-xl border border-amber-300/35 bg-amber-200/12 px-4 py-2 text-sm font-medium text-amber-100 transition hover:bg-amber-200/20"
              >
                Read Latest Review
              </Link>
              <Link
                href="/products"
                className="inline-flex items-center rounded-xl border border-neutral-700 px-4 py-2 text-sm font-medium transition hover:bg-neutral-900"
              >
                Browse Catalog
              </Link>
              <SaveToggleButton
                kind="product"
                itemId={product.id}
                isAuthenticated={isAuthenticated}
                loginHref={loginHref}
                initialSaved={savedProductIds.has(product.id)}
                initialCount={product.savedCount}
                tone="amber"
              />
            </div>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-[1.9rem] border border-white/10 bg-black/20 p-5 md:p-6">
            <div className="text-xs uppercase tracking-[0.28em] opacity-65">Trust signals</div>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">Why this page matters</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4">
                <p className="text-xs uppercase tracking-[0.18em] opacity-65">Reviews</p>
                <p className="mt-2 text-3xl font-semibold">{product.reviewCount}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4">
                <p className="text-xs uppercase tracking-[0.18em] opacity-65">Buy routes</p>
                <p className="mt-2 text-3xl font-semibold">{product.trustSignals.buyRouteCount}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4">
                <p className="text-xs uppercase tracking-[0.18em] opacity-65">Local stores</p>
                <p className="mt-2 text-3xl font-semibold">{product.trustSignals.storeCount}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4">
                <p className="text-xs uppercase tracking-[0.18em] opacity-65">Delivery stores</p>
                <p className="mt-2 text-3xl font-semibold">{product.trustSignals.deliveryStoreCount}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4">
                <p className="text-xs uppercase tracking-[0.18em] opacity-65">Saved by members</p>
                <p className="mt-2 text-3xl font-semibold">{product.trustSignals.savedCount}</p>
              </div>
            </div>
          </div>

          <div className="rounded-[1.9rem] border border-white/10 bg-black/20 p-5 md:p-6">
            <div className="text-xs uppercase tracking-[0.28em] opacity-65">Store network</div>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">Where this product is showing up</h2>
            {product.storeSummaries.length > 0 ? (
              <div className="mt-5 space-y-3">
                {product.storeSummaries.map((store) => (
                  <div
                    key={store.slug || store.name}
                    className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{store.displayName}</p>
                        <p className="mt-1 text-sm opacity-70">
                          {store.locationLabel || "Local network partner"}
                        </p>
                      </div>
                      <div className="text-right text-sm opacity-75">
                        <p>{store.buyRouteCount} route(s)</p>
                        <p>{store.liveOfferCount} live offer(s)</p>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.18em] opacity-75">
                      {store.deliveryEnabled && (
                        <span className="rounded-full border border-emerald-300/30 bg-emerald-200/10 px-3 py-1 text-emerald-100">
                          Delivery
                        </span>
                      )}
                      {store.pickupEnabled && (
                        <span className="rounded-full border border-white/10 px-3 py-1">
                          Pickup
                        </span>
                      )}
                    </div>
                    {store.slug ? (
                      <div className="mt-4">
                        <Link
                          href={`/stores/${store.slug}`}
                          className="inline-flex items-center rounded-xl border border-white/10 px-4 py-2 text-sm font-medium transition hover:bg-white/5"
                        >
                          Open Store Page
                        </Link>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm opacity-75">
                Store-level local coverage will appear here as product-linked inventory and offers grow.
              </p>
            )}
          </div>
        </section>

        {product.buyOptions.length > 0 && (
          <section className="space-y-4">
            <div className="space-y-1">
              <div className="text-xs uppercase tracking-[0.28em] opacity-65">Where To Buy</div>
              <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
                Live local buy network
              </h2>
              <p className="max-w-3xl text-sm leading-6 opacity-75">
                These cards are no longer article-only promos. They are tied directly to this product,
                which means Wheat & Stone can surface real local availability from the product page itself.
              </p>
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              {product.buyOptions.map((option) => (
                <article
                  key={option.key}
                  className="space-y-3 rounded-[1.8rem] border border-white/10 bg-black/20 p-3"
                >
                  <ArticleCommerceModuleView
                    articleSlug={option.articleSlug}
                    returnPath={`/products/${product.slug}`}
                    module={option.module}
                  />
                  <div className="flex flex-wrap gap-2 px-2 pb-2 text-[11px] uppercase tracking-[0.18em] opacity-75">
                    <span className="rounded-full border border-neutral-700 px-3 py-1">
                      {option.source === "offer" ? "Live offer" : "Inventory route"}
                    </span>
                    {option.locationLabel && (
                      <span className="rounded-full border border-neutral-700 px-3 py-1">
                        {option.locationLabel}
                      </span>
                    )}
                    {option.deliveryEnabled && (
                      <span className="rounded-full border border-emerald-300/30 bg-emerald-200/10 px-3 py-1 text-emerald-100">
                        Delivery
                      </span>
                    )}
                    {option.pickupEnabled && (
                      <span className="rounded-full border border-neutral-700 px-3 py-1">
                        Pickup
                      </span>
                    )}
                    {typeof option.availableUnits === "number" && (
                      <span className="rounded-full border border-neutral-700 px-3 py-1">
                        {option.availableUnits} available
                      </span>
                    )}
                    {option.compareAtCents !== null && (
                      <span className="rounded-full border border-neutral-700 px-3 py-1">
                        Compare at {money(option.compareAtCents)}
                      </span>
                    )}
                  </div>
                  {option.module.business?.slug ? (
                    <div className="px-2 pb-2">
                      <Link
                        href={`/stores/${option.module.business.slug}`}
                        className="inline-flex items-center rounded-xl border border-white/10 px-4 py-2 text-sm font-medium transition hover:bg-white/5"
                      >
                        Open Store Page
                      </Link>
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          </section>
        )}

        {product.editorialSpotlights.length > 0 && (
          <section className="space-y-4">
            <div className="space-y-1">
              <div className="text-xs uppercase tracking-[0.28em] opacity-65">Editorial Layer</div>
              <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
                Review-linked store spotlights
              </h2>
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              {product.editorialSpotlights.map((spotlight) => (
                <ArticleCommerceModuleView
                  key={spotlight.module.id}
                  articleSlug={spotlight.articleSlug}
                  returnPath={`/products/${product.slug}`}
                  module={spotlight.module}
                />
              ))}
            </div>
          </section>
        )}

        <section className="space-y-4">
          <div className="space-y-1">
            <div className="text-xs uppercase tracking-[0.28em] opacity-65">Reviews</div>
            <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
              Linked Wheat & Stone reviews
            </h2>
          </div>

          <div className="grid gap-4">
            {product.reviews.map((review) => (
              <article key={review.id} className="rounded-[1.75rem] border border-neutral-800 bg-black/30 p-5">
                <div className="flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.18em] opacity-70">
                  {typeof review.score === "number" && (
                    <span className="rounded-full border border-amber-300/30 bg-amber-200/10 px-3 py-1 text-amber-100">
                      {review.score}/100
                    </span>
                  )}
                  {review.article.publishedAt && (
                    <span className="rounded-full border border-neutral-700 px-3 py-1">
                      {review.article.publishedAt.toLocaleDateString()}
                    </span>
                  )}
                </div>

                <div className="mt-3 space-y-3">
                  <h3 className="text-xl font-semibold tracking-tight">{review.article.title}</h3>
                  <p className="text-sm opacity-65">
                    By{" "}
                    <Link
                      href={`/community/contributors/${resolveContributorPublicSlug(
                        review.article.author,
                      )}`}
                      className="underline-offset-4 hover:underline"
                    >
                      {resolveContributorDisplayName(review.article.author?.name)}
                    </Link>
                  </p>
                  <p className="text-sm leading-6 opacity-80">
                    {review.verdict || review.article.excerpt || "Linked review available."}
                  </p>
                </div>

                <div className="mt-4 flex flex-wrap gap-2 text-xs uppercase tracking-[0.16em] opacity-70">
                  {review.recommendedFor && (
                    <span className="rounded-full border border-neutral-700 px-3 py-1">
                      Best for: {review.recommendedFor}
                    </span>
                  )}
                  {review.localAvailability && (
                    <span className="rounded-full border border-neutral-700 px-3 py-1">
                      {review.localAvailability}
                    </span>
                  )}
                </div>

                <div className="mt-5">
                  <Link
                    href={`/articles/${review.article.slug}`}
                    className="inline-flex items-center rounded-xl border border-neutral-700 px-4 py-2 text-sm font-medium transition hover:bg-neutral-900"
                  >
                    Open Review
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>

        {product.relatedProducts.length > 0 && (
          <section className="space-y-4">
            <div className="space-y-1">
              <div className="text-xs uppercase tracking-[0.28em] opacity-65">Keep exploring</div>
              <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
                Related organic alternatives
              </h2>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              {product.relatedProducts.map((related) => (
                <article
                  key={related.slug}
                  className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-black/25"
                >
                  {related.heroImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={related.heroImageUrl}
                      alt={related.name}
                      className="h-40 w-full object-cover"
                    />
                  ) : null}
                  <div className="space-y-3 p-5">
                    <div className="flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.18em] opacity-75">
                      {typeof related.featuredReview.score === "number" && (
                        <span className="rounded-full border border-amber-300/30 bg-amber-200/10 px-3 py-1 text-amber-100">
                          {related.featuredReview.score}/100
                        </span>
                      )}
                      {related.savedCount > 0 && (
                        <span className="rounded-full border border-sky-300/30 bg-sky-200/10 px-3 py-1 text-sky-100">
                          {related.savedCount} saved
                        </span>
                      )}
                    </div>
                    <h3 className="text-xl font-semibold tracking-tight">{related.name}</h3>
                    <p className="text-sm leading-6 opacity-80">
                      {related.summary || "Related canonical product page available."}
                    </p>
                    <div className="flex flex-wrap gap-3">
                      <Link
                        href={`/products/${related.slug}`}
                        className="inline-flex items-center rounded-xl border border-amber-300/35 bg-amber-200/12 px-4 py-2 text-sm font-medium text-amber-100 transition hover:bg-amber-200/20"
                      >
                        Open Product
                      </Link>
                      <Link
                        href={`/articles/${related.featuredReview.articleSlug}`}
                        className="inline-flex items-center rounded-xl border border-white/10 px-4 py-2 text-sm font-medium transition hover:bg-white/5"
                      >
                        Read Review
                      </Link>
                    </div>
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
