import { getServerSession } from "next-auth";
import Link from "next/link";
import SaveToggleButton from "@/components/community/SaveToggleButton";
import { authOptions } from "@/lib/authOptions";
import { listPublicProducts } from "@/lib/publicProducts";
import { listSavedProductIdsForUser } from "@/lib/savedCollections";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type SearchParams = Record<string, string | string[] | undefined>;

function asString(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function buildQueryString(input: Record<string, string | null | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(input)) {
    if (!value) continue;
    params.set(key, value);
  }
  const query = params.toString();
  return query ? `?${query}` : "";
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const [params, session] = await Promise.all([searchParams, getServerSession(authOptions)]);
  const allProducts = await listPublicProducts();
  const savedProductIds =
    session?.user?.id ? await listSavedProductIdsForUser(session.user.id) : new Set<string>();

  const query = asString(params.q).trim().toLowerCase();
  const selectedCategory = asString(params.category).trim();
  const deliveryOnly = asString(params.delivery) === "1";
  const sort = asString(params.sort) || "score";

  const categories = [
    ...new Set(
      allProducts
        .map((product) => product.category)
        .filter((category): category is string => Boolean(category)),
    ),
  ].sort();

  const filteredProducts = allProducts.filter((product) => {
    const matchesQuery =
      !query ||
      product.name.toLowerCase().includes(query) ||
      (product.brandName || "").toLowerCase().includes(query) ||
      (product.summary || "").toLowerCase().includes(query);

    const matchesCategory = !selectedCategory || product.category === selectedCategory;
    const matchesDelivery = !deliveryOnly || product.deliveryStoreCount > 0;

    return matchesQuery && matchesCategory && matchesDelivery;
  });

  const products = [...filteredProducts].sort((left, right) => {
    if (sort === "local") {
      if (right.storeCount !== left.storeCount) return right.storeCount - left.storeCount;
      return (right.featuredReview.score ?? 0) - (left.featuredReview.score ?? 0);
    }

    if (sort === "offers") {
      if (right.liveOfferCount !== left.liveOfferCount) return right.liveOfferCount - left.liveOfferCount;
      return right.buyRouteCount - left.buyRouteCount;
    }

    if (sort === "saved") {
      if (right.savedCount !== left.savedCount) return right.savedCount - left.savedCount;
      return (right.featuredReview.score ?? 0) - (left.featuredReview.score ?? 0);
    }

    if (sort === "recent") {
      const rightTime = right.featuredReview.publishedAt?.getTime() ?? 0;
      const leftTime = left.featuredReview.publishedAt?.getTime() ?? 0;
      return rightTime - leftTime;
    }

    const rightScore = right.featuredReview.score ?? -1;
    const leftScore = left.featuredReview.score ?? -1;
    if (rightScore !== leftScore) return rightScore - leftScore;
    return right.reviewCount - left.reviewCount;
  });

  const featuredProducts = products.slice(0, 3);
  const totalDeliveryProducts = allProducts.filter((product) => product.deliveryStoreCount > 0).length;
  const totalLocalStores = allProducts.reduce((count, product) => count + product.storeCount, 0);
  const totalSavedSignals = allProducts.reduce((count, product) => count + product.savedCount, 0);
  const isAuthenticated = Boolean(session?.user?.id);
  const loginHref = `/login?callbackUrl=${encodeURIComponent("/products")}`;

  return (
    <main className="ws-container py-8 md:py-10">
      <section className="space-y-8">
        <header className="rounded-[2rem] border border-amber-200/15 bg-[radial-gradient(circle_at_top,_rgba(245,158,11,0.16),_rgba(10,10,10,0.96)_60%)] p-6 md:p-8">
          <div className="text-xs uppercase tracking-[0.3em] opacity-65">Product Atlas</div>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-5xl">
            Filterable Organic Product Discovery
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 opacity-85 md:text-lg">
            This is now a true catalog surface. Every product can be ranked by review quality,
            local coverage, delivery availability, and live offers, instead of sitting as a static
            card in a content feed.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.18em] opacity-65">Products</p>
              <p className="mt-2 text-3xl font-semibold">{allProducts.length}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.18em] opacity-65">Categories</p>
              <p className="mt-2 text-3xl font-semibold">{categories.length}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.18em] opacity-65">Delivery-ready products</p>
              <p className="mt-2 text-3xl font-semibold">{totalDeliveryProducts}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.18em] opacity-65">Store links surfaced</p>
              <p className="mt-2 text-3xl font-semibold">{totalLocalStores}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.18em] opacity-65">Member saves</p>
              <p className="mt-2 text-3xl font-semibold">{totalSavedSignals}</p>
            </div>
          </div>
        </header>

        <section className="rounded-[2rem] border border-white/10 bg-black/20 p-5 md:p-6">
          <form className="grid gap-3 lg:grid-cols-[1.35fr_0.9fr_0.8fr_0.8fr_auto]">
            <label className="space-y-1 text-sm">
              <span>Search products</span>
              <input
                type="search"
                name="q"
                defaultValue={query}
                placeholder="Avalon, chocolate milk, organic..."
                className="w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2"
              />
            </label>

            <label className="space-y-1 text-sm">
              <span>Category</span>
              <select
                name="category"
                defaultValue={selectedCategory}
                className="w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2"
              >
                <option value="">All categories</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1 text-sm">
              <span>Delivery filter</span>
              <select
                name="delivery"
                defaultValue={deliveryOnly ? "1" : ""}
                className="w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2"
              >
                <option value="">All products</option>
                <option value="1">Delivery available</option>
              </select>
            </label>

            <label className="space-y-1 text-sm">
              <span>Sort by</span>
              <select
                name="sort"
                defaultValue={sort}
                className="w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2"
              >
                <option value="score">Top score</option>
                <option value="local">Most local coverage</option>
                <option value="offers">Most live offers</option>
                <option value="saved">Most saved</option>
                <option value="recent">Most recent review</option>
              </select>
            </label>

            <div className="flex items-end gap-2">
              <button
                type="submit"
                className="inline-flex min-h-[42px] items-center justify-center rounded-xl border border-amber-300/35 bg-amber-200/12 px-4 py-2 text-sm font-medium text-amber-100 transition hover:bg-amber-200/20"
              >
                Apply
              </button>
              <Link
                href="/products"
                className="inline-flex min-h-[42px] items-center justify-center rounded-xl border border-white/10 px-4 py-2 text-sm font-medium transition hover:bg-white/5"
              >
                Reset
              </Link>
            </div>
          </form>
        </section>

        {featuredProducts.length > 0 && (
          <section className="space-y-4">
            <div className="space-y-1">
              <div className="text-xs uppercase tracking-[0.28em] opacity-65">Ranked now</div>
              <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
                Best positioned products in the catalog
              </h2>
            </div>

            <div className="grid gap-4 xl:grid-cols-3">
              {featuredProducts.map((product) => (
                <article
                  key={product.slug}
                  className="rounded-[1.8rem] border border-white/10 bg-black/25 p-5"
                >
                  <div className="flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.18em] opacity-75">
                    {typeof product.featuredReview.score === "number" && (
                      <span className="rounded-full border border-amber-300/30 bg-amber-200/10 px-3 py-1 text-amber-100">
                        {product.featuredReview.score}/100
                      </span>
                    )}
                    {product.deliveryStoreCount > 0 && (
                      <span className="rounded-full border border-emerald-300/30 bg-emerald-200/10 px-3 py-1 text-emerald-100">
                        Delivery live
                      </span>
                    )}
                    {product.savedCount > 0 && (
                      <span className="rounded-full border border-sky-300/30 bg-sky-200/10 px-3 py-1 text-sky-100">
                        {product.savedCount} saved
                      </span>
                    )}
                  </div>

                  <h3 className="mt-4 text-xl font-semibold tracking-tight">{product.name}</h3>
                  <p className="mt-2 text-sm leading-6 opacity-80">
                    {product.summary || "Canonical product page now available."}
                  </p>

                  <div className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
                    <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-3">
                      <p className="text-xs uppercase tracking-wide opacity-65">Local stores</p>
                      <p className="mt-1 text-xl font-semibold">{product.storeCount}</p>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-3">
                      <p className="text-xs uppercase tracking-wide opacity-65">Live offers</p>
                      <p className="mt-1 text-xl font-semibold">{product.liveOfferCount}</p>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-3">
                      <p className="text-xs uppercase tracking-wide opacity-65">Saved</p>
                      <p className="mt-1 text-xl font-semibold">{product.savedCount}</p>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-3">
                    <Link
                      href={`/products/${product.slug}`}
                      className="inline-flex items-center rounded-xl border border-amber-300/35 bg-amber-200/12 px-4 py-2 text-sm font-medium text-amber-100 transition hover:bg-amber-200/20"
                    >
                      Open Product
                    </Link>
                    <Link
                      href={`/articles/${product.featuredReview.articleSlug}`}
                      className="inline-flex items-center rounded-xl border border-white/10 px-4 py-2 text-sm font-medium transition hover:bg-white/5"
                    >
                      Read Review
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
                </article>
              ))}
            </div>
          </section>
        )}

        {products.length === 0 ? (
          <section className="rounded-[2rem] border border-dashed border-white/10 bg-black/10 px-6 py-12 text-center">
            <h2 className="text-2xl font-semibold">No products match that filter yet</h2>
            <p className="mt-3 text-sm opacity-75">
              Broaden the search or clear the filters to see the current discovery network.
            </p>
          </section>
        ) : (
          <section className="grid gap-5 lg:grid-cols-2">
            {products.map((product) => (
              <article
                key={product.slug}
                className="overflow-hidden rounded-[2rem] border border-neutral-800 bg-black/35"
              >
                {product.heroImageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={product.heroImageUrl}
                    alt={product.name}
                    className="h-52 w-full object-cover"
                  />
                )}

                <div className="space-y-4 p-5 md:p-6">
                  <div className="flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.18em] opacity-70">
                    {typeof product.featuredReview.score === "number" && (
                      <span className="rounded-full border border-amber-300/30 bg-amber-200/10 px-3 py-1 text-amber-100">
                        {product.featuredReview.score}/100
                      </span>
                    )}
                    {product.brandName && (
                      <span className="rounded-full border border-neutral-700 px-3 py-1">
                        {product.brandName}
                      </span>
                    )}
                    {product.category && (
                      <Link
                        href={`/products${buildQueryString({
                          category: product.category,
                          sort,
                          q: query || null,
                          delivery: deliveryOnly ? "1" : null,
                        })}`}
                        className="rounded-full border border-neutral-700 px-3 py-1 transition hover:bg-white/5"
                      >
                        {product.category}
                      </Link>
                    )}
                    {product.organicStatus && (
                      <span className="rounded-full border border-neutral-700 px-3 py-1">
                        {product.organicStatus}
                      </span>
                    )}
                    {product.deliveryStoreCount > 0 && (
                      <span className="rounded-full border border-emerald-300/30 bg-emerald-200/10 px-3 py-1 text-emerald-100">
                        {product.deliveryStoreCount} delivery store{product.deliveryStoreCount === 1 ? "" : "s"}
                      </span>
                    )}
                    {product.savedCount > 0 && (
                      <span className="rounded-full border border-sky-300/30 bg-sky-200/10 px-3 py-1 text-sky-100">
                        {product.savedCount} saved
                      </span>
                    )}
                  </div>

                  <div className="space-y-2">
                    <h2 className="text-2xl font-semibold tracking-tight">{product.name}</h2>
                    <p className="text-sm leading-6 opacity-80">
                      {product.summary ||
                        "This product now has a canonical page in the Wheat & Stone catalog."}
                    </p>
                  </div>

                  <div className="grid gap-3 rounded-2xl border border-neutral-800/80 bg-black/20 p-4 sm:grid-cols-4">
                    <div>
                      <div className="text-xs uppercase tracking-[0.18em] opacity-60">Reviews</div>
                      <div className="mt-1 text-lg font-semibold">{product.reviewCount}</div>
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-[0.18em] opacity-60">Buy routes</div>
                      <div className="mt-1 text-lg font-semibold">{product.buyRouteCount}</div>
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-[0.18em] opacity-60">Stores</div>
                      <div className="mt-1 text-lg font-semibold">{product.storeCount}</div>
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-[0.18em] opacity-60">Saved</div>
                      <div className="mt-1 text-lg font-semibold">{product.savedCount}</div>
                    </div>
                  </div>

                  <div className="grid gap-3 rounded-2xl border border-neutral-800/80 bg-black/20 p-4 md:grid-cols-[1fr_auto] md:items-center">
                    <div className="space-y-1">
                      <div className="text-xs uppercase tracking-[0.18em] opacity-60">
                        Latest linked review
                      </div>
                      <div className="font-medium">{product.featuredReview.articleTitle}</div>
                    </div>
                    <div className="text-sm opacity-70">
                      {product.featuredReview.publishedAt
                        ? product.featuredReview.publishedAt.toLocaleDateString()
                        : `${product.reviewCount} review(s)`}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Link
                      href={`/products/${product.slug}`}
                      className="inline-flex items-center rounded-xl border border-amber-300/35 bg-amber-200/12 px-4 py-2 text-sm font-medium text-amber-100 transition hover:bg-amber-200/20"
                    >
                      Open Product Page
                    </Link>
                    <Link
                      href={`/articles/${product.featuredReview.articleSlug}`}
                      className="inline-flex items-center rounded-xl border border-neutral-700 px-4 py-2 text-sm font-medium transition hover:bg-neutral-900"
                    >
                      Read Review
                    </Link>
                    <Link
                      href={`/map${buildQueryString({ q: product.name })}`}
                      className="inline-flex items-center rounded-xl border border-neutral-700 px-4 py-2 text-sm font-medium transition hover:bg-neutral-900"
                    >
                      Find Local Stores
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
              </article>
            ))}
          </section>
        )}
      </section>
    </main>
  );
}
