// app/layout.tsx
import type { Metadata } from 'next';
import './globals.css';
import { SiteHeader } from '@/src/components/SiteHeader';

export const metadata: Metadata = {
  title: 'Ovipoint – Bus Pickup Booking SaaS',
  description:
    'Ovipoint is a bus pickup booking platform for churches, schools and community groups.',
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
