import Link from "next/link";
import { listPublicProducts } from "@/lib/publicProducts";
import { listPublicStores } from "@/lib/publicStores";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function DiscoverPage() {
  const [products, stores] = await Promise.all([listPublicProducts(), listPublicStores()]);

  const featuredProducts = [...products].sort((left, right) => {
    const rightScore = right.featuredReview.score ?? -1;
    const leftScore = left.featuredReview.score ?? -1;
    if (rightScore !== leftScore) {
      return rightScore - leftScore;
    }
    if (right.storeCount !== left.storeCount) {
      return right.storeCount - left.storeCount;
    }
    return right.liveOfferCount - left.liveOfferCount;
  }).slice(0, 4);

  const featuredStores = [...stores].sort((left, right) => {
    if (right.liveOfferCount !== left.liveOfferCount) {
      return right.liveOfferCount - left.liveOfferCount;
    }
    if (right.liveProductCount !== left.liveProductCount) {
      return right.liveProductCount - left.liveProductCount;
    }
    return left.displayName.localeCompare(right.displayName);
  }).slice(0, 4);

  const categoryLeaders = [...new Map(
    products
      .filter((product) => product.category)
      .map((product) => [product.category as string, 0]),
  ).keys()].map((category) => ({
    category,
    count: products.filter((product) => product.category === category).length,
  })).sort((left, right) => {
    if (right.count !== left.count) {
      return right.count - left.count;
    }
    return left.category.localeCompare(right.category);
  }).slice(0, 6);

  const liveOfferCount = products.reduce((count, product) => count + product.liveOfferCount, 0);
  const deliveryStoreCount = stores.filter((store) => store.deliveryEnabled).length;

  return (
    <main className="ws-container py-8 md:py-10">
      <div className="space-y-8">
        <section className="rounded-[2.25rem] border border-amber-200/15 bg-[radial-gradient(circle_at_top,_rgba(245,158,11,0.16),_rgba(10,10,10,0.96)_60%)] p-6 md:p-8">
          <div className="text-xs uppercase tracking-[0.3em] opacity-65">Discover</div>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-5xl">
            Organic discovery now runs like a network
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 opacity-85 md:text-lg">
            Wheat & Stone can now connect reviewed products, local stores, and live buying routes
            from one premium discovery layer. This is no longer a placeholder page. It is the
            beginning of the consumer-facing operating system.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.18em] opacity-65">Reviewed products</p>
              <p className="mt-2 text-3xl font-semibold">{products.length}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.18em] opacity-65">Public stores</p>
              <p className="mt-2 text-3xl font-semibold">{stores.length}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.18em] opacity-65">Live offers</p>
              <p className="mt-2 text-3xl font-semibold">{liveOfferCount}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.18em] opacity-65">Delivery stores</p>
              <p className="mt-2 text-3xl font-semibold">{deliveryStoreCount}</p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/products"
              className="inline-flex items-center rounded-xl border border-amber-300/35 bg-amber-200/12 px-4 py-2 text-sm font-medium text-amber-100 transition hover:bg-amber-200/20"
            >
              Browse product atlas
            </Link>
            <Link
              href="/map"
              className="inline-flex items-center rounded-xl border border-white/10 px-4 py-2 text-sm font-medium transition hover:bg-white/5"
            >
              Open local store atlas
            </Link>
            <Link
              href="/offers"
              className="inline-flex items-center rounded-xl border border-white/10 px-4 py-2 text-sm font-medium transition hover:bg-white/5"
            >
              View live offers
            </Link>
          </div>
        </section>

        {featuredProducts.length > 0 && (
          <section className="space-y-4">
            <div className="space-y-1">
              <div className="text-xs uppercase tracking-[0.28em] opacity-65">Top Products</div>
              <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
                Best-positioned products in the network
              </h2>
              <p className="max-w-3xl text-sm leading-6 opacity-75">
                These products currently have the strongest mix of editorial quality, store
                coverage, and live commercial routes.
              </p>
            </div>

            <div className="grid gap-5 xl:grid-cols-2">
              {featuredProducts.map((product) => (
                <article
                  key={product.slug}
                  className="overflow-hidden rounded-[2rem] border border-neutral-800 bg-black/35"
                >
                  {product.heroImageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={product.heroImageUrl}
                      alt={product.name}
                      className="h-56 w-full object-cover"
                    />
                  )}

                  <div className="space-y-4 p-5 md:p-6">
                    <div className="flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.18em] opacity-75">
                      {typeof product.featuredReview.score === "number" && (
                        <span className="rounded-full border border-amber-300/30 bg-amber-200/10 px-3 py-1 text-amber-100">
                          {product.featuredReview.score}/100
                        </span>
                      )}
                      {product.category && (
                        <Link
                          href={`/products?category=${encodeURIComponent(product.category)}`}
                          className="rounded-full border border-neutral-700 px-3 py-1 transition hover:bg-white/5"
                        >
                          {product.category}
                        </Link>
                      )}
                      {product.deliveryStoreCount > 0 && (
                        <span className="rounded-full border border-emerald-300/30 bg-emerald-200/10 px-3 py-1 text-emerald-100">
                          {product.deliveryStoreCount} delivery store{product.deliveryStoreCount === 1 ? "" : "s"}
                        </span>
                      )}
                    </div>

                    <div className="space-y-2">
                      <h3 className="text-2xl font-semibold tracking-tight">{product.name}</h3>
                      <p className="text-sm leading-6 opacity-80">
                        {product.summary ||
                          "This product now has a canonical Wheat & Stone page with review and local buying context."}
                      </p>
                    </div>

                    <div className="grid gap-3 rounded-2xl border border-neutral-800/80 bg-black/20 p-4 sm:grid-cols-3">
                      <div>
                        <div className="text-xs uppercase tracking-[0.18em] opacity-60">Reviews</div>
                        <div className="mt-1 text-lg font-semibold">{product.reviewCount}</div>
                      </div>
                      <div>
                        <div className="text-xs uppercase tracking-[0.18em] opacity-60">Buy routes</div>
                        <div className="mt-1 text-lg font-semibold">{product.buyRouteCount}</div>
                      </div>
                      <div>
                        <div className="text-xs uppercase tracking-[0.18em] opacity-60">Live offers</div>
                        <div className="mt-1 text-lg font-semibold">{product.liveOfferCount}</div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <Link
                        href={`/products/${product.slug}`}
                        className="inline-flex items-center rounded-xl border border-amber-300/35 bg-amber-200/12 px-4 py-2 text-sm font-medium text-amber-100 transition hover:bg-amber-200/20"
                      >
                        Open product page
                      </Link>
                      <Link
                        href={`/articles/${product.featuredReview.articleSlug}`}
                        className="inline-flex items-center rounded-xl border border-white/10 px-4 py-2 text-sm font-medium transition hover:bg-white/5"
                      >
                        Read review
                      </Link>
                      <Link
                        href={`/map?q=${encodeURIComponent(product.name)}`}
                        className="inline-flex items-center rounded-xl border border-white/10 px-4 py-2 text-sm font-medium transition hover:bg-white/5"
                      >
                        Find local coverage
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[2rem] border border-white/10 bg-black/20 p-5 md:p-6">
            <div className="text-xs uppercase tracking-[0.28em] opacity-65">Category Radar</div>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">Browse by organic lane</h2>
            <p className="mt-2 text-sm leading-6 opacity-75">
              These category jump points now lead into a server-filtered product atlas rather than
              a flat content archive.
            </p>

            {categoryLeaders.length > 0 ? (
              <div className="mt-5 flex flex-wrap gap-2">
                {categoryLeaders.map((entry) => (
                  <Link
                    key={entry.category}
                    href={`/products?category=${encodeURIComponent(entry.category)}`}
                    className="rounded-full border border-white/10 px-4 py-2 text-sm transition hover:bg-white/5"
                  >
                    {entry.category} ({entry.count})
                  </Link>
                ))}
              </div>
            ) : (
              <p className="mt-5 text-sm opacity-70">
                Category grouping will expand as more products are seeded into the network.
              </p>
            )}
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-black/20 p-5 md:p-6">
            <div className="text-xs uppercase tracking-[0.28em] opacity-65">Store Network</div>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">Local partners now have public landing pages</h2>
            <p className="mt-2 text-sm leading-6 opacity-75">
              Each store can now surface live offers, active inventory, delivery readiness, and the
              products it carries from one public destination.
            </p>

            {featuredStores.length > 0 ? (
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {featuredStores.map((store) => (
                  <article
                    key={store.slug}
                    className="rounded-2xl border border-white/10 bg-black/20 p-4"
                  >
                    <div className="flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.18em] opacity-75">
                      {store.locationLabel && (
                        <span className="rounded-full border border-neutral-700 px-3 py-1">
                          {store.locationLabel}
                        </span>
                      )}
                      {store.deliveryEnabled && (
                        <span className="rounded-full border border-emerald-300/30 bg-emerald-200/10 px-3 py-1 text-emerald-100">
                          Delivery
                        </span>
                      )}
                    </div>

                    <h3 className="mt-3 text-xl font-semibold tracking-tight">{store.displayName}</h3>
                    <p className="mt-2 text-sm leading-6 opacity-80">
                      {store.description ||
                        "This store now has a public Wheat & Stone landing page for products, offers, and local coverage."}
                    </p>

                    <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
                      <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-3">
                        <p className="text-xs uppercase tracking-wide opacity-65">Products</p>
                        <p className="mt-1 text-xl font-semibold">{store.liveProductCount}</p>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-3">
                        <p className="text-xs uppercase tracking-wide opacity-65">Live offers</p>
                        <p className="mt-1 text-xl font-semibold">{store.liveOfferCount}</p>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {store.featuredProducts.slice(0, 2).map((product) => (
                        <Link
                          key={product.slug}
                          href={`/products/${product.slug}`}
                          className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-[0.18em] opacity-75 transition hover:bg-white/5"
                        >
                          {product.name}
                        </Link>
                      ))}
                    </div>

                    <div className="mt-5 flex flex-wrap gap-3">
                      <Link
                        href={`/stores/${store.slug}`}
                        className="inline-flex items-center rounded-xl border border-amber-300/35 bg-amber-200/12 px-4 py-2 text-sm font-medium text-amber-100 transition hover:bg-amber-200/20"
                      >
                        Open store page
                      </Link>
                      <Link
                        href={`/map?q=${encodeURIComponent(store.displayName)}`}
                        className="inline-flex items-center rounded-xl border border-white/10 px-4 py-2 text-sm font-medium transition hover:bg-white/5"
                      >
                        View in atlas
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="mt-5 text-sm opacity-70">
                Public store pages will appear here as more specialty partners are onboarded.
              </p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
