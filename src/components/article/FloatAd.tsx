// src/components/article/FloatAd.tsx
"use client";

import Image from "next/image";

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
function join(...parts: (string | undefined)[]) {
  return parts.filter(Boolean).join(" ");
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

  // Float container base style (float + margins + shape-outside)
  const boxStyle: React.CSSProperties = {
    float: side,
    marginTop: mt,
    marginLeft: !isLeft ? horizontalGutter : 0,
    marginRight: isLeft ? horizontalGutter : 0,
    marginBottom: 20,
    shapeOutside: "margin-box",
    shapeMargin: `${shapePad}px`,
    display: "inline-block",
  };

  // Container responsive classes (Tailwind sees these statically)
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

  // CSS vars provide dynamic values; classes stay static
  const imgStyleVars: React.CSSProperties = {
    ...(imgMaxH != null ? { ["--img-h" as any]: `${imgMaxH}px` } : {}),
    ...(mdImgMaxH != null ? { ["--img-h-md" as any]: `${mdImgMaxH}px` } : {}),
    ...(lgImgMaxH != null ? { ["--img-h-lg" as any]: `${lgImgMaxH}px` } : {}),
    transform: `translateY(${nudgeY}px)`,
  };

  return (
    <a
      href={`mailto:tony@wheatandstone.ca?subject=${encodeURIComponent(`Ad Inquiry: ${label}`)}&body=${encodeURIComponent(
        `Hi Tony,\n\nI'm interested in the "${label}" ad placement I saw on Wheat & Stone.\n\nThanks!\n`,
      )}`}
      aria-label={`${label} — email tony@wheatandstone.ca`}
      style={boxStyle}
      className={join(
        "group floatad relative rounded-xl border overflow-hidden cursor-pointer",
        "bg-neutral-50 dark:bg-neutral-900",
        "border-neutral-200 dark:border-neutral-800",
        "ring-0 transition focus:outline-none focus-visible:ring-2",
        "hover:ring-neutral-300 dark:hover:ring-neutral-700",
        containerSizeClasses,
        containerClassName
      )}
    >
      {imageSrc ? (
        intrinsic ? (
          // Intrinsic <img> stays responsive; clamp via CSS vars
          <div className="h-full w-full flex items-center justify-center" style={innerPadStyle}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageSrc}
              alt={imageAlt || label}
              className={join(
                "block w-auto h-auto max-w-full",
                "max-h-[var(--img-h)] md:max-h-[var(--img-h-md)] lg:max-h-[var(--img-h-lg)]",
                fitClass,
                imgClassName
              )}
              style={imgStyleVars}
              loading="lazy"
            />
          </div>
        ) : (
          // Fixed-box using Next/Image
          <div className="h-full w-full flex items-center justify-center" style={innerPadStyle}>
            <Image
              src={imageSrc}
              alt={imageAlt || label}
              width={Math.max(1, (w ?? 1))}
              height={Math.max(1, (h ?? 1))}
              className={join("max-h-full max-w-full", fitClass, imgClassName)}
              style={{ transform: `translateY(${nudgeY}px)` }}
              priority={false}
            />
          </div>
        )
      ) : (
        <div className="h-full w-full flex items-center justify-center text-sm text-neutral-700 dark:text-neutral-300">
          {label}
        </div>
      )}
      <div className="floatad__overlay" aria-hidden="true" />
    </a>
  );
}
