// src/components/article/AffiliatePair.tsx
"use client";

import React from "react";
import { trackAnalyticsEvent } from "@/lib/analytics/client";

type Product = {
  title: string;
  href: string;
  imageSrc?: string;
  imageAlt?: string;
  priceHint?: string;
  badge?: string;
};

type Props = { left: Product; right: Product; note?: string; articleSlug?: string };

function detectAffiliateNetwork(href: string): "AMAZON" | "LOCAL_DIRECT" | "TOKENTAP" | "OTHER" {
  const target = href.toLowerCase();
  if (target.includes("amazon.")) return "AMAZON";
  if (target.includes("tokentap.ca")) return "TOKENTAP";
  if (target.startsWith("mailto:")) return "LOCAL_DIRECT";
  return "OTHER";
}

function Card({ p, articleSlug }: { p: Product; articleSlug?: string }) {
  const onClick = React.useCallback(() => {
    const network = detectAffiliateNetwork(p.href);

    trackAnalyticsEvent({
      eventType: "AFFILIATE_CLICK",
      articleSlug: articleSlug ?? null,
      destinationUrl: p.href,
      sourceContext: "article_affiliate_pair",
      metadata: {
        network,
        title: p.title,
        badge: p.badge ?? null,
      },
    });

    if (network === "LOCAL_DIRECT") {
      trackAnalyticsEvent({
        eventType: "INVENTORY_CTA",
        articleSlug: articleSlug ?? null,
        destinationUrl: p.href,
        sourceContext: "article_affiliate_local_direct",
        metadata: {
          title: p.title,
        },
      });
    }
  }, [articleSlug, p.badge, p.href, p.title]);

  return (
    <a
      href={p.href}
      target="_blank"
      rel="nofollow sponsored noopener"
      aria-label={`Buy ${p.title} on Amazon`}
      onClick={onClick}
      className="aff-card group w-full min-w-0 max-w-full overflow-hidden flex h-full flex-col rounded-2xl border border-neutral-800 bg-black/60 p-4 md:p-5 transition-colors hover:bg-black/70"
    >
      {p.badge && (
        <div className="mb-2 text-xs uppercase tracking-wide opacity-80 break-words">
          {p.badge}
        </div>
      )}

      {p.imageSrc && (
        <div className="stage rounded-lg bg-black/30">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={p.imageSrc}
            alt={p.imageAlt ?? p.title}
            className="aff-img"
            loading="lazy"
            decoding="async"
          />
        </div>
      )}

      <div className="mt-3 md:mt-4">
        {/* exactly 2 lines; never changes card width/height */}
        <div className="title font-medium break-words">{p.title}</div>
        {p.priceHint && <div className="mt-0.5 text-sm opacity-70 break-words">{p.priceHint}</div>}
      </div>

      <div className="mt-auto pt-4">
        <span className="inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold bg-amber-400 text-black group-hover:opacity-90">
          Buy on Amazon →
        </span>
      </div>

      <style jsx>{`
        /* Consistent image stage */
        .aff-card .stage {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 150px;
          overflow: hidden;
        }
        @media (min-width: 768px) {
          .aff-card .stage { height: 160px; }
        }
        .aff-card .aff-img {
          max-width: 100% !important;
          max-height: 100% !important;
          width: auto !important;
          height: auto !important;
          object-fit: contain !important;
        }

        /* Two-line clamp with ellipsis */
        .aff-card .title {
          line-height: 1.35 !important;
          max-height: calc(1.35em * 2);
          display: -webkit-box;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 2;
          overflow: hidden;
          text-overflow: ellipsis;
          overflow-wrap: anywhere;
          word-break: break-word;
        }
      `}</style>
    </a>
  );
}

export default function AffiliatePair({ left, right, note, articleSlug }: Props) {
  return (
    <section className="mt-12 md:mt-16 mb-12 md:mb-16">
      {/* Strict 2-col grid with its own class forced via CSS to avoid any overrides */}
      <div className="aff-grid mx-auto w-full max-w-[980px] px-2">
        <div className="min-w-0 overflow-hidden">
          <Card p={left} articleSlug={articleSlug} />
        </div>
        <div className="min-w-0 overflow-hidden">
          <Card p={right} articleSlug={articleSlug} />
        </div>
      </div>

      <p className="mt-5 text-center text-xs opacity-60">
        {note ?? "As an Amazon Associate, Wheat & Stone earns from qualifying purchases."}
      </p>

      <style jsx>{`
        .aff-grid {
          display: grid !important;
          grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) !important; /* lock 50/50 */
          column-gap: 1.5rem;  /* ~24px */
          row-gap: 0;          /* no stacking gap since we want side-by-side */
        }
        @media (min-width: 768px) {
          .aff-grid { column-gap: 2rem; } /* ~32px on md+ */
        }
      `}</style>
    </section>
  );
}
