// app/[churchSlug]/admin/page.tsx
import { notFound } from 'next/navigation';
import { supabase } from '@/src/lib/supabaseClient';
import { AdminEventForm } from '@/src/components/AdminEventForm';
import { DeleteEventButton } from '@/src/components/DeleteEventButton';
import { ToggleBookingsButton } from '@/src/components/ToggleBookingsButton';

type PageProps = {
  params: Promise<{ churchSlug: string }>;
};

export default async function ChurchAdminPage({ params }: PageProps) {
  const { churchSlug } = await params;

  const { data: church, error: churchError } = await supabase
    .from('churches')
    .select('id, name, slug')
    .eq('slug', churchSlug)
    .single();

  if (churchError || !church) {
    return notFound();
  }

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
  const pastEvents = allEvents.filter(
    (e: any) => e.pickup_date < todayStr
  );

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-5xl px-4 pt-6 space-y-6">
        <header className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Admin – {church.name}</h1>
            <p className="text-slate-600 text-sm">
              Create and manage pickup events for this church.
            </p>
          </div>
          <nav className="flex gap-4 text-sm">
            <a
              href={`/${church.slug}`}
              className="text-slate-700 hover:text-sky-700"
            >
              Pickup dates
            </a>
            <span className="text-slate-900 font-medium">Admin</span>
            <a
              href={`/${church.slug}/admin/settings`}
              className="text-slate-700 hover:text-sky-700"
            >
              Settings
            </a>
          </nav>
        </header>

        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="text-lg font-semibold mb-3">
            Create new pickup event
          </h2>
          <AdminEventForm churchId={church.id} churchSlug={church.slug} />
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-4 space-y-4">
          <h2 className="text-lg font-semibold">Existing events</h2>

          {eventsError && (
            <p className="text-red-600 text-sm">
              Failed to load events for this church.
            </p>
          )}

          {/* Upcoming events */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-2">
              Upcoming events
            </h3>

            {upcomingEvents.length === 0 ? (
              <p className="text-slate-500 text-sm">
                No upcoming pickup events.
              </p>
            ) : (
              <div className="space-y-2">
                {upcomingEvents.map((event: any) => {
                  const date = new Date(event.pickup_date);
                  const bookingsOpen =
                    event.bookings_open === null ||
                    event.bookings_open === undefined
                      ? true
                      : !!event.bookings_open;

                  return (
                    <div
                      key={event.id}
                      className="flex flex-col gap-1 rounded border border-slate-200 px-3 py-2 text-sm"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex flex-col">
                          <div className="font-medium">{event.title}</div>
                          <span
                            className={`mt-0.5 inline-flex items-center rounded-full px-2 py-0.5 text-[11px] ${
                              bookingsOpen
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}
                          >
                            {bookingsOpen
                              ? 'Bookings open'
                              : 'Bookings paused'}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <a
                            href={`/${church.slug}/admin/events/${event.id}/bookings`}
                            className="text-xs text-sky-600 hover:underline"
                          >
                            View bookings
                          </a>
                          <a
                            href={`/${church.slug}/admin/events/${event.id}/edit`}
                            className="text-xs text-sky-600 hover:underline"
                          >
                            Edit
                          </a>
                          <ToggleBookingsButton
                            eventId={event.id}
                            initialOpen={bookingsOpen}
                          />
                          <DeleteEventButton
                            eventId={event.id}
                            churchSlug={church.slug}
                          />
                        </div>
                      </div>
                      <div className="text-slate-600">
                        {date.toLocaleDateString(undefined, {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}{' '}
                        · {event.pickup_start_time.slice(0, 5)} –{' '}
                        {event.pickup_end_time.slice(0, 5)} · Interval:{' '}
                        {event.interval_minutes} mins
                      </div>
                      <div className="text-xs text-slate-500">
                        Capacity: {event.capacity}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Past events */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-2">
              Past events (auto-archived)
            </h3>

            {pastEvents.length === 0 ? (
              <p className="text-slate-400 text-xs">
                No past events yet.
              </p>
            ) : (
              <div className="space-y-2">
                {pastEvents.map((event: any) => {
                  const date = new Date(event.pickup_date);
                  const bookingsOpen =
                    event.bookings_open === null ||
                    event.bookings_open === undefined
                      ? true
                      : !!event.bookings_open;

                  return (
                    <div
                      key={event.id}
                      className="flex flex-col gap-1 rounded border border-slate-200 px-3 py-2 text-xs text-slate-500 bg-slate-50"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex flex-col">
                          <div className="font-medium text-slate-600">
                            {event.title}
                          </div>
                          <span
                            className={`mt-0.5 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] ${
                              bookingsOpen
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}
                          >
                            {bookingsOpen
                              ? 'Bookings open (past date)'
                              : 'Bookings paused'}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <a
                            href={`/${church.slug}/admin/events/${event.id}/bookings`}
                            className="text-[11px] text-sky-600 hover:underline"
                          >
                            View bookings
                          </a>
                          {/* Optional: still allow pause/resume + delete on past events */}
                          <ToggleBookingsButton
                            eventId={event.id}
                            initialOpen={bookingsOpen}
                          />
                          <DeleteEventButton
                            eventId={event.id}
                            churchSlug={church.slug}
                          />
                        </div>
                      </div>
                      <div>
                        {date.toLocaleDateString(undefined, {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}{' '}
                        · {event.pickup_start_time.slice(0, 5)} –{' '}
                        {event.pickup_end_time.slice(0, 5)} · Interval:{' '}
                        {event.interval_minutes} mins · Capacity:{' '}
                        {event.capacity}
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
