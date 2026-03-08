"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export default function OfferAlertPreferencesForm({
  savedOfferAlertsEnabled,
  savedOfferEmailAlertsEnabled,
}: {
  savedOfferAlertsEnabled: boolean;
  savedOfferEmailAlertsEnabled: boolean;
}) {
  const router = useRouter();
  const [alertsEnabled, setAlertsEnabled] = useState(savedOfferAlertsEnabled);
  const [emailEnabled, setEmailEnabled] = useState(savedOfferEmailAlertsEnabled);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="space-y-3 rounded-lg border border-black/10 px-3 py-3 dark:border-white/15">
      <div>
        <p className="text-sm font-semibold">Alert preferences</p>
        <p className="mt-1 text-xs opacity-70">
          Control whether saved products automatically produce offer matches in your inbox.
        </p>
      </div>

      <label className="flex items-start gap-3 text-sm">
        <input
          type="checkbox"
          checked={alertsEnabled}
          onChange={(event) => {
            const checked = event.target.checked;
            setAlertsEnabled(checked);
            if (!checked) {
              setEmailEnabled(false);
            }
          }}
          className="mt-0.5"
        />
        <span>
          <span className="font-medium">Enable saved-product offer alerts</span>
          <span className="mt-1 block opacity-75">
            When a live offer matches one of your saved products, it can appear in your offer box automatically.
          </span>
        </span>
      </label>

      <label className="flex items-start gap-3 text-sm">
        <input
          type="checkbox"
          checked={emailEnabled}
          disabled={!alertsEnabled}
          onChange={(event) => setEmailEnabled(event.target.checked)}
          className="mt-0.5"
        />
        <span>
          <span className="font-medium">Enable email alert attempts</span>
          <span className="mt-1 block opacity-75">
            If delivery infrastructure is available, Wheat & Stone can also try to email you when a match appears.
          </span>
        </span>
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={isPending}
          onClick={() => {
            setNotice(null);
            setError(null);
            startTransition(async () => {
              try {
                const response = await fetch("/api/account/offer-alerts", {
                  method: "PATCH",
                  headers: {
                    "content-type": "application/json",
                  },
                  body: JSON.stringify({
                    savedOfferAlertsEnabled: alertsEnabled,
                    savedOfferEmailAlertsEnabled: alertsEnabled ? emailEnabled : false,
                  }),
                });

                const payload = (await response.json().catch(() => null)) as
                  | { message?: string }
                  | null;

                if (!response.ok) {
                  throw new Error(payload?.message || "Failed to update alert preferences");
                }

                setNotice("Offer alert preferences updated.");
                router.refresh();
              } catch (updateError) {
                setError(
                  updateError instanceof Error
                    ? updateError.message
                    : "Failed to update alert preferences",
                );
              }
            });
          }}
          className="inline-flex items-center rounded-lg border border-amber-300/35 bg-amber-200/12 px-3 py-2 text-sm font-medium text-amber-100 transition hover:bg-amber-200/20 disabled:opacity-60"
        >
          {isPending ? "Saving..." : "Save preferences"}
        </button>

        {notice ? <p className="text-xs text-emerald-300/90">{notice}</p> : null}
        {error ? <p className="text-xs text-rose-300/90">{error}</p> : null}
      </div>
    </div>
  );
}
