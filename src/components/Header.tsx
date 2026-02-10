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
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import DesktopActions from "./header/DesktopActions";
import MobileMenu from "./header/MobileMenu";
import ThemeCircles from "./header/ThemeCircles";
import { isEditorialRole, roleBadgePrefix } from "@/lib/rbac";
import {
  applyThemeToDocument,
  cycleTheme,
  getSystemDefaultTheme,
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

export default function Header() {
  const { data: session } = useSession();
  const router = useRouter();

  const [linkedWalletAddress, setLinkedWalletAddress] = useState<string | null>(null);
  const [walletBusy, setWalletBusy] = useState(false);
  const [walletError, setWalletError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [theme, setTheme] = useState<ThemeMode>("gray");

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
  }, [router]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (menuPanelRef.current && !menuPanelRef.current.contains(t) && menuBtnRef.current && !menuBtnRef.current.contains(t)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

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
            setWalletError(payload?.message ?? "Failed to read wallet link");
          }
          return;
        }

        const walletAddress = payload?.wallet?.walletAddress;
        setLinkedWalletAddress(
          typeof walletAddress === "string" && walletAddress.trim()
            ? walletAddress.trim()
            : null,
        );
      } catch (error) {
        if (cancelled) return;
        setLinkedWalletAddress(null);
        setWalletError(
          error instanceof Error ? error.message : "Failed to read wallet link",
        );
      }
    };

    void refreshWalletLink();

    return () => {
      cancelled = true;
    };
  }, [session?.user?.id]);

  useEffect(() => {
    const stored = readThemeFromStorage();
    const nextTheme = stored ?? readThemeFromDocument() ?? getSystemDefaultTheme();
    applyThemeToDocument(nextTheme);
    setTheme(nextTheme);
  }, []);

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

  const updateTheme = (nextTheme: ThemeMode) => {
    applyThemeToDocument(nextTheme);
    persistTheme(nextTheme);
    setTheme(nextTheme);
  };

  const toggleTheme = () => {
    updateTheme(cycleTheme(theme));
  };

  const isAdmin = isEditorialRole(session?.user?.role);
  const walletConnected = Boolean(linkedWalletAddress);
  const walletShortAddress = shortWallet(linkedWalletAddress);
  const identityLabel = session?.user?.email
    ? `${roleBadgePrefix(session?.user?.role)} - ${session.user.email}`
    : roleBadgePrefix(session?.user?.role);

  async function openLogin() {
    const { signIn } = await import("next-auth/react");
    signIn();
  }

  const mobileChipClass =
    "shrink-0 rounded-full border border-black/15 dark:border-white/15 bg-transparent px-3 py-1.5 text-[12px] font-medium transition hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer";

  return (
    <header
      ref={headerRef}
      className="w-full bg-[var(--background)] text-[var(--foreground)] shadow relative z-50"
      role="banner"
    >
      <div className="ws-container grid min-w-0 grid-cols-[auto_1fr_auto] items-end gap-3 pt-2 pb-1 md:items-center md:gap-4 md:pt-3 md:pb-2">
        {/* Logo */}
        <a href="/" aria-label="Wheat & Stone home" className="flex items-center shrink-0 cursor-pointer">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/tlogo.png"
            alt="Wheat & Stone"
            width={560}
            height={168}
            style={{ height: "clamp(68px, 9.5vw, 128px)", width: "auto" }}
            className="block select-none cursor-pointer"
            loading="eager"
            decoding="async"
          />
        </a>

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

        {/* Mobile hamburger — flush right in its own rail */}
        <div
          className="md:hidden justify-self-end self-center"
          style={{ gridColumn: 3 }}
          ref={menuBtnRef}
        >
          <button
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            onClick={() => setMenuOpen((v) => !v)}
            className="h-11 inline-flex items-center gap-2 rounded-lg border border-black/10 bg-transparent px-3 hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/10 active:scale-[0.98] transition cursor-pointer"
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
            <span className="text-[13px] font-medium">Menu</span>
          </button>
        </div>
      </div>

      {/* Mobile quick actions for better discoverability */}
      <div className="ws-container md:hidden pb-2">
        <div className="flex gap-2 overflow-x-auto whitespace-nowrap py-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <ThemeCircles value={theme} onChange={updateTheme} compact />
          {session ? (
            <>
              <div className="min-w-[228px] shrink-0 rounded-xl border border-black/10 dark:border-white/10 px-3 py-2">
                <button
                  onClick={connectWallet}
                  disabled={walletBusy}
                  className={`w-full rounded-lg border px-3 py-2 text-sm font-medium transition cursor-pointer ${
                    walletConnected
                      ? "bg-emerald-500/15 text-emerald-300 border-emerald-400/30 hover:bg-emerald-500/25"
                      : "bg-neutral-200 text-neutral-900 border-neutral-300 hover:bg-neutral-300 dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-700"
                  }`}
                >
                  {walletBusy
                    ? "Linking..."
                    : walletConnected
                      ? "Wallet Linked"
                      : "Connect Wallet"}
                </button>
                <p className="mt-1.5 truncate text-[11px] opacity-75">{identityLabel}</p>
                {walletShortAddress ? (
                  <p className="mt-1 truncate text-[11px] text-emerald-300/90">
                    {walletShortAddress}
                  </p>
                ) : null}
                {walletError ? (
                  <p className="mt-1 line-clamp-2 text-[11px] text-amber-300/90">
                    {walletError}
                  </p>
                ) : null}
              </div>

              <button onClick={() => router.push("/articles")} className={mobileChipClass}>
                Articles
              </button>
              <button onClick={() => router.push("/premium")} className={mobileChipClass}>
                Premium
              </button>
              {isAdmin ? (
                <button onClick={() => router.push("/admin")} className={mobileChipClass}>
                  Admin
                </button>
              ) : null}
            </>
          ) : (
            <>
              <button onClick={() => router.push("/articles")} className={mobileChipClass}>
                Articles
              </button>
              <button onClick={() => router.push("/premium")} className={mobileChipClass}>
                Premium
              </button>
              <button onClick={() => router.push("/register")} className={mobileChipClass}>
                Register
              </button>
              <button onClick={() => void openLogin()} className={mobileChipClass}>
                Login
              </button>
            </>
          )}
        </div>
      </div>

      {/* Mobile slide-down */}
      <div
        id="mobile-menu"
        ref={menuPanelRef}
        className={`md:hidden absolute left-0 right-0 top-full bg-[var(--background)] text-[var(--foreground)] border-t border-black/10 dark:border-white/10 shadow transition-[max-height,opacity] overflow-hidden ${
          menuOpen ? "opacity-100 max-h-[480px]" : "opacity-0 max-h-0"
        }`}
      >
        <MobileMenu
          session={session}
          theme={theme}
          setTheme={updateTheme}
          isAdmin={!!isAdmin}
          walletConnected={walletConnected}
          walletBusy={walletBusy}
          walletAddressLabel={walletShortAddress}
          walletError={walletError}
          connectWallet={connectWallet}
          toggleTheme={toggleTheme}
          close={() => setMenuOpen(false)}
        />
      </div>
    </header>
  );
}
