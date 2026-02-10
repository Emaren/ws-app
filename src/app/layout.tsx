// src/app/layout.tsx
import type { Metadata, Viewport } from "next";
import "./globals.css";
import ClientLayout from "./ClientLayout";
import { Geist, Geist_Mono } from "next/font/google";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"], display: "swap" });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "Wheat & Stone",
  description:
    "Health, Heritage, and Truth in Every Bite. The premier health site for Grande Prairie and area.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { url: "/icons/maskable-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    title: "Wheat & Stone",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full scroll-smooth transition-colors">
      <head>
        {/* Plausible Analytics */}
        <script
          async
          defer
          data-domain="wheatandstone.ca"
          src="https://plausible.io/js/script.js"
        ></script>
      </head>
      <body
        className={[
          geistSans.variable,
          geistMono.variable,
          "font-sans",
          "min-h-svh antialiased bg-[var(--background)] text-[var(--foreground)]",
          "overflow-x-clip",
        ].join(" ")}
      >
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
