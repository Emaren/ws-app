// src/app/ClientLayout.tsx
'use client';

import { useEffect } from "react";
import { SessionProvider } from "next-auth/react";
import Header from "../components/Header";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  // Load saved theme from localStorage on first page load
  useEffect(() => {
    const saved = localStorage.getItem('theme');
    const html = document.documentElement;
    if (saved === 'dark') html.classList.add('dark');
    else html.classList.remove('dark');
  }, []);

  return (
    <SessionProvider>
      <Header />
      <main>{children}</main>
    </SessionProvider>
  );
}
