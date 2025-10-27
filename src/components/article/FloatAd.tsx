// src/components/article/FloatAd.tsx
"use client";

import Image from "next/image";
import React from "react";

type FloatAdProps = {
  label: string;
  side: "right" | "left";
  imageSrc?: string;
  imageAlt?: string;

  // Container sizing (px)
  w?: number; h?: number;
  mdW?: number; mdH?: number;
  lgW?: number; lgH?: number;

  // Image sizing (px)
  intrinsic?: boolean;             // true = <img>, false = Next <Image>
  imgMaxH?: number;                // base clamp
  mdImgMaxH?: number;              // md clamp
  lgImgMaxH?: number;              // lg clamp
  imgFit?: "contain" | "cover";
  nudgeY?: number;

  // Spacing / cosmetics
  pad?: number; mt?: number;

  // Optional class hooks
  containerClassName?: string;
  imgClassName?: string;
};

function sizeClass(v?: number, axis: "w" | "h" = "w") {
  return v != null ? `${axis}-[${v}px]` : "";
}
function join(...parts: Array<string | undefined | null | false>) {
  return parts.filter(Boolean).join(" ");
}

// Build a responsive `sizes` string for better image selection.
// Falls back to fixed width if only `w` is provided.
function buildSizes({ w, mdW, lgW }: { w?: number; mdW?: number; lgW?: number }) {
  const parts: string[] = [];
  if (lgW) parts.push(`(min-width: 1024px) ${lgW}px`);
  if (mdW) parts.push(`(min-width: 768px) ${mdW}px`);
  if (w)   parts.push(`${w}px`);
  return parts.length ? parts.join(", ") : "100vw";
}

export default function FloatAd({
  label,
  side,
  imageSrc,
  imageAlt,
  // container sizes
  w, h, mdW, mdH, lgW, lgH,
  // image sizes
  intrinsic,
  imgMaxH, mdImgMaxH, lgImgMaxH,
  imgFit = "contain",
  // layout
  nudgeY = 0,
  pad = 16,
  mt = 0,
  containerClassName,
  imgClassName,
}: FloatAdProps) {
  const isLeft = side === "left";
  const horizontalGutter = isLeft ? 44 : 36;
  const shapePad = isLeft ? 32 : 16;

  // The *floated* root box. Avoid flex/grid/overflow here so text can wrap.
  // NOTE: On small screens your global CSS collapses this to width:100% and no float.
  const floatRootStyle: React.CSSProperties = {
    float: side,
    marginTop: mt,
    marginLeft: !isLeft ? horizontalGutter : 0,
    marginRight: isLeft ? horizontalGutter : 0,
    marginBottom: 20,
    width: w,           // explicit width for classic float (overridden on mobile by your CSS)
    height: h,          // reserve space & improve shape-outside
    shapeOutside: "margin-box",
    shapeMargin: `${shapePad}px`,
  };

  // Tailwind static tokens (so purge doesn’t remove them)
  const containerSizeClasses = join(
    sizeClass(w, "w"),
    sizeClass(h, "h"),
    mdW != null ? `md:${sizeClass(mdW, "w")}` : "",
    mdH != null ? `md:${sizeClass(mdH, "h")}` : "",
    lgW != null ? `lg:${sizeClass(lgW, "w")}` : "",
    lgH != null ? `lg:${sizeClass(lgH, "h")}` : "",
  );

  const innerPadStyle: React.CSSProperties = { padding: pad };
  const fitClass = imgFit === "cover" ? "object-cover" : "object-contain";

  // CSS vars provide dynamic max-heights across breakpoints
  const imgStyleVars: React.CSSProperties = {
    ...(imgMaxH   != null ? { ["--img-h" as any]: `${imgMaxH}px` }     : {}),
    ...(mdImgMaxH != null ? { ["--img-h-md" as any]: `${mdImgMaxH}px` } : {}),
    ...(lgImgMaxH != null ? { ["--img-h-lg" as any]: `${lgImgMaxH}px` } : {}),
    transform: `translateY(${nudgeY}px)`,
  };

  const sizes = buildSizes({ w, mdW, lgW });

  const [imgError, setImgError] = React.useState(false);

  const mailto = `mailto:tony@wheatandstone.ca?subject=${encodeURIComponent(
    `Ad Inquiry: ${label}`,
  )}&body=${encodeURIComponent(
    `Hi Tony,\n\nI'm interested in the "${label}" ad placement I saw on Wheat & Stone.\n\nThanks!\n`,
  )}`;

  return (
    // IMPORTANT: this element is the float. No overflow/flex/grid here.
    <a
      href={mailto}
      aria-label={`${label} — email tony@wheatandstone.ca`}
      style={floatRootStyle}
      data-side={side}
      className={join(
        "floatad relative rounded-xl border cursor-pointer bg-neutral-50 dark:bg-neutral-900",
        "border-neutral-200 dark:border-neutral-800",
        "ring-0 transition motion-reduce:transition-none",
        "focus:outline-none focus-visible:ring-2 hover:ring-neutral-300 dark:hover:ring-neutral-700",
        containerSizeClasses,
        containerClassName
      )}
    >
      {/* Inner can use flex; it's inside the floated box */}
      <div className="h-full w-full flex items-center justify-center" style={innerPadStyle}>
        {imageSrc && !imgError ? (
          intrinsic ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageSrc}
              alt={imageAlt || label}
              width={Math.max(1, w ?? mdW ?? lgW ?? 1)}
              height={Math.max(1, h ?? mdH ?? lgH ?? 1)}
              sizes={sizes}
              className={join(
                "block w-auto h-auto max-w-full",
                "max-h-[var(--img-h)] md:max-h-[var(--img-h-md)] lg:max-h-[var(--img-h-lg)]",
                fitClass,
                imgClassName
              )}
              style={imgStyleVars}
              loading="lazy"
              decoding="async"
              draggable={false}
              onError={() => setImgError(true)}
            />
          ) : (
            <Image
              src={imageSrc}
              alt={imageAlt || label}
              width={Math.max(1, w ?? 1)}
              height={Math.max(1, h ?? 1)}
              sizes={sizes}
              className={join("max-h-full max-w-full", fitClass, imgClassName)}
              style={{ transform: `translateY(${nudgeY}px)` }}
              draggable={false}
              priority={false}
              onError={() => setImgError(true)}
            />
          )
        ) : (
          <div className="text-sm text-neutral-700 dark:text-neutral-300 text-center px-3">
            {label}
          </div>
        )}
      </div>

      {/* Hover tint (click-through disabled via pointer-events in global CSS) */}
      <div className="floatad__overlay" aria-hidden="true" />
    </a>
  );
}
