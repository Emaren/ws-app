"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setNotice("");
    setError("");

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        setError("Could not submit reset request. Please try again.");
        return;
      }

      const payload = (await response.json().catch(() => null)) as
        | { message?: string }
        | null;
      setNotice(
        payload?.message ??
          "If this email exists, password reset instructions will be sent.",
      );
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center h-screen">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-grey dark:bg-neutral-900 p-6 shadow"
      >
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Forgot Password</h1>
          <button
            type="button"
            onClick={() => router.push("/login")}
            aria-label="Close forgot password form"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full cursor-pointer
                       bg-grey dark:bg-neutral-800 text-neutral-700 dark:text-neutral-100
                       hover:bg-neutral-50 dark:hover:bg-neutral-700"
          >
            <span className="text-xl leading-none">x</span>
          </button>
        </div>

        <p className="mb-4 text-sm text-neutral-400">
          Enter your email and we will send reset instructions if the account
          exists.
        </p>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
          className="appearance-none bg-black text-white placeholder-gray-400 border border-gray-700 rounded px-4 py-2 mb-4 w-full focus:outline-none focus:ring-2 focus:ring-gray-500 shadow-[inset_0_0_0_1000px_#000]"
          style={{ WebkitTextFillColor: "#fff" }}
          required
          autoFocus
        />

        {error && <p className="text-red-500 mb-4">{error}</p>}
        {notice && <p className="text-emerald-400 mb-4">{notice}</p>}

        <button
          type="submit"
          disabled={loading}
          className={`bg-black text-white px-4 py-2 rounded w-full ${
            loading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
          }`}
        >
          {loading ? "Please wait..." : "Send reset link"}
        </button>

        <p className="text-center mt-4">
          Remembered your password?{" "}
          <a href="/login" className="text-blue-500 underline">
            Back to login
          </a>
        </p>
      </form>
    </div>
  );
}
