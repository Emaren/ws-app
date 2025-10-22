// src/app/layout.tsx
'use client';

import type { Metadata } from "next";
import { SessionProvider } from "next-auth/react";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Wheat & Stone",
  description: "Health, Heritage, and Truth in Every Bite",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={geistSans.variable}>
        <SessionProvider>
          <header style={{ background: "white", padding: "1rem" }}>
            <a href="/">
              <img
                src="/logog.png"
                alt="Wheat and Stone"
                style={{ height: "150px" }}
              />
            </a>
          </header>
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}
