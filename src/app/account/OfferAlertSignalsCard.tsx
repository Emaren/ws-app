import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  readSavedProductMatchMetadata,
  SAVED_PRODUCT_MATCH_SOURCE,
} from "@/lib/savedOfferAutomation";
import OfferAlertPreferencesForm from "./OfferAlertPreferencesForm";

const RECENT_MATCH_LIMIT = 6;

function formatDateTime(value: Date | null): string {
  if (!value) {
    return "-";
  }

  return value.toLocaleString();
}

function productLink(offer: {
  product: { slug: string; name: string } | null;
  inventoryItem: { product: { slug: string; name: string } | null } | null;
}) {
  return offer.product ?? offer.inventoryItem?.product ?? null;
}

export default async function OfferAlertSignalsCard({
  userId,
}: {
  userId: string;
}) {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      email: true,
      savedOfferAlertsEnabled: true,
      savedOfferEmailAlertsEnabled: true,
      _count: {
        select: {
          savedProducts: true,
        },
      },
    },
  });

  if (!user) {
    return null;
  }

  const [activeMatchedCount, recentMatches] = await Promise.all([
    prisma.userOfferInbox.count({
      where: {
        OR: [{ userExternalId: userId }, { userEmail: user.email }],
        status: {
          in: ["ACTIVE", "SEEN"],
        },
        AND: [{ OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] }],
        metadata: {
          path: ["source"],
          equals: SAVED_PRODUCT_MATCH_SOURCE,
        },
      },
    }),
    prisma.userOfferInbox.findMany({
      where: {
        OR: [{ userExternalId: userId }, { userEmail: user.email }],
        metadata: {
          path: ["source"],
          equals: SAVED_PRODUCT_MATCH_SOURCE,
        },
      },
      orderBy: [{ assignedAt: "desc" }],
      take: RECENT_MATCH_LIMIT,
      select: {
        id: true,
        status: true,
        assignedAt: true,
        expiresAt: true,
        metadata: true,
        business: {
          select: {
            name: true,
            slug: true,
          },
        },
        offer: {
          select: {
            id: true,
            title: true,
            badgeText: true,
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
        },
      },
    }),
  ]);

  const emailStatus = user.savedOfferEmailAlertsEnabled ? "On" : "Off";

  return (
    <section className="rounded-xl border border-black/10 bg-black/[0.02] p-4 dark:border-white/15 dark:bg-white/[0.03] md:p-5">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] opacity-70">Alerts</p>
          <h2 className="mt-1 text-base font-semibold md:text-lg">Saved-product offer matching</h2>
          <p className="mt-1 text-sm opacity-75">
            Wheat & Stone can watch your saved products and surface matching live offers automatically.
          </p>
        </div>
        <div className="text-sm opacity-70">
          Email attempts: <span className="font-medium text-inherit">{emailStatus}</span>
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <div className="rounded-lg border border-black/10 px-3 py-3 dark:border-white/15">
          <p className="text-xs uppercase tracking-[0.18em] opacity-65">Saved products</p>
          <p className="mt-1 text-2xl font-semibold">{user._count.savedProducts}</p>
        </div>
        <div className="rounded-lg border border-black/10 px-3 py-3 dark:border-white/15">
          <p className="text-xs uppercase tracking-[0.18em] opacity-65">Active matches</p>
          <p className="mt-1 text-2xl font-semibold">{activeMatchedCount}</p>
        </div>
        <div className="rounded-lg border border-black/10 px-3 py-3 dark:border-white/15">
          <p className="text-xs uppercase tracking-[0.18em] opacity-65">Alert engine</p>
          <p className="mt-1 text-sm font-medium">
            {user.savedOfferAlertsEnabled ? "Watching your catalog" : "Paused"}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold md:text-base">Recent matched offers</h3>
            <Link
              href="/offers"
              className="text-xs font-medium opacity-75 transition hover:opacity-100"
            >
              Open offers
            </Link>
          </div>

          {recentMatches.length === 0 ? (
            <div className="rounded-lg border border-dashed border-black/15 px-3 py-4 text-sm opacity-75 dark:border-white/15">
              No saved-product matches yet. Save products and the alert engine will start watching for live offers.
            </div>
          ) : (
            <div className="space-y-2">
              {recentMatches.map((match) => {
                const metadata = readSavedProductMatchMetadata(match.metadata);
                const linkedProduct = productLink(match.offer);

                return (
                  <article
                    key={match.id}
                    className="rounded-lg border border-black/10 px-3 py-3 dark:border-white/15"
                  >
                    <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                      <div className="space-y-1">
                        <p className="font-medium">{match.offer.title}</p>
                        <p className="text-sm opacity-75">
                          {metadata.matchedProductName || linkedProduct?.name || "Saved product match"}
                          {" · "}
                          {match.business.name}
                        </p>
                      </div>
                      <span className="inline-flex w-fit rounded-full border border-sky-300/30 bg-sky-200/10 px-2.5 py-1 text-[11px] font-medium text-sky-100">
                        {match.status}
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs opacity-70">
                      <span>Matched {formatDateTime(match.assignedAt)}</span>
                      <span>Expires {formatDateTime(match.expiresAt)}</span>
                      {match.offer.badgeText ? <span>{match.offer.badgeText}</span> : null}
                    </div>

                    <div className="mt-4 flex flex-wrap gap-3">
                      <Link
                        href="/offers"
                        className="inline-flex items-center rounded-lg border border-white/10 px-3 py-1.5 text-sm font-medium transition hover:bg-white/5"
                      >
                        Open offer box
                      </Link>
                      {linkedProduct ? (
                        <Link
                          href={`/products/${linkedProduct.slug}`}
                          className="inline-flex items-center rounded-lg border border-white/10 px-3 py-1.5 text-sm font-medium transition hover:bg-white/5"
                        >
                          Open product
                        </Link>
                      ) : null}
                      {match.business.slug ? (
                        <Link
                          href={`/stores/${match.business.slug}`}
                          className="inline-flex items-center rounded-lg border border-white/10 px-3 py-1.5 text-sm font-medium transition hover:bg-white/5"
                        >
                          Open store
                        </Link>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        <OfferAlertPreferencesForm
          savedOfferAlertsEnabled={user.savedOfferAlertsEnabled}
          savedOfferEmailAlertsEnabled={user.savedOfferEmailAlertsEnabled}
        />
      </div>
    </section>
  );
}
