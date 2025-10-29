// src/app/premium/cancel/page.tsx
"use client";

import Link from "next/link";

export default function PremiumCancel() {
  return (
    <main className="ws-container">
      <div className="ws-article text-center py-12">
        <h1 className="text-3xl md:text-4xl font-semibold">Checkout canceled</h1>
        <p className="mt-3 opacity-80">No worries — you can subscribe anytime.</p>
        <Link href="/premium" className="mt-6 inline-block underline underline-offset-4 cursor-pointer">
          Return to Premium
        </Link>
      </div>
    </main>
  );
}
