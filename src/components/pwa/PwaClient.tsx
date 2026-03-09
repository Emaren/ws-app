"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";

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

function isIosSafariBrowser(): boolean {
  if (typeof window === "undefined") return false;
  const userAgent = window.navigator.userAgent;
  const isiOSDevice =
    /iPhone|iPad|iPod/i.test(userAgent) ||
    (window.navigator.platform === "MacIntel" && window.navigator.maxTouchPoints > 1);
  const isSafari =
    /Safari/i.test(userAgent) &&
    !/CriOS|Chrome|FxiOS|EdgiOS|OPiOS|YaBrowser/i.test(userAgent);
  return isiOSDevice && isSafari;
}

export default function PwaClient() {
  const pathname = usePathname();
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [installing, setInstalling] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [online, setOnline] = useState(true);
  const [updateReady, setUpdateReady] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [refreshingForUpdate, setRefreshingForUpdate] = useState(false);
  const [showIosInstallHint, setShowIosInstallHint] = useState(false);
  const refreshingForUpdateRef = useRef(false);

  const suppressPrompts =
    pathname?.startsWith("/admin") ||
    pathname?.startsWith("/preview") ||
    pathname?.startsWith("/api");

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

    const standalone = isStandalone();
    setIsInstalled(standalone);
    setShowIosInstallHint(
      !standalone && !wasInstallPromptDismissedRecently() && isIosSafariBrowser(),
    );

    document.documentElement.classList.toggle("ws-standalone", standalone);
    document.body.classList.toggle("ws-standalone", standalone);

    const onAppInstalled = () => {
      setDeferredPrompt(null);
      setIsInstalled(true);
      setShowIosInstallHint(false);
      window.localStorage.removeItem(INSTALL_DISMISS_KEY);
      document.documentElement.classList.add("ws-standalone");
      document.body.classList.add("ws-standalone");
    };

    const onBeforeInstallPrompt = (event: Event) => {
      const castEvent = event as BeforeInstallPromptEvent;
      castEvent.preventDefault();

      if (wasInstallPromptDismissedRecently()) {
        return;
      }

      setDeferredPrompt(castEvent);
      setShowIosInstallHint(false);
    };

    window.addEventListener("appinstalled", onAppInstalled);
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);

    return () => {
      window.removeEventListener("appinstalled", onAppInstalled);
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      document.documentElement.classList.remove("ws-standalone");
      document.body.classList.remove("ws-standalone");
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in window.navigator)) return;

    const onControllerChange = () => {
      if (refreshingForUpdateRef.current) {
        window.location.reload();
      }
    };

    const wireRegistration = (registration: ServiceWorkerRegistration) => {
      if (registration.waiting && window.navigator.serviceWorker.controller) {
        setWaitingWorker(registration.waiting);
        setUpdateReady(true);
      }

      registration.addEventListener("updatefound", () => {
        const installingWorker = registration.installing;
        if (!installingWorker) {
          return;
        }

        installingWorker.addEventListener("statechange", () => {
          if (
            installingWorker.state === "installed" &&
            window.navigator.serviceWorker.controller
          ) {
            setWaitingWorker(registration.waiting ?? installingWorker);
            setUpdateReady(true);
          }
        });
      });
    };

    const registerWorker = () => {
      void window.navigator.serviceWorker
        .register("/sw.js")
        .then(wireRegistration)
        .catch((error) => console.warn("sw registration failed", error));
    };

    window.navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    if (document.readyState === "complete") {
      registerWorker();
      return () =>
        window.navigator.serviceWorker.removeEventListener(
          "controllerchange",
          onControllerChange,
        );
    }

    window.addEventListener("load", registerWorker);
    return () => {
      window.removeEventListener("load", registerWorker);
      window.navigator.serviceWorker.removeEventListener(
        "controllerchange",
        onControllerChange,
      );
    };
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
    setShowIosInstallHint(false);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(INSTALL_DISMISS_KEY, String(Date.now()));
    }
  }

  function handleRefreshForUpdate() {
    if (!waitingWorker || refreshingForUpdate) {
      return;
    }
    refreshingForUpdateRef.current = true;
    setRefreshingForUpdate(true);
    waitingWorker.postMessage({ type: "SKIP_WAITING" });
  }

  return (
    <>
      {!online ? (
        <div className="pointer-events-none fixed right-3 top-[calc(var(--header-h,0px)+12px)] z-[55] rounded-full border border-amber-400/35 bg-amber-500/20 px-3 py-1 text-xs font-medium text-amber-100 backdrop-blur">
          Offline mode
        </div>
      ) : null}

      {updateReady && !suppressPrompts ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[61] p-3 md:right-3 md:left-auto md:max-w-sm">
          <div className="pointer-events-auto mx-auto rounded-2xl border border-sky-300/25 bg-neutral-950/95 p-3 text-neutral-100 shadow-2xl backdrop-blur">
            <p className="text-xs uppercase tracking-[0.18em] text-neutral-400">App update ready</p>
            <p className="mt-1 text-sm leading-relaxed">
              A fresher Wheat & Stone build is ready. Refresh once to switch to the new version.
            </p>
            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={handleRefreshForUpdate}
                disabled={refreshingForUpdate}
                className="rounded-lg border border-sky-400/40 bg-sky-500/20 px-3 py-2 text-sm font-medium text-sky-100 transition hover:bg-sky-500/30 disabled:opacity-60"
              >
                {refreshingForUpdate ? "Refreshing..." : "Refresh app"}
              </button>
              <button
                onClick={() => setUpdateReady(false)}
                className="rounded-lg border border-white/20 px-3 py-2 text-sm font-medium transition hover:bg-white/10"
              >
                Later
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {canInstall && !suppressPrompts ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] p-3 md:hidden">
          <div className="pointer-events-auto mx-auto max-w-md rounded-2xl border border-white/15 bg-neutral-950/95 p-3 text-neutral-100 shadow-2xl backdrop-blur">
            <p className="text-xs uppercase tracking-[0.18em] text-neutral-400">Wheat & Stone App</p>
            <p className="mt-1 text-sm leading-relaxed">
              Install for faster loading, offline access, and a cleaner app-style shell.
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

      {!canInstall && showIosInstallHint && !suppressPrompts ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] p-3 md:hidden">
          <div className="pointer-events-auto mx-auto max-w-md rounded-2xl border border-white/15 bg-neutral-950/95 p-3 text-neutral-100 shadow-2xl backdrop-blur">
            <p className="text-xs uppercase tracking-[0.18em] text-neutral-400">Install on iPhone</p>
            <p className="mt-1 text-sm leading-relaxed">
              In Safari, tap Share and then <span className="font-medium">Add to Home Screen</span>{" "}
              to run Wheat & Stone like an app.
            </p>
            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={handleDismiss}
                className="rounded-lg border border-white/20 px-3 py-2 text-sm font-medium transition hover:bg-white/10"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
