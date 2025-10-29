"use client";
import { useState } from "react";

export default function CheckoutButton() {
  const [busy, setBusy] = useState(false);

  const go = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: "premium_monthly" }),
      });
      const data = await res.json();
      if (data?.url) window.location.href = data.url;
      else throw new Error(data?.error || "Checkout failed");
    } catch (e) {
      alert((e as Error).message);
      setBusy(false);
    }
  };

  return (
    <button
      onClick={go}
      disabled={busy}
      className="cursor-pointer inline-flex items-center justify-center rounded-xl px-5 py-3
                 bg-black text-white dark:bg-white dark:text-black
                 hover:opacity-90 disabled:opacity-60"
    >
      {busy ? "Redirecting…" : "Subscribe for $9 / month"}
    </button>
  );
}
