// src/components/Header.tsx
"use client";

declare global {
  interface KeplrKey {
    bech32Address: string;
    pubKey: Uint8Array;
  }

  interface KeplrSignResult {
    signature: string;
    pub_key?: {
      type: string;
      value: string;
    };
  }

  interface CosmosWalletProvider {
    enable: (chainId: string) => Promise<void>;
    getKey: (chainId: string) => Promise<KeplrKey>;
    signArbitrary: (
      chainId: string,
      signer: string,
      data: string,
    ) => Promise<KeplrSignResult>;
  }

  interface Window {
    keplr?: CosmosWalletProvider;
    leap?: CosmosWalletProvider;
  }
}

import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import DesktopActions from "./header/DesktopActions";
import MobileMenu from "./header/MobileMenu";
import ThemeCircles from "./header/ThemeCircles";
import { isEditorialRole } from "@/lib/rbac";
import {
  applyExperienceToDocument,
  defaultEditionSelection,
  defaultLayoutSelection,
  hasExperiencePreviewOverride,
  normalizeEditionSelection,
  normalizeLayoutSelection,
  persistEdition,
  persistLayout,
  readEditionFromStorage,
  readExperiencePreviewOverrideFromUrl,
  readLayoutFromStorage,
  type SiteSkin,
  type SiteVersion,
} from "@/lib/experiencePreferences";
import {
  applyThemeToDocument,
  cycleTheme,
  getSystemDefaultTheme,
  normalizeTheme,
  persistTheme,
  readThemeFromDocument,
  readThemeFromStorage,
  type ThemeMode,
} from "@/lib/theme";

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const value of bytes) {
    binary += String.fromCharCode(value);
  }

  return btoa(binary);
}

function shortWallet(address: string | null): string | null {
  if (!address) {
    return null;
  }

  if (address.length <= 18) {
    return address;
  }

  return `${address.slice(0, 8)}...${address.slice(-6)}`;
}

const DEFAULT_WALLET_CHAIN_ID = "wheatandstone";
const DEFAULT_WALLET_CHAIN_FALLBACKS = [
  "cosmoshub-4",
  "osmosis-1",
  "juno-1",
  "stargaze-1",
];
const PRIMARY_NAV_LINKS = [
  { href: "/discover", label: "Discover" },
  { href: "/products", label: "Products" },
  { href: "/offers", label: "Offers" },
  { href: "/map", label: "Map" },
  { href: "/community", label: "Community" },
  { href: "/articles", label: "Articles" },
  { href: "/about", label: "About" },
] as const;

function chainIdCandidates(): string[] {
  const primary = (
    process.env.NEXT_PUBLIC_WALLET_CHAIN_ID || DEFAULT_WALLET_CHAIN_ID
  ).trim();

  const configuredFallbacks = (process.env.NEXT_PUBLIC_WALLET_CHAIN_FALLBACK_IDS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  return [...new Set([primary, ...configuredFallbacks, ...DEFAULT_WALLET_CHAIN_FALLBACKS])];
}

function isLikelySafariBrowser() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /Safari/i.test(ua) && !/Chrome|Chromium|CriOS|Edg|OPR|FxiOS/i.test(ua);
}

function isUserRejectedWalletAction(message: string) {
  return /reject|denied|declined|cancel/i.test(message);
}

function isMissingChainInfo(message: string) {
  return /no modular chain info|chain info|unknown chain|chain not found/i.test(message);
}

function normalizeWalletError(
  error: unknown,
  preferredChainId: string,
  attemptedChainIds: string[],
) {
  const raw = error instanceof Error ? error.message : "Wallet not connected.";

  if (isMissingChainInfo(raw)) {
    const fallbackHint = attemptedChainIds
      .filter((chainId) => chainId !== preferredChainId)
      .slice(0, 3)
      .join(", ");
    if (fallbackHint) {
      return `Wallet chain "${preferredChainId}" is not installed. Using fallback chains failed too (${fallbackHint}).`;
    }
    return `Wallet chain "${preferredChainId}" is not installed in your wallet.`;
  }

  if (/No supported wallet found/i.test(raw) && isLikelySafariBrowser()) {
    return "No wallet extension detected. Safari usually needs a wallet in-app browser, or use Chrome/Brave + Keplr/Leap.";
  }

  return raw;
}

function normalizeWalletStatusMessage(message: string | null | undefined): string | null {
  const normalized = message?.trim();
  if (!normalized) {
    return null;
  }

  if (normalized === "ws-api request failed") {
    return "Wallet service reconnecting.";
  }

  if (normalized === "ws-api request timed out") {
    return "Wallet service is responding slowly.";
  }

  return normalized;
}

export default function Header() {
  const { data: session } = useSession();
  const pathname = usePathname();

  const [linkedWalletAddress, setLinkedWalletAddress] = useState<string | null>(null);
  const [walletBusy, setWalletBusy] = useState(false);
  const [walletError, setWalletError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [theme, setTheme] = useState<ThemeMode>("black");
  const [offersBadgeCount, setOffersBadgeCount] = useState(0);

  const headerRef = useRef<HTMLElement>(null);
  const menuBtnRef = useRef<HTMLDivElement>(null);
  const menuPanelRef = useRef<HTMLDivElement>(null);

  // Expose header height
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const setHeaderVar = () =>
      document.documentElement.style.setProperty("--header-h", `${el.getBoundingClientRect().height}px`);
    setHeaderVar();
    const ro = new ResizeObserver(setHeaderVar);
    ro.observe(el);
    addEventListener("resize", setHeaderVar);
    return () => {
      ro.disconnect();
      removeEventListener("resize", setHeaderVar);
    };
  }, []);

  // Close popovers on route change / outside click / Esc
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";

    return () => {
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousBodyOverflow;
    };
  }, [menuOpen]);

  useEffect(() => {
    let cancelled = false;

    if (!session?.user) {
      setLinkedWalletAddress(null);
      setWalletError(null);
      return () => {
        cancelled = true;
      };
    }

    const refreshWalletLink = async () => {
      try {
        const response = await fetch("/api/wallet/link", {
          method: "GET",
          cache: "no-store",
        });

        const payload = (await response.json().catch(() => null)) as
          | { wallet?: { walletAddress?: string | null } | null; message?: string }
          | null;

        if (cancelled) return;

        if (!response.ok) {
          setLinkedWalletAddress(null);
          if (response.status !== 401) {
            setWalletError(
              normalizeWalletStatusMessage(payload?.message ?? "Failed to read wallet link"),
            );
          } else {
            setWalletError(null);
          }
          return;
        }

        const walletAddress = payload?.wallet?.walletAddress;
        setLinkedWalletAddress(
          typeof walletAddress === "string" && walletAddress.trim()
            ? walletAddress.trim()
            : null,
        );
        setWalletError(null);
      } catch (error) {
        if (cancelled) return;
        setLinkedWalletAddress(null);
        setWalletError(
          normalizeWalletStatusMessage(
            error instanceof Error ? error.message : "Failed to read wallet link",
          ),
        );
      }
    };

    void refreshWalletLink();

    return () => {
      cancelled = true;
    };
  }, [session?.user?.id]);

  useEffect(() => {
    const previewOverride = readExperiencePreviewOverrideFromUrl();
    if (previewOverride) {
      applyExperienceToDocument(previewOverride);
      setTheme(previewOverride.theme);
      return;
    }

    const stored = readThemeFromStorage();
    const nextTheme = stored ?? readThemeFromDocument() ?? getSystemDefaultTheme();
    applyExperienceToDocument({
      theme: nextTheme,
      layout: readLayoutFromStorage() ?? defaultLayoutSelection(),
      edition: readEditionFromStorage() ?? defaultEditionSelection(),
    });
    setTheme(nextTheme);
  }, []);

  useEffect(() => {
    let cancelled = false;

    if (!session?.user || hasExperiencePreviewOverride()) {
      return () => {
        cancelled = true;
      };
    }

    const syncExperience = async () => {
      try {
        const response = await fetch("/api/account/preferences", {
          method: "GET",
          cache: "no-store",
        });
        const payload = (await response.json().catch(() => null)) as
          | {
              profile?: {
                theme?: string | null;
                layout?: string | null;
                edition?: string | null;
                skin?: string | null;
                siteVersion?: string | null;
                preset?: string | null;
              };
            }
          | null;

        if (cancelled || !response.ok || !payload?.profile) {
          return;
        }

        const serverTheme =
          normalizeTheme(payload.profile.theme) ??
          readThemeFromStorage() ??
          readThemeFromDocument() ??
          getSystemDefaultTheme();
        const serverSkin =
          normalizeLayoutSelection(payload.profile.layout ?? payload.profile.skin) ??
          readLayoutFromStorage() ??
          defaultLayoutSelection();
        const serverSiteVersion =
          normalizeEditionSelection(payload.profile.edition ?? payload.profile.siteVersion) ??
          readEditionFromStorage() ??
          defaultEditionSelection();

        applyExperienceToDocument({
          theme: serverTheme,
          layout: serverSkin,
          edition: serverSiteVersion,
          preset: payload.profile.preset ?? null,
        });
        persistTheme(serverTheme);
        persistLayout(serverSkin);
        persistEdition(serverSiteVersion);
        setTheme(serverTheme);
      } catch {
        // Preference sync is non-blocking.
      }
    };

    void syncExperience();

    return () => {
      cancelled = true;
    };
  }, [session?.user?.id]);

  useEffect(() => {
    let active = true;
    let timer: number | null = null;

    const loadOffersBadge = async () => {
      if (!session?.user) {
        if (active) {
          setOffersBadgeCount(0);
        }
        return;
      }

      try {
        const response = await fetch("/api/offers/badge", { cache: "no-store" });
        if (!response.ok) {
          return;
        }
        const payload = (await response.json()) as { count?: number };
        if (!active) {
          return;
        }
        setOffersBadgeCount(Math.max(0, Number(payload.count ?? 0)));
      } catch {
        // Non-blocking badge fetch; keep the existing value.
      }
    };

    void loadOffersBadge();
    timer = window.setInterval(() => {
      void loadOffersBadge();
    }, 45_000);

    return () => {
      active = false;
      if (timer !== null) {
        window.clearInterval(timer);
      }
    };
  }, [session?.user?.id, session?.user?.email]);

  const connectWallet = async () => {
    if (walletBusy) {
      return;
    }

    if (!session?.user) {
      setWalletError("Login required before linking a wallet");
      return;
    }

    try {
      setWalletBusy(true);
      setWalletError(null);

      const walletProvider = window.keplr ?? window.leap;
      if (!walletProvider) {
        if (isLikelySafariBrowser()) {
          throw new Error(
            "No wallet extension detected. Safari usually needs a wallet in-app browser, or use Chrome/Brave + Keplr/Leap.",
          );
        }
        throw new Error("No supported wallet found (install Keplr or Leap).");
      }

      const attemptedChainIds = chainIdCandidates();
      const preferredChainId = attemptedChainIds[0] || DEFAULT_WALLET_CHAIN_ID;
      let selectedChainId: string | null = null;
      let key: KeplrKey | null = null;
      let walletAddress: string | null = null;
      let lastError: unknown = null;

      for (const chainId of attemptedChainIds) {
        try {
          await walletProvider.enable(chainId);
          const nextKey = await walletProvider.getKey(chainId);
          if (!nextKey?.bech32Address) {
            throw new Error(`Wallet key did not include a bech32 address for ${chainId}`);
          }
          selectedChainId = chainId;
          key = nextKey;
          walletAddress = nextKey.bech32Address;
          break;
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          lastError = error;
          if (isUserRejectedWalletAction(message)) {
            throw error;
          }

          // Unknown chain info can happen on custom chains; continue to next candidate.
          if (isMissingChainInfo(message)) {
            continue;
          }
        }
      }

      if (!selectedChainId || !key || !walletAddress) {
        throw (
          lastError ??
          new Error(
            `Could not connect wallet on "${preferredChainId}". Install that chain or set NEXT_PUBLIC_WALLET_CHAIN_ID to an installed chain id.`,
          )
        );
      }

      const challengeResponse = await fetch("/api/wallet/challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chainType: "COSMOS",
          walletAddress,
        }),
      });

      const challengePayload = (await challengeResponse
        .json()
        .catch(() => null)) as
        | {
            challengeId?: string;
            message?: string;
            expiresAt?: string;
            error?: string;
          }
        | null;

      if (!challengeResponse.ok) {
        throw new Error(
          challengePayload?.message ||
            challengePayload?.error ||
            "Failed to create wallet challenge",
        );
      }

      const challengeId = challengePayload?.challengeId;
      const challengeMessage = challengePayload?.message;
      if (!challengeId || !challengeMessage) {
        throw new Error("Wallet challenge payload was incomplete");
      }

      const signed = await walletProvider.signArbitrary(
        selectedChainId,
        walletAddress,
        challengeMessage,
      );
      const publicKey = signed.pub_key?.value || bytesToBase64(key.pubKey);

      const linkResponse = await fetch("/api/wallet/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challengeId,
          signature: signed.signature,
          publicKey,
        }),
      });

      const linkPayload = (await linkResponse.json().catch(() => null)) as
        | { wallet?: { walletAddress?: string | null }; message?: string; error?: string }
        | null;

      if (!linkResponse.ok) {
        throw new Error(
          linkPayload?.message || linkPayload?.error || "Wallet link failed",
        );
      }

      const normalizedAddress = linkPayload?.wallet?.walletAddress ?? walletAddress;
      setLinkedWalletAddress(normalizedAddress);
      setWalletError(null);
    } catch (error) {
      const chainIds = chainIdCandidates();
      const message = normalizeWalletError(error, chainIds[0] || DEFAULT_WALLET_CHAIN_ID, chainIds);
      setWalletError(message);
      console.warn(message);
    } finally {
      setWalletBusy(false);
    }
  };

  const persistExperienceSelection = async (
    input: Partial<{
      theme: ThemeMode;
      layout: SiteSkin;
      edition: SiteVersion;
      sourceContext: string;
    }>,
  ) => {
    if (!session?.user || hasExperiencePreviewOverride()) {
      return;
    }

    try {
      await fetch("/api/account/preferences", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(input),
      });
    } catch {
      // Preference persistence is non-blocking.
    }
  };

  const updateTheme = (nextTheme: ThemeMode) => {
    applyExperienceToDocument({ theme: nextTheme });
    persistTheme(nextTheme);
    setTheme(nextTheme);
    void persistExperienceSelection({
      theme: nextTheme,
      sourceContext: "header_theme_selector",
    });
  };

  const toggleTheme = () => {
    updateTheme(cycleTheme(theme));
  };

  const isAdmin = isEditorialRole(session?.user?.role);
  const walletConnected = Boolean(linkedWalletAddress);
  const walletShortAddress = shortWallet(linkedWalletAddress);

  return (
    <header
      ref={headerRef}
      className="w-full bg-[var(--background)] text-[var(--foreground)] relative z-50"
      role="banner"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="ws-container grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 pt-2 pb-2 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:gap-x-6 md:gap-y-0 md:pt-3 md:pb-2">
        {/* Logo */}
        <a
          href="/"
          aria-label="Wheat & Stone home"
          className="flex min-w-0 items-center shrink-0 cursor-pointer md:justify-self-start"
          style={{ gridColumn: 1, gridRow: 1 }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/tlogo.png"
            alt="Wheat & Stone"
            width={560}
            height={168}
            className="block select-none cursor-pointer"
            loading="eager"
            decoding="async"
            style={{ height: "clamp(60px, 6vw, 92px)", width: "auto" }}
          />
        </a>

        <nav
          aria-label="Primary"
          className="hidden md:flex min-w-0 items-center justify-center gap-4 justify-self-center lg:gap-6 text-sm"
        >
          {PRIMARY_NAV_LINKS.map((link) => {
            const showOffersBadge = link.href === "/offers" && offersBadgeCount > 0;
            const displayCount = Math.min(99, offersBadgeCount);

            return (
              <a
                key={link.href}
                href={link.href}
                className="inline-flex items-center whitespace-nowrap opacity-85 hover:opacity-100 hover:underline underline-offset-4 transition"
              >
                <span>{link.label}</span>
                {showOffersBadge ? (
                  <span className="ml-1.5 inline-flex min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">
                    {displayCount}
                  </span>
                ) : null}
              </a>
            );
          })}
        </nav>

        {/* Desktop actions */}
        <DesktopActions
          gridColumn={3}
          session={session}
          theme={theme}
          setTheme={updateTheme}
          walletConnected={walletConnected}
          walletBusy={walletBusy}
          walletAddressLabel={walletShortAddress}
          walletError={walletError}
          connectWallet={connectWallet}
        />

        {/* Mobile menu button */}
        <div
          className="md:hidden flex min-w-0 items-center justify-end overflow-hidden px-1"
          style={{ gridColumn: "2 / 4", gridRow: 2 }}
        >
          <ThemeCircles
            value={theme}
            onChange={updateTheme}
            compact
            dense
            className="justify-end"
          />
        </div>

        <div
          className="md:hidden flex min-w-0 items-center justify-end"
          style={{ gridColumn: 3, gridRow: 1 }}
          ref={menuBtnRef}
        >
          <button
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            onClick={() => setMenuOpen((v) => !v)}
            title={menuOpen ? "Close menu" : "Open menu"}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-black/10 bg-transparent hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/10 active:scale-[0.98] transition cursor-pointer"
          >
            <svg
              className={`w-5 h-5 text-[var(--foreground)] opacity-90 transition-transform ${menuOpen ? "rotate-90" : ""}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              {menuOpen ? (
                <path d="M6 18L18 6M6 6l12 12" />
              ) : (
                <>
                  <path d="M3 6h18" />
                  <path d="M3 12h18" />
                  <path d="M3 18h18" />
                </>
              )}
            </svg>
            <span className="sr-only">{menuOpen ? "Close menu" : "Open menu"}</span>
          </button>
        </div>
      </div>

      {menuOpen ? (
        <button
          type="button"
          aria-label="Close menu"
          className="md:hidden fixed inset-x-0 bottom-0 top-[var(--header-h)] z-[55] bg-black/45 backdrop-blur-[2px]"
          onClick={() => setMenuOpen(false)}
        />
      ) : null}

      {/* Mobile slide-down */}
      <div
        id="mobile-menu"
        ref={menuPanelRef}
        className={`md:hidden fixed inset-x-0 top-[var(--header-h)] z-[60] border-t border-black/10 bg-[var(--background)] text-[var(--foreground)] shadow-2xl transition-[opacity,transform] duration-200 dark:border-white/10 ${
          menuOpen
            ? "pointer-events-auto translate-y-0 opacity-100"
            : "pointer-events-none -translate-y-2 opacity-0"
        }`}
      >
        <div className="mx-auto max-h-[calc(100dvh-var(--header-h)-0.5rem)] overflow-y-auto overscroll-contain">
          <MobileMenu
            session={session}
            isAdmin={!!isAdmin}
            offersBadgeCount={offersBadgeCount}
            walletConnected={walletConnected}
            walletBusy={walletBusy}
            walletAddressLabel={walletShortAddress}
            walletError={walletError}
            connectWallet={connectWallet}
            toggleTheme={toggleTheme}
            close={() => setMenuOpen(false)}
          />
        </div>
      </div>
    </header>
  );
}
