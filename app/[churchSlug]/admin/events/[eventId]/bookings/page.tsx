// app/[churchSlug]/admin/events/[eventId]/bookings/page.tsx
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/src/lib/supabaseClient';

type PageProps = {
  params: Promise<{
    churchSlug: string;
    eventId: string;
  }>;
};

export default async function EventBookingsPage({ params }: PageProps) {
  const { churchSlug, eventId } = await params;

  // 1. Load church
  const { data: church, error: churchError } = await supabase
    .from('churches')
    .select('id, name, slug')
    .eq('slug', churchSlug)
    .single();

  if (churchError || !church) {
    return notFound();
  }

  // 2. Load event (ensure it belongs to this church)
  const { data: event, error: eventError } = await supabase
    .from('pickup_events')
    .select('*')
    .eq('id', Number(eventId))
    .eq('church_id', church.id)
    .single();

  if (eventError || !event) {
    return notFound();
  }

  // 3. Load bookings for this event
  const { data: bookings, error: bookingsError } = await supabase
    .from('bookings')
    .select('id, name, phone, address, pickup_time')
    .eq('pickup_event_id', event.id)
    .order('pickup_time', { ascending: true });

  const bookingList = bookings || [];

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-5xl px-4 pt-6 space-y-6">
        <header className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">
              Bookings – {event.title}
            </h1>
            <p className="text-slate-600 text-sm">
              {church.name}
            </p>
            <p className="text-slate-500 text-xs mt-1">
              Pickup date:{' '}
              {new Date(event.pickup_date).toLocaleDateString(undefined, {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}{' '}
              · {event.pickup_start_time.slice(0, 5)} –{' '}
              {event.pickup_end_time.slice(0, 5)} · Interval:{' '}
              {event.interval_minutes} mins
            </p>
          </div>
          <nav className="flex gap-4 text-sm">
            <Link
              href={`/${church.slug}/admin`}
              className="text-slate-700 hover:text-sky-700"
            >
              &larr; Back to admin
            </Link>
          </nav>
        </header>

        {bookingsError && (
          <p className="text-sm text-red-600">
            Failed to load bookings for this event.
          </p>
        )}

        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">
              Pickup bookings
            </h2>
            <span className="text-sm text-slate-600">
              Total: {bookingList.length}
            </span>
          </div>

          {bookingList.length === 0 ? (
            <p className="text-sm text-slate-500">
              No bookings have been made for this event yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-left">
                    <th className="border-b border-slate-200 px-3 py-2">
                      Name
                    </th>
                    <th className="border-b border-slate-200 px-3 py-2">
                      Phone
                    </th>
                    <th className="border-b border-slate-200 px-3 py-2">
                      Pickup time
                    </th>
                    <th className="border-b border-slate-200 px-3 py-2">
                      Address / Location
                    </th>
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
                        key={b.id}
                        className="odd:bg-white even:bg-slate-50"
                      >
                        <td className="border-b border-slate-200 px-3 py-2">
                          {b.name}
                        </td>
                        <td className="border-b border-slate-200 px-3 py-2">
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
                        <td className="border-b border-slate-200 px-3 py-2">
                          {b.pickup_time.slice(0, 5)}
                        </td>
                        <td className="border-b border-slate-200 px-3 py-2">
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
