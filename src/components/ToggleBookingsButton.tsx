'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

type Props = {
  eventId: string; // ✅ string
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
      try {
        const res = await fetch('/api/admin/events/toggle-bookings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ eventId, bookingsOpen: newValue }),
        });

        const json: { ok?: boolean; error?: string } = await res.json();

        if (!res.ok) {
          alert(json?.error || 'Failed to update booking status.');
          return;
        }

        setBookingsOpen(newValue);
        router.refresh();
      } catch (e) {
        console.error(e);
        alert('Unexpected error while updating booking status.');
      }
    });
  };

  const label = bookingsOpen ? 'Pause bookings' : 'Resume bookings';

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={pending}
      className="text-sm text-amber-700 hover:underline disabled:opacity-60"
    >
      {pending ? 'Updating…' : label}
    </button>
  );
}
