"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  SiteDeliveryPaymentConfig,
  SiteDeliveryPaymentMethod,
} from "@/lib/siteConfigurationShared";

type DeliveryPaymentConfigResponse = {
  deliveryPaymentConfig?: SiteDeliveryPaymentConfig;
};

function methodTone(method: SiteDeliveryPaymentMethod): string {
  const token = method.tokenSymbol.toUpperCase();
  if (token === "WHEAT") {
    return "border-amber-300/35 bg-amber-400/10 text-amber-100";
  }
  if (token === "STONE") {
    return "border-slate-300/35 bg-slate-300/10 text-slate-100";
  }
  return "border-cyan-300/35 bg-cyan-400/10 text-cyan-100";
}

export default function DeliveryPaymentRail() {
  const [config, setConfig] = useState<SiteDeliveryPaymentConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const response = await fetch("/api/site-configuration/delivery-payments", {
          cache: "no-store",
        });
        const payload = (await response.json().catch(() => null)) as
          | DeliveryPaymentConfigResponse
          | null;
        if (!active) {
          return;
        }

        if (response.ok && payload?.deliveryPaymentConfig) {
          setConfig(payload.deliveryPaymentConfig);
        } else {
          setConfig(null);
        }
      } catch {
        if (!active) {
          return;
        }
        setConfig(null);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!copiedId) {
      return;
    }

    const timer = window.setTimeout(() => setCopiedId(null), 1600);
    return () => window.clearTimeout(timer);
  }, [copiedId]);

  const methods = useMemo(() => config?.methods ?? [], [config?.methods]);

  async function copyAddress(method: SiteDeliveryPaymentMethod) {
    try {
      await navigator.clipboard.writeText(method.address);
      setCopiedId(method.id);
    } catch {
      setCopiedId(null);
    }
  }

  if (!loading && !config) {
    return null;
  }

  return (
    <section className="rounded-[1.35rem] border border-amber-300/25 bg-[radial-gradient(circle_at_top,_rgba(199,153,72,0.18),_rgba(11,11,11,0.98)_58%)] p-4 text-white shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.24em] text-amber-100/70">
            Delivery Settlement
          </p>
          <h4 className="mt-1 text-base font-semibold md:text-lg">
            {config?.title ?? "Crypto & Hybrid Delivery Payment"}
          </h4>
        </div>
        <div className="flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.16em] text-neutral-200">
          <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
            Fiat
          </span>
          <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
            Crypto
          </span>
          <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
            Hybrid Split
          </span>
        </div>
      </div>

      <p className="mt-3 text-sm leading-6 text-neutral-200">
        {config?.summary ??
          "Pay in CAD, in crypto, or split the balance between both. Wheat & Stone can settle delivery cost and delivery fee in fiat, $WHEAT, $STONE, or a blended mix."}
      </p>
      <p className="mt-2 text-xs leading-5 text-neutral-300">
        {config?.instructions ??
          "Submit the delivery request, send any crypto portion to one of the configured addresses below, and we will confirm the remaining fiat balance or mixed split directly with you."}
      </p>

      {methods.length > 0 ? (
        <div className="mt-4 grid gap-3">
          {methods.map((method) => (
            <div
              key={method.id}
              className="rounded-[1.15rem] border border-white/10 bg-white/[0.045] p-3 backdrop-blur-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${methodTone(method)}`}
                    >
                      ${method.tokenSymbol}
                    </span>
                    <span className="text-sm font-medium text-white">{method.label}</span>
                  </div>
                  <p className="mt-2 text-xs uppercase tracking-[0.18em] text-neutral-400">
                    {method.network}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => void copyAddress(method)}
                  className="rounded-full border border-white/15 bg-white/8 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] transition hover:bg-white/15"
                >
                  {copiedId === method.id ? "Copied" : "Copy Address"}
                </button>
              </div>

              <p className="mt-3 break-all rounded-xl border border-white/8 bg-black/25 px-3 py-3 font-mono text-xs leading-6 text-neutral-100">
                {method.address}
              </p>

              {method.note ? (
                <p className="mt-2 text-xs leading-5 text-neutral-300">{method.note}</p>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-4 rounded-[1.15rem] border border-dashed border-white/12 bg-black/15 px-4 py-4 text-sm text-neutral-300">
          Crypto settlement is enabled, and owner-configured payment addresses will appear here as
          soon as they are saved from the admin dashboard.
        </div>
      )}
    </section>
  );
}
