"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

function passwordStrength(password: string): { label: string; width: number; className: string } {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  if (score <= 1) return { label: "Weak", width: 25, className: "bg-rose-500" };
  if (score <= 3) return { label: "Good", width: 60, className: "bg-amber-400" };
  return { label: "Strong", width: 100, className: "bg-emerald-500" };
}

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams?.get("token")?.trim() ?? "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const strength = useMemo(() => passwordStrength(password), [password]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!token) {
      setError("Reset link is missing a token.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token, password }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { message?: string }
        | null;

      if (!response.ok) {
        setError(payload?.message ?? "Could not reset password. Please request a new reset link.");
        return;
      }

      setSuccess(payload?.message ?? "Password updated. You can now sign in.");
      setTimeout(() => router.push("/login"), 900);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-xl items-center justify-center px-4 py-8">
      <form
        onSubmit={handleSubmit}
        className="w-full rounded-2xl border border-neutral-200/20 bg-grey p-6 shadow dark:border-neutral-800 dark:bg-neutral-900"
      >
        <div className="mb-5 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Reset Password</h1>
          <button
            type="button"
            onClick={() => router.push("/")}
            aria-label="Close reset password form"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-lg hover:bg-white/20"
          >
            ×
          </button>
        </div>

        <p className="mb-4 text-sm text-neutral-300">
          Enter a new password for your Wheat &amp; Stone account.
        </p>

        <input
          type="password"
          placeholder="New password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="new-password"
          className="appearance-none bg-black text-white placeholder-gray-400 border border-gray-700 rounded px-4 py-2 mb-3 w-full focus:outline-none focus:ring-2 focus:ring-gray-500 shadow-[inset_0_0_0_1000px_#000]"
          style={{ WebkitTextFillColor: "#fff" }}
          required
          autoFocus
        />

        <div className="mb-3">
          <div className="h-1.5 w-full rounded-full bg-white/10">
            <div
              className={`h-full rounded-full transition-all ${strength.className}`}
              style={{ width: `${strength.width}%` }}
            />
          </div>
          <p className="mt-1 text-xs opacity-75">Password strength: {strength.label}</p>
        </div>

        <input
          type="password"
          placeholder="Confirm password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          autoComplete="new-password"
          className="appearance-none bg-black text-white placeholder-gray-400 border border-gray-700 rounded px-4 py-2 mb-4 w-full focus:outline-none focus:ring-2 focus:ring-gray-500 shadow-[inset_0_0_0_1000px_#000]"
          style={{ WebkitTextFillColor: "#fff" }}
          required
        />

        {error ? <p className="mb-3 text-sm text-rose-400">{error}</p> : null}
        {success ? <p className="mb-3 text-sm text-emerald-400">{success}</p> : null}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded bg-black px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Updating password..." : "Update password"}
        </button>

        <p className="mt-4 text-center text-sm opacity-90">
          Back to{" "}
          <Link href="/login" className="text-blue-400 underline">
            login
          </Link>
        </p>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto flex min-h-[70vh] w-full max-w-xl items-center justify-center px-4 py-8">
          <div className="w-full rounded-2xl border border-neutral-200/20 bg-grey p-6 shadow dark:border-neutral-800 dark:bg-neutral-900">
            <p className="text-sm opacity-80">Loading reset form...</p>
          </div>
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
