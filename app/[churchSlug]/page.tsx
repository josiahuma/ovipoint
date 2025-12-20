// app/[churchSlug]/page.tsx
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/src/lib/prisma';

type PageProps = {
  params: Promise<{ churchSlug: string }>;
};

type ChurchRow = {
  id: bigint;
  name: string;
  slug: string;
};

type PickupEventRow = {
  id: bigint;
  churchId: bigint;
  title: string;
  pickupDate: Date;
  capacity: number;
  pickupStartTime: Date;
  pickupEndTime: Date;
  intervalMinutes: number;
};

type BookingSeatRow = {
  pickupEventId: bigint;
  partySize: number | null;
};

function countSlotsForEvent(ev: {
  pickupStartTime: Date;
  pickupEndTime: Date;
  intervalMinutes: number;
}): number {
  const start = ev.pickupStartTime.getTime();
  const end = ev.pickupEndTime.getTime();
  const interval = Number(ev.intervalMinutes) || 0;

  if (!Number.isFinite(start) || !Number.isFinite(end)) return 0;
  if (interval <= 0) return 0;
  if (end < start) return 0;

  const diffMinutes = Math.floor((end - start) / 60000);
  return Math.floor(diffMinutes / interval) + 1; // includes start slot
}

export default async function ChurchEventsPage({ params }: PageProps) {
  const { churchSlug } = await params;

  const church: ChurchRow | null = await prisma.church.findUnique({
    where: { slug: churchSlug },
    select: { id: true, name: true, slug: true },
  });

  if (!church) return notFound();

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const events: PickupEventRow[] = await prisma.pickupEvent.findMany({
    where: {
      churchId: church.id,
      pickupDate: { gte: today },
    },
    orderBy: { pickupDate: 'asc' },
    select: {
      id: true,
      churchId: true,
      title: true,
      pickupDate: true,
      capacity: true,
      pickupStartTime: true,
      pickupEndTime: true,
      intervalMinutes: true,
    },
  });

  // Sum bookings per event (people, not bookings)
  const bookingsByEvent: Record<string, number> = {};

  if (events.length > 0) {
    const eventIds = events.map((e: PickupEventRow) => e.id);

    const bookings: BookingSeatRow[] = await prisma.booking.findMany({
      where: { pickupEventId: { in: eventIds } },
      select: { pickupEventId: true, partySize: true },
    });

    bookings.forEach((b: BookingSeatRow) => {
      const key = String(b.pickupEventId);
      const size = b.partySize ?? 1;
      bookingsByEvent[key] = (bookingsByEvent[key] || 0) + size;
    });
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-5xl px-4 pt-6 space-y-4">
        <header className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{church.name}</h1>
            <p className="text-slate-600 text-sm">
              Bus pickup dates for this church.
            </p>
          </div>
        </header>

        {events.length === 0 ? (
          <p className="text-slate-500 text-sm">
            No upcoming pickup dates have been created yet.
          </p>
        ) : (
          <ul className="space-y-3">
            {events.map((event: PickupEventRow) => {
              const usedSeats = bookingsByEvent[String(event.id)] || 0;

              const slotCount = countSlotsForEvent({
                pickupStartTime: event.pickupStartTime,
                pickupEndTime: event.pickupEndTime,
                intervalMinutes: event.intervalMinutes,
              });

              const totalCapacity = (Number(event.capacity) || 0) * slotCount;
              const capacityLeft = Math.max(0, totalCapacity - usedSeats);

              // low threshold: 20% of per-slot capacity OR 3 seats, whichever higher
              const lowThreshold = Math.max(3, Math.round((Number(event.capacity) || 0) * 0.2));
              const isLow = capacityLeft > 0 && capacityLeft <= lowThreshold;
              const isFull = capacityLeft <= 0;

              const dateLabel = event.pickupDate.toLocaleDateString(undefined, {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              });

              const startTime = event.pickupStartTime.toISOString().slice(11, 16);
              const endTime = event.pickupEndTime.toISOString().slice(11, 16);

              return (
                <li key={String(event.id)}>
                  <Link
                    href={`/${church.slug}/events/${String(event.id)}`}
                    className="block rounded-lg border border-slate-200 bg-white px-4 py-3 hover:border-sky-500 hover:shadow-sm transition"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="font-semibold">{event.title}</div>
                        <div className="text-sm text-slate-600">{dateLabel}</div>
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        <span className="text-sm text-slate-600">
                          Seats left:{' '}
                          <strong>
                            {capacityLeft} / {totalCapacity}
                          </strong>
                        </span>

                        <div className="flex gap-2">
                          {isFull && (
                            <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700 border border-red-200">
                              Fully booked
                            </span>
                          )}
                          {!isFull && isLow && (
                            <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 border border-amber-200">
                              Almost full
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-sm text-slate-500 mt-1">
                      Pickup window: {startTime} – {endTime} · Interval: {event.intervalMinutes} mins
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}
