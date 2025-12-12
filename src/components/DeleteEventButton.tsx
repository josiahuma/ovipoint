// src/components/DeleteEventButton.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/src/lib/supabaseClient';

type Props = {
  eventId: number;
  churchSlug: string;
};

export function DeleteEventButton({ eventId, churchSlug }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (loading) return;

    const ok = window.confirm(
      'Are you sure you want to delete this event and all its bookings?'
    );
    if (!ok) return;

    setLoading(true);

    // 1. Delete bookings for this event (to avoid FK issues)
    const { error: bookingsError } = await supabase
      .from('bookings')
      .delete()
      .eq('pickup_event_id', eventId);

    if (bookingsError) {
      console.error(bookingsError);
      alert('Failed to delete bookings for this event.');
      setLoading(false);
      return;
    }

    // 2. Delete the event itself
    const { error: eventError } = await supabase
      .from('pickup_events')
      .delete()
      .eq('id', eventId);

    if (eventError) {
      console.error(eventError);
      alert('Failed to delete event. Please try again.');
      setLoading(false);
      return;
    }

    // 3. Refresh admin list
    router.refresh();
    setLoading(false);
  };

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={loading}
      className="text-xs text-red-600 hover:underline disabled:opacity-60"
    >
      {loading ? 'Deleting…' : 'Delete'}
    </button>
  );
}
