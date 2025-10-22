// src/app/ClientLayout.tsx
'use client';

import { SessionProvider } from "next-auth/react";
import Header from "../components/Header";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <Header />
      <main>{children}</main>
    </SessionProvider>
  );
}
