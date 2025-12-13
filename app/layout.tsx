// app/layout.tsx
import type { Metadata } from 'next';
import './globals.css';
import { SiteHeader } from '@/src/components/SiteHeader';


export const metadata: Metadata = {
  title: 'Ovipoint – Pickup Booking Service',
  description:
    'Ovipoint is a pickup booking platform for churches, schools and community groups.',

  openGraph: {
    title: 'Ovipoint – Bus Pickup Booking SaaS',
    description:
      'Simple bus pickup booking for churches, schools and community groups.',
    url: 'https://www.ovipoint.com',
    siteName: 'Ovipoint',
    images: [
      {
        url: 'https://www.ovipoint.com/og/ovipoint-og.png',
        width: 1200,
        height: 630,
        alt: 'Ovipoint bus pickup booking platform',
      },
    ],
    type: 'website',
  },

  icons: {
    icon: '/favicon.ico',
  },
};


export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900">
        <SiteHeader />
        <main className="pt-4 pb-10">{children}</main>
      </body>
    </html>
  );
}
