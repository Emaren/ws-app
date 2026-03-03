import Link from "next/link";

export const dynamic = "force-dynamic";

export default function MapPage() {
  return (
    <main className="ws-container py-8 md:py-10">
      <section className="ws-article rounded-2xl border border-black/10 dark:border-white/15 bg-black/[0.03] dark:bg-white/[0.04] p-5 md:p-7 space-y-5">
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-[0.24em] opacity-65">Map</p>
          <h1 className="text-2xl md:text-4xl font-semibold">Local Radius & Delivery Graph</h1>
          <p className="opacity-80 leading-relaxed">
            Map mode will visualize nearby businesses, active offers, pickup/delivery zones, and
            token-enabled local interactions.
          </p>
        </header>

        <section className="space-y-2">
          <h2 className="text-lg md:text-2xl font-semibold">Map Data Layer Status</h2>
          <ul className="list-disc pl-5 space-y-1 leading-relaxed">
            <li>Store profile location fields already exist in the data model.</li>
            <li>Business + inventory APIs are wired through ops proxy routes.</li>
            <li>Delivery leads and campaign metadata are already tracked.</li>
          </ul>
        </section>

        <footer className="pt-2 flex flex-wrap items-center gap-3">
          <Link
            href="/admin/business"
            className="inline-flex items-center rounded-lg border border-black/15 dark:border-white/20 px-3 py-2 text-sm font-medium hover:bg-black/5 dark:hover:bg-white/10"
          >
            Manage Geo Data
          </Link>
          <Link
            href="/discover"
            className="inline-flex items-center rounded-lg border border-black/15 dark:border-white/20 px-3 py-2 text-sm font-medium hover:bg-black/5 dark:hover:bg-white/10"
          >
            Back to Discover
          </Link>
        </footer>
      </section>
    </main>
  );
}
