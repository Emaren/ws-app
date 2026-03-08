import Link from "next/link";
import { listPublicProducts } from "@/lib/publicProducts";

export const dynamic = "force-dynamic";

export default async function DiscoverPage() {
  const products = await listPublicProducts(6);
  const categories = [...new Set(products.map((product) => product.category).filter(Boolean))];

  return (
    <main className="ws-container py-8 md:py-10">
      <section className="ws-article rounded-[2rem] border border-black/10 dark:border-white/15 bg-black/[0.03] dark:bg-white/[0.04] p-5 md:p-7 space-y-8">
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-[0.24em] opacity-65">Discover</p>
          <h1 className="text-2xl md:text-4xl font-semibold">Organic Picks & Local Stories</h1>
          <p className="opacity-80 leading-relaxed">
            Discovery is no longer a placeholder. Wheat & Stone can now surface canonical
            products, linked reviews, and buying routes from one catalog.
          </p>
        </header>

        <section className="space-y-2">
          <h2 className="text-lg md:text-2xl font-semibold">Now Live</h2>
          <ul className="list-disc pl-5 space-y-1 leading-relaxed">
            <li>Latest published article on the home feed.</li>
            <li>Article directory at /articles with offer badges.</li>
            <li>Canonical product catalog at /products.</li>
            <li>Local ad-to-delivery flow integrated in configurable review commerce modules.</li>
          </ul>
        </section>

        {products.length > 0 && (
          <section className="space-y-4">
            <div className="space-y-1">
              <h2 className="text-lg md:text-2xl font-semibold">Featured Products</h2>
              <p className="opacity-75">
                These pages are now shared anchors for reviews, stores, and offer discovery.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {products.map((product) => (
                <article
                  key={product.slug}
                  className="rounded-[1.5rem] border border-black/10 dark:border-white/15 bg-black/[0.04] dark:bg-white/[0.03] p-4 space-y-3"
                >
                  <div className="flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.18em] opacity-70">
                    {typeof product.featuredReview.score === "number" && (
                      <span className="rounded-full border border-amber-400/40 bg-amber-400/10 px-2.5 py-1 text-amber-200">
                        {product.featuredReview.score}/100
                      </span>
                    )}
                    {product.category && (
                      <span className="rounded-full border border-black/10 dark:border-white/15 px-2.5 py-1">
                        {product.category}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-lg font-semibold">{product.name}</h3>
                    <p className="text-sm opacity-75">
                      {product.summary || "Canonical product page now available."}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Link
                      href={`/products/${product.slug}`}
                      className="inline-flex items-center rounded-lg border border-black/15 dark:border-white/20 px-3 py-2 text-sm font-medium hover:bg-black/5 dark:hover:bg-white/10"
                    >
                      Open Product
                    </Link>
                    <Link
                      href={`/articles/${product.featuredReview.articleSlug}`}
                      className="inline-flex items-center rounded-lg border border-black/15 dark:border-white/20 px-3 py-2 text-sm font-medium hover:bg-black/5 dark:hover:bg-white/10"
                    >
                      Read Review
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {categories.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-lg md:text-2xl font-semibold">Categories</h2>
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <span
                  key={category}
                  className="rounded-full border border-black/10 dark:border-white/15 px-3 py-1 text-sm opacity-75"
                >
                  {category}
                </span>
              ))}
            </div>
          </section>
        )}

        <footer className="pt-2 flex flex-wrap items-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center rounded-lg border border-black/15 dark:border-white/20 px-3 py-2 text-sm font-medium hover:bg-black/5 dark:hover:bg-white/10"
          >
            Open Home Feed
          </Link>
          <Link
            href="/articles"
            className="inline-flex items-center rounded-lg border border-black/15 dark:border-white/20 px-3 py-2 text-sm font-medium hover:bg-black/5 dark:hover:bg-white/10"
          >
            Browse Articles
          </Link>
          <Link
            href="/products"
            className="inline-flex items-center rounded-lg border border-black/15 dark:border-white/20 px-3 py-2 text-sm font-medium hover:bg-black/5 dark:hover:bg-white/10"
          >
            Browse Products
          </Link>
        </footer>
      </section>
    </main>
  );
}
