import Link from "next/link";
import { prisma } from "@/lib/prisma";

function formatDateTime(value: Date | string | null): string {
  if (!value) {
    return "-";
  }

  const parsed = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(parsed.getTime())) {
    return "-";
  }

  return parsed.toLocaleString();
}

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

export default async function WhatsNewSinceLastVisitCard({
  userId,
}: {
  userId: string;
}) {
  const experienceProfile = await prisma.userExperienceProfile.findUnique({
    where: {
      userId,
    },
    select: {
      lastSeenAt: true,
      personalDigestEnabled: true,
      digestCadenceHours: true,
    },
  });

  const savedProducts = await prisma.savedProduct.findMany({
    where: {
      userId,
    },
    select: {
      productId: true,
    },
  });

  const since = experienceProfile?.lastSeenAt ?? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const savedProductIds = savedProducts.map((saved) => saved.productId);

  const [newArticlesCount, newProductsCount, newOffersCount, savedProductOfferMatches] =
    await Promise.all([
      prisma.article.count({
        where: {
          status: "PUBLISHED",
          publishedAt: {
            gt: since,
          },
        },
      }),
      prisma.product.count({
        where: {
          updatedAt: {
            gt: since,
          },
        },
      }),
      prisma.offer.count({
        where: {
          status: "LIVE",
          updatedAt: {
            gt: since,
          },
        },
      }),
      savedProductIds.length === 0
        ? Promise.resolve([])
        : prisma.offer.findMany({
            where: {
              status: "LIVE",
              OR: [
                { productId: { in: savedProductIds } },
                { inventoryItem: { is: { productId: { in: savedProductIds } } } },
              ],
            },
            orderBy: [{ featured: "desc" }, { updatedAt: "desc" }],
            take: 6,
            select: {
              id: true,
              title: true,
              discountPriceCents: true,
              badgeText: true,
              updatedAt: true,
              business: {
                select: {
                  slug: true,
                  name: true,
                },
              },
              product: {
                select: {
                  slug: true,
                  name: true,
                },
              },
              inventoryItem: {
                select: {
                  product: {
                    select: {
                      slug: true,
                      name: true,
                    },
                  },
                },
              },
            },
          }),
    ]);

  return (
    <section className="rounded-xl border border-black/10 bg-black/[0.02] p-4 dark:border-white/15 dark:bg-white/[0.03] md:p-5">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] opacity-70">Since Last Visit</p>
          <h2 className="mt-1 text-base font-semibold md:text-lg">
            Personalized momentum and fresh discovery
          </h2>
          <p className="mt-1 text-sm opacity-75">
            Wheat & Stone now knows what changed since you were last here, and it can
            keep that retention loop personal.
          </p>
        </div>
        <div className="text-sm opacity-70">Last seen: {formatDateTime(experienceProfile?.lastSeenAt ?? null)}</div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-3 xl:grid-cols-4">
        <div className="rounded-lg border border-black/10 px-3 py-3 dark:border-white/15">
          <p className="text-xs uppercase tracking-[0.18em] opacity-65">New reviews</p>
          <p className="mt-1 text-2xl font-semibold">{newArticlesCount}</p>
        </div>
        <div className="rounded-lg border border-black/10 px-3 py-3 dark:border-white/15">
          <p className="text-xs uppercase tracking-[0.18em] opacity-65">Fresh products</p>
          <p className="mt-1 text-2xl font-semibold">{newProductsCount}</p>
        </div>
        <div className="rounded-lg border border-black/10 px-3 py-3 dark:border-white/15">
          <p className="text-xs uppercase tracking-[0.18em] opacity-65">Live offers</p>
          <p className="mt-1 text-2xl font-semibold">{newOffersCount}</p>
        </div>
        <div className="rounded-lg border border-black/10 px-3 py-3 dark:border-white/15">
          <p className="text-xs uppercase tracking-[0.18em] opacity-65">Saved-product matches</p>
          <p className="mt-1 text-2xl font-semibold">{savedProductOfferMatches.length}</p>
          <p className="mt-1 text-xs opacity-70">
            Digest {experienceProfile?.personalDigestEnabled ? `on · ${experienceProfile.digestCadenceHours}h cadence` : "paused"}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold md:text-base">Priority matches from your saved products</h3>
            <Link
              href="/offers"
              className="text-xs font-medium opacity-75 transition hover:opacity-100"
            >
              Open offers
            </Link>
          </div>

          {savedProductOfferMatches.length === 0 ? (
            <div className="rounded-lg border border-dashed border-black/15 px-3 py-4 text-sm opacity-75 dark:border-white/15">
              No live saved-product matches yet. Save more products or wait for new local offers to land.
            </div>
          ) : (
            <div className="space-y-2">
              {savedProductOfferMatches.map((offer) => {
                const product = offer.product ?? offer.inventoryItem?.product ?? null;

                return (
                  <article
                    key={offer.id}
                    className="rounded-lg border border-black/10 px-3 py-3 dark:border-white/15"
                  >
                    <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                      <div className="space-y-1">
                        <p className="font-medium">{offer.title}</p>
                        <p className="text-sm opacity-75">
                          {offer.business.name}
                          {product ? ` · ${product.name}` : ""}
                        </p>
                      </div>
                      <span className="text-xs opacity-65">
                        {formatDateTime(offer.updatedAt)}
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs opacity-70">
                      <span>{formatMoney(offer.discountPriceCents)}</span>
                      {offer.badgeText ? <span>{offer.badgeText}</span> : null}
                    </div>

                    <div className="mt-4 flex flex-wrap gap-3">
                      <Link
                        href="/offers"
                        className="inline-flex items-center rounded-lg border border-white/10 px-3 py-1.5 text-sm font-medium transition hover:bg-white/5"
                      >
                        Open offer
                      </Link>
                      {product ? (
                        <Link
                          href={`/products/${product.slug}`}
                          className="inline-flex items-center rounded-lg border border-white/10 px-3 py-1.5 text-sm font-medium transition hover:bg-white/5"
                        >
                          Open product
                        </Link>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div className="rounded-lg border border-black/10 px-4 py-4 dark:border-white/15">
            <p className="text-xs uppercase tracking-[0.18em] opacity-65">Why this matters</p>
            <p className="mt-2 text-sm opacity-80">
              Before this phase, Wheat & Stone could remember what you saved. Now it can
              also tell you what is newly worth your attention.
            </p>
          </div>

          <div className="rounded-lg border border-black/10 px-4 py-4 dark:border-white/15">
            <p className="text-xs uppercase tracking-[0.18em] opacity-65">Retention loop</p>
            <ul className="mt-2 space-y-2 text-sm opacity-80">
              <li>Save products that matter to you.</li>
              <li>Return to see what changed since your last visit.</li>
              <li>Let the digest settings control how often the platform nudges you.</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
