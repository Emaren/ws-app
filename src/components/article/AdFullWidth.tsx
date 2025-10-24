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
        bg: "bg-neutral-50 dark:bg-neutral-900",
        border: "border-neutral-200 dark:border-neutral-800",
        text: "text-neutral-600 dark:text-neutral-300",
      };
  }
}

export default function AdFullWidth({
  label = "TokenTap.ca",
  tone = "neutral",
  height = 256, // px
}: {
  label?: string;
  tone?: Tone;
  height?: number;
}) {
  const classes = toneClasses(tone);

  return (
    <div className="w-full mt-10">
      <div
        className={[
          "w-full rounded-2xl border flex items-center justify-center text-sm md:text-base",
          classes.bg,
          classes.border,
          classes.text,
        ].join(" ")}
        style={{ height }}
        role="complementary"
        aria-label={label}
      >
        {label}
      </div>
    </div>
  );
}
