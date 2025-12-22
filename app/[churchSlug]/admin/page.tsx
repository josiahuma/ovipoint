// app/[churchSlug]/admin/page.tsx

import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { prisma } from '@/src/lib/prisma';
import { getCurrentChurchSession } from '@/src/lib/auth';

type PageProps = {
  params: Promise<{ churchSlug: string }>;
};

type PickupEventRow = {
  id: bigint;
  churchId: bigint;
  title: string;
  pickupDate: Date | null;
  capacity: number | null;
  pickupStartTime: Date | string | null;
  pickupEndTime: Date | string | null;
  intervalMinutes: number | null;
};

type RawBooking = {
  id: bigint;
  pickupEventId: bigint;
  name: string;
  phone: string;
  address: string;
  pickupTime: Date | string;
  partySize: number | null;
};

function toYmdUTC(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// Date|string -> "HH:MM:SS"
function toHHMMSS(value: Date | string | null | undefined): string {
  if (!value) return '00:00:00';

  if (value instanceof Date) {
    return value.toISOString().slice(11, 19);
  }

  if (typeof value === 'string') {
    if (value.length >= 8) return value.slice(0, 8);
    if (value.length === 5) return `${value}:00`;
  }

  return '00:00:00';
}

// "HH:MM:SS" -> minutes since midnight
function hhmmssToMinutes(hhmmss: string): number {
  const [hStr, mStr] = hhmmss.split(':');
  const h = Number(hStr) || 0;
  const m = Number(mStr) || 0;
  return h * 60 + m;
}

// IMPORTANT: This is the missing function that crashed your page.
// Total seats for an event = (capacity per slot) * (number of slots in the window)
function computeEventTotalSeats(ev: PickupEventRow): number {
  const cap = Number(ev.capacity ?? 0);
  const interval = Number(ev.intervalMinutes ?? 0);

  if (!cap || !interval) return 0;

  const start = hhmmssToMinutes(toHHMMSS(ev.pickupStartTime));
  const end = hhmmssToMinutes(toHHMMSS(ev.pickupEndTime));

  if (end < start) return 0;

  // Slots are inclusive: e.g. 09:00, 09:20, 09:40, 10:00 ...
  const slotCount = Math.floor((end - start) / interval) + 1;

  return cap * Math.max(0, slotCount);
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

function formatTime(value: Date | string | null | undefined): string {
  return toHHMMSS(value).slice(0, 5);
}

function mapsUrl(address: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

function wazeUrl(address: string) {
  return `https://waze.com/ul?q=${encodeURIComponent(address)}&navigate=yes`;
}


export default async function ChurchDashboardPage({ params }: PageProps) {
  const { churchSlug } = await params;

  if (!churchSlug) return notFound();

  // 🔒 Session guard
  const session = await getCurrentChurchSession();
  if (!session) redirect(`/login?slug=${churchSlug}`);
  if (session.slug !== churchSlug) redirect(`/${session.slug}/admin`);

  // Load church
  const church = await prisma.church.findUnique({
    where: { slug: churchSlug },
    select: { id: true, name: true, slug: true },
  });

  if (!church) return notFound();

  // Load events
  const allEvents: PickupEventRow[] = await prisma.pickupEvent.findMany({
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
    },
  });

  const todayStr = toYmdUTC(new Date());

  const upcomingEvents = allEvents.filter((e) => {
    if (!e.pickupDate) return false;
    return toYmdUTC(e.pickupDate) >= todayStr;
  });

  const pastEvents = allEvents.filter((e) => {
    if (!e.pickupDate) return false;
    return toYmdUTC(e.pickupDate) < todayStr;
  });

  // total SEAT capacity for upcoming events
  const totalUpcomingCapacity = upcomingEvents.reduce(
    (sum, ev) => sum + computeEventTotalSeats(ev),
    0
  );

  // Load bookings (partySize)
  const eventIds = allEvents.map((e) => e.id);

  const allBookings: RawBooking[] = eventIds.length
    ? await prisma.booking.findMany({
        where: { pickupEventId: { in: eventIds } },
        select: {
          id: true,
          pickupEventId: true,
          name: true,
          phone: true,
          address: true,
          pickupTime: true,
          partySize: true,
        },
      })
    : [];

  // Total people booked across all events
  const totalSeatCountAll = allBookings.reduce((sum, b) => sum + (b.partySize ?? 1), 0);

  // Pair bookings with their event
  const bookingsWithEvent = allBookings
    .map((b) => {
      const ev = allEvents.find((e) => e.id === b.pickupEventId);
      if (!ev) return null;
      return { booking: b, event: ev };
    })
    .filter(Boolean) as { booking: RawBooking; event: PickupEventRow }[];

  const upcomingBookings = bookingsWithEvent.filter((be) => {
    if (!be.event.pickupDate) return false;
    return toYmdUTC(be.event.pickupDate) >= todayStr;
  });

  const pastBookings = bookingsWithEvent.filter((be) => {
    if (!be.event.pickupDate) return false;
    return toYmdUTC(be.event.pickupDate) < todayStr;
  });

  const upcomingSeatsBooked = upcomingBookings.reduce(
    (sum, be) => sum + (be.booking.partySize ?? 1),
    0
  );

  const pastSeatsBooked = pastBookings.reduce(
    (sum, be) => sum + (be.booking.partySize ?? 1),
    0
  );

  const occupancyPercent =
    totalUpcomingCapacity > 0
      ? Math.round((upcomingSeatsBooked / totalUpcomingCapacity) * 100)
      : 0;

  const latestBookings = [...bookingsWithEvent]
    .sort((a, b) => {
      const dateA = a.event.pickupDate?.getTime() ?? 0;
      const dateB = b.event.pickupDate?.getTime() ?? 0;
      if (dateA < dateB) return 1;
      if (dateA > dateB) return -1;

      const timeA = toHHMMSS(a.booking.pickupTime);
      const timeB = toHHMMSS(b.booking.pickupTime);
      if (timeA < timeB) return 1;
      if (timeA > timeB) return -1;
      return 0;
    })
    .slice(0, 5);

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-5xl px-4 pt-6 space-y-6">
        <header className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Dashboard – {church.name}</h1>
            <p className="text-sm text-slate-600">Overview of your pickup events and bookings.</p>
          </div>

          <nav className="flex flex-wrap items-center gap-3 text-sm">
            <Link href={`/${church.slug}`} className="text-slate-700 hover:text-sky-700">
              View public pickup page
            </Link>
            <Link
              href={`/${church.slug}/admin/events`}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-slate-800 hover:bg-slate-100"
            >
              Manage events
            </Link>
            <Link
              href={`/${church.slug}/admin/events/new`}
              className="rounded-md bg-sky-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-sky-700"
            >
              + New event
            </Link>
          </nav>
        </header>

        {/* Stats */}
        <section className="grid gap-4 md:grid-cols-4">
          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <p className="text-sm font-semibold text-slate-500">Upcoming events</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{upcomingEvents.length}</p>
            <p className="mt-1 text-[11px] text-slate-500">From today onwards</p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <p className="text-sm font-semibold text-slate-500">Past events</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{pastEvents.length}</p>
            <p className="mt-1 text-[11px] text-slate-500">Auto-archived</p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <p className="text-sm font-semibold text-slate-500">Total passengers</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{totalSeatCountAll}</p>
            <p className="mt-1 text-[11px] text-slate-500">People booked across all events</p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <p className="text-sm font-semibold text-slate-500">Upcoming occupancy</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{occupancyPercent}%</p>
            <p className="mt-1 text-[11px] text-slate-500">
              {upcomingSeatsBooked} passengers / {totalUpcomingCapacity} seats
            </p>
          </div>
        </section>

        {/* Bar */}
        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <h2 className="text-sm font-semibold text-slate-800 mb-2">Upcoming capacity usage</h2>
            <p className="text-sm text-slate-600 mb-3">How full your upcoming buses are.</p>

            <div className="h-3 w-full rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-sky-500 transition-all"
                style={{ width: `${Math.min(100, Math.max(0, occupancyPercent))}%` }}
              />
            </div>

            <p className="mt-2 text-sm text-slate-600">
              {totalUpcomingCapacity === 0
                ? 'No upcoming events configured yet.'
                : `${upcomingSeatsBooked} of ${totalUpcomingCapacity} available seats are booked.`}
            </p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <h2 className="text-sm font-semibold text-slate-800 mb-2">Booking breakdown</h2>
            <p className="text-sm text-slate-600 mb-3">Upcoming vs past passengers.</p>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Upcoming passengers</span>
                <span className="font-semibold">{upcomingSeatsBooked}</span>
              </div>

              <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-500"
                  style={{
                    width:
                      totalSeatCountAll === 0
                        ? '0%'
                        : `${Math.min(100, Math.round((upcomingSeatsBooked / totalSeatCountAll) * 100))}%`,
                  }}
                />
              </div>

              <div className="flex items-center justify-between text-sm mt-3">
                <span className="text-slate-600">Past passengers</span>
                <span className="font-semibold">{pastSeatsBooked}</span>
              </div>

              <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-slate-500"
                  style={{
                    width:
                      totalSeatCountAll === 0
                        ? '0%'
                        : `${Math.min(100, Math.round((pastSeatsBooked / totalSeatCountAll) * 100))}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Latest bookings */}
        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-slate-800">Latest bookings</h2>
            <Link href={`/${church.slug}/admin/events`} className="text-sm text-sky-600 hover:underline">
              Go to events &amp; full booking lists
            </Link>
          </div>

          {latestBookings.length === 0 ? (
            <p className="text-sm text-slate-500">
              No bookings yet. Once members start booking pickups, they will appear here.
            </p>
          ) : (
            <div className="space-y-2 text-sm">
              {latestBookings.map(({ booking, event }) => {
                const timeShort = formatTime(booking.pickupTime);
                const size = booking.partySize ?? 1;

                const bookingHref = `/${church.slug}/admin/bookings/${booking.id.toString()}`;
                const mapsHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                  booking.address
                )}`;
                const wazeHref = `https://waze.com/ul?q=${encodeURIComponent(booking.address)}&navigate=yes`;

                return (
                  <div key={String(booking.id)} className="rounded border border-slate-200 bg-slate-50">
                    {/* Only THIS part navigates */}
                    <Link href={bookingHref} className="block px-3 py-2 hover:bg-slate-100">
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-semibold text-slate-800">{booking.name}</div>
                        <span className="font-mono text-[11px] text-slate-600">{timeShort}</span>
                      </div>

                      <div className="mt-0.5 text-[11px] text-slate-600">
                        {event.title} · {formatDate(event.pickupDate)}
                      </div>

                      <div className="mt-0.5 text-[11px] text-slate-500">Party size: {size}</div>
                    </Link>

                    {/* Non-clickable info & actions */}
                    <div className="px-3 pb-2 text-[11px] text-slate-500 space-y-1">
                      <div>
                        Address:{" "}
                        <a
                          href={mapsHref}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sky-700 hover:underline"
                        >
                          {booking.address}
                        </a>
                      </div>

                      <div>
                        Phone:{" "}
                        <a href={`tel:${booking.phone}`} className="text-sky-700 hover:underline">
                          {booking.phone}
                        </a>
                      </div>

                      <div className="flex flex-wrap gap-2 pt-1">
                        <a
                          href={`tel:${booking.phone}`}
                          className="rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] hover:bg-slate-100"
                        >
                          Call
                        </a>

                        <a
                          href={mapsHref}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] hover:bg-slate-100"
                        >
                          Google Maps
                        </a>

                        <a
                          href={wazeHref}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] hover:bg-slate-100"
                        >
                          Waze
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}

            </div>
          )}
        </section>
      </div>
    </main>
  );
}
