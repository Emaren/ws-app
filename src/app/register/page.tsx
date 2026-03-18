"use client";

import Link from "next/link";
import { useMemo, useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { getProviders, signIn } from "next-auth/react";
import { trackAuthFunnelEvent } from "@/lib/authFunnelClient";

type AuthProviderLite = {
  id: string;
  name: string;
  type: string;
};

const POPULAR_PROVIDER_ORDER: Array<{
  id: string;
  label: string;
  accent: string;
}> = [
  { id: "google", label: "Continue with Google", accent: "text-emerald-300" },
  { id: "apple", label: "Continue with Apple", accent: "text-neutral-200" },
  { id: "azure-ad", label: "Continue with Microsoft", accent: "text-sky-300" },
  { id: "facebook", label: "Continue with Facebook", accent: "text-blue-300" },
  { id: "instagram", label: "Continue with Instagram", accent: "text-pink-300" },
  { id: "github", label: "Continue with GitHub", accent: "text-zinc-200" },
];

function scorePassword(password: string): { score: number; label: string; color: string } {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  if (score <= 1) return { score, label: "Weak", color: "bg-rose-500" };
  if (score <= 3) return { score, label: "Good", color: "bg-amber-400" };
  return { score, label: "Strong", color: "bg-emerald-500" };
}

export default function RegisterPage() {
  const router = useRouter();
  const hasTrackedViewRef = useRef(false);
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptMarketing, setAcceptMarketing] = useState(true);
  const [providerMap, setProviderMap] = useState<Record<string, AuthProviderLite>>(
    {},
  );
  const [socialLoadingId, setSocialLoadingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const providers = await getProviders();
      if (!active || !providers) return;
      setProviderMap(providers as Record<string, AuthProviderLite>);
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (hasTrackedViewRef.current) return;
    hasTrackedViewRef.current = true;
    trackAuthFunnelEvent({
      stage: "REGISTER_VIEW_STARTED",
      sourceContext: "register_page",
      metadata: { surface: "register_screen_v2" },
    });
  }, []);

  const passwordStrength = useMemo(() => scorePassword(password), [password]);
  const socialProviders = useMemo(() => {
    const entries = Object.values(providerMap).filter(
      (provider) => provider.type === "oauth",
    );
    return new Map(entries.map((provider) => [provider.id, provider]));
  }, [providerMap]);
  const visibleSocialProviders = useMemo(
    () => POPULAR_PROVIDER_ORDER.filter((item) => socialProviders.has(item.id)),
    [socialProviders],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    trackAuthFunnelEvent({
      stage: "REGISTER_SUBMIT_ATTEMPTED",
      provider: "credentials",
      email,
      sourceContext: "register_email_submit",
      metadata: {
        termsAccepted: acceptTerms,
        marketingOptIn: acceptMarketing,
      },
    });

    if (!acceptTerms) {
      setError("Please accept Terms and Privacy to create your account.");
      return;
    }

    setLoading(true);

    let res: Response;
    let data: { message?: string } | null = null;

    try {
      res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          name: displayName,
          marketingOptIn: acceptMarketing,
        }),
      });
      data = (await res.json().catch(() => null)) as { message?: string } | null;
    } catch {
      setError("Network error. Could not reach registration service.");
      setLoading(false);
      return;
    }

    if (res.status === 409) {
      const existingLogin = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (!existingLogin?.error) {
        setSuccess("Account already existed. Signing you in...");
        setTimeout(() => router.push("/"), 350);
        setLoading(false);
        return;
      }

      setError(
        data?.message ||
          "User already exists. Password does not match this account. Use Login or Forgot password.",
      );
      setLoading(false);
      return;
    }

    if (res.ok) {
      setSuccess("Account created. Signing you in...");
      const login = await signIn("credentials", { email, password, redirect: false });
      if (login?.error) {
        setError("Account created, but auto-login failed. Please sign in.");
        setSuccess("");
      } else {
        setTimeout(() => router.push("/"), 350);
      }
    } else {
      setError(data?.message || "Registration failed.");
    }

    setLoading(false);
  };

  const launchSocial = async (providerId: string, enabled: boolean) => {
    if (!enabled || socialLoadingId) return;
    trackAuthFunnelEvent({
      stage: "REGISTER_SUBMIT_ATTEMPTED",
      provider: providerId,
      sourceContext: "register_social_click",
      metadata: { providerId },
    });
    setSocialLoadingId(providerId);
    await signIn(providerId, { callbackUrl: "/" });
    setSocialLoadingId(null);
  };

  return (
    <section className="mx-auto w-full max-w-6xl px-4 pb-10 pt-5 md:px-6 md:pb-14">
      <div className="grid gap-5 lg:grid-cols-[1.05fr_1fr]">
        <article className="admin-card rounded-2xl border border-amber-300/20 bg-gradient-to-br from-amber-500/10 via-black/0 to-black/0 p-5 md:p-7">
          <p className="text-xs uppercase tracking-[0.24em] text-amber-300/80">
            Join Wheat & Stone
          </p>
          <h1 className="mt-2 text-2xl font-semibold md:text-4xl">
            Your local-first food identity for Alberta
          </h1>
          <p className="mt-3 text-sm leading-6 opacity-85 md:text-base">
            Discover trusted organic reviews, claim premium offers, and grow your
            $WHEAT and $STONE journey with one secure account.
          </p>
          <ul className="mt-5 space-y-2 text-sm opacity-90 md:text-base">
            <li>Instant offer inbox with high-converting local discounts.</li>
            <li>Personal account for reactions, saves, and story participation.</li>
            <li>Future-ready wallet and token rewards foundation.</li>
          </ul>
          <div className="mt-6 grid grid-cols-3 gap-2">
            <div className="admin-surface rounded-xl p-3 text-center">
              <p className="text-xs uppercase opacity-70">Preferred</p>
              <p className="mt-1 text-sm font-semibold">Google / Apple</p>
            </div>
            <div className="admin-surface rounded-xl p-3 text-center">
              <p className="text-xs uppercase opacity-70">Data Safe</p>
              <p className="mt-1 text-sm font-semibold">Encrypted</p>
            </div>
            <div className="admin-surface rounded-xl p-3 text-center">
              <p className="text-xs uppercase opacity-70">Region</p>
              <p className="mt-1 text-sm font-semibold">Alberta</p>
            </div>
          </div>
        </article>

        <article className="admin-card rounded-2xl p-5 md:p-7">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Create account</h2>
            <button
              type="button"
              onClick={() => router.push("/")}
              aria-label="Close registration form"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-lg hover:bg-white/20"
            >
              ×
            </button>
          </div>

          {visibleSocialProviders.length > 0 ? (
            <div className="space-y-2">
              {visibleSocialProviders.map((item) => {
                const provider = socialProviders.get(item.id);
                const enabled = Boolean(provider);
                const loadingThis = socialLoadingId === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => launchSocial(item.id, enabled)}
                    disabled={!enabled || Boolean(socialLoadingId)}
                    className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-sm transition ${
                      enabled
                        ? "border-white/20 bg-white/5 hover:border-amber-300/40 hover:bg-white/10"
                        : "cursor-not-allowed border-white/10 bg-white/5 opacity-50"
                    }`}
                  >
                    <span className={item.accent}>{item.label}</span>
                    <span className="text-xs opacity-70">
                      {loadingThis ? "Connecting..." : "OAuth"}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : null}

          {visibleSocialProviders.length > 0 ? (
            <div className="my-4 flex items-center gap-3 text-xs uppercase tracking-[0.2em] opacity-60">
              <span className="h-px flex-1 bg-white/20" />
              <span>Or email</span>
              <span className="h-px flex-1 bg-white/20" />
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="text"
              placeholder="Full name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              autoComplete="name"
              className="admin-surface w-full rounded-xl px-4 py-2.5 text-sm"
              required
            />
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              className="admin-surface w-full rounded-xl px-4 py-2.5 text-sm"
              required
            />
            <div>
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                className="admin-surface w-full rounded-xl px-4 py-2.5 text-sm"
                required
              />
              <div className="mt-2">
                <div className="h-1.5 w-full rounded-full bg-white/10">
                  <div
                    className={`h-full rounded-full transition-all ${passwordStrength.color}`}
                    style={{ width: `${Math.max(10, passwordStrength.score * 20)}%` }}
                  />
                </div>
                <p className="mt-1 text-xs opacity-75">
                  Password strength: {passwordStrength.label}
                </p>
              </div>
            </div>

            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={acceptTerms}
                onChange={(event) => setAcceptTerms(event.target.checked)}
                className="mt-1"
                required
              />
              <span className="opacity-90">
                I agree to the{" "}
                <Link href="/terms" className="underline underline-offset-4">
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link href="/privacy" className="underline underline-offset-4">
                  Privacy Policy
                </Link>
                .
              </span>
            </label>
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={acceptMarketing}
                onChange={(event) => setAcceptMarketing(event.target.checked)}
                className="mt-1"
              />
              <span className="opacity-80">
                Send me offer drops and community updates (optional).
              </span>
            </label>

            {error ? <p className="text-sm text-rose-400">{error}</p> : null}
            {success ? <p className="text-sm text-emerald-400">{success}</p> : null}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl border border-amber-300/40 bg-amber-300/20 px-4 py-2.5 text-sm font-medium transition hover:bg-amber-300/30 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Creating account..." : "Create Account"}
            </button>
          </form>

          <p className="mt-4 text-center text-sm opacity-85">
            Already have an account?{" "}
            <Link href="/login" className="text-amber-200 underline">
              Sign in
            </Link>
          </p>
          <p className="text-center text-xs leading-relaxed opacity-70">
            Need account removal? Review{" "}
            <Link href="/data-deletion" className="underline underline-offset-4">
              Data Deletion
            </Link>{" "}
            instructions before or after registration.
          </p>
        </article>
      </div>
    </section>
  );
}
