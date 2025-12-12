// app/layout.tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'Ovipoint – Church Bus Pickup SaaS',
  description:
    'Ovipoint is a multi-church bus pickup booking platform for Sunday services and church events.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/80 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-600 text-xs font-bold text-white">
                O
              </div>
              <div className="flex flex-col leading-tight">
                <span className="text-lg font-bold tracking-tight">
                  Ovipoint
                </span>
                <span className="text-[11px] text-slate-500 hidden sm:inline">
                  Church bus pickup SaaS
                </span>
              </div>
            </Link>

            <nav className="flex items-center gap-4 text-sm">
              <Link
                href="/"
                className="text-slate-700 hover:text-sky-700 transition"
              >
                Home
              </Link>
              <Link
                href="/find-booking"
                className="text-slate-700 hover:text-sky-700 transition"
              >
                Find my booking
              </Link>
              {/* Anchor link to CTA on the homepage */}
              <a
                href="#get-started"
                className="hidden sm:inline-flex items-center rounded-full border border-sky-600 px-3 py-1 text-xs font-semibold text-sky-700 hover:bg-sky-50"
              >
                Get your church started
              </a>
            </nav>
          </div>
        </header>

        <main className="pt-4 pb-10">{children}</main>
      </body>
    </html>
  );
}
