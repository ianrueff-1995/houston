import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { VercelToolbar } from "@vercel/toolbar/next";
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
  title: "Houston",
  description: "Houston, we have a problem. A tiny game about needy satellites.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  // The Vercel toolbar (for design comments) only loads while developing.
  const showToolbar = process.env.NODE_ENV === "development";
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        {children}
        {showToolbar && <VercelToolbar />}
      </body>
    </html>
  );
}
