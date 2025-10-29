// src/components/article/FloatAd.tsx
"use client";

import React from "react";

type ShapeMode = "rect" | "rounded" | "ellipse" | "image";

type FloatAdProps = {
  label: string;
  side: "right" | "left";
  imageSrc?: string | null;
  imageAlt?: string;

  // Card size (px)
  w?: number;  h?: number;
  mdW?: number; mdH?: number;
  lgW?: number; lgH?: number;

  // Visual behavior
  imgFit?: "contain" | "cover" | "fill" | "none" | "scale-down";
  pad?: number;
  mt?: number;

  // Per-instance transform controls
  nudgeY?: number;
  mdNudgeY?: number;
  lgNudgeY?: number;
  scale?: number;
  mdScale?: number;
  lgScale?: number;

  frameless?: boolean;

  // Hover & caption controls
  hoverTint?: boolean;                 // grey rounded hover bg
  caption?: string | null;             // chip label; null = hide
  captionClassName?: string;
  captionInside?: boolean;             // NEW: true = on-image (default), false = below

  // Flow shape controls
  shape?: ShapeMode;                   // how text wraps around the float
  shapeMargin?: number;                // px margin around shape
  shapeThreshold?: number;             // 0..1 alpha cutoff for image shape

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
  hoverTint = true,
  caption = "Click for Delivery",
  captionClassName,
  captionInside = true,                // default: put chip ON the image

  shape = "rect",
  shapeMargin = 8,
  shapeThreshold = 0.5,

  containerClassName,
  imgClassName,
}: FloatAdProps) {
  const key = React.useId().replace(/:/g, "_");
  const isLeft = side === "left";
  const overlayInset = isLeft ? "-4px" : "-10px";

  // Decide the wrapping shape for the float
  const computedShapeOutside =
    shape === "rounded"
      ? "inset(0 round 14px)"
      : shape === "ellipse"
      ? "ellipse(50% 45% at 50% 50%)"
      : shape === "image" && imageSrc
      ? `url("${imageSrc}")`
      : "inset(0)";

  const floatStyle: React.CSSProperties = {
    float: side,
    marginTop: mt,
    marginLeft: isLeft ? 0 : 16,
    marginRight: isLeft ? 20 : 0,
    marginBottom: 6,

    // text wrap
    shapeOutside: computedShapeOutside as any,
    // @ts-ignore
    WebkitShapeOutside: computedShapeOutside as any,
    shapeMargin: `${shapeMargin}px`,
    // @ts-ignore
    WebkitShapeMargin: `${shapeMargin}px`,
    ...(shape === "image"
      ? ({
          // @ts-ignore
          shapeImageThreshold: shapeThreshold,
          // @ts-ignore
          WebkitShapeImageThreshold: shapeThreshold,
        } as React.CSSProperties)
      : {}),

    borderRadius: frameless ? 0 : 14,
    overflow: frameless ? "visible" : "hidden",
    background: frameless
      ? "transparent"
      : "color-mix(in oklab, currentColor 8%, transparent)",
  };

  const mailto = `mailto:tony@wheatandstone.ca?subject=${encodeURIComponent(
    `Delivery Inquiry: ${label}`
  )}&body=${encodeURIComponent(
    `Hi Tony,\n\nI'm interested in the "${label}" ad I saw on Wheat & Stone.\n\nThanks!\n`
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
        data-cap={captionInside ? "in" : "below"}
        className={[
          "floatad block relative cursor-pointer ring-0 transition motion-reduce:transition-none",
          "focus:outline-none focus-visible:ring-2 hover:ring-neutral-300 dark:hover:ring-neutral-700",
          chrome,
          containerClassName ?? "",
        ].join(" ")}
        style={floatStyle}
      >
        {imageSrc ? (
          <img
            src={imageSrc}
            alt={imageAlt || label}
            className={[
              "block w-full h-full max-w-none m-0",
              `object-${imgFit}`,
              imgClassName ?? "",
            ].join(" ")}
            loading="lazy"
            decoding="async"
            draggable={false}
            style={{ zIndex: 0, position: "relative" }}
          />
        ) : null}

        {/* Hover overlay */}
        <span className="floatad__overlay" aria-hidden />

        {/* Caption */}
        {caption !== null && (
          <span
            className={["floatad__caption", captionClassName ?? ""].join(" ")}
            aria-hidden
          >
            {caption}
          </span>
        )}
      </a>

      {/* Per-instance sizing + transform vars */}
      <style jsx>{`
        a[data-floatkey="${key}"] {
          ${baseWH}
          box-sizing: border-box;
          line-height: 0;
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

        /* Hover overlay (rounded card highlight) */
        a[data-floatkey="${key}"] .floatad__overlay{
          position: absolute;
          z-index: 1;
          inset: ${overlayInset};
          border-radius: 12px;
          transform: translateY(var(--nudgeY)) scale(var(--scale));
          transform-origin: 50% 50%;
          background: ${hoverTint
            ? "color-mix(in oklab, currentColor 14%, transparent)"
            : "transparent"};
          opacity: 0;
          transition: opacity .15s ease;
          pointer-events: none;
        }
        a[data-floatkey="${key}"]:hover .floatad__overlay,
        a[data-floatkey="${key}"]:focus-visible .floatad__overlay {
          opacity: 1;
        }

        /* Caption ON-IMAGE (default) */
        a[data-floatkey="${key}"][data-cap="in"] .floatad__caption{
          position: absolute;
          z-index: 2;
          left: 50%;
          bottom: 10px;                 /* sit on the image */
          top: auto;
          transform: translateX(-50%) translateY(var(--nudgeY)) scale(var(--scale));
          transform-origin: 50% 50%;
          font-size: 14px;
          line-height: 1;
          padding: 6px 14px;
          border-radius: 9999px;
          background: rgba(0,0,0,.68);
          color: #fff;
          box-shadow: 0 6px 20px rgba(0,0,0,.35);
          white-space: nowrap;
          opacity: 0;
          transition: opacity .15s ease, transform .15s ease;
          pointer-events: none;
        }

        /* Caption BELOW image (opt-in) */
        a[data-floatkey="${key}"][data-cap="below"] .floatad__caption{
          position: absolute;
          z-index: 2;
          left: 50%;
          top: calc(100% + 6px);
          transform: translateX(-50%);
          font-size: 12px;
          line-height: 1;
          padding: 2px 8px;
          border-radius: 9999px;
          background: ${hoverTint ? "rgba(0,0,0,.7)" : "transparent"};
          color: ${hoverTint ? "#fff" : "currentColor"};
          white-space: nowrap;
          opacity: 0;
          transition: opacity .15s ease;
          pointer-events: none;
        }

        a[data-floatkey="${key}"]:hover .floatad__caption,
        a[data-floatkey="${key}"]:focus-visible .floatad__caption{
          opacity: 1;
        }
      `}</style>
    </>
  );
}
