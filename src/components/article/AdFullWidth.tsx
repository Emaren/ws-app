// src/components/article/AdFullWidth.tsx

type Tone = "neutral" | "zinc" | "slate" | "stone" | "amber" | "indigo";

function toneClasses(tone: Tone) {
  switch (tone) {
    case "zinc":
      return {
        bg: "bg-zinc-50 dark:bg-zinc-900",
        border: "border-zinc-200 dark:border-zinc-800",
        text: "text-zinc-600 dark:text-zinc-300",
      };
    case "slate":
      return {
        bg: "bg-slate-50 dark:bg-slate-900",
        border: "border-slate-200 dark:border-slate-800",
        text: "text-slate-600 dark:text-slate-300",
      };
    case "stone":
      return {
        bg: "bg-stone-50 dark:bg-stone-900",
        border: "border-stone-200 dark:border-stone-800",
        text: "text-stone-600 dark:text-stone-300",
      };
    case "amber":
      return {
        bg: "bg-amber-50 dark:bg-stone-900",
        border: "border-amber-100 dark:border-stone-800",
        text: "text-amber-700 dark:text-stone-200",
      };
    case "indigo":
      return {
        bg: "bg-indigo-50 dark:bg-zinc-900",
        border: "border-indigo-100 dark:border-zinc-800",
        text: "text-indigo-700 dark:text-zinc-200",
      };
    case "neutral":
    default:
      return {
        bg: "bg-neutral-900", // force black background
        border: "border-neutral-800",
        text: "text-neutral-300",
      };
  }
}

export default function AdFullWidth({
  label = "TokenTap.ca",
  tone = "neutral",
  height = 256,
}: {
  label?: string;
  tone?: Tone;
  height?: number;
}) {
  const classes = toneClasses(tone);

  return (
    // Add top margin here to separate from comments
    <div className="w-full mt-12 md:mt-16 lg:mt-20">
      <a
        href="https://tokentap.ca"
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Visit ${label}`}
        className={[
          "w-full rounded-2xl border block overflow-hidden",
          "bg-black border-neutral-800",
          "focus:outline-none focus:ring-0 active:outline-none active:ring-0",
          "flex items-center justify-center",
        ].join(" ")}
        style={{ height: `${height}px` }}
      >
        <img
          src="/tt.png"
          alt={label}
          loading="lazy"
          className="object-contain outline-none"
          style={{
            height: `${Math.round(height * 0.46)}px`, // 75% of container height
            width: "auto",
          }}
        />
      </a>
    </div>
  );
}
