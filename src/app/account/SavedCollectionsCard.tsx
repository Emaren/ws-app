import Link from "next/link";
import SaveToggleButton from "@/components/community/SaveToggleButton";
import { getSavedCollectionsForUser } from "@/lib/savedCollections";

function formatMoney(cents: number | null): string {
  if (cents === null || !Number.isFinite(cents)) {
    return "-";
  }

  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

export default async function SavedCollectionsCard({
  userId,
}: {
  userId: string;
}) {
  const { savedProducts, savedOffers } = await getSavedCollectionsForUser(userId);

  return (
    <section className="rounded-xl border border-black/10 bg-black/[0.02] p-4 dark:border-white/15 dark:bg-white/[0.03] md:p-5">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] opacity-70">Saved</p>
          <h2 className="mt-1 text-base font-semibold md:text-lg">Products and offers you want to track</h2>
          <p className="mt-1 text-sm opacity-75">
            Save items for later and use your account as a personal organic shopping shortlist.
          </p>
        </div>
        <div className="text-sm opacity-70">
          {savedProducts.length} product{savedProducts.length === 1 ? "" : "s"} · {savedOffers.length} offer{savedOffers.length === 1 ? "" : "s"}
        </div>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold md:text-base">Saved products</h3>
            <Link
              href="/products"
              className="text-xs font-medium opacity-75 transition hover:opacity-100"
            >
              Browse products
            </Link>
          </div>

          {savedProducts.length === 0 ? (
            <div className="rounded-lg border border-dashed border-black/15 px-3 py-4 text-sm opacity-75 dark:border-white/15">
              Save products from the catalog to build your personal shortlist.
            </div>
          ) : (
            <div className="space-y-2">
              {savedProducts.map((saved) => (
                <article
                  key={saved.id}
                  className="rounded-lg border border-black/10 px-3 py-3 dark:border-white/15"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-1">
                      <p className="font-medium">{saved.product.name}</p>
                      <p className="text-sm opacity-75">
                        {saved.product.brand?.name ? `${saved.product.brand.name} · ` : ""}
                        {saved.product.category || "Organic catalog"}
                      </p>
                    </div>
                    <SaveToggleButton
                      kind="product"
                      itemId={saved.product.id}
                      isAuthenticated
                      loginHref="/login?callbackUrl=/account"
                      initialSaved
                      initialCount={saved.product._count.savedProducts}
                      refreshOnChange
                      tone="amber"
                      compact
                    />
                  </div>

                  <p className="mt-2 text-sm opacity-80">
                    {saved.product.summary || "Saved canonical product page."}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-3">
                    <Link
                      href={`/products/${saved.product.slug}`}
                      className="inline-flex items-center rounded-lg border border-white/10 px-3 py-1.5 text-sm font-medium transition hover:bg-white/5"
                    >
                      Open product
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold md:text-base">Saved offers</h3>
            <Link
              href="/offers"
              className="text-xs font-medium opacity-75 transition hover:opacity-100"
            >
              Browse offers
            </Link>
          </div>

          {savedOffers.length === 0 ? (
            <div className="rounded-lg border border-dashed border-black/15 px-3 py-4 text-sm opacity-75 dark:border-white/15">
              Save live offers you want to compare or claim later.
            </div>
          ) : (
            <div className="space-y-2">
              {savedOffers.map((saved) => {
                const product = saved.offer.product ?? saved.offer.inventoryItem?.product ?? null;

                return (
                  <article
                    key={saved.id}
                    className="rounded-lg border border-black/10 px-3 py-3 dark:border-white/15"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="space-y-1">
                        <p className="font-medium">{saved.offer.title}</p>
                        <p className="text-sm opacity-75">
                          {saved.offer.business.name} · {formatMoney(saved.offer.discountPriceCents)}
                        </p>
                      </div>
                      <SaveToggleButton
                        kind="offer"
                        itemId={saved.offer.id}
                        isAuthenticated
                        loginHref="/login?callbackUrl=/account"
                        initialSaved
                        initialCount={saved.offer._count.savedOffers}
                        refreshOnChange
                        tone="sky"
                        compact
                      />
                    </div>

                    <p className="mt-2 text-sm opacity-80">
                      {saved.offer.description || "Saved live offer for later review."}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2 text-xs uppercase tracking-[0.16em] opacity-70">
                      {product ? (
                        <Link
                          href={`/products/${product.slug}`}
                          className="rounded-full border border-white/10 px-3 py-1 transition hover:bg-white/5"
                        >
                          {product.name}
                        </Link>
                      ) : null}
                      {saved.offer.badgeText ? (
                        <span className="rounded-full border border-white/10 px-3 py-1">
                          {saved.offer.badgeText}
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-4 flex flex-wrap gap-3">
                      <Link
                        href="/offers"
                        className="inline-flex items-center rounded-lg border border-white/10 px-3 py-1.5 text-sm font-medium transition hover:bg-white/5"
                      >
                        Open offers
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
