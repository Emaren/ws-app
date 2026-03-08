"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type SaveKind = "product" | "offer";
type SaveTone = "amber" | "sky" | "neutral";

function toneClassName(tone: SaveTone, saved: boolean) {
  if (tone === "amber") {
    return saved
      ? "border-amber-300/40 bg-amber-200/18 text-amber-100"
      : "border-amber-300/25 bg-amber-200/8 text-amber-50 hover:bg-amber-200/14";
  }

  if (tone === "sky") {
    return saved
      ? "border-sky-300/40 bg-sky-200/18 text-sky-100"
      : "border-sky-300/25 bg-sky-200/8 text-sky-50 hover:bg-sky-200/14";
  }

  return saved
    ? "border-white/20 bg-white/10 text-white"
    : "border-white/10 bg-black/10 text-white/85 hover:bg-white/5";
}

export default function SaveToggleButton({
  kind,
  itemId,
  isAuthenticated,
  loginHref,
  initialSaved,
  initialCount = 0,
  refreshOnChange = false,
  showCount = true,
  tone = "amber",
  compact = false,
  unsavedLabel = "Save",
  savedLabel = "Saved",
}: {
  kind: SaveKind;
  itemId: string;
  isAuthenticated: boolean;
  loginHref: string;
  initialSaved: boolean;
  initialCount?: number;
  refreshOnChange?: boolean;
  showCount?: boolean;
  tone?: SaveTone;
  compact?: boolean;
  unsavedLabel?: string;
  savedLabel?: string;
}) {
  const router = useRouter();
  const [saved, setSaved] = useState(initialSaved);
  const [count, setCount] = useState(initialCount);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!isAuthenticated) {
    return (
      <Link
        href={loginHref}
        className={`inline-flex items-center rounded-xl border px-4 py-2 text-sm font-medium transition ${toneClassName(
          tone,
          false,
        )} ${compact ? "px-3 py-1.5 text-xs" : ""}`}
      >
        {unsavedLabel}
        {showCount ? ` · ${count}` : ""}
      </Link>
    );
  }

  const label = saved ? savedLabel : unsavedLabel;

  return (
    <div className="space-y-1">
      <button
        type="button"
        disabled={isPending}
        onClick={() => {
          setError(null);
          setNotice(null);
          const nextSaved = !saved;

          startTransition(async () => {
            try {
              const response = await fetch("/api/account/saved", {
                method: nextSaved ? "POST" : "DELETE",
                headers: {
                  "content-type": "application/json",
                },
                body: JSON.stringify({
                  kind,
                  itemId,
                }),
              });

              const payload = (await response.json().catch(() => null)) as
                | {
                    saved?: boolean;
                    savedCount?: number;
                    matchedOffersCreated?: number;
                    matchedOffersReactivated?: number;
                    message?: string;
                  }
                | null;

              if (!response.ok) {
                throw new Error(payload?.message || "Failed to update saved items");
              }

              setSaved(Boolean(payload?.saved));
              if (typeof payload?.savedCount === "number") {
                setCount(payload.savedCount);
              } else {
                setCount((current) => Math.max(0, current + (nextSaved ? 1 : -1)));
              }

              const matchedCreated = payload?.matchedOffersCreated ?? 0;
              const matchedReactivated = payload?.matchedOffersReactivated ?? 0;
              const matchedTotal = matchedCreated + matchedReactivated;
              if (nextSaved && matchedTotal > 0) {
                setNotice(
                  `${matchedTotal} live offer ${matchedTotal === 1 ? "match" : "matches"} added to your offer box.`,
                );
              }

              if (refreshOnChange) {
                router.refresh();
              }
            } catch (toggleError) {
              setError(toggleError instanceof Error ? toggleError.message : "Failed to update saved items");
            }
          });
        }}
        className={`inline-flex items-center rounded-xl border px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-70 ${toneClassName(
          tone,
          saved,
        )} ${compact ? "px-3 py-1.5 text-xs" : ""}`}
      >
        {isPending ? "Updating..." : label}
        {showCount ? ` · ${count}` : ""}
      </button>

      {notice ? <p className="text-xs text-emerald-300/90">{notice}</p> : null}
      {error ? <p className="text-xs text-rose-300/90">{error}</p> : null}
    </div>
  );
}
