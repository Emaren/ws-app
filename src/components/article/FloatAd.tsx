// src/components/article/FloatAd.tsx
"use client";

import React from "react";
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

function buildSizes({ w, mdW, lgW }: { w?: number; mdW?: number; lgW?: number }) {
  const parts: string[] = [];
  if (lgW) parts.push(`(min-width: 1024px) ${lgW}px`);
  if (mdW) parts.push(`(min-width: 768px) ${mdW}px`);
  if (w)   parts.push(`${w}px`);
  return parts.length ? parts.join(", ") : "100vw";
}

function makeKey(p: {
  side: "right" | "left";
  w?: number; h?: number; mdW?: number; mdH?: number; lgW?: number; lgH?: number;
  imgMaxH?: number; mdImgMaxH?: number; lgImgMaxH?: number;
  label?: string;
}) {
  return [
    p.side, p.w, p.h, p.mdW, p.mdH, p.lgW, p.lgH,
    p.imgMaxH, p.mdImgMaxH, p.lgImgMaxH, (p.label ?? "").length
  ].join("-");
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

  const floatKey = makeKey({
    side, w, h, mdW, mdH, lgW, lgH, imgMaxH, mdImgMaxH, lgImgMaxH, label
  });

  // No width/height inline — let styled-jsx control all breakpoints
  const floatRootStyle: React.CSSProperties = {
    float: side,
    marginTop: mt,
    marginLeft: !isLeft ? horizontalGutter : 0,
    marginRight: isLeft ? horizontalGutter : 0,
    marginBottom: 20,
    shapeOutside: "margin-box",
    shapeMargin: `${shapePad}px`,
  };

  const innerPadStyle: React.CSSProperties = { padding: pad };
  const fitClass = imgFit === "cover" ? "object-cover" : "object-contain";
  const sizes = buildSizes({ w, mdW, lgW });

  const [imgError, setImgError] = React.useState(false);

  const mailto = `mailto:tony@wheatandstone.ca?subject=${encodeURIComponent(
    `Ad Inquiry: ${label}`,
  )}&body=${encodeURIComponent(
    `Hi Tony,\n\nI'm interested in the "${label}" ad placement I saw on Wheat & Stone.\n\nThanks!\n`,
  )}`;

  return (
    <>
      <a
        href={mailto}
        aria-label={`${label} — email tony@wheatandstone.ca`}
        style={floatRootStyle}
        data-side={side}
        data-floatkey={floatKey}
        className={[
          "relative rounded-xl border cursor-pointer bg-neutral-50 dark:bg-neutral-900",
          "border-neutral-200 dark:border-neutral-800",
          "ring-0 transition motion-reduce:transition-none",
          "focus:outline-none focus-visible:ring-2 hover:ring-neutral-300 dark:hover:ring-neutral-700",
          containerClassName ?? "",
        ].join(" ")}
      >
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
                className={[
                  "block w-auto h-auto max-w-full",
                  "max-h-[var(--img-h)]",
                  fitClass,
                  imgClassName ?? "",
                ].join(" ")}
                style={{ transform: `translateY(${nudgeY}px)` }}
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
                className={["max-h-[var(--img-h)] max-w-full", fitClass, imgClassName ?? ""].join(" ")}
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

        <div className="floatad__overlay" aria-hidden="true" />
      </a>

      {/* All sizing lives here so md/lg can override without fighting inline styles */}
      <style jsx>{`
        a[data-floatkey="${floatKey}"] {
          ${w  != null ? `width:${w}px;` : ""}
          ${h  != null ? `height:${h}px;` : ""}
          ${imgMaxH != null ? `--img-h:${imgMaxH}px;` : ""}
        }
        @media (min-width: 768px) {
          a[data-floatkey="${floatKey}"] {
            ${mdW != null ? `width:${mdW}px;` : ""}
            ${mdH != null ? `height:${mdH}px;` : ""}
            ${mdImgMaxH != null ? `--img-h:${mdImgMaxH}px;` : ""}
          }
        }
        @media (min-width: 1024px) {
          a[data-floatkey="${floatKey}"] {
            ${lgW != null ? `width:${lgW}px;` : ""}
            ${lgH != null ? `height:${lgH}px;` : ""}
            ${lgImgMaxH != null ? `--img-h:${lgImgMaxH}px;` : ""}
          }
        }
      `}</style>
    </>
  );
}
