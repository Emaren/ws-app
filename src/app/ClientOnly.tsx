// src/app/ClientOnly.tsx
"use client";

import dynamic from "next/dynamic";

// Defer heavy/non-critical UI to the client
export const AdFullWidthCSR = dynamic(
  () => import("@/components/article/AdFullWidth"),
  { ssr: false }
);
