// src/components/article/FloatAd.tsx
"use client";

import React from "react";

type FloatAdProps = {
  label: string;
  side: "right" | "left";
  imageSrc?: string;
  imageAlt?: string;

  // Card size (px)
  w?: number;  h?: number;
  mdW?: number; mdH?: number;
  lgW?: number; lgH?: number;

  // Visual behavior
  imgFit?: "contain" | "cover" | "fill" | "none" | "scale-down";
  pad?: number;            // inner padding of the card
  mt?: number;             // margin-top (px)

  // Per-instance transform controls (independent for each ad)
  nudgeY?: number;         // base
  mdNudgeY?: number;       // >=768px
  lgNudgeY?: number;       // >=1024px
  scale?: number;          // base
  mdScale?: number;        // >=768px
  lgScale?: number;        // >=1024px

  frameless?: boolean;     // remove border/bg/rounding if true

  // Hooks
  containerClassName?: string;
  imgClassName?: string;

  // Back-compat (ignored)
  intrinsic?: boolean;
  imgMaxH?: number; mdImgMaxH?: number; lgImgMaxH?: number;
};

export default function FloatAd({
  label,
  side,
  imageSrc,
  imageAlt,
  w, h, mdW, mdH, lgW, lgH,
  imgFit = "contain",
  pad = 0,
  mt = 0,

  nudgeY = 0,
  mdNudgeY,
  lgNudgeY,
  scale = 1,
  mdScale,
  lgScale,

  frameless = true,
  containerClassName,
  imgClassName,
}: FloatAdProps) {
  const key = React.useId().replace(/:/g, "_");
  const isLeft = side === "left";

  const floatStyle: React.CSSProperties = {
    float: side,
    marginTop: mt,
    marginLeft: isLeft ? 0 : 16,
    marginRight: isLeft ? 16 : 0,
    marginBottom: 6,
    // only keep rounded wrap when you actually show a card
    shapeOutside: frameless ? "inset(0)" : "inset(0 round 14px)",
    borderRadius: frameless ? 0 : 14,
    // <-- stop clipping when frameless so scaled/nudged image can bleed
    overflow: frameless ? "visible" : "hidden",
    background: frameless
      ? "transparent"
      : "color-mix(in oklab, currentColor 8%, transparent)",
  };

  const mailto = `mailto:tony@wheatandstone.ca?subject=${encodeURIComponent(
    `Ad Inquiry: ${label}`
  )}&body=${encodeURIComponent(
    `Hi Tony,\n\nI'm interested in the "${label}" ad placement I saw on Wheat & Stone.\n\nThanks!\n`
  )}`;

  const baseWH =
    (w  != null ? `width:${w}px;` : "") +
    (h  != null ? `height:${h}px;` : "") +
    `padding:${pad}px;`;

  const mdWH =
    (mdW != null ? `width:${mdW}px;` : "") +
    (mdH != null ? `height:${mdH}px;` : "");

  const lgWH =
    (lgW != null ? `width:${lgW}px;` : "") +
    (lgH != null ? `height:${lgH}px;` : "");

  const chrome = frameless
    ? "bg-transparent border-0 rounded-none shadow-none"
    : "rounded-xl border bg-neutral-50 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800";

  return (
    <>
      <a
        href={mailto}
        aria-label={`${label} — email tony@wheatandstone.ca`}
        data-floatkey={key}
        className={[
          "floatad block relative cursor-pointer ring-0 transition motion-reduce:transition-none",
          "focus:outline-none focus-visible:ring-2 hover:ring-neutral-300 dark:hover:ring-neutral-700",
          chrome,
          containerClassName ?? "",
        ].join(" ")}
        style={floatStyle}
      >
        <img
          src={imageSrc || ""}
          alt={imageAlt || label}
          className={[
            "block w-full h-full max-w-none m-0",
            `object-${imgFit}`,
            imgClassName ?? "",
          ].join(" ")}
          // Transform is applied via CSS vars scoped to this key (see styled-jsx)
          loading="lazy"
          decoding="async"
          draggable={false}
        />
        <span className="floatad__overlay" aria-hidden />
      </a>

      {/* Sizing + per-instance transform vars; breakpoint overrides are scoped by key */}
      <style jsx>{`
        a[data-floatkey="${key}"] {
          ${baseWH}
          box-sizing: border-box;
          line-height: 0;

          /* per-instance defaults */
          --nudgeY: ${nudgeY}px;
          --scale: ${scale};
        }
        @media (min-width: 768px) {
          a[data-floatkey="${key}"] {
            ${mdWH}
            ${mdNudgeY != null ? `--nudgeY:${mdNudgeY}px;` : ""}
            ${mdScale  != null ? `--scale:${mdScale};` : ""}
          }
        }
        @media (min-width: 1024px) {
          a[data-floatkey="${key}"] {
            ${lgWH}
            ${lgNudgeY != null ? `--nudgeY:${lgNudgeY}px;` : ""}
            ${lgScale  != null ? `--scale:${lgScale};` : ""}
          }
        }
        a[data-floatkey="${key}"] > img {
          border-radius: 0;
          transform: translateY(var(--nudgeY)) scale(var(--scale));
          transform-origin: 50% 50%;
        }
      `}</style>
    </>
  );
}
