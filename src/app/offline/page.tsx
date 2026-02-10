import Link from "next/link";

export const metadata = {
  title: "Offline | Wheat & Stone",
};

export default function OfflinePage() {
  return (
    <section className="ws-container py-10">
      <div className="mx-auto max-w-xl rounded-2xl border border-neutral-700/60 bg-neutral-950/80 p-6 text-neutral-100 shadow-xl">
        <p className="text-xs uppercase tracking-[0.18em] text-neutral-400">Wheat & Stone</p>
        <h1 className="mt-2 text-2xl font-semibold">You are offline</h1>
        <p className="mt-3 text-sm leading-relaxed text-neutral-300">
          Connection dropped, but the app shell is still available. Reconnect to load fresh
          articles, rewards data, and business tools.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/"
            className="rounded-lg border border-neutral-500 px-4 py-2 text-sm font-medium hover:bg-neutral-800"
          >
            Retry
          </Link>
          <Link
            href="/articles"
            className="rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-2 text-sm font-medium hover:bg-neutral-800"
          >
            Browse Articles
          </Link>
        </div>
      </div>
    </section>
  );
}
