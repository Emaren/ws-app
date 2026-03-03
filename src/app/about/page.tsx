import Link from "next/link";

export const dynamic = "force-dynamic";

export default function AboutPage() {
  return (
    <main className="ws-container py-8 md:py-10">
      <section className="ws-article rounded-2xl border border-black/10 dark:border-white/15 bg-black/[0.03] dark:bg-white/[0.04] p-5 md:p-7 space-y-5">
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-[0.24em] opacity-65">About</p>
          <h1 className="text-2xl md:text-4xl font-semibold">Wheat &amp; Stone</h1>
          <p className="opacity-80 leading-relaxed">
            Wheat &amp; Stone is building a local-first organic review platform that mixes honest
            ingredient breakdowns, practical buying routes, and token-powered community growth.
          </p>
        </header>

        <section className="space-y-2">
          <h2 className="text-lg md:text-2xl font-semibold">What We Stand For</h2>
          <ul className="list-disc pl-5 space-y-1 leading-relaxed">
            <li>Truth-first food reviews with clear ingredient analysis.</li>
            <li>Direct local business support through delivery leads and partner placements.</li>
            <li>A growth model that combines content, commerce, and crypto utility.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg md:text-2xl font-semibold">Roadmap Direction</h2>
          <ul className="list-disc pl-5 space-y-1 leading-relaxed">
            <li>Dual frontend identity: clean minimal and rugged heritage experiences.</li>
            <li>Expanded discovery pages for offers, map, community, and contributor stories.</li>
            <li>$WHEAT/$STONE utility for rewards, reputation, and local participation loops.</li>
          </ul>
        </section>

        <footer className="pt-2 flex flex-wrap items-center gap-3">
          <Link
            href="/get-stone"
            className="inline-flex items-center rounded-lg border border-black/15 dark:border-white/20 px-3 py-2 text-sm font-medium hover:bg-black/5 dark:hover:bg-white/10"
          >
            Learn $STONE
          </Link>
          <Link
            href="/get-wheat"
            className="inline-flex items-center rounded-lg border border-black/15 dark:border-white/20 px-3 py-2 text-sm font-medium hover:bg-black/5 dark:hover:bg-white/10"
          >
            Learn $WHEAT
          </Link>
        </footer>
      </section>
    </main>
  );
}
