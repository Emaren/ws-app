import Link from "next/link";
import {
  resolveContributorDisplayName,
  resolveContributorPublicSlug,
} from "@/lib/contributorIdentity";
import type { HomePageStory } from "@/lib/getHomePageStories";
import type { LatestArticle } from "@/lib/getLatestArticle";
import type { SiteEdition } from "@/lib/experienceSystem";

type HomeSurfaceProps = {
  edition: SiteEdition;
  latestArticle: LatestArticle;
  supportingStories: HomePageStory[];
};

function formatPublishedAt(value: Date | null): string {
  if (!value) {
    return "Draft in motion";
  }

  return new Date(value).toLocaleDateString("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function editionTone(edition: SiteEdition) {
  if (edition === "modern") {
    return {
      feature:
        "border-amber-300/20 bg-[radial-gradient(circle_at_top,_rgba(245,158,11,0.16),_rgba(10,10,10,0.96)_62%)]",
      card: "border-amber-300/18 bg-white/[0.035]",
      accent: "border-amber-300/35 bg-amber-200/10 text-amber-50",
    };
  }

  if (edition === "rustic") {
    return {
      feature: "border-amber-300/20 bg-amber-500/[0.06]",
      card: "border-amber-200/16 bg-black/20",
      accent: "border-amber-300/30 bg-amber-200/10 text-amber-50",
    };
  }

  if (edition === "operator") {
    return {
      feature:
        "border-sky-300/18 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.16),_rgba(10,10,10,0.96)_62%)]",
      card: "border-sky-300/18 bg-white/[0.03]",
      accent: "border-sky-300/30 bg-sky-300/10 text-sky-50",
    };
  }

  return {
    feature: "border-white/12 bg-white/[0.025]",
    card: "border-white/10 bg-black/20",
    accent: "border-white/16 bg-white/[0.05] text-white",
  };
}

function SectionEyebrow({
  label,
  toneClass,
}: {
  label: string;
  toneClass: string;
}) {
  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-medium uppercase tracking-[0.24em] ${toneClass}`}
    >
      {label}
    </span>
  );
}

function StoryCard({
  story,
  toneClass,
}: {
  story: HomePageStory;
  toneClass: ReturnType<typeof editionTone>;
}) {
  const contributorName = resolveContributorDisplayName(story.author?.name);
  const contributorSlug = resolveContributorPublicSlug(story.author);

  return (
    <article className={`min-w-0 rounded-[1.75rem] border p-5 ${toneClass.card}`}>
      {story.coverUrl ? (
        <img
          src={story.coverUrl}
          alt=""
          className="mb-4 h-48 w-full rounded-[1.35rem] object-cover"
          loading="lazy"
          decoding="async"
        />
      ) : null}
      <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.18em] opacity-65">
        <span>{formatPublishedAt(story.publishedAt)}</span>
        {typeof story.reviewProfile?.reviewScore === "number" ? (
          <span className={`rounded-full border px-2.5 py-1 ${toneClass.accent}`}>
            {story.reviewProfile.reviewScore}/100
          </span>
        ) : null}
      </div>
      <h3 className="mt-3 text-2xl font-semibold tracking-tight text-balance">
        <Link href={`/articles/${story.slug}`} className="hover:underline underline-offset-4">
          {story.title}
        </Link>
      </h3>
      {story.excerpt ? (
        <p className="mt-3 text-base leading-7 opacity-85">{story.excerpt}</p>
      ) : null}
      <div className="mt-4 flex flex-wrap items-center gap-3 text-sm opacity-70">
        <Link
          href={`/community/contributors/${contributorSlug}`}
          className="underline-offset-4 hover:underline"
        >
          {contributorName}
        </Link>
        {story.reviewProfile?.category ? <span>{story.reviewProfile.category}</span> : null}
      </div>
    </article>
  );
}

export function HomeGazetteSurface({
  edition,
  latestArticle,
  supportingStories,
}: HomeSurfaceProps) {
  const tone = editionTone(edition);
  const contributorName = resolveContributorDisplayName(latestArticle.author?.name);
  const contributorSlug = resolveContributorPublicSlug(latestArticle.author);

  return (
    <main className="ws-container stack stack--lg">
      <section className={`overflow-hidden rounded-[2.5rem] border px-6 py-8 md:px-8 md:py-10 lg:px-10 ${tone.feature}`}>
        <div className="grid gap-8 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
          <div className="min-w-0">
            <SectionEyebrow label="Gazette Layout" toneClass={tone.accent} />
            <h1 className="mt-5 max-w-4xl text-4xl font-semibold tracking-tight text-balance md:text-5xl lg:text-6xl">
              Front-page rhythm for the Wheat &amp; Stone home.
            </h1>
            <p className="mt-4 max-w-3xl text-lg leading-8 opacity-85 md:text-xl">
              This layout gives the home page more publication confidence: one strong lead story,
              cleaner pacing, and more room for the site to feel like a real journal instead of a
              squeezed article column.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href={`/articles/${latestArticle.slug}`}
                className={`inline-flex items-center rounded-full border px-4 py-2 text-sm font-medium transition hover:bg-white/5 ${tone.accent}`}
              >
                Read lead story
              </Link>
              <Link
                href="/articles"
                className="inline-flex items-center rounded-full border border-white/15 px-4 py-2 text-sm font-medium transition hover:bg-white/5"
              >
                Browse journal
              </Link>
              <Link
                href="/products"
                className="inline-flex items-center rounded-full border border-white/15 px-4 py-2 text-sm font-medium transition hover:bg-white/5"
              >
                Open marketplace
              </Link>
            </div>
          </div>

          <article className={`min-w-0 rounded-[2rem] border p-6 ${tone.card}`}>
            <p className="text-xs uppercase tracking-[0.24em] opacity-65">Lead story</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance">
              <Link
                href={`/articles/${latestArticle.slug}`}
                className="hover:underline underline-offset-4"
              >
                {latestArticle.title}
              </Link>
            </h2>
            {latestArticle.excerpt ? (
              <p className="mt-4 text-base leading-7 opacity-85">{latestArticle.excerpt}</p>
            ) : null}
            <div className="mt-5 flex flex-wrap items-center gap-3 text-sm opacity-70">
              <Link
                href={`/community/contributors/${contributorSlug}`}
                className="underline-offset-4 hover:underline"
              >
                {contributorName}
              </Link>
              <span>{formatPublishedAt(latestArticle.publishedAt)}</span>
              {typeof latestArticle.reviewProfile?.reviewScore === "number" ? (
                <span className={`rounded-full border px-2.5 py-1 text-xs ${tone.accent}`}>
                  {latestArticle.reviewProfile.reviewScore}/100
                </span>
              ) : null}
            </div>
          </article>
        </div>
      </section>

      <section className="space-y-5">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] opacity-65">From Our Journal</p>
            <h2 className="mt-1 text-3xl font-semibold tracking-tight md:text-4xl">
              Handpicked stories and local proof.
            </h2>
          </div>
          <Link href="/articles" className="text-sm font-medium opacity-80 hover:opacity-100">
            View all articles
          </Link>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {supportingStories.map((story) => (
            <StoryCard key={story.slug} story={story} toneClass={tone} />
          ))}
        </div>
      </section>
    </main>
  );
}

export function HomeMarketplaceSurface({
  edition,
  latestArticle,
  supportingStories,
}: HomeSurfaceProps) {
  const tone = editionTone(edition);

  return (
    <main className="ws-container stack stack--lg">
      <section className={`overflow-hidden rounded-[2.5rem] border px-6 py-8 md:px-8 md:py-10 lg:px-10 ${tone.feature}`}>
        <div className="grid gap-8 xl:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]">
          <div className="min-w-0">
            <SectionEyebrow label="Marketplace Layout" toneClass={tone.accent} />
            <h1 className="mt-5 text-4xl font-semibold tracking-tight text-balance md:text-5xl">
              Commerce-forward, but still editorial.
            </h1>
            <p className="mt-4 max-w-3xl text-lg leading-8 opacity-85">
              This home mode puts products, offers, and buy paths closer to the surface while
              keeping Wheat &amp; Stone’s judgment-led lead story in the frame.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {[
                { href: "/products", label: "Products", body: "Browse the linked product atlas." },
                { href: "/offers", label: "Offers", body: "Unread-deal energy, surfaced cleanly." },
                { href: "/map", label: "Map", body: "See local routes and where to buy." },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-[1.4rem] border p-4 transition hover:bg-white/5 ${tone.card}`}
                >
                  <p className="text-sm font-semibold">{item.label}</p>
                  <p className="mt-2 text-sm leading-6 opacity-75">{item.body}</p>
                </Link>
              ))}
            </div>
          </div>

          <StoryCard
            story={{
              slug: latestArticle.slug,
              title: latestArticle.title,
              excerpt: latestArticle.excerpt,
              coverUrl: latestArticle.coverUrl,
              publishedAt: latestArticle.publishedAt,
              author: latestArticle.author,
              reviewProfile: latestArticle.reviewProfile
                ? {
                    reviewScore: latestArticle.reviewProfile.reviewScore,
                    productName: latestArticle.reviewProfile.productName,
                    category: latestArticle.reviewProfile.category,
                    organicStatus: latestArticle.reviewProfile.organicStatus,
                  }
                : null,
            }}
            toneClass={tone}
          />
        </div>
      </section>

      <section className="space-y-5">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] opacity-65">Offer-adjacent stories</p>
          <h2 className="mt-1 text-3xl font-semibold tracking-tight md:text-4xl">
            Reviews that can actually convert.
          </h2>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {supportingStories.map((story) => (
            <StoryCard key={story.slug} story={story} toneClass={tone} />
          ))}
        </div>
      </section>
    </main>
  );
}

export function HomeAtlasSurface({
  edition,
  latestArticle,
  supportingStories,
}: HomeSurfaceProps) {
  const tone = editionTone(edition);

  return (
    <main className="ws-container stack stack--lg">
      <section className={`overflow-hidden rounded-[2.5rem] border px-6 py-8 md:px-8 md:py-10 lg:px-10 ${tone.feature}`}>
        <div className="grid gap-8 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <div className="min-w-0">
            <SectionEyebrow label="Atlas Layout" toneClass={tone.accent} />
            <h1 className="mt-5 text-4xl font-semibold tracking-tight text-balance md:text-5xl">
              Discover routes, regions, and what matters nearby.
            </h1>
            <p className="mt-4 text-lg leading-8 opacity-85">
              Atlas mode makes the front page behave more like a discovery deck: stores, routes,
              products, and stories all feel like part of the same local network.
            </p>
            <div className="mt-6 grid gap-3">
              {[
                { href: "/map", label: "Open map", body: "Browse stores and local routes." },
                { href: "/discover", label: "Discover", body: "Mixed article, product, and store discovery." },
                { href: "/community", label: "Community", body: "See contributors and participation." },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-[1.4rem] border p-4 transition hover:bg-white/5 ${tone.card}`}
                >
                  <p className="text-sm font-semibold">{item.label}</p>
                  <p className="mt-2 text-sm leading-6 opacity-75">{item.body}</p>
                </Link>
              ))}
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <StoryCard
              story={{
                slug: latestArticle.slug,
                title: latestArticle.title,
                excerpt: latestArticle.excerpt,
                coverUrl: latestArticle.coverUrl,
                publishedAt: latestArticle.publishedAt,
                author: latestArticle.author,
                reviewProfile: latestArticle.reviewProfile
                  ? {
                      reviewScore: latestArticle.reviewProfile.reviewScore,
                      productName: latestArticle.reviewProfile.productName,
                      category: latestArticle.reviewProfile.category,
                      organicStatus: latestArticle.reviewProfile.organicStatus,
                    }
                  : null,
              }}
              toneClass={tone}
            />
            {supportingStories.slice(0, 1).map((story) => (
              <StoryCard key={story.slug} story={story} toneClass={tone} />
            ))}
          </div>
        </div>
      </section>

      {supportingStories.length > 1 ? (
        <section className="space-y-5">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] opacity-65">Network signals</p>
            <h2 className="mt-1 text-3xl font-semibold tracking-tight md:text-4xl">
              More local stories to open from here.
            </h2>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            {supportingStories.slice(1).map((story) => (
              <StoryCard key={story.slug} story={story} toneClass={tone} />
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
