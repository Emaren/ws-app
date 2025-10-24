// src/components/article/AdRail.tsx

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
    case "amber": // warm paper vibe
      return {
        bg: "bg-amber-50 dark:bg-stone-900",
        border: "border-amber-100 dark:border-stone-800",
        text: "text-amber-700 dark:text-stone-200",
      };
    case "indigo": // soft brand tint
      return {
        bg: "bg-indigo-50 dark:bg-zinc-900",
        border: "border-indigo-100 dark:border-zinc-800",
        text: "text-indigo-700 dark:text-zinc-200",
      };
    case "neutral":
    default:
      return {
        bg: "bg-neutral-50 dark:bg-neutral-900",
        border: "border-neutral-200 dark:border-neutral-800",
        text: "text-neutral-600 dark:text-neutral-300",
      };
  }
}

function AdSlot({
  label,
  classes,
}: {
  label: string;
  classes: ReturnType<typeof toneClasses>;
}) {
  return (
    <div
      role="complementary"
      aria-label={label}
      className={[
        "h-40 rounded-xl flex items-center justify-center text-sm border",
        classes.bg,
        classes.border,
        classes.text,
      ].join(" ")}
    >
      {label}
    </div>
  );
}

export default function AdRail({ tone = "neutral" }: { tone?: Tone }) {
  const classes = toneClasses(tone);

  return (
    // sticky on large screens so the rail stays visible while reading
    <div className="space-y-4 lg:sticky lg:top-24">
      <AdSlot label="Homesteader Health Delivery" classes={classes} />
      <AdSlot label="Beaverlodge Butcher Shop Delivery" classes={classes} />
      {/* example tall unit */}
      <div
        className={[
          "h-64 rounded-xl flex items-center justify-center text-sm border",
          classes.bg,
          classes.border,
          classes.text,
        ].join(" ")}
      >
        TokenTap.ca
      </div>
    </div>
  );
}
