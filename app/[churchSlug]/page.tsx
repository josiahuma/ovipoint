// app/[churchSlug]/page.tsx
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { supabase } from '@/src/lib/supabaseClient';

type PageProps = {
  params: Promise<{ churchSlug: string }>;
};

export default async function ChurchEventsPage({ params }: PageProps) {
  // ⬇️ Next 16: params is a Promise, so we await it
  const { churchSlug } = await params;

  // 1. Load the church by slug
  const { data: church, error: churchError } = await supabase
    .from('churches')
    .select('id, name, slug')
    .eq('slug', churchSlug)
    .single();

  if (churchError || !church) {
    return notFound();
  }

  const today = new Date().toISOString().slice(0, 10);

  // 2. Load upcoming pickup events
  const { data: events, error: eventsError } = await supabase
    .from('pickup_events')
    .select('*')
    .eq('church_id', church.id)
    .gte('pickup_date', today)
    .order('pickup_date', { ascending: true });

  // 3. Load bookings for those events to compute capacity left
  let bookingsByEvent: Record<number, number> = {};

  if (events && events.length > 0) {
    const eventIds = events.map((e: any) => e.id);

    const { data: bookings } = await supabase
      .from('bookings')
      .select('pickup_event_id')
      .in('pickup_event_id', eventIds);

    (bookings || []).forEach((b: any) => {
      const key = b.pickup_event_id;
      bookingsByEvent[key] = (bookingsByEvent[key] || 0) + 1;
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

        {eventsError && (
          <p className="text-red-600 text-sm">
            Failed to load events for this church.
          </p>
        )}

        {!events || events.length === 0 ? (
          <p className="text-slate-500 text-sm">
            No upcoming pickup dates have been created yet.
          </p>
        ) : (
          <ul className="space-y-3">
            {events.map((event: any) => {
              const date = new Date(event.pickup_date);
              const bookedCount = bookingsByEvent[event.id] || 0;
              const capacityLeft = Math.max(0, event.capacity - bookedCount);

              // "Running low" threshold: 20% of capacity or 3 seats, whichever is higher
              const lowThreshold = Math.max(
                3,
                Math.round(event.capacity * 0.2)
              );
              const isLow =
                capacityLeft > 0 && capacityLeft <= lowThreshold;
              const isFull = capacityLeft <= 0;

              return (
                <li key={event.id}>
                  <Link
                    href={`/${church.slug}/events/${event.id}`}
                    className="block rounded-lg border border-slate-200 bg-white px-4 py-3 hover:border-sky-500 hover:shadow-sm transition"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="font-semibold">{event.title}</div>
                        <div className="text-sm text-slate-600">
                          {date.toLocaleDateString(undefined, {
                            weekday: 'short',
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-xs text-slate-600">
                          Capacity left:{' '}
                          <strong>
                            {capacityLeft} / {event.capacity}
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

                    <div className="text-xs text-slate-500 mt-1">
                      Pickup window: {event.pickup_start_time.slice(0, 5)} –{' '}
                      {event.pickup_end_time.slice(0, 5)} · Interval:{' '}
                      {event.interval_minutes} mins
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
