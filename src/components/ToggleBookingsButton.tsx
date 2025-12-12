// src/components/ToggleBookingsButton.tsx
'use client';

import { useState, useTransition } from 'react';
import { supabase } from '@/src/lib/supabaseClient';
import { useRouter } from 'next/navigation';

type Props = {
  eventId: number;
  initialOpen: boolean;
};

export function ToggleBookingsButton({ eventId, initialOpen }: Props) {
  const [bookingsOpen, setBookingsOpen] = useState(initialOpen);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const handleToggle = async () => {
    if (pending) return;

    const newValue = !bookingsOpen;

    startTransition(async () => {
      const { error } = await supabase
        .from('pickup_events')
        .update({ bookings_open: newValue })
        .eq('id', eventId);

      if (error) {
        console.error(error);
        alert('Failed to update booking status. Please try again.');
        return;
      }

      setBookingsOpen(newValue);
      router.refresh();
    });
  };

  const label = bookingsOpen ? 'Pause bookings' : 'Resume bookings';

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={pending}
      className="text-xs text-amber-700 hover:underline disabled:opacity-60"
    >
      {pending ? 'Updating…' : label}
    </button>
  );
}
