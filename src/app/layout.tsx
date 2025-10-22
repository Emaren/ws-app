// src/app/layout.tsx
import type { Metadata } from "next";
import ClientLayout from "./ClientLayout";
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
  description: "Health, Heritage, and Truth in Every Bite. The premier health site for Grande Prairie and area.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} bg-white`}>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
