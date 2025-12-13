// app/[churchSlug]/admin/page.tsx
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/src/lib/supabaseClient';

type PageProps = {
  params: Promise<{ churchSlug: string }>;
};

export default async function ChurchDashboardPage({ params }: PageProps) {
  const { churchSlug } = await params;

  // 1. Load organisation
  const { data: church, error: churchError } = await supabase
    .from('churches')
    .select('id, name, slug')
    .eq('slug', churchSlug)
    .single();

  if (churchError || !church) {
    return notFound();
  }

  // 2. Load all events for this org
  const { data: events, error: eventsError } = await supabase
    .from('pickup_events')
    .select('*')
    .eq('church_id', church.id)
    .order('pickup_date', { ascending: true });

  const allEvents = events || [];
  const todayStr = new Date().toISOString().slice(0, 10);

  const upcomingEvents = allEvents.filter(
    (e: any) => e.pickup_date >= todayStr
  );
  const pastEvents = allEvents.filter((e: any) => e.pickup_date < todayStr);

  const totalUpcomingCapacity = upcomingEvents.reduce(
    (sum: number, ev: any) => sum + (ev.capacity || 0),
    0
  );

  // 3. Load bookings for these events
  const eventIds = allEvents.map((e: any) => e.id);

  let allBookings: any[] = [];
  if (eventIds.length > 0) {
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('id, pickup_event_id, name, phone, address, pickup_time')
      .in('pickup_event_id', eventIds);

    if (!bookingsError && bookings) {
      allBookings = bookings;
    }
  }

  const totalBookings = allBookings.length;

  // bookings linked with event for display
  const bookingsWithEvent = allBookings
    .map((b) => {
      const ev = allEvents.find((e: any) => e.id === b.pickup_event_id);
      if (!ev) return null;
      return { booking: b, event: ev };
    })
    .filter(Boolean) as {
    booking: {
      id: number;
      pickup_event_id: number;
      name: string;
      phone: string;
      address: string;
      pickup_time: string;
    };
    event: any;
  }[];

  // upcoming vs past bookings
  const upcomingBookings = bookingsWithEvent.filter(
    (be) => be.event.pickup_date >= todayStr
  );
  const pastBookings = bookingsWithEvent.filter(
    (be) => be.event.pickup_date < todayStr
  );

  const upcomingBookingsCount = upcomingBookings.length;

  // simple "occupancy" percentage for upcoming events
  const occupancyPercent =
    totalUpcomingCapacity > 0
      ? Math.round((upcomingBookingsCount / totalUpcomingCapacity) * 100)
      : 0;

  // last 5 bookings (sorted by event date desc then pickup_time desc)
  const latestBookings = [...bookingsWithEvent]
    .sort((a, b) => {
      const dateA = a.event.pickup_date;
      const dateB = b.event.pickup_date;
      if (dateA < dateB) return 1;
      if (dateA > dateB) return -1;
      // same date, compare time
      if (a.booking.pickup_time < b.booking.pickup_time) return 1;
      if (a.booking.pickup_time > b.booking.pickup_time) return -1;
      return 0;
    })
    .slice(0, 5);

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-5xl px-4 pt-6 space-y-6">
        {/* Header */}
        <header className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">
              Dashboard – {church.name}
            </h1>
            <p className="text-sm text-slate-600">
              Overview of your pickup events and bookings.
            </p>
          </div>
          <nav className="flex flex-wrap items-center gap-3 text-sm">
            <Link
              href={`/${church.slug}`}
              className="text-slate-700 hover:text-sky-700"
            >
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
              className="rounded-md bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-700"
            >
              + New event
            </Link>
          </nav>
        </header>

        {/* Stats cards */}
        <section className="grid gap-4 md:grid-cols-4">
          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <p className="text-xs font-semibold text-slate-500">
              Upcoming events
            </p>
            <p className="mt-1 text-2xl font-bold text-slate-900">
              {upcomingEvents.length}
            </p>
            <p className="mt-1 text-[11px] text-slate-500">
              From today onwards
            </p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <p className="text-xs font-semibold text-slate-500">
              Past events
            </p>
            <p className="mt-1 text-2xl font-bold text-slate-900">
              {pastEvents.length}
            </p>
            <p className="mt-1 text-[11px] text-slate-500">
              Auto-archived
            </p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <p className="text-xs font-semibold text-slate-500">
              Total bookings
            </p>
            <p className="mt-1 text-2xl font-bold text-slate-900">
              {totalBookings}
            </p>
            <p className="mt-1 text-[11px] text-slate-500">
              Across all events
            </p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <p className="text-xs font-semibold text-slate-500">
              Upcoming occupancy
            </p>
            <p className="mt-1 text-2xl font-bold text-slate-900">
              {occupancyPercent}%
            </p>
            <p className="mt-1 text-[11px] text-slate-500">
              {upcomingBookingsCount} bookings /{' '}
              {totalUpcomingCapacity || 0} seats
            </p>
          </div>
        </section>

        {/* Mini chart */}
        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <h2 className="text-sm font-semibold text-slate-800 mb-2">
              Upcoming capacity usage
            </h2>
            <p className="text-xs text-slate-600 mb-3">
              A simple visual showing how full your upcoming buses are.
            </p>

            <div className="h-3 w-full rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-sky-500 transition-all"
                style={{
                  width: `${Math.min(100, Math.max(0, occupancyPercent))}%`,
                }}
              />
            </div>

            <p className="mt-2 text-xs text-slate-600">
              {totalUpcomingCapacity === 0 ? (
                <>No upcoming events configured yet.</>
              ) : (
                <>
                  {upcomingBookingsCount} of {totalUpcomingCapacity} available
                  seats are booked.
                </>
              )}
            </p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <h2 className="text-sm font-semibold text-slate-800 mb-2">
              Booking breakdown
            </h2>
            <p className="text-xs text-slate-600 mb-3">
              Split of bookings between upcoming and past events.
            </p>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600">Upcoming bookings</span>
                <span className="font-semibold">
                  {upcomingBookings.length}
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-500"
                  style={{
                    width:
                      totalBookings === 0
                        ? '0%'
                        : `${Math.min(
                            100,
                            Math.round(
                              (upcomingBookings.length / totalBookings) * 100
                            )
                          )}%`,
                  }}
                />
              </div>

              <div className="flex items-center justify-between text-xs mt-3">
                <span className="text-slate-600">Past bookings</span>
                <span className="font-semibold">
                  {pastBookings.length}
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-slate-500"
                  style={{
                    width:
                      totalBookings === 0
                        ? '0%'
                        : `${Math.min(
                            100,
                            Math.round(
                              (pastBookings.length / totalBookings) * 100
                            )
                          )}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Latest bookings */}
        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-slate-800">
              Latest bookings
            </h2>
            <Link
              href={`/${church.slug}/admin/events`}
              className="text-xs text-sky-600 hover:underline"
            >
              Go to events &amp; full booking lists
            </Link>
          </div>

          {latestBookings.length === 0 ? (
            <p className="text-xs text-slate-500">
              No bookings yet. Once members start booking pickups, they will
              appear here.
            </p>
          ) : (
            <div className="space-y-2 text-xs">
              {latestBookings.map(({ booking, event }) => {
                const date = new Date(event.pickup_date);
                const timeShort = booking.pickup_time.slice(0, 5);
                return (
                  <div
                    key={booking.id}
                    className="flex flex-col rounded border border-slate-200 bg-slate-50 px-3 py-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-semibold text-slate-800">
                        {booking.name}
                      </div>
                      <span className="font-mono text-[11px] text-slate-600">
                        {timeShort}
                      </span>
                    </div>
                    <div className="mt-0.5 text-[11px] text-slate-600">
                      {event.title} ·{' '}
                      {date.toLocaleDateString(undefined, {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </div>
                    <div className="mt-0.5 text-[11px] text-slate-500">
                      {booking.address}
                    </div>
                    <div className="mt-0.5 text-[11px] text-slate-500">
                      Phone: {booking.phone}
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
