// app/[churchSlug]/admin/events/[eventId]/edit/page.tsx
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/src/lib/supabaseClient';
import { AdminEventForm } from '@/src/components/AdminEventForm';

type PageProps = {
  params: Promise<{
    churchSlug: string;
    eventId: string;
  }>;
};

export default async function EditEventPage({ params }: PageProps) {
  const { churchSlug, eventId } = await params;

  // 1. Load the church
  const { data: church, error: churchError } = await supabase
    .from('churches')
    .select('id, name, slug')
    .eq('slug', churchSlug)
    .single();

  if (churchError || !church) {
    return notFound();
  }

  // 2. Load the event, scoped to this church
  const { data: event, error: eventError } = await supabase
    .from('pickup_events')
    .select('*')
    .eq('id', Number(eventId))
    .eq('church_id', church.id)
    .single();

  if (eventError || !event) {
    return notFound();
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-5xl px-4 pt-6 space-y-6">
        <header className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">
              Edit event – {church.name}
            </h1>
            <p className="text-slate-600 text-sm">
              Update the pickup details for this event.
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

        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <AdminEventForm
            churchId={church.id}
            churchSlug={church.slug}   // ✅ ADD THIS LINE
            initialEvent={event}
            returnTo={`/${church.slug}/admin`}
          />
        </section>
      </div>
    </main>
  );
}
