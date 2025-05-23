import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

import { PostHogProvider /*ThemeProvider */ } from './providers';
import { TopNav } from '@/components/navigation/TopNav';

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
    <html lang="en" className="dark">
      {/* <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        enableSystem
        forcedTheme="dark"
        disableTransitionOnChange
      >  */}
      <PostHogProvider>
        <body
          suppressHydrationWarning={true}
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        >
          <div className="grid h-screen grid-rows-[auto,1fr]">
            <TopNav />
            <div className="overflow-y-scroll">
              <main className="mx-auto min-h-screen p-4 print:min-h-0">
                {children}
              </main>
              <footer className="w-full text-center print:hidden">
                Made by Maxwell Cohen, with data from Google crux report.
              </footer>
            </div>
          </div>
        </body>
      </PostHogProvider>
      {/* </ThemeProvider> */}
    </html>
  );
}
