"use client";

import { signOut } from "next-auth/react";

export default function SignOutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/" })}
      className="inline-flex items-center rounded-lg border border-black/15 dark:border-white/20 px-3 py-2 text-sm font-medium hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
    >
      Logout
    </button>
  );
}
