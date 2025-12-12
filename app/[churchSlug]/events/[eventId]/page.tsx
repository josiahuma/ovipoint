// app/[churchSlug]/events/[eventId]/page.tsx
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/src/lib/supabaseClient';
import { BookingForm } from '@/src/components/BookingForm';

type PageProps = {
  params: Promise<{ churchSlug: string; eventId: string }>;
};

export default async function EventPage({ params }: PageProps) {
  const { churchSlug, eventId } = await params;

  const { data: church, error: churchError } = await supabase
    .from('churches')
    .select('id, slug, name, sms_contact_phone')
    .eq('slug', churchSlug)
    .single();

  if (churchError || !church) {
    return notFound();
  }

  const { data: event, error: eventError } = await supabase
    .from('pickup_events')
    .select('*')
    .eq('id', Number(eventId))
    .eq('church_id', church.id)
    .single();

  if (eventError || !event) {
    return notFound();
  }

  const { data: bookings, error: bookingsError } = await supabase
    .from('bookings')
    .select('pickup_time')
    .eq('pickup_event_id', event.id);

  const date = new Date(event.pickup_date);

  // Determine if this event date is in the past (auto-close bookings)
  const todayStr = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
  const isPast = event.pickup_date < todayStr;
  const isPaused = event.bookings_open === false; // if null/undefined, treat as open

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-5xl px-4 pt-6">
        <Link
          href={`/${church.slug}`}
          className="text-sm text-sky-600 hover:underline"
        >
          &larr; Back to pickup dates
        </Link>

        <h1 className="text-2xl font-bold mt-3">{event.title}</h1>
        <p className="text-slate-600 text-sm">{church.name}</p>

        <div className="mt-3 text-sm text-slate-700 space-y-1">
          <p>
            Date:{' '}
            {date.toLocaleDateString(undefined, {
              weekday: 'short',
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </p>
          <p>
            Pickup window: {event.pickup_start_time.slice(0, 5)} –{' '}
            {event.pickup_end_time.slice(0, 5)}
          </p>
          <p>Interval: {event.interval_minutes} minutes</p>
          <p>Capacity: {event.capacity}</p>
          {isPaused && !isPast && (
            <p className="text-xs text-amber-700">
              Bookings for this pickup date are currently paused by the church.
            </p>
          )}
        </div>

        {bookingsError && (
          <p className="text-red-600 mt-3 text-sm">
            Failed to load existing bookings.
          </p>
        )}

        {isPast ? (
          <p className="mt-4 text-sm text-red-600">
            This pickup date has passed. Bookings are now closed for this event.
          </p>
        ) : isPaused ? (
          <p className="mt-4 text-sm text-amber-700">
            Bookings for this event are temporarily paused. Please check back
            later or contact the church office.
          </p>
        ) : (
          <BookingForm
            eventId={event.id}
            capacity={event.capacity}
            pickupStartTime={event.pickup_start_time}
            pickupEndTime={event.pickup_end_time}
            intervalMinutes={event.interval_minutes}
            existingBookings={bookings || []}
            adminPhone={church.sms_contact_phone ?? ''}
            eventTitle={event.title}
            eventDate={event.pickup_date}
            churchName={church.name}
          />
        )}
      </div>
    </main>
  );
}
