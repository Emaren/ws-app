import Link from "next/link";

export const dynamic = "force-dynamic";

export default function DiscoverPage() {
  return (
    <main className="ws-container py-8 md:py-10">
      <section className="ws-article rounded-2xl border border-black/10 dark:border-white/15 bg-black/[0.03] dark:bg-white/[0.04] p-5 md:p-7 space-y-5">
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-[0.24em] opacity-65">Discover</p>
          <h1 className="text-2xl md:text-4xl font-semibold">Organic Picks & Local Stories</h1>
          <p className="opacity-80 leading-relaxed">
            This surface is where curated category discovery will live: featured reviews, local
            maker highlights, and high-signal product collections.
          </p>
        </header>

        <section className="space-y-2">
          <h2 className="text-lg md:text-2xl font-semibold">Now Live</h2>
          <ul className="list-disc pl-5 space-y-1 leading-relaxed">
            <li>Latest published article on the home feed.</li>
            <li>Article directory at /articles with offer badges.</li>
            <li>Local ad-to-delivery flow integrated in article bodies.</li>
          </ul>
        </section>

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
        </footer>
      </section>
    </main>
  );
}
