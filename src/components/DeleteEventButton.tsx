'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Props = {
  eventId: string; // ✅ string, because Prisma ids are bigint and must be serialized
};

export function DeleteEventButton({ eventId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (loading) return;

    const ok = window.confirm(
      'Are you sure you want to delete this event and all its bookings? This cannot be undone.'
    );
    if (!ok) return;

    setLoading(true);

    try {
      const res = await fetch('/api/events/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId }), // string
      });

      const json: { ok?: boolean; error?: string } = await res.json();

      if (!res.ok) {
        alert(json?.error || 'Failed to delete event.');
        return;
      }

      router.refresh();
    } catch (err) {
      console.error('Delete event error', err);
      alert('Unexpected error while deleting event.');
    } finally {
      setLoading(false);
    }
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
