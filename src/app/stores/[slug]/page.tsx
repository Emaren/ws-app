import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicStoreBySlug } from "@/lib/publicStores";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function money(cents: number | null): string {
  if (cents === null || !Number.isFinite(cents)) return "-";
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
  }).format(cents / 100);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const store = await getPublicStoreBySlug(slug);

  if (!store) {
    return {
      title: "Store not found | Wheat & Stone",
      robots: { index: false, follow: false },
    };
  }

  const title = `${store.displayName} | Wheat & Stone`;
  const description =
    store.description ||
    "Browse a public Wheat & Stone store page with live offers, inventory, and local coverage.";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      images: store.heroImageUrl ? [{ url: store.heroImageUrl, alt: store.displayName }] : [],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: store.heroImageUrl ? [store.heroImageUrl] : [],
    },
  };
}

export default async function StorePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const store = await getPublicStoreBySlug(slug);

  if (!store) {
    notFound();
  }

  return (
    <main className="ws-container py-8 md:py-10">
      <div className="space-y-8">
        <section className="overflow-hidden rounded-[2.25rem] border border-emerald-200/15 bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.16),_rgba(10,10,10,0.96)_60%)]">
          {store.heroImageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={store.heroImageUrl}
              alt={store.displayName}
              className="h-64 w-full object-cover md:h-80"
            />
          )}

          <div className="space-y-5 p-6 md:p-8">
            <div className="flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.2em] opacity-75">
              {store.locationLabel && (
                <span className="rounded-full border border-neutral-700 px-3 py-1">
                  {store.locationLabel}
                </span>
              )}
              {store.deliveryEnabled && (
                <span className="rounded-full border border-emerald-300/30 bg-emerald-200/10 px-3 py-1 text-emerald-100">
                  Delivery enabled
                </span>
              )}
              {store.pickupEnabled && (
                <span className="rounded-full border border-white/10 px-3 py-1">
                  Pickup enabled
                </span>
              )}
              {typeof store.deliveryRadiusKm === "number" && store.deliveryRadiusKm > 0 && (
                <span className="rounded-full border border-white/10 px-3 py-1">
                  {store.deliveryRadiusKm} km radius
                </span>
              )}
            </div>

            <div className="space-y-3">
              <h1 className="text-3xl font-semibold tracking-tight md:text-5xl">
                {store.displayName}
              </h1>
              <p className="max-w-3xl text-base leading-7 opacity-85 md:text-lg">
                {store.description}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/map"
                className="inline-flex items-center rounded-xl border border-emerald-300/35 bg-emerald-200/12 px-4 py-2 text-sm font-medium text-emerald-100 transition hover:bg-emerald-200/20"
              >
                Back to atlas
              </Link>
              {store.websiteUrl && (
                <a
                  href={store.websiteUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center rounded-xl border border-white/10 px-4 py-2 text-sm font-medium transition hover:bg-white/5"
                >
                  Visit website
                </a>
              )}
            </div>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-[1.9rem] border border-white/10 bg-black/20 p-5 md:p-6">
            <div className="text-xs uppercase tracking-[0.28em] opacity-65">Store Signal</div>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">Current local footprint</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4">
                <p className="text-xs uppercase tracking-[0.18em] opacity-65">Live offers</p>
                <p className="mt-2 text-3xl font-semibold">{store.liveOfferCount}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4">
                <p className="text-xs uppercase tracking-[0.18em] opacity-65">Active inventory</p>
                <p className="mt-2 text-3xl font-semibold">{store.inventoryCount}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4">
                <p className="text-xs uppercase tracking-[0.18em] opacity-65">Products represented</p>
                <p className="mt-2 text-3xl font-semibold">{store.liveProductCount}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4">
                <p className="text-xs uppercase tracking-[0.18em] opacity-65">Fulfillment mode</p>
                <p className="mt-2 text-lg font-semibold">
                  {store.deliveryEnabled ? "Delivery live" : store.pickupEnabled ? "Pickup live" : "Discovery only"}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[1.9rem] border border-white/10 bg-black/20 p-5 md:p-6">
            <div className="text-xs uppercase tracking-[0.28em] opacity-65">Product Network</div>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">Products carried here</h2>
            {store.featuredProducts.length > 0 ? (
              <div className="mt-5 flex flex-wrap gap-2">
                {store.featuredProducts.map((product) => (
                  <Link
                    key={product.slug}
                    href={`/products/${product.slug}`}
                    className="rounded-full border border-white/10 px-4 py-2 text-sm transition hover:bg-white/5"
                  >
                    {product.name}
                  </Link>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm opacity-75">
                Product links will appear here as more canonical inventory records are added.
              </p>
            )}
          </div>
        </section>

        {store.liveOffers.length > 0 && (
          <section className="space-y-4">
            <div className="space-y-1">
              <div className="text-xs uppercase tracking-[0.28em] opacity-65">Live Offers</div>
              <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
                Current store promotions
              </h2>
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              {store.liveOffers.map((offer) => (
                <article
                  key={offer.id}
                  className="rounded-[1.9rem] border border-neutral-800 bg-black/30 p-5"
                >
                  <div className="flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.18em] opacity-75">
                    {offer.badgeText && (
                      <span className="rounded-full border border-emerald-300/30 bg-emerald-200/10 px-3 py-1 text-emerald-100">
                        {offer.badgeText}
                      </span>
                    )}
                    {offer.featured && (
                      <span className="rounded-full border border-white/10 px-3 py-1">
                        Featured
                      </span>
                    )}
                    {offer.product && (
                      <Link
                        href={`/products/${offer.product.slug}`}
                        className="rounded-full border border-white/10 px-3 py-1 transition hover:bg-white/5"
                      >
                        {offer.product.name}
                      </Link>
                    )}
                  </div>

                  <div className="mt-3 space-y-3">
                    <h3 className="text-2xl font-semibold tracking-tight">{offer.title}</h3>
                    <p className="text-sm leading-6 opacity-80">
                      {offer.description || "This store is currently spotlighting a live local route."}
                    </p>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.18em] opacity-75">
                    {offer.discountPriceCents !== null && (
                      <span className="rounded-full border border-amber-300/30 bg-amber-200/10 px-3 py-1 text-amber-100">
                        {money(offer.discountPriceCents)}
                      </span>
                    )}
                    {offer.inventoryItem && (
                      <span className="rounded-full border border-white/10 px-3 py-1">
                        {offer.inventoryItem.availableUnits} available
                      </span>
                    )}
                  </div>

                  <div className="mt-5 flex flex-wrap gap-3">
                    {offer.product && (
                      <Link
                        href={`/products/${offer.product.slug}`}
                        className="inline-flex items-center rounded-xl border border-emerald-300/35 bg-emerald-200/12 px-4 py-2 text-sm font-medium text-emerald-100 transition hover:bg-emerald-200/20"
                      >
                        Open product page
                      </Link>
                    )}
                    <Link
                      href="/offers"
                      className="inline-flex items-center rounded-xl border border-white/10 px-4 py-2 text-sm font-medium transition hover:bg-white/5"
                    >
                      Browse all offers
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {store.activeInventory.length > 0 && (
          <section className="space-y-4">
            <div className="space-y-1">
              <div className="text-xs uppercase tracking-[0.28em] opacity-65">Inventory</div>
              <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
                Active inventory routes
              </h2>
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              {store.activeInventory.map((item) => (
                <article
                  key={item.id}
                  className="overflow-hidden rounded-[1.9rem] border border-neutral-800 bg-black/30"
                >
                  {item.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="h-52 w-full object-cover"
                    />
                  )}

                  <div className="space-y-4 p-5">
                    <div className="flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.18em] opacity-75">
                      {item.product && (
                        <Link
                          href={`/products/${item.product.slug}`}
                          className="rounded-full border border-white/10 px-3 py-1 transition hover:bg-white/5"
                        >
                          {item.product.name}
                        </Link>
                      )}
                      <span className="rounded-full border border-white/10 px-3 py-1">
                        {item.availableUnits} available
                      </span>
                    </div>

                    <div className="space-y-2">
                      <h3 className="text-2xl font-semibold tracking-tight">{item.name}</h3>
                      <p className="text-sm leading-6 opacity-80">
                        {item.description || "This active inventory route is now visible from the store network."}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.18em] opacity-75">
                      <span className="rounded-full border border-amber-300/30 bg-amber-200/10 px-3 py-1 text-amber-100">
                        {money(item.priceCents)}
                      </span>
                      {item.compareAtCents !== null && (
                        <span className="rounded-full border border-white/10 px-3 py-1">
                          Compare at {money(item.compareAtCents)}
                        </span>
                      )}
                    </div>

                    {item.product && (
                      <div className="pt-1">
                        <Link
                          href={`/products/${item.product.slug}`}
                          className="inline-flex items-center rounded-xl border border-white/10 px-4 py-2 text-sm font-medium transition hover:bg-white/5"
                        >
                          View product page
                        </Link>
                      </div>
                    )}
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
