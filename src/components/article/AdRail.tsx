// src/components/article/AdRail.tsx
import Image from "next/image";

type Tone = "neutral" | "zinc" | "slate" | "stone" | "amber" | "indigo";

function toneClasses(tone: Tone) {
  switch (tone) {
    case "zinc":
      return {
        bg: "bg-zinc-50 dark:bg-zinc-900",
        border: "border-zinc-200 dark:border-zinc-800",
        text: "text-zinc-600 dark:text-zinc-300",
        hover: "hover:ring-zinc-300 dark:hover:ring-zinc-700",
      };
    case "slate":
      return {
        bg: "bg-slate-50 dark:bg-slate-900",
        border: "border-slate-200 dark:border-slate-800",
        text: "text-slate-600 dark:text-slate-300",
        hover: "hover:ring-slate-300 dark:hover:ring-slate-700",
      };
    case "stone":
      return {
        bg: "bg-stone-50 dark:bg-stone-900",
        border: "border-stone-200 dark:border-stone-800",
        text: "text-stone-600 dark:text-stone-300",
        hover: "hover:ring-stone-300 dark:hover:ring-stone-700",
      };
    case "amber":
      return {
        bg: "bg-amber-50 dark:bg-stone-900",
        border: "border-amber-100 dark:border-stone-800",
        text: "text-amber-700 dark:text-stone-200",
        hover: "hover:ring-amber-200 dark:hover:ring-stone-700",
      };
    case "indigo":
      return {
        bg: "bg-indigo-50 dark:bg-zinc-900",
        border: "border-indigo-100 dark:border-zinc-800",
        text: "text-indigo-700 dark:text-zinc-200",
        hover: "hover:ring-indigo-200 dark:hover:ring-zinc-700",
      };
    case "neutral":
    default:
      return {
        bg: "bg-neutral-50 dark:bg-neutral-900",
        border: "border-neutral-200 dark:border-neutral-800",
        text: "text-neutral-600 dark:text-neutral-300",
        hover: "hover:ring-neutral-300 dark:hover:ring-neutral-700",
      };
  }
}

type AdSlotProps = {
  label: string;
  classes: ReturnType<typeof toneClasses>;
  tall?: boolean;
  /** Path in /public (e.g. "/ads/homesteader.jpg"). */
  imageSrc?: string;
  /** Alt text for the image. */
  imageAlt?: string;
};

function AdSlot({ label, classes, tall, imageSrc, imageAlt }: AdSlotProps) {
  const subject = encodeURIComponent(`Ad Inquiry: ${label}`);
  const body = encodeURIComponent(
    `Hi Tony,\n\nI'm interested in the "${label}" ad placement.\n\nThanks!\n`
  );
  const href = `mailto:tony@wheatandstone.ca?subject=${subject}&body=${body}`;

  const heightClass = tall ? "h-64" : "h-40";

  return (
    <a
      href={href}
      aria-label={`${label} — email tony@wheatandstone.ca`}
      className={[
        "group block rounded-xl border overflow-hidden relative",
        "ring-0 transition focus:outline-none focus-visible:ring-2",
        classes.bg,
        classes.border,
        classes.hover,
      ].join(" ")}
    >
      <div className={["relative w-full", heightClass].join(" ")}>
        {imageSrc ? (
          <>
            {/* Image fills the card */}
            <Image
              src={imageSrc}
              alt={imageAlt || label}
              fill
              sizes="320px"
              className="object-cover"
              priority={false}
            />
            {/* Subtle gradient + label for readability */}
            <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/40 to-transparent">
              <div className="text-xs font-medium text-white drop-shadow-sm">
                {label} — click to email
              </div>
            </div>
          </>
        ) : (
          // Fallback if no image provided
          <div
            className={[
              "flex h-full w-full items-center justify-center text-sm",
              classes.text,
            ].join(" ")}
          >
            {label}
          </div>
        )}
      </div>
    </a>
  );
}

type Props = {
  tone?: Tone;
  /** Extra pixels of gap before the second ad (used to drop it ~halfway). */
  secondExtraTop?: number;
};

/**
 * Right-rail ads. The parent positions the whole rail under the timestamp.
 * `secondExtraTop` inserts extra vertical space before the second ad.
 */
export default function AdRail({ tone = "neutral", secondExtraTop = 0 }: Props) {
  const classes = toneClasses(tone);

  return (
    <div className="w-[320px] space-y-4">
      {/* Ad #1 */}
      <AdSlot
        label="Homesteader Health Delivery"
        classes={classes}
        imageSrc="/ads/homesteader.jpg"  // put the image under public/ads/
        imageAlt="Homesteader Health home delivery"
      />

      {/* Spacer before Ad #2 (kept for layout control) */}
      <div style={{ marginTop: Math.max(0, Math.round(secondExtraTop)) }} />

      {/* Ad #2 */}
      <AdSlot
        label="Beaverlodge Butcher Shp Delivery"
        classes={classes}
        imageSrc="/ads/beaverlodge.jpg" // put the image under public/ads/
        imageAlt="Beaverlodge Butcher Shp delivery"
        tall
      />
    </div>
  );
}
