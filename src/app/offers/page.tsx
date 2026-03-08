import Link from "next/link";
import { getServerSession } from "next-auth";
import SaveToggleButton from "@/components/community/SaveToggleButton";
import { authOptions } from "@/lib/authOptions";
import { hasAnyRole, RBAC_ROLE_GROUPS } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { listSavedOfferIdsForUser } from "@/lib/savedCollections";

export const dynamic = "force-dynamic";

function isOfferLiveNow(offer: {
  status: string;
  startsAt: Date | null;
  endsAt: Date | null;
}): boolean {
  if (offer.status !== "LIVE") return false;

  const nowMs = Date.now();
  const startMs = offer.startsAt ? offer.startsAt.getTime() : null;
  const endMs = offer.endsAt ? offer.endsAt.getTime() : null;

  if (startMs !== null && nowMs < startMs) return false;
  if (endMs !== null && nowMs > endMs) return false;

  return true;
}

function money(cents: number | null): string {
  if (cents === null || !Number.isFinite(cents)) return "-";
  return `$${(cents / 100).toFixed(2)}`;
}

function localDate(iso: Date | null): string {
  if (!iso) return "-";
  return iso.toLocaleString();
}

export default async function OffersPage() {
  const session = await getServerSession(authOptions);
  const isOffersManager = hasAnyRole(session?.user?.role, RBAC_ROLE_GROUPS.staff);
  const savedOfferIds =
    session?.user?.id ? await listSavedOfferIdsForUser(session.user.id) : new Set<string>();
  const isAuthenticated = Boolean(session?.user?.id);
  const loginHref = `/login?callbackUrl=${encodeURIComponent("/offers")}`;

  const now = new Date();
  const liveOffers = await prisma.offer.findMany({
    where: {
      status: "LIVE",
      AND: [
        { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
        { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
      ],
    },
    include: {
      business: {
        select: {
          id: true,
          name: true,
          slug: true,
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
      _count: {
        select: {
          savedOffers: true,
        },
      },
    },
    orderBy: [{ featured: "desc" }, { updatedAt: "desc" }],
    take: 24,
  });

  let inboxItems: Array<{
    id: string;
    assignedAt: Date;
    expiresAt: Date | null;
      offer: {
        id: string;
        title: string;
      description: string | null;
      discountPriceCents: number | null;
      ctaUrl: string | null;
      badgeText: string | null;
      status: string;
      startsAt: Date | null;
      endsAt: Date | null;
      product: {
        slug: string;
        name: string;
      } | null;
        inventoryItem: {
          product: {
            slug: string;
            name: string;
          } | null;
        } | null;
        _count: {
          savedOffers: number;
        };
      };
      business: {
        id: string;
      name: string;
      slug: string;
    };
  }> = [];

  if (session?.user?.id || session?.user?.email) {
    const identityClauses: Array<Record<string, unknown>> = [];
    if (session.user.id) {
      identityClauses.push({ userExternalId: session.user.id });
    }
    if (session.user.email) {
      identityClauses.push({ userEmail: { equals: session.user.email, mode: "insensitive" } });
    }

    if (identityClauses.length > 0) {
      const rows = await prisma.userOfferInbox.findMany({
        where: {
          AND: [
            { OR: identityClauses },
            { status: { in: ["ACTIVE", "SEEN"] } },
            { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
          ],
        },
        include: {
          offer: {
            select: {
              id: true,
              title: true,
              description: true,
              discountPriceCents: true,
              ctaUrl: true,
              badgeText: true,
              status: true,
              startsAt: true,
              endsAt: true,
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
              _count: {
                select: {
                  savedOffers: true,
                },
              },
            },
          },
          business: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
        orderBy: [{ assignedAt: "desc" }],
      });

      inboxItems = rows.filter((row) => isOfferLiveNow(row.offer));
    }
  }

  return (
    <main className="ws-container py-8 md:py-10 space-y-5">
      <section className="ws-article rounded-2xl border border-black/10 dark:border-white/15 bg-black/[0.03] dark:bg-white/[0.04] p-5 md:p-7 space-y-5">
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-[0.24em] opacity-65">Offers</p>
          <h1 className="text-2xl md:text-4xl font-semibold">Your Active Offer Box</h1>
          <p className="opacity-80 leading-relaxed">
            Every signed-in user should always have active offers in their box. This page shows
            assigned deals first, then all currently live offers across the network.
          </p>
        </header>

        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-red-500/40 bg-red-600 px-3 py-1 text-xs font-semibold text-white">
            Badge Count: {inboxItems.length}
          </span>
          {session?.user ? (
            <span className="rounded-full border border-sky-300/30 bg-sky-200/10 px-3 py-1 text-xs font-semibold text-sky-100">
              Saved offers: {savedOfferIds.size}
            </span>
          ) : null}
          {isOffersManager ? (
            <Link
              href="/admin/offers"
              className="inline-flex items-center rounded-lg border border-black/15 dark:border-white/20 px-3 py-2 text-sm font-medium hover:bg-black/5 dark:hover:bg-white/10"
            >
              Open Offers Command Center
            </Link>
          ) : null}
        </div>

        {session?.user ? (
          <section className="space-y-3">
            <h2 className="text-lg md:text-2xl font-semibold">Assigned To You</h2>
            {inboxItems.length === 0 ? (
              <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                Your offers box is empty right now. Admin can backfill from the Offers Command Center.
              </p>
            ) : (
              <ul className="grid gap-3 md:grid-cols-2">
                {inboxItems.map((item) => {
                  const product =
                    item.offer.product ?? item.offer.inventoryItem?.product ?? null;

                  return (
                    <li key={item.id} className="rounded-xl border border-white/10 bg-black/20 p-4 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold">{item.offer.title}</p>
                        <span className="rounded-full bg-red-600 px-2 py-0.5 text-[11px] font-semibold text-white">
                          {item.offer.badgeText ?? "Offer"}
                        </span>
                      </div>
                      <p className="text-sm opacity-80">{item.offer.description ?? "No description"}</p>
                      <p className="text-sm">
                        {item.business.name} · {money(item.offer.discountPriceCents)}
                      </p>
                      {product ? (
                        <Link
                          href={`/products/${product.slug}`}
                          className="inline-flex items-center rounded-full border border-amber-300/30 bg-amber-200/10 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-amber-100"
                        >
                          {product.name}
                        </Link>
                      ) : null}
                      <p className="text-xs opacity-70">
                        Assigned: {localDate(item.assignedAt)} · Expires: {localDate(item.expiresAt)}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {item.offer.ctaUrl ? (
                          <a
                            href={item.offer.ctaUrl}
                            className="inline-flex items-center rounded-lg border border-amber-300/50 bg-amber-300/15 px-3 py-1.5 text-xs font-medium hover:bg-amber-300/25"
                          >
                            Claim Offer
                          </a>
                        ) : null}
                        <SaveToggleButton
                          kind="offer"
                          itemId={item.offer.id}
                          isAuthenticated={isAuthenticated}
                          loginHref={loginHref}
                          initialSaved={savedOfferIds.has(item.offer.id)}
                          initialCount={item.offer._count.savedOffers}
                          tone="sky"
                          compact
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        ) : (
          <p className="rounded-xl border border-black/10 dark:border-white/15 px-3 py-2 text-sm opacity-80">
            Login to see your personal offer box and badge count.
          </p>
        )}

        <section className="space-y-3">
          <h2 className="text-lg md:text-2xl font-semibold">Live Offers Network-Wide</h2>
          {liveOffers.length === 0 ? (
            <p className="text-sm opacity-70">No live offers found.</p>
          ) : (
            <ul className="grid gap-3 md:grid-cols-2">
              {liveOffers.map((offer) => {
                const product = offer.product ?? offer.inventoryItem?.product ?? null;

                return (
                  <li key={offer.id} className="rounded-xl border border-white/10 bg-black/20 p-4 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold">{offer.title}</p>
                      <span className="rounded-full border border-white/20 px-2 py-0.5 text-[11px] opacity-80">
                        {offer.badgeText ?? offer.status}
                      </span>
                    </div>
                    <p className="text-sm opacity-80">{offer.description ?? "No description"}</p>
                    <p className="text-sm">
                      {offer.business.name} · {money(offer.discountPriceCents)}
                    </p>
                    {product ? (
                      <Link
                        href={`/products/${product.slug}`}
                        className="inline-flex items-center rounded-full border border-amber-300/30 bg-amber-200/10 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-amber-100"
                      >
                        {product.name}
                      </Link>
                    ) : null}
                    {offer._count.savedOffers > 0 ? (
                      <span className="inline-flex items-center rounded-full border border-sky-300/30 bg-sky-200/10 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-sky-100">
                        {offer._count.savedOffers} saved
                      </span>
                    ) : null}
                    <p className="text-xs opacity-70">
                      Starts: {localDate(offer.startsAt)} · Ends: {localDate(offer.endsAt)}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {offer.ctaUrl ? (
                        <a
                          href={offer.ctaUrl}
                          className="inline-flex items-center rounded-lg border border-amber-300/50 bg-amber-300/15 px-3 py-1.5 text-xs font-medium hover:bg-amber-300/25"
                        >
                          Claim Offer
                        </a>
                      ) : null}
                      <SaveToggleButton
                        kind="offer"
                        itemId={offer.id}
                        isAuthenticated={isAuthenticated}
                        loginHref={loginHref}
                        initialSaved={savedOfferIds.has(offer.id)}
                        initialCount={offer._count.savedOffers}
                        tone="sky"
                        compact
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </section>
    </main>
  );
}
