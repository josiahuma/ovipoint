// app/[churchSlug]/admin/events/[eventId]/edit/page.tsx
// @ts-nocheck

import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/src/lib/prisma';
import { getCurrentChurchSession } from '@/src/lib/auth';
import { AdminEventForm } from '@/src/components/AdminEventForm';

type PageProps = {
  params: Promise<{
    churchSlug: string;
    eventId: string;
  }>;
};

function serializeEvent(ev: any) {
  if (!ev) return ev;

  return {
    ...ev,
    id: String(ev.id),
    churchId: String(ev.churchId),

    // Dates
    pickupDate: ev.pickupDate ? ev.pickupDate.toISOString() : null,
    createdAt: ev.createdAt ? ev.createdAt.toISOString() : null,
    updatedAt: ev.updatedAt ? ev.updatedAt.toISOString() : null,
  };
}

export default async function EditEventPage({ params }: PageProps) {
  const { churchSlug, eventId } = await params;

  if (!churchSlug || !eventId) return notFound();

  // 🔒 Guard (JWT)
  const session = await getCurrentChurchSession();
  if (!session) redirect(`/login?slug=${churchSlug}`);
  if (session.slug !== churchSlug) redirect(`/${session.slug}/admin`);

  // 1) Load church
  const church = await prisma.church.findUnique({
    where: { slug: churchSlug },
    select: { id: true, name: true, slug: true },
  });

  if (!church) return notFound();

  // 2) Load event (scoped to this church)
  const eventIdBig = BigInt(eventId);

  const event = await prisma.pickupEvent.findFirst({
    where: {
      id: eventIdBig,
      churchId: church.id,
    },
  });

  if (!event) return notFound();

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-5xl px-4 pt-6 space-y-6">
        <header className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Edit event – {church.name}</h1>
            <p className="text-slate-600 text-sm">
              Update the pickup details for this event.
            </p>
          </div>

          <nav className="flex gap-4 text-sm">
            <Link
              href={`/${church.slug}/admin/events`}
              className="text-slate-700 hover:text-sky-700"
            >
              &larr; Back to events
            </Link>
          </nav>
        </header>

        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <AdminEventForm
            churchId={String(church.id)}
            churchSlug={church.slug}
            initialEvent={serializeEvent(event)}
            returnTo={`/${church.slug}/admin/events`}
          />
        </section>
      </div>
    </main>
  );
}
