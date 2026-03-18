import Link from "next/link";
import type { ReactNode } from "react";

type LegalPageLayoutProps = {
  eyebrow: string;
  title: string;
  summary: string;
  updatedLabel: string;
  children: ReactNode;
};

const legalLinks = [
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/data-deletion", label: "Data Deletion" },
];

export default function LegalPageLayout({
  eyebrow,
  title,
  summary,
  updatedLabel,
  children,
}: LegalPageLayoutProps) {
  return (
    <main className="ws-container py-8 md:py-10">
      <article className="ws-article space-y-6 rounded-2xl border border-black/10 bg-black/[0.03] p-5 dark:border-white/15 dark:bg-white/[0.04] md:p-7">
        <header className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs uppercase tracking-[0.24em] opacity-65">{eyebrow}</p>
            <span className="text-xs opacity-65">{updatedLabel}</span>
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold md:text-4xl">{title}</h1>
            <p className="max-w-3xl text-sm leading-relaxed opacity-80 md:text-base">
              {summary}
            </p>
          </div>
          <nav className="flex flex-wrap items-center gap-2 text-sm" aria-label="Legal navigation">
            {legalLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-full border border-black/15 px-3 py-1.5 transition hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </header>

        <div className="space-y-6 text-sm leading-relaxed opacity-90 md:text-base">{children}</div>
      </article>
    </main>
  );
}
