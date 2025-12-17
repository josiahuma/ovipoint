// app/[churchSlug]/admin/events/[eventId]/bookings/page.tsx
// @ts-nocheck

import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/src/lib/prisma';
import { getCurrentChurchSession } from '@/src/lib/auth';

type PageProps = {
  params: Promise<{
    churchSlug: string;
    eventId: string;
  }>;
};

function timeToHHMM(value: unknown): string {
  if (!value) return '';
  if (value instanceof Date) return value.toISOString().slice(11, 16); // HH:MM
  if (typeof value === 'string') return value.slice(0, 5); // "HH:MM" or "HH:MM:SS"
  return String(value).slice(0, 5);
}


export default async function EventBookingsPage({ params }: PageProps) {
  const { churchSlug, eventId } = await params;

  if (!churchSlug || !eventId) return notFound();

  // 🔒 Guard (JWT)
  const session = await getCurrentChurchSession();

  if (!session) {
    redirect(`/login?slug=${churchSlug}`);
  }

  if (session.slug !== churchSlug) {
    redirect(`/${session.slug}/admin`);
  }

  // 1) Load church
  const church = await prisma.church.findUnique({
    where: { slug: churchSlug },
    select: { id: true, name: true, slug: true },
  });

  if (!church) return notFound();

  // eventId comes from URL -> convert safely
  const eventIdBig = BigInt(eventId);

  // 2) Load event (must belong to this church)
  const event = await prisma.pickupEvent.findFirst({
    where: {
      id: eventIdBig,
      churchId: church.id,
    },
  });

  if (!event) return notFound();

  // 3) Load bookings for this event
  const bookingList = await prisma.booking.findMany({
    where: { pickupEventId: event.id },
    select: {
      id: true,
      name: true,
      phone: true,
      address: true,
      pickupTime: true,
      partySize: true,
    },
    orderBy: { pickupTime: 'asc' },
  });

  const totalPeople = bookingList.reduce(
    (sum, b) => sum + (b.partySize ?? 1),
    0
  );

  const pickupDateLabel = event.pickupDate
    ? event.pickupDate.toLocaleDateString(undefined, {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '';

  const startTime = timeToHHMM(event.pickupStartTime);
  const endTime = timeToHHMM(event.pickupEndTime);


  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-5xl px-4 pt-6 space-y-6">
        <header className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Bookings – {event.title}</h1>
            <p className="text-slate-600 text-sm">{church.name}</p>

            <p className="text-slate-500 text-xs mt-1">
              {pickupDateLabel}
              {startTime && endTime ? (
                <>
                  {' '}
                  · {startTime} – {endTime}
                </>
              ) : null}
              {event.intervalMinutes ? (
                <>
                  {' '}
                  · Interval: {event.intervalMinutes} mins
                </>
              ) : null}
            </p>
          </div>

          <Link
            href={`/${church.slug}/admin/events`}
            className="text-sm text-sky-600 hover:underline"
          >
            ← Back to events
          </Link>
        </header>

        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Pickup bookings</h2>
            <span className="text-sm text-slate-600">
              {bookingList.length} bookings · {totalPeople} people
            </span>
          </div>

          {bookingList.length === 0 ? (
            <p className="text-sm text-slate-500">No bookings yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-left">
                    <th className="border-b px-3 py-2">Name</th>
                    <th className="border-b px-3 py-2">Phone</th>
                    <th className="border-b px-3 py-2">Pickup time</th>
                    <th className="border-b px-3 py-2">People</th>
                    <th className="border-b px-3 py-2">Address</th>
                  </tr>
                </thead>

                <tbody>
                  {bookingList.map((b) => {
                    const phoneClean = b.phone?.replace(/\s+/g, '');
                    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                      b.address || ''
                    )}`;

                    return (
                      <tr
                        key={String(b.id)}
                        className="odd:bg-white even:bg-slate-50"
                      >
                        <td className="border-b px-3 py-2">{b.name}</td>

                        <td className="border-b px-3 py-2">
                          {phoneClean ? (
                            <a
                              href={`tel:${phoneClean}`}
                              className="text-sky-600 hover:underline"
                            >
                              {b.phone}
                            </a>
                          ) : (
                            '-'
                          )}
                        </td>

                        <td className="border-b px-3 py-2">
                          {timeToHHMM(b.pickupTime)}
                        </td>

                        <td className="border-b px-3 py-2 font-medium">
                          {b.partySize ?? 1}
                        </td>

                        <td className="border-b px-3 py-2">
                          {b.address ? (
                            <a
                              href={mapsUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sky-600 hover:underline"
                            >
                              {b.address}
                            </a>
                          ) : (
                            '-'
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
