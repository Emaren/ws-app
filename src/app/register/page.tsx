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

    // Existing user → auto-login
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

    // New user → create then login
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
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded shadow w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-gray-800">Register</h1>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="cursor-pointer border border-gray-300 rounded px-4 py-2 mb-4 w-full placeholder-gray-700 text-black"
          required
          autoFocus
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="cursor-pointer border border-gray-300 rounded px-4 py-2 mb-4 w-full placeholder-gray-700 text-black"
          required
        />

        {error && <p className="text-red-500 mb-4">{error}</p>}
        {success && <p className="text-green-600 mb-4">{success}</p>}

        <button
          type="submit"
          className={`${loading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"} bg-black text-white px-4 py-2 rounded w-full`}
          disabled={loading}
        >
          {loading ? "Please wait..." : "Register"}
        </button>
      </form>
    </div>
  );
}
