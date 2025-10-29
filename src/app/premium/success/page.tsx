// src/app/premium/success/page.tsx
"use client";

import Link from "next/link";

export default function PremiumSuccess() {
  return (
    <main className="ws-container">
      <div className="ws-article text-center py-12">
        <h1 className="text-3xl md:text-4xl font-semibold">Welcome to Premium 🎉</h1>
        <p className="mt-3 opacity-80">Thanks for supporting Wheat &amp; Stone.</p>
        <Link href="/" className="mt-6 inline-block underline underline-offset-4 cursor-pointer">
          Back to home
        </Link>
      </div>
    </main>
  );
}