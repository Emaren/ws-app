import Link from "next/link";

export const dynamic = "force-dynamic";

export default function CommunityPage() {
  return (
    <main className="ws-container py-8 md:py-10">
      <section className="ws-article rounded-2xl border border-black/10 dark:border-white/15 bg-black/[0.03] dark:bg-white/[0.04] p-5 md:p-7 space-y-5">
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-[0.24em] opacity-65">Community</p>
          <h1 className="text-2xl md:text-4xl font-semibold">Members, Contributors, Momentum</h1>
          <p className="opacity-80 leading-relaxed">
            Community mode will bring together reader reactions, contributor workflow, and
            token-linked participation loops.
          </p>
        </header>

        <section className="space-y-2">
          <h2 className="text-lg md:text-2xl font-semibold">Current Live Systems</h2>
          <ul className="list-disc pl-5 space-y-1 leading-relaxed">
            <li>Public article and product reactions with anonymous-safe actor tracking.</li>
            <li>Wallet challenge/linking flow for account-to-wallet identity.</li>
            <li>Rewards ledger, reporting, export, and settlement workflow foundations.</li>
          </ul>
        </section>

        <footer className="pt-2 flex flex-wrap items-center gap-3">
          <Link
            href="/account"
            className="inline-flex items-center rounded-lg border border-black/15 dark:border-white/20 px-3 py-2 text-sm font-medium hover:bg-black/5 dark:hover:bg-white/10"
          >
            Open Account
          </Link>
          <Link
            href="/get-wheat"
            className="inline-flex items-center rounded-lg border border-black/15 dark:border-white/20 px-3 py-2 text-sm font-medium hover:bg-black/5 dark:hover:bg-white/10"
          >
            Explore Tokens
          </Link>
        </footer>
      </section>
    </main>
  );
}
