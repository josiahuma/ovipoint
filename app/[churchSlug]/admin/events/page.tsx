import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/src/lib/prisma';
import { getCurrentChurchSession } from '@/src/lib/auth';
import { DeleteEventButton } from '@/src/components/DeleteEventButton';
import { ToggleBookingsButton } from '@/src/components/ToggleBookingsButton';

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
  pickupDate: Date | null;
  capacity: number | null;

  // In your schema these are DateTime (so Prisma returns Date)
  // but keep union-safe anyway:
  pickupStartTime: Date | string | null;
  pickupEndTime: Date | string | null;

  intervalMinutes: number | null;
  bookingsOpen: boolean | null;
};

type BookingCountRow = {
  pickupEventId: bigint;
};

function toYmdUTC(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function formatTime(value: Date | string | null | undefined): string {
  if (!value) return '00:00';

  if (value instanceof Date) {
    // DateTime -> ISO -> take HH:MM
    return value.toISOString().slice(11, 16);
  }

  if (typeof value === 'string') {
    // "09:00:00" or "09:00"
    return value.slice(0, 5);
  }

  return '00:00';
}

function formatDate(value: Date | null | undefined): string {
  if (!value) return 'No date';
  return value.toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default async function ChurchEventsAdminPage({ params }: PageProps) {
  const { churchSlug } = await params;
  if (!churchSlug) return notFound();

  // 🔒 Guard (JWT)
  const session = await getCurrentChurchSession();
  if (!session) redirect(`/login?slug=${churchSlug}`);
  if (session.slug !== churchSlug) redirect(`/${session.slug}/admin`);

  const church: ChurchRow | null = await prisma.church.findUnique({
    where: { slug: churchSlug },
    select: { id: true, name: true, slug: true },
  });

  if (!church) return notFound();

  const events: PickupEventRow[] = await prisma.pickupEvent.findMany({
    where: { churchId: church.id },
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
      bookingsOpen: true,
    },
  });

  const allEvents: PickupEventRow[] = events ?? [];
  const todayStr = toYmdUTC(new Date());

  const upcomingEvents = allEvents.filter((e) => {
    if (!e.pickupDate) return false;
    return toYmdUTC(e.pickupDate) >= todayStr;
  });

  const pastEvents = allEvents.filter((e) => {
    if (!e.pickupDate) return false;
    return toYmdUTC(e.pickupDate) < todayStr;
  });

  // Booking counts
  const eventIds: bigint[] = allEvents.map((e) => e.id);

  const bookings: BookingCountRow[] = eventIds.length
    ? await prisma.booking.findMany({
        where: { pickupEventId: { in: eventIds } },
        select: { pickupEventId: true },
      })
    : [];

  const bookingCountMap = new Map<string, number>();
  for (const b of bookings) {
    const key = String(b.pickupEventId);
    bookingCountMap.set(key, (bookingCountMap.get(key) ?? 0) + 1);
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-5xl px-4 pt-6 space-y-6">
        <header className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Events – {church.name}</h1>
            <p className="text-slate-600 text-sm">
              View and manage all pickup events for this organisation.
            </p>
          </div>

          <nav className="flex flex-wrap items-center gap-3 text-sm">
            <Link
              href={`/${church.slug}/admin`}
              className="text-slate-700 hover:text-sky-700"
            >
              Dashboard
            </Link>
            <Link
              href={`/${church.slug}`}
              className="text-slate-700 hover:text-sky-700"
            >
              Public pickup page
            </Link>
            <Link
              href={`/${church.slug}/admin/events/new`}
              className="rounded-md bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-700"
            >
              + New event
            </Link>
          </nav>
        </header>

        <section className="rounded-lg border border-slate-200 bg-white p-4 space-y-4">
          <h2 className="text-lg font-semibold">Existing events</h2>

          {/* Upcoming */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-2">
              Upcoming events
            </h3>

            {upcomingEvents.length === 0 ? (
              <p className="text-slate-500 text-sm">No upcoming pickup events.</p>
            ) : (
              <div className="space-y-2">
                {upcomingEvents.map((event) => {
                  const bookingsOpen =
                    event.bookingsOpen === null || event.bookingsOpen === undefined
                      ? true
                      : !!event.bookingsOpen;

                  const totalBookings = bookingCountMap.get(String(event.id)) ?? 0;

                  return (
                    <div
                      key={String(event.id)}
                      className="flex flex-col gap-1 rounded border border-slate-200 px-3 py-2 text-sm"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex flex-col">
                          <div className="font-medium">{event.title}</div>

                          <div className="text-xs font-semibold text-slate-700">
                            {totalBookings} booking{totalBookings === 1 ? '' : 's'} received
                          </div>

                          <span
                            className={`mt-0.5 inline-flex items-center rounded-full px-2 py-0.5 text-[11px] ${
                              bookingsOpen
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}
                          >
                            {bookingsOpen ? 'Bookings open' : 'Bookings paused'}
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          <Link
                            href={`/${church.slug}/admin/events/${String(event.id)}/bookings`}
                            className="text-xs text-sky-600 hover:underline"
                          >
                            View bookings
                          </Link>

                          <Link
                            href={`/${church.slug}/admin/events/${String(event.id)}/edit`}
                            className="text-xs text-sky-600 hover:underline"
                          >
                            Edit
                          </Link>

                          <ToggleBookingsButton
                            eventId={String(event.id)} // ✅ string
                            initialOpen={bookingsOpen}
                          />

                          <DeleteEventButton eventId={String(event.id)} />
                        </div>
                      </div>

                      <div className="text-slate-600">
                        {formatDate(event.pickupDate)} · {formatTime(event.pickupStartTime)} –{' '}
                        {formatTime(event.pickupEndTime)} · Interval:{' '}
                        {event.intervalMinutes ?? 0} mins
                      </div>

                      <div className="text-xs text-slate-500">
                        Capacity: {event.capacity ?? 0}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Past */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-2">
              Past events (auto-archived)
            </h3>

            {pastEvents.length === 0 ? (
              <p className="text-slate-400 text-xs">No past events yet.</p>
            ) : (
              <div className="space-y-2">
                {pastEvents.map((event) => {
                  const bookingsOpen =
                    event.bookingsOpen === null || event.bookingsOpen === undefined
                      ? true
                      : !!event.bookingsOpen;

                  const totalBookings = bookingCountMap.get(String(event.id)) ?? 0;

                  return (
                    <div
                      key={String(event.id)}
                      className="flex flex-col gap-1 rounded border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex flex-col">
                          <div className="font-medium text-slate-600">{event.title}</div>

                          <div className="text-[11px] font-semibold text-slate-700">
                            {totalBookings} booking{totalBookings === 1 ? '' : 's'} received
                          </div>

                          <span
                            className={`mt-0.5 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] ${
                              bookingsOpen
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}
                          >
                            {bookingsOpen ? 'Bookings open (past date)' : 'Bookings paused'}
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          <Link
                            href={`/${church.slug}/admin/events/${String(event.id)}/bookings`}
                            className="text-[11px] text-sky-600 hover:underline"
                          >
                            View bookings
                          </Link>

                          <ToggleBookingsButton
                            eventId={String(event.id)} // ✅ string
                            initialOpen={bookingsOpen}
                          />

                          <DeleteEventButton eventId={String(event.id)} />
                        </div>
                      </div>

                      <div>
                        {formatDate(event.pickupDate)} · {formatTime(event.pickupStartTime)} –{' '}
                        {formatTime(event.pickupEndTime)} · Interval:{' '}
                        {event.intervalMinutes ?? 0} mins · Capacity: {event.capacity ?? 0}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
