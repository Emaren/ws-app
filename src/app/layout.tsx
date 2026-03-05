// src/app/layout.tsx
import type { Metadata, Viewport } from "next";
import "./globals.css";
import ClientLayout from "./ClientLayout";
import { Geist, Geist_Mono } from "next/font/google";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"], display: "swap" });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"], display: "swap" });

function resolveSiteOrigin(): URL {
  const fallback = "https://wheatandstone.ca";
  const raw = process.env.NEXT_PUBLIC_SITE_ORIGIN?.trim();
  if (!raw) {
    return new URL(fallback);
  }
  const normalized = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    return new URL(normalized);
  } catch {
    return new URL(fallback);
  }
}

const siteOrigin = resolveSiteOrigin();
const socialImageBasePath = "/og-x-card.jpg";
const socialImageAbsolute = new URL(socialImageBasePath, siteOrigin).toString();
const canonicalHomeUrl = new URL("/", siteOrigin).toString();
const socialImageAlt = "Wheat & Stone featured organic review card";

export const metadata: Metadata = {
  metadataBase: siteOrigin,
  title: "Wheat & Stone",
  description:
    "Health, Heritage, and Truth in Every Bite. The premier health site for Grande Prairie and area.",
  alternates: {
    canonical: canonicalHomeUrl,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    type: "website",
    url: canonicalHomeUrl,
    title: "Wheat & Stone",
    description:
      "Health, Heritage, and Truth in Every Bite. The premier health site for Grande Prairie and area.",
    siteName: "Wheat & Stone",
    locale: "en_CA",
    images: [
      {
        url: socialImageAbsolute,
        width: 1200,
        height: 630,
        alt: socialImageAlt,
        type: "image/jpeg",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@wheatandstoneca",
    title: "Wheat & Stone",
    description:
      "Health, Heritage, and Truth in Every Bite. The premier health site for Grande Prairie and area.",
    images: [socialImageAbsolute],
  },
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
  themeColor: "#202123",
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
