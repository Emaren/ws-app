// src/app/login/page.tsx
"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await signIn("credentials", { email, password, redirect: false });
    if (res?.error) {
      setError("Invalid credentials.");
      setLoading(false);
      return;
    }
    router.push("/");
  };

  return (
    <section className="site-shell flex min-h-[70vh] items-center justify-center py-12">
      <form onSubmit={handleSubmit} className="w-full max-w-md rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-grey dark:bg-neutral-900 p-6 shadow">
        {/* Toolbar with title + close */}
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Sign In</h1>
          <button
            type="button"
            onClick={() => router.push("/")}
            aria-label="Close sign in form"
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
          autoComplete="current-password"
          className="appearance-none bg-black text-white placeholder-gray-400 border border-gray-700 rounded px-4 py-2 mb-4 w-full focus:outline-none focus:ring-2 focus:ring-gray-500 shadow-[inset_0_0_0_1000px_#000]"
          style={{ WebkitTextFillColor: "#fff" }}
          required
        />

        {error && <p className="text-red-500 mb-4">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className={`bg-black text-white px-4 py-2 rounded w-full ${loading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
        >
          {loading ? "Please wait..." : "Login"}
        </button>

        <p className="text-center mt-4">
          Don’t have an account?{" "}
          <a href="/register" className="text-blue-500 underline">Register</a>
        </p>
      </form>
    </section>
  );
}
