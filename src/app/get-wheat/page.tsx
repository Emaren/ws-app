import Link from "next/link";

export const dynamic = "force-dynamic";

export default function GetWheatPage() {
  return (
    <main className="ws-container py-8 md:py-10">
      <section className="ws-article rounded-2xl border border-black/10 dark:border-white/15 bg-black/[0.03] dark:bg-white/[0.04] p-5 md:p-7 space-y-5">
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-[0.24em] opacity-65">Token</p>
          <h1 className="text-2xl md:text-4xl font-semibold">$WHEAT</h1>
          <p className="opacity-80 leading-relaxed">
            $WHEAT is the activity and growth token for Wheat &amp; Stone. It is intended to power
            participation loops between content, local delivery flow, and marketplace discovery.
          </p>
        </header>

        <section className="space-y-2">
          <h2 className="text-lg md:text-2xl font-semibold">Planned Utility</h2>
          <ul className="list-disc pl-5 space-y-1 leading-relaxed">
            <li>Accrual from ecosystem actions such as fulfilled leads and campaigns.</li>
            <li>Incentive rails for local partner engagement and repeat activity.</li>
            <li>Future redemption paths tied to community and commerce outcomes.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg md:text-2xl font-semibold">Get Started</h2>
          <p className="opacity-80 leading-relaxed">
            Connect your account, monitor balances, and follow TokenTap for expanded tooling.
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <a
              href="https://tokentap.ca"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center rounded-lg border border-amber-400/40 bg-amber-300/20 px-3 py-2 text-sm font-semibold hover:bg-amber-300/30"
            >
              Open TokenTap.ca
            </a>
            <Link
              href="/account"
              className="inline-flex items-center rounded-lg border border-black/15 dark:border-white/20 px-3 py-2 text-sm font-medium hover:bg-black/5 dark:hover:bg-white/10"
            >
              View My Balances
            </Link>
          </div>
        </section>
      </section>
    </main>
  );
}
