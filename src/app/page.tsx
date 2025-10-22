'use client';

import { useSession, signOut } from "next-auth/react";

export default function Home() {
  const { data: session, status } = useSession();

  if (status === "loading") return <div className="p-6">Loading...</div>;

  if (!session) {
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    return null;
  }

  return (
    <div className="p-6">
      <h1 className="text-xl">Welcome back, {session.user?.email}</h1>
      <button
        onClick={() => signOut({ callbackUrl: "/login" })}
        className="mt-4 px-4 py-2 bg-white text-black rounded"
      >
        Logout
      </button>
    </div>
  );
}
