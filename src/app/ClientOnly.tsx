// src/app/ClientOnly.tsx
"use client";

import dynamic from "next/dynamic";

// Defer heavy/non-critical UI to the client
export const CommentsSectionCSR = dynamic(
  () => import("@/components/article/CommentsSection"),
  {
    ssr: false,
    loading: () => (
      <div className="mt-8 text-center opacity-60">Loading comments…</div>
    ),
  }
);

export const AdFullWidthCSR = dynamic(
  () => import("@/components/article/AdFullWidth"),
  { ssr: false }
);
