// app/[churchSlug]/events/[eventId]/page.tsx

import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/src/lib/prisma';
import { BookingForm } from '@/src/components/BookingForm';

type PageProps = {
  params: Promise<{ churchSlug: string; eventId: string }>;
};

function toYmdUTC(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// Convert Prisma DateTime (Date) OR string -> "HH:MM:SS"
function toHHMMSS(value: Date | string | null | undefined): string {
  if (!value) return '00:00:00';

  if (value instanceof Date) {
    return value.toISOString().slice(11, 19); // HH:MM:SS
  }

  if (typeof value === 'string') {
    // could be "09:00:00", or "09:00"
    if (value.length >= 8) return value.slice(0, 8);
    if (value.length === 5) return `${value}:00`;
  }

  return '00:00:00';
}

export default async function EventPage({ params }: PageProps) {
  const { churchSlug, eventId } = await params;

  if (!churchSlug || !eventId) return notFound();

  // 1) Load church
  const church = await prisma.church.findUnique({
    where: { slug: churchSlug },
    select: {
      id: true,
      slug: true,
      name: true,
      smsContactPhone: true,
    },
  });

  if (!church) return notFound();

  // 2) Load event (scoped to church)
  let eventIdBigInt: bigint;
  try {
    eventIdBigInt = BigInt(eventId);
  } catch {
    return notFound();
  }

  const event = await prisma.pickupEvent.findFirst({
    where: { id: eventIdBigInt, churchId: church.id },
    select: {
      id: true,
      title: true,
      pickupDate: true,
      capacity: true,
      pickupStartTime: true,
      pickupEndTime: true,
      intervalMinutes: true,
      bookingsOpen: true,
    },
  });

  if (!event) return notFound();

  // 3) Load bookings for slot availability
  const bookings = await prisma.booking.findMany({
    where: { pickupEventId: event.id },
    select: {
      pickupTime: true,
      partySize: true,
    },
  });

  // BookingForm expects strings like Supabase returned before
  const existingBookings = bookings.map((b: { pickupTime: Date | string | null; partySize: number | null }) => ({
    pickup_time: toHHMMSS(b.pickupTime), // normalize
    party_size: b.partySize ?? 1,
  }));

  const date = event.pickupDate ? new Date(event.pickupDate) : null;

  const todayStr = toYmdUTC(new Date());
  const eventDateStr = event.pickupDate ? toYmdUTC(new Date(event.pickupDate)) : '';

  const isPast = !!eventDateStr && eventDateStr < todayStr;
  const isPaused = event.bookingsOpen === false;

  const pickupStartTime = toHHMMSS(event.pickupStartTime as any);
  const pickupEndTime = toHHMMSS(event.pickupEndTime as any);

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-5xl px-4 pt-6">
        <Link href={`/${church.slug}`} className="text-sm text-sky-600 hover:underline">
          &larr; Back to pickup dates
        </Link>

        <h1 className="text-2xl font-bold mt-3">{event.title}</h1>
        <p className="text-slate-600 text-sm">{church.name}</p>

        <div className="mt-3 text-sm text-slate-700 space-y-1">
          <p>
            Date:{' '}
            {date
              ? date.toLocaleDateString(undefined, {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })
              : '-'}
          </p>

          <p>
            Pickup window: {pickupStartTime.slice(0, 5)} – {pickupEndTime.slice(0, 5)}
          </p>

          <p>Interval: {event.intervalMinutes ?? 0} minutes</p>
          <p>Capacity per time slot: {event.capacity ?? 0}</p>

          {isPaused && !isPast && (
            <p className="text-sm text-amber-700">
              Bookings for this pickup date are currently paused by the church.
            </p>
          )}
        </div>

        {isPast ? (
          <p className="mt-4 text-sm text-red-600">
            This pickup date has passed. Bookings are now closed for this event.
          </p>
        ) : isPaused ? (
          <p className="mt-4 text-sm text-amber-700">
            Bookings for this event are temporarily paused. Please check back later or contact the church office.
          </p>
        ) : (
          <BookingForm
            eventId={Number(event.id)} // if you ever exceed Number range, we’ll switch BookingForm to accept string
            capacity={Number(event.capacity ?? 0)}
            pickupStartTime={pickupStartTime}
            pickupEndTime={pickupEndTime}
            intervalMinutes={Number(event.intervalMinutes ?? 0)}
            existingBookings={existingBookings}
            adminPhone={church.smsContactPhone ?? ''}
            eventTitle={event.title}
            eventDate={eventDateStr}
            churchName={church.name}
          />
        )}
      </div>
    </main>
  );
}
