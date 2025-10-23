// src/app/register/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();

    if (res.status === 409) {
      setSuccess("User already exists, signing you in...");
      const login = await signIn("credentials", { email, password, redirect: false });
      if (login?.error) {
        setError("Could not log you in.");
        setSuccess("");
      } else {
        setTimeout(() => router.push("/"), 400);
      }
      setLoading(false);
      return;
    }

    if (res.ok) {
      setSuccess("Account created! Logging you in...");
      const login = await signIn("credentials", { email, password, redirect: false });
      if (login?.error) {
        setError("Could not log you in.");
        setSuccess("");
      } else {
        setTimeout(() => router.push("/"), 400);
      }
    } else {
      setError(data?.message || "Registration failed.");
    }

    setLoading(false);
  };

  return (
    <div className="flex items-center justify-center h-screen">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-grey dark:bg-neutral-900 p-6 shadow"
      >
        {/* Toolbar with title + close (identical to Sign In) */}
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Register</h1>
          <button
            type="button"
            onClick={() => router.push("/")}
            aria-label="Close registration form"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full cursor-pointer
                       bg-grey dark:bg-neutral-800 text-neutral-700 dark:text-neutral-100
                       hover:bg-neutral-50 dark:hover:bg-neutral-700"
          >
            <span className="text-xl leading-none">x</span>
          </button>
        </div>

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
          autoComplete="new-password"
          className="appearance-none bg-black text-white placeholder-gray-400 border border-gray-700 rounded px-4 py-2 mb-4 w-full focus:outline-none focus:ring-2 focus:ring-gray-500 shadow-[inset_0_0_0_1000px_#000]"
          style={{ WebkitTextFillColor: "#fff" }}
          required
        />

        {error && <p className="text-red-500 mb-4">{error}</p>}
        {success && <p className="text-green-600 mb-4">{success}</p>}

        <button
          type="submit"
          disabled={loading}
          className={`bg-black text-white px-4 py-2 rounded w-full ${
            loading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
          }`}
        >
          {loading ? "Please wait..." : "Register"}
        </button>

        <p className="text-center mt-4">
          Already have an account?{" "}
          <a href="/login" className="text-blue-500 underline">
            Login
          </a>
        </p>
      </form>
    </div>
  );
}
