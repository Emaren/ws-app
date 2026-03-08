import Link from "next/link";
import { listPublicStores } from "@/lib/publicStores";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type SearchParams = Record<string, string | string[] | undefined>;

function asString(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function buildStoreSearchBlob(store: {
  displayName: string;
  name: string;
  description: string | null;
  locationLabel: string | null;
  featuredProducts: Array<{ name: string }>;
}) {
  return [
    store.displayName,
    store.name,
    store.description,
    store.locationLabel,
    ...store.featuredProducts.map((product) => product.name),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export default async function MapPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const stores = await listPublicStores();

  const query = asString(params.q).trim().toLowerCase();
  const deliveryOnly = asString(params.delivery) === "1";

  const filteredStores = stores.filter((store) => {
    const matchesQuery = !query || buildStoreSearchBlob(store).includes(query);
    const matchesDelivery = !deliveryOnly || store.deliveryEnabled;
    return matchesQuery && matchesDelivery;
  });

  const deliveryStoreCount = stores.filter((store) => store.deliveryEnabled).length;
  const liveOfferCount = stores.reduce((count, store) => count + store.liveOfferCount, 0);
  const networkProductCount = new Set(
    stores.flatMap((store) => store.featuredProducts.map((product) => product.slug)),
  ).size;

  return (
    <main className="ws-container py-8 md:py-10">
      <div className="space-y-8">
        <section className="rounded-[2.25rem] border border-emerald-200/15 bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.16),_rgba(10,10,10,0.96)_60%)] p-6 md:p-8">
          <div className="text-xs uppercase tracking-[0.3em] opacity-65">Local Store Atlas</div>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-5xl">
            Browse the live local buying network
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 opacity-85 md:text-lg">
            The map layer is now a real public atlas. Stores can be discovered by location,
            delivery readiness, live offers, and the products they currently carry.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.18em] opacity-65">Stores live</p>
              <p className="mt-2 text-3xl font-semibold">{stores.length}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.18em] opacity-65">Delivery-enabled</p>
              <p className="mt-2 text-3xl font-semibold">{deliveryStoreCount}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.18em] opacity-65">Products represented</p>
              <p className="mt-2 text-3xl font-semibold">{networkProductCount}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.18em] opacity-65">Live offers</p>
              <p className="mt-2 text-3xl font-semibold">{liveOfferCount}</p>
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-black/20 p-5 md:p-6">
          <form className="grid gap-3 lg:grid-cols-[1.3fr_0.8fr_auto]">
            <label className="space-y-1 text-sm">
              <span>Search stores or products</span>
              <input
                type="search"
                name="q"
                defaultValue={query}
                placeholder="Edmonton, marketplace, Avalon..."
                className="w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2"
              />
            </label>

            <label className="space-y-1 text-sm">
              <span>Coverage</span>
              <select
                name="delivery"
                defaultValue={deliveryOnly ? "1" : ""}
                className="w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2"
              >
                <option value="">All stores</option>
                <option value="1">Delivery-enabled only</option>
              </select>
            </label>

            <div className="flex items-end gap-3">
              <button
                type="submit"
                className="inline-flex h-11 items-center rounded-xl border border-emerald-300/35 bg-emerald-200/12 px-4 text-sm font-medium text-emerald-100 transition hover:bg-emerald-200/20"
              >
                Update atlas
              </button>
              <Link
                href="/map"
                className="inline-flex h-11 items-center rounded-xl border border-white/10 px-4 text-sm font-medium transition hover:bg-white/5"
              >
                Reset
              </Link>
            </div>
          </form>
        </section>

        {filteredStores.length === 0 ? (
          <section className="rounded-[2rem] border border-dashed border-white/10 bg-black/10 px-6 py-12 text-center">
            <h2 className="text-2xl font-semibold">No stores match that atlas filter yet</h2>
            <p className="mt-3 text-sm opacity-75">
              Clear the search or broaden the delivery filter to see the current local network.
            </p>
          </section>
        ) : (
          <section className="grid gap-5 lg:grid-cols-2">
            {filteredStores.map((store) => (
              <article
                key={store.slug}
                className="overflow-hidden rounded-[2rem] border border-neutral-800 bg-black/35"
              >
                {store.heroImageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={store.heroImageUrl}
                    alt={store.displayName}
                    className="h-56 w-full object-cover"
                  />
                )}

                <div className="space-y-4 p-5 md:p-6">
                  <div className="flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.18em] opacity-75">
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

                  <div className="space-y-2">
                    <h2 className="text-2xl font-semibold tracking-tight">{store.displayName}</h2>
                    <p className="text-sm leading-6 opacity-80">
                      {store.description ||
                        "This store now has a public Wheat & Stone page for inventory, offers, and local product coverage."}
                    </p>
                  </div>

                  <div className="grid gap-3 rounded-2xl border border-neutral-800/80 bg-black/20 p-4 sm:grid-cols-3">
                    <div>
                      <div className="text-xs uppercase tracking-[0.18em] opacity-60">Products</div>
                      <div className="mt-1 text-lg font-semibold">{store.liveProductCount}</div>
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-[0.18em] opacity-60">Live offers</div>
                      <div className="mt-1 text-lg font-semibold">{store.liveOfferCount}</div>
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-[0.18em] opacity-60">Inventory routes</div>
                      <div className="mt-1 text-lg font-semibold">{store.inventoryCount}</div>
                    </div>
                  </div>

                  {store.featuredProducts.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {store.featuredProducts.map((product) => (
                        <Link
                          key={product.slug}
                          href={`/products/${product.slug}`}
                          className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-[0.18em] opacity-75 transition hover:bg-white/5"
                        >
                          {product.name}
                        </Link>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-3">
                    <Link
                      href={`/stores/${store.slug}`}
                      className="inline-flex items-center rounded-xl border border-emerald-300/35 bg-emerald-200/12 px-4 py-2 text-sm font-medium text-emerald-100 transition hover:bg-emerald-200/20"
                    >
                      Open store page
                    </Link>
                    <Link
                      href="/offers"
                      className="inline-flex items-center rounded-xl border border-white/10 px-4 py-2 text-sm font-medium transition hover:bg-white/5"
                    >
                      Browse offers
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
