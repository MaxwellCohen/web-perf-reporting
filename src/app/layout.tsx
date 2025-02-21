import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { TopNav } from './_components/TopNav';
import { PostHogProvider } from './providers';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Web Performance Report',
  description: 'Web performance report from CRUX data',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} dark antialiased`}
      >
        <PostHogProvider>
          <div className="grid h-screen grid-rows-[auto,1fr]">
            <TopNav />
            <div className="overflow-y-scroll">
              <main className="container mx-auto min-h-screen p-4">
                {children}
              </main>
              <footer className="w-full text-center">
                Made by Maxwell Cohen, with data from Google crux report.
              </footer>
            </div>
          </div>
        </PostHogProvider>
      </body>
    </html>
  );
}
