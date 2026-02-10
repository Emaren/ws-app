// src/components/article/FloatAd.tsx
"use client";

import React from "react";

type ShapeMode = "rect" | "rounded" | "ellipse" | "image";
type DeliveryLeadSource =
  | "ARTICLE_CTA"
  | "LOCAL_AD"
  | "INVENTORY_ALERT"
  | "CAMPAIGN_CLICK"
  | "AFFILIATE";

const DELIVERY_LEAD_SOURCES: readonly DeliveryLeadSource[] = [
  "ARTICLE_CTA",
  "LOCAL_AD",
  "INVENTORY_ALERT",
  "CAMPAIGN_CLICK",
  "AFFILIATE",
];

type DeliveryLeadContext = {
  source?: DeliveryLeadSource;
  articleSlug?: string;
  businessSlug?: string;
  businessName?: string;
  offerId?: string;
  offerTitle?: string;
  inventoryItemId?: string;
  inventoryItemName?: string;
};

type DeliveryLeadFormState = {
  name: string;
  email: string;
  phone: string;
  address: string;
  requestedQty: string;
  notes: string;
};

const DEFAULT_DELIVERY_FORM_STATE: DeliveryLeadFormState = {
  name: "",
  email: "",
  phone: "",
  address: "",
  requestedQty: "1",
  notes: "",
};
const DEFAULT_DELIVERY_EMAIL = "tony@wheatandstone.ca";

function normalizeQty(raw: string): number | null {
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 1 || parsed > 99) {
    return null;
  }
  return parsed;
}

function buildMailtoHref({
  to,
  subject,
  body,
}: {
  to: string;
  subject: string;
  body: string;
}): string {
  const params = new URLSearchParams({ subject, body });
  return `mailto:${to}?${params.toString()}`;
}

type FloatAdProps = {
  label: string;
  side: "right" | "left";
  imageSrc?: string | null;
  imageAlt?: string;

  // Card size (px)
  w?: number;
  h?: number;
  mdW?: number;
  mdH?: number;
  lgW?: number;
  lgH?: number;

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
  hoverTint?: boolean; // grey rounded hover bg
  caption?: string | null; // chip label; null = hide
  captionClassName?: string;
  captionInside?: boolean; // true = on-image (default), false = below

  // Flow shape controls
  shape?: ShapeMode; // how text wraps around the float
  shapeMargin?: number; // px margin around shape
  shapeThreshold?: number; // 0..1 alpha cutoff for image shape

  // Hooks
  containerClassName?: string;
  imgClassName?: string;

  // Back-compat (ignored)
  intrinsic?: boolean;
  imgMaxH?: number;
  mdImgMaxH?: number;
  lgImgMaxH?: number;

  // Delivery-lead context
  deliveryLeadContext?: DeliveryLeadContext;
};

export default function FloatAd({
  label,
  side,
  imageSrc,
  imageAlt,
  w,
  h,
  mdW,
  mdH,
  lgW,
  lgH,
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
  captionInside = true,

  shape = "rect",
  shapeMargin = 8,
  shapeThreshold = 0.5,

  containerClassName,
  imgClassName,
  deliveryLeadContext,
}: FloatAdProps) {
  const key = React.useId().replace(/:/g, "_");
  const isLeft = side === "left";
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);
  const [formState, setFormState] = React.useState<DeliveryLeadFormState>(
    DEFAULT_DELIVERY_FORM_STATE,
  );

  const contextSource = React.useMemo<DeliveryLeadSource>(() => {
    const source = deliveryLeadContext?.source;
    if (source && DELIVERY_LEAD_SOURCES.includes(source)) {
      return source;
    }
    return "LOCAL_AD";
  }, [deliveryLeadContext?.source]);

  const contextBusinessName = deliveryLeadContext?.businessName?.trim() || null;
  const contextItemName =
    deliveryLeadContext?.inventoryItemName?.trim() ||
    deliveryLeadContext?.offerTitle?.trim() ||
    label;
  const deliveryEmailHref = React.useMemo(() => {
    const subject = `Delivery request: ${contextItemName}`;
    const bodyLines = [
      "Hi Wheat & Stone team,",
      "",
      "I'd like to request delivery for the item below:",
      `Item: ${contextItemName}`,
      contextBusinessName ? `Business: ${contextBusinessName}` : null,
      deliveryLeadContext?.articleSlug
        ? `Article: https://wheatandstone.ca/articles/${deliveryLeadContext.articleSlug}`
        : null,
      "",
      "My details:",
      "Name:",
      "Phone:",
      "Address:",
      "Quantity:",
      "",
      "Thanks!",
    ].filter(Boolean);

    return buildMailtoHref({
      to: DEFAULT_DELIVERY_EMAIL,
      subject,
      body: bodyLines.join("\n"),
    });
  }, [
    contextBusinessName,
    contextItemName,
    deliveryLeadContext?.articleSlug,
  ]);

  React.useEffect(() => {
    if (!isDialogOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSubmitting) {
        setIsDialogOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isDialogOpen, isSubmitting]);

  // Decide the wrapping shape for the float
  const computedShapeOutside =
    shape === "rounded"
      ? "inset(0 round 14px)"
      : shape === "ellipse"
        ? "ellipse(50% 45% at 50% 50%)"
        : shape === "image" && imageSrc
          ? `url("${imageSrc}")`
          : "inset(0)";

  // Float card itself (no left:50% / translateX anywhere)
  const floatStyle: React.CSSProperties = {
    float: side,
    marginTop: mt,
    marginLeft: isLeft ? 0 : 16,
    marginRight: isLeft ? 20 : 0,
    marginBottom: 6,

    // text wrap
    shapeOutside: computedShapeOutside as React.CSSProperties["shapeOutside"],
    shapeMargin: `${shapeMargin}px`,

    borderRadius: frameless ? 0 : 14,
    overflow: frameless ? "visible" : "hidden",
    background: frameless
      ? "transparent"
      : "color-mix(in oklab, currentColor 8%, transparent)",
    maxWidth: "100%", // defensive: never exceed container
  };

  const floatStyleAny = floatStyle as React.CSSProperties & Record<string, unknown>;
  floatStyleAny.WebkitShapeOutside = computedShapeOutside;
  floatStyleAny.WebkitShapeMargin = `${shapeMargin}px`;
  if (shape === "image") {
    floatStyleAny.shapeImageThreshold = shapeThreshold;
    floatStyleAny.WebkitShapeImageThreshold = shapeThreshold;
  }

  function openDeliveryDialog() {
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsDialogOpen(true);
  }

  function closeDeliveryDialog() {
    if (isSubmitting) return;
    setIsDialogOpen(false);
  }

  function updateField(field: keyof DeliveryLeadFormState, value: string) {
    setFormState((previous) => ({ ...previous, [field]: value }));
  }

  async function submitDeliveryLead(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    const contactEmail = formState.email.trim();
    const contactPhone = formState.phone.trim();
    const deliveryAddress = formState.address.trim();
    const requestedQty = normalizeQty(formState.requestedQty);

    if (!requestedQty) {
      setErrorMessage("Quantity must be a whole number between 1 and 99.");
      return;
    }

    if (!contactEmail && !contactPhone) {
      setErrorMessage("Add an email or phone so we can confirm your order.");
      return;
    }

    if (!deliveryAddress) {
      setErrorMessage("Delivery address is required.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await fetch("/api/delivery-leads", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          source: contextSource,
          articleSlug: deliveryLeadContext?.articleSlug ?? null,
          businessSlug: deliveryLeadContext?.businessSlug ?? null,
          businessName: contextBusinessName,
          offerId: deliveryLeadContext?.offerId ?? null,
          offerTitle: deliveryLeadContext?.offerTitle ?? label,
          inventoryItemId: deliveryLeadContext?.inventoryItemId ?? null,
          inventoryItemName: contextItemName,
          requestedQty,
          contactName: formState.name.trim() || null,
          contactEmail: contactEmail || null,
          contactPhone: contactPhone || null,
          deliveryAddress,
          notes: formState.notes.trim() || null,
        }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        const message =
          payload && typeof payload.message === "string"
            ? payload.message
            : `Delivery request failed (${response.status})`;
        throw new Error(message);
      }

      setSuccessMessage("Request sent. Wheat & Stone will contact you shortly.");
      setFormState(DEFAULT_DELIVERY_FORM_STATE);
      window.setTimeout(() => {
        setSuccessMessage(null);
        setIsDialogOpen(false);
      }, 1200);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  const baseWH =
    (w != null ? `width:${w}px;` : "") +
    (h != null ? `height:${h}px;` : "") +
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
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={isDialogOpen}
        aria-label={`${label} - open delivery form`}
        data-floatkey={key}
        data-ad-slot={isLeft ? "slot-2-left" : "slot-1-right"}
        data-cap={captionInside ? "in" : "below"}
        className={[
          "floatad block w-full p-0 text-left relative cursor-pointer ring-0 transition motion-reduce:transition-none",
          "focus:outline-none focus-visible:ring-2 hover:ring-neutral-300 dark:hover:ring-neutral-700",
          chrome,
          containerClassName ?? "",
        ].join(" ")}
        onClick={openDeliveryDialog}
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
            style={{
              zIndex: 0,
              position: "relative",
              transform: "translateY(var(--nudgeY)) scale(var(--scale))",
              transformOrigin: "50% 50%",
            }}
          />
        ) : null}

        {/* Hover overlay (fills card, centered via flex - no 50% tricks) */}
        <span className="floatad__overlay" aria-hidden>
          {captionInside && caption !== null && (
            <span
              className={[
                "inline-block px-3.5 py-1 rounded-full text-[14px] leading-none text-white",
                "shadow-[0_6px_20px_rgba(0,0,0,.35)]",
                captionClassName ?? "",
              ].join(" ")}
              style={{ background: "rgba(0,0,0,.68)" }}
            >
              {caption}
            </span>
          )}
        </span>
      </button>

      {/* Caption BELOW (normal flow; never affects width) */}
      {!captionInside && caption !== null && (
        <div
          className="not-prose mt-1"
          style={{ textAlign: "center" }}
          aria-hidden
        >
          <span
            className={[
              "inline-block px-2.5 py-1 rounded-full text-[12px] leading-none",
              captionClassName ?? "",
            ].join(" ")}
            style={{
              background: hoverTint ? "rgba(0,0,0,.7)" : "transparent",
              color: hoverTint ? "#fff" : "currentColor",
            }}
          >
            {caption}
          </span>
        </div>
      )}

      {isDialogOpen && (
        <div
          className="fixed inset-0 z-[90] bg-black/70 p-4 sm:p-6"
          role="presentation"
          onClick={closeDeliveryDialog}
        >
          <div className="mx-auto flex min-h-full w-full max-w-xl items-center justify-center">
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby={`${key}-lead-title`}
              className="w-full rounded-2xl border border-neutral-200 bg-white p-4 text-neutral-900 shadow-2xl dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 sm:p-5"
              onClick={(event) => event.stopPropagation()}
            >
              <header className="mb-4 space-y-1">
                <h3 id={`${key}-lead-title`} className="text-base font-semibold">
                  Click to Buy / Deliver Now
                </h3>
                <p className="text-sm opacity-80">
                  {contextItemName}
                  {contextBusinessName ? ` - ${contextBusinessName}` : ""}
                </p>
              </header>

              <form className="space-y-3" onSubmit={submitDeliveryLead}>
                <label className="block text-sm">
                  <span className="mb-1 block opacity-80">Name</span>
                  <input
                    value={formState.name}
                    onChange={(event) => updateField("name", event.target.value)}
                    autoComplete="name"
                    className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/30 dark:border-neutral-700 dark:bg-neutral-950"
                    placeholder="Your name"
                  />
                </label>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-sm">
                    <span className="mb-1 block opacity-80">Email</span>
                    <input
                      type="email"
                      value={formState.email}
                      onChange={(event) => updateField("email", event.target.value)}
                      autoComplete="email"
                      className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/30 dark:border-neutral-700 dark:bg-neutral-950"
                      placeholder="you@email.com"
                    />
                  </label>

                  <label className="block text-sm">
                    <span className="mb-1 block opacity-80">Phone</span>
                    <input
                      type="tel"
                      value={formState.phone}
                      onChange={(event) => updateField("phone", event.target.value)}
                      autoComplete="tel"
                      className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/30 dark:border-neutral-700 dark:bg-neutral-950"
                      placeholder="+1 555 123 4567"
                    />
                  </label>
                </div>

                <label className="block text-sm">
                  <span className="mb-1 block opacity-80">Delivery address</span>
                  <textarea
                    value={formState.address}
                    onChange={(event) => updateField("address", event.target.value)}
                    rows={2}
                    className="w-full resize-y rounded-lg border border-neutral-300 bg-white px-3 py-2 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/30 dark:border-neutral-700 dark:bg-neutral-950"
                    placeholder="Street, city, postal code"
                    required
                  />
                </label>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-sm">
                    <span className="mb-1 block opacity-80">Quantity</span>
                    <input
                      type="number"
                      min={1}
                      max={99}
                      value={formState.requestedQty}
                      onChange={(event) =>
                        updateField("requestedQty", event.target.value)
                      }
                      className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/30 dark:border-neutral-700 dark:bg-neutral-950"
                      required
                    />
                  </label>

                  <div className="text-sm opacity-75 sm:self-end">
                    Provide email or phone and we will confirm delivery details.
                  </div>
                </div>

                <label className="block text-sm">
                  <span className="mb-1 block opacity-80">Notes</span>
                  <textarea
                    value={formState.notes}
                    onChange={(event) => updateField("notes", event.target.value)}
                    rows={2}
                    className="w-full resize-y rounded-lg border border-neutral-300 bg-white px-3 py-2 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/30 dark:border-neutral-700 dark:bg-neutral-950"
                    placeholder="Optional timing or preferences"
                  />
                </label>

                {errorMessage && (
                  <p className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200">
                    {errorMessage}
                  </p>
                )}
                {successMessage && (
                  <p className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
                    {successMessage}
                  </p>
                )}

                <footer className="flex items-center justify-end gap-2 pt-2">
                  <a
                    href={deliveryEmailHref}
                    className="mr-auto rounded-lg border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
                  >
                    Email instead
                  </a>
                  <button
                    type="button"
                    onClick={closeDeliveryDialog}
                    disabled={isSubmitting}
                    className="rounded-lg border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-100 disabled:opacity-60 dark:border-neutral-700 dark:hover:bg-neutral-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="rounded-lg bg-amber-400 px-3 py-2 text-sm font-semibold text-black hover:opacity-90 disabled:opacity-60"
                  >
                    {isSubmitting ? "Sending..." : "Send delivery request"}
                  </button>
                </footer>
              </form>
            </section>
          </div>
        </div>
      )}

      {/* Per-instance sizing + transform vars */}
      <style jsx>{`
        [data-floatkey="${key}"] {
          ${baseWH}
          box-sizing: border-box;
          line-height: 0;
          --nudgeY: ${nudgeY}px;
          --scale: ${scale};
        }
        @media (min-width: 768px) {
          [data-floatkey="${key}"] {
            ${mdWH}
            ${mdNudgeY != null ? `--nudgeY:${mdNudgeY}px;` : ""}
            ${mdScale != null ? `--scale:${mdScale};` : ""}
          }
        }
        @media (min-width: 1024px) {
          [data-floatkey="${key}"] {
            ${lgWH}
            ${lgNudgeY != null ? `--nudgeY:${lgNudgeY}px;` : ""}
            ${lgScale != null ? `--scale:${lgScale};` : ""}
          }
        }

        /* Overlay fills the card and centers content with flex */
        [data-floatkey="${key}"] .floatad__overlay {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          padding: 10px;
          pointer-events: none;
          border-radius: 12px;
        }
      `}</style>
    </>
  );
}
