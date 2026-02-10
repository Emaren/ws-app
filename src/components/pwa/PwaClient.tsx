"use client";

import { useEffect, useMemo, useState } from "react";

type InstallOutcome = "accepted" | "dismissed";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: InstallOutcome; platform: string }>;
  prompt(): Promise<void>;
}

const INSTALL_DISMISS_KEY = "ws-pwa-install-dismissed-at";
const INSTALL_DISMISS_TTL_MS = 1000 * 60 * 60 * 24 * 7;

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const iosStandalone = Boolean(
    (window.navigator as Navigator & { standalone?: boolean }).standalone,
  );
  return iosStandalone || window.matchMedia("(display-mode: standalone)").matches;
}

function wasInstallPromptDismissedRecently(): boolean {
  if (typeof window === "undefined") return false;

  const raw = window.localStorage.getItem(INSTALL_DISMISS_KEY);
  if (!raw) return false;

  const timestamp = Number.parseInt(raw, 10);
  if (!Number.isFinite(timestamp)) return false;

  return Date.now() - timestamp < INSTALL_DISMISS_TTL_MS;
}

export default function PwaClient() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [installing, setInstalling] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [online, setOnline] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;

    setOnline(window.navigator.onLine);

    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    setIsInstalled(isStandalone());

    const onAppInstalled = () => {
      setDeferredPrompt(null);
      setIsInstalled(true);
      window.localStorage.removeItem(INSTALL_DISMISS_KEY);
    };

    const onBeforeInstallPrompt = (event: Event) => {
      const castEvent = event as BeforeInstallPromptEvent;
      castEvent.preventDefault();

      if (wasInstallPromptDismissedRecently()) {
        return;
      }

      setDeferredPrompt(castEvent);
    };

    window.addEventListener("appinstalled", onAppInstalled);
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);

    return () => {
      window.removeEventListener("appinstalled", onAppInstalled);
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in window.navigator)) return;

    const registerWorker = () => {
      void window.navigator.serviceWorker
        .register("/sw.js")
        .catch((error) => console.warn("sw registration failed", error));
    };

    if (document.readyState === "complete") {
      registerWorker();
      return;
    }

    window.addEventListener("load", registerWorker);
    return () => window.removeEventListener("load", registerWorker);
  }, []);

  const canInstall = useMemo(
    () => !isInstalled && deferredPrompt !== null,
    [deferredPrompt, isInstalled],
  );

  async function handleInstall() {
    if (!deferredPrompt || installing) return;

    try {
      setInstalling(true);
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } finally {
      setInstalling(false);
    }
  }

  function handleDismiss() {
    setDeferredPrompt(null);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(INSTALL_DISMISS_KEY, String(Date.now()));
    }
  }

  return (
    <>
      {!online ? (
        <div className="pointer-events-none fixed right-3 top-[calc(var(--header-h,0px)+12px)] z-[55] rounded-full border border-amber-400/35 bg-amber-500/20 px-3 py-1 text-xs font-medium text-amber-100 backdrop-blur">
          Offline mode
        </div>
      ) : null}

      {canInstall ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] p-3 md:hidden">
          <div className="pointer-events-auto mx-auto max-w-md rounded-2xl border border-white/15 bg-neutral-950/95 p-3 text-neutral-100 shadow-2xl backdrop-blur">
            <p className="text-xs uppercase tracking-[0.18em] text-neutral-400">Wheat & Stone App</p>
            <p className="mt-1 text-sm leading-relaxed">
              Install for faster mobile loading and offline access.
            </p>
            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={() => void handleInstall()}
                disabled={installing}
                className="rounded-lg border border-emerald-400/40 bg-emerald-500/20 px-3 py-2 text-sm font-medium text-emerald-100 transition hover:bg-emerald-500/30 disabled:opacity-60"
              >
                {installing ? "Installing..." : "Install"}
              </button>
              <button
                onClick={handleDismiss}
                className="rounded-lg border border-white/20 px-3 py-2 text-sm font-medium transition hover:bg-white/10"
              >
                Not now
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
