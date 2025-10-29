// src/components/site/ActionLinks.tsx
import Link from "next/link";

type Item = { emoji: string; label: string; href: string };
const ITEMS: Item[] = [
  { emoji: "🪨", label: "Get Stone", href: "/get-stone" },
  { emoji: "🌾", label: "Get Wheat", href: "/get-wheat" },
  { emoji: "ℹ️", label: "About", href: "/about" },
];

export default function ActionLinks() {
  return (
    // Symmetric vertical spacing knob lives here
    <section className="ws-container my-12 md:my-16 lg:my-20">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
        {ITEMS.map((it) => (
          <Link
            key={it.label}
            href={it.href}
            aria-label={it.label}
            className={[
              "no-underline hover:no-underline focus:no-underline active:no-underline visited:no-underline",
              "[text-decoration:none]",
              "flex items-center justify-center select-none rounded-2xl",
              "border border-neutral-200 dark:border-neutral-800",
              "bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10",
              "px-5 py-4 md:px-6 md:py-5 transition",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50",
            ].join(" ")}
          >
            <span className="text-base md:text-lg font-semibold tracking-tight">
              <span className="mr-2">{it.emoji}</span>
              {it.label}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
