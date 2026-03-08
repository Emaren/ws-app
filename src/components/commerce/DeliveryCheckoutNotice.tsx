"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

export default function DeliveryCheckoutNotice() {
  const searchParams = useSearchParams();
  const [dismissed, setDismissed] = useState(false);

  const status = useMemo(() => {
    const value = searchParams?.get("deliveryCheckout");
    return value === "success" || value === "canceled" ? value : null;
  }, [searchParams]);

  if (!status || dismissed) {
    return null;
  }

  const success = status === "success";

  return (
    <div
      className={`rounded-[1.6rem] border px-4 py-3 md:px-5 md:py-4 ${
        success
          ? "border-emerald-400/35 bg-emerald-500/10 text-emerald-50"
          : "border-amber-300/35 bg-amber-400/10 text-amber-50"
      }`}
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.22em] opacity-80">
            {success ? "Delivery reserved" : "Checkout paused"}
          </p>
          <p className="text-sm md:text-base">
            {success
              ? "Payment was received and your delivery request is now reserved. Any eligible STONE or WHEAT rewards were recorded."
              : "Checkout was canceled, but your delivery request details were saved. You can reopen the delivery flow whenever you are ready."}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="inline-flex items-center rounded-xl border border-white/15 px-3 py-2 text-sm transition hover:bg-white/5"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
