import type { Metadata } from "next";
import Link from "next/link";
import { ViewTransition } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { PostHogAnalytics } from "@/app/PostHogAnalytics";
import { PostHogProvider } from "@/app/PostHogProvider";
import { QueryProvider } from "@/app/providers";
import { TopNav } from "@/components/navigation/TopNav";
import { getSiteUrl } from "@/lib/siteUrl";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: "Web Performance Report",
  description: "Web performance report from CRUX data",
  openGraph: {
    type: "website",
    siteName: "Web Performance Report",
    title: "Web Performance Report",
    description: "Web performance report from CRUX data",
  },
  twitter: { card: "summary" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        suppressHydrationWarning={true}
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <PostHogProvider>
          <PostHogAnalytics />
          <QueryProvider>
            <div>
              <TopNav />
              <main className="mx-auto min-h-screen w-full p-4">
                <ViewTransition>{children}</ViewTransition>
              </main>
              <footer className="w-full text-center print:hidden">
                Made by Maxwell Cohen, with data from Google crux report.
                {" · "}
                <Link href="/privacy" className="underline">
                  Privacy
                </Link>
                {" · "}
                <Link href="/terms" className="underline">
                  Terms
                </Link>
              </footer>
            </div>
          </QueryProvider>
        </PostHogProvider>
      </body>
    </html>
  );
}
