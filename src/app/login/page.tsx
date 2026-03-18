"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { signIn, getProviders } from "next-auth/react";
import { useRouter } from "next/navigation";

type AuthProviderLite = {
  id: string;
  name: string;
  type: string;
};

const POPULAR_PROVIDER_ORDER: Array<{ id: string; label: string }> = [
  { id: "google", label: "Continue with Google" },
  { id: "apple", label: "Continue with Apple" },
  { id: "azure-ad", label: "Continue with Microsoft" },
  { id: "facebook", label: "Continue with Facebook" },
  { id: "instagram", label: "Continue with Instagram" },
  { id: "github", label: "Continue with GitHub" },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [socialLoadingId, setSocialLoadingId] = useState<string | null>(null);
  const [providerMap, setProviderMap] = useState<Record<string, AuthProviderLite>>(
    {},
  );

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
    setLoading(true);

    const res = await signIn("credentials", { email, password, redirect: false });
    if (res?.error) {
      setError("Invalid credentials. Try Forgot password if needed.");
      setLoading(false);
      return;
    }
    router.push("/");
  };

  const launchSocial = async (providerId: string, enabled: boolean) => {
    if (!enabled || socialLoadingId) return;
    setSocialLoadingId(providerId);
    await signIn(providerId, { callbackUrl: "/" });
    setSocialLoadingId(null);
  };

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-xl items-center justify-center px-4 py-8">
      <form
        onSubmit={handleSubmit}
        className="w-full rounded-2xl border border-neutral-200/20 bg-grey p-6 shadow dark:border-neutral-800 dark:bg-neutral-900"
      >
        <div className="mb-5 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Sign In</h1>
          <button
            type="button"
            onClick={() => router.push("/")}
            aria-label="Close sign in form"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-grey text-neutral-700 hover:bg-neutral-50 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-700"
          >
            <span className="text-xl leading-none">×</span>
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
                  className={`w-full rounded-xl border px-4 py-2.5 text-left text-sm transition ${
                    enabled
                      ? "border-white/20 bg-white/5 hover:border-amber-300/40 hover:bg-white/10"
                      : "cursor-not-allowed border-white/10 bg-white/5 opacity-50"
                  }`}
                >
                  {loadingThis ? "Connecting..." : item.label}
                </button>
              );
            })}
          </div>
        ) : null}

        {visibleSocialProviders.length > 0 ? (
          <div className="my-4 flex items-center gap-3 text-xs uppercase tracking-[0.18em] opacity-60">
            <span className="h-px flex-1 bg-white/20" />
            <span>Or email</span>
            <span className="h-px flex-1 bg-white/20" />
          </div>
        ) : null}

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          className="appearance-none bg-black text-white placeholder-gray-400 border border-gray-700 rounded px-4 py-2 mb-4 w-full focus:outline-none focus:ring-2 focus:ring-gray-500 shadow-[inset_0_0_0_1000px_#000]"
          style={{ WebkitTextFillColor: "#fff" }}
          required
          autoFocus
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          className="appearance-none bg-black text-white placeholder-gray-400 border border-gray-700 rounded px-4 py-2 mb-4 w-full focus:outline-none focus:ring-2 focus:ring-gray-500 shadow-[inset_0_0_0_1000px_#000]"
          style={{ WebkitTextFillColor: "#fff" }}
          required
        />

        {error ? <p className="mb-4 text-red-500">{error}</p> : null}

        <button
          type="submit"
          disabled={loading}
          className={`bg-black text-white px-4 py-2 rounded w-full ${
            loading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
          }`}
        >
          {loading ? "Please wait..." : "Login"}
        </button>

        <p className="mt-3 text-center text-sm">
          <Link href="/forgot-password" className="text-blue-500 underline">
            Forgot password?
          </Link>
        </p>

        <p className="mt-4 text-center">
          Don’t have an account?{" "}
          <Link href="/register" className="text-blue-500 underline">
            Register
          </Link>
        </p>
      </form>
    </div>
  );
}
