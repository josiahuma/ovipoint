// app/[churchSlug]/admin/events/new/page.tsx
// @ts-nocheck

import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/src/lib/prisma';
import { getCurrentChurchSession } from '@/src/lib/auth';
import { AdminEventForm } from '@/src/components/AdminEventForm';

type PageProps = {
  params: Promise<{ churchSlug: string }>;
};

export default async function NewEventPage({ params }: PageProps) {
  const { churchSlug } = await params;

  if (!churchSlug) return notFound();

  // 🔒 Guard (JWT)
  const session = await getCurrentChurchSession();
  if (!session) redirect(`/login?slug=${churchSlug}`);
  if (session.slug !== churchSlug) redirect(`/${session.slug}/admin`);

  // Load church via Prisma
  const church = await prisma.church.findUnique({
    where: { slug: churchSlug },
    select: { id: true, name: true, slug: true },
  });

  if (!church) return notFound();

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-5xl px-4 pt-6 space-y-6">
        <header className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">
              New pickup event – {church.name}
            </h1>
            <p className="text-slate-600 text-sm">
              Create a new pickup date with capacity and time slots.
            </p>
          </div>

          <nav className="flex gap-3 text-sm">
            <Link
              href={`/${church.slug}/admin/events`}
              className="text-slate-700 hover:text-sky-700"
            >
              &larr; Back to events
            </Link>
          </nav>
        </header>

        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="text-lg font-semibold mb-3">Pickup event details</h2>

          <AdminEventForm
            churchId={String(church.id)}
            churchSlug={church.slug}
          />
        </section>
      </div>
    </main>
  );
}
