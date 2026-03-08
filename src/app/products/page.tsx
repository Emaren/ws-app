import Link from "next/link";
import { listPublicProducts } from "@/lib/publicProducts";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ProductsPage() {
  const products = await listPublicProducts();
  const categories = [...new Set(products.map((product) => product.category).filter(Boolean))];

  return (
    <main className="ws-container py-8 md:py-10">
      <section className="space-y-8">
        <header className="rounded-[2rem] border border-amber-200/15 bg-[radial-gradient(circle_at_top,_rgba(245,158,11,0.16),_rgba(10,10,10,0.96)_60%)] p-6 md:p-8">
          <div className="text-xs uppercase tracking-[0.3em] opacity-65">Product Catalog</div>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-5xl">
            Canonical Organic Product Pages
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 opacity-85 md:text-lg">
            Wheat & Stone now treats products as first-class records. That means a single product
            can anchor reviews, store spotlights, affiliate comparisons, and discovery surfaces.
          </p>

          <div className="mt-6 flex flex-wrap gap-3 text-xs uppercase tracking-[0.18em] opacity-75">
            <span className="rounded-full border border-neutral-700 px-3 py-1">
              {products.length} products
            </span>
            <span className="rounded-full border border-neutral-700 px-3 py-1">
              {categories.length} categories
            </span>
            <span className="rounded-full border border-neutral-700 px-3 py-1">
              Product-first review graph
            </span>
          </div>
        </header>

        {categories.length > 0 && (
          <section className="space-y-3">
            <div className="text-sm font-medium opacity-75">Active categories</div>
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <span
                  key={category}
                  className="rounded-full border border-neutral-700 bg-black/20 px-3 py-1 text-sm opacity-80"
                >
                  {category}
                </span>
              ))}
            </div>
          </section>
        )}

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
                    <span className="rounded-full border border-neutral-700 px-3 py-1">
                      {product.category}
                    </span>
                  )}
                  {product.organicStatus && (
                    <span className="rounded-full border border-neutral-700 px-3 py-1">
                      {product.organicStatus}
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

                <div className="grid gap-3 rounded-2xl border border-neutral-800/80 bg-black/20 p-4 md:grid-cols-[1fr_auto] md:items-center">
                  <div className="space-y-1">
                    <div className="text-xs uppercase tracking-[0.18em] opacity-60">
                      Latest linked review
                    </div>
                    <div className="font-medium">{product.featuredReview.articleTitle}</div>
                  </div>
                  <div className="text-sm opacity-70">{product.reviewCount} review(s)</div>
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
                </div>
              </div>
            </article>
          ))}
        </section>
      </section>
    </main>
  );
}
