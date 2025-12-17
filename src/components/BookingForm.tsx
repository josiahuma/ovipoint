'use client';

import { useMemo, useState } from 'react';

type ExistingBooking = {
  pickup_time: Date | string; // comes from server mapping
  party_size?: number | null;
};

type Props = {
  eventId: number;
  capacity: number;
  pickupStartTime: Date | string;
  pickupEndTime: Date | string;
  intervalMinutes: number;
  existingBookings: ExistingBooking[];
  adminPhone?: string;
  eventTitle: string;
  eventDate: string; // YYYY-MM-DD
  churchName: string;
};

function toHHMM(value: Date | string): string {
  if (value instanceof Date) return value.toISOString().slice(11, 16);
  if (typeof value === 'string') return value.slice(0, 5);
  return '00:00';
}

function toHHMMFromPickup(value: Date | string): string {
  if (value instanceof Date) return value.toISOString().slice(11, 16);
  if (typeof value === 'string') return value.slice(0, 5);
  return '00:00';
}

function generateSlots(startHHMM: string, endHHMM: string, intervalMinutes: number): string[] {
  const [sh, sm] = startHHMM.split(':').map(Number);
  const [eh, em] = endHHMM.split(':').map(Number);

  const startTotal = sh * 60 + sm;
  const endTotal = eh * 60 + em;

  const slots: string[] = [];
  for (let t = startTotal; t <= endTotal; t += intervalMinutes) {
    const h = Math.floor(t / 60);
    const m = t % 60;
    slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
  }
  return slots;
}

async function sendSms(to: string | undefined | null, message: string) {
  const phone = to?.trim();
  if (!phone) return;

  try {
    await fetch('/api/send-sms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: phone, message }),
    });
  } catch (e) {
    console.error('Failed to trigger SMS', e);
  }
}

export function BookingForm({
  eventId,
  capacity,
  pickupStartTime,
  pickupEndTime,
  intervalMinutes,
  existingBookings,
  adminPhone,
  eventTitle,
  eventDate,
  churchName,
}: Props) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [partySize, setPartySize] = useState(1);

  const [selectedSlot, setSelectedSlot] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const startHHMM = toHHMM(pickupStartTime);
  const endHHMM = toHHMM(pickupEndTime);

  const allSlots = useMemo(() => {
    return generateSlots(startHHMM, endHHMM, intervalMinutes);
  }, [startHHMM, endHHMM, intervalMinutes]);

  // Build slot usage map from existingBookings (people, not bookings)
  const slotUsedMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const b of existingBookings || []) {
      const hhmm = toHHMMFromPickup(b.pickup_time);
      const size = b.party_size ?? 1;
      map[hhmm] = (map[hhmm] || 0) + size;
    }
    return map;
  }, [existingBookings]);

  const slotRemainingMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const slot of allSlots) {
      const used = slotUsedMap[slot] || 0;
      map[slot] = Math.max(0, capacity - used);
    }
    return map;
  }, [allSlots, slotUsedMap, capacity]);

  const availableSlots = useMemo(() => {
    const size = Math.max(1, partySize || 1);
    return allSlots.filter((slot) => (slotRemainingMap[slot] || 0) >= size);
  }, [allSlots, slotRemainingMap, partySize]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();
    const trimmedAddress = address.trim();
    const size = Math.max(1, Number(partySize || 1));

    if (!trimmedName || !trimmedPhone || !trimmedAddress) {
      setError('Please fill in name, phone, and address.');
      return;
    }

    if (!selectedSlot) {
      setError('Please choose a pickup time.');
      return;
    }

    // Client-side quick check (still keep server as source of truth)
    if ((slotRemainingMap[selectedSlot] || 0) < size) {
      setError('That time slot is full for your group size. Please choose another time.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/bookings/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId,
          name: trimmedName,
          phone: trimmedPhone,
          address: trimmedAddress,
          pickupTime: selectedSlot, // "HH:MM"
          partySize: size,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json?.ok) {
        setError(json?.error || 'Something went wrong while saving your booking.');
        setLoading(false);
        return;
      }

      // SMS (optional)
      const prettyDate = new Date(`${eventDate}T00:00:00.000Z`).toLocaleDateString(undefined, {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });

      const userMsg = `Your bus pickup is confirmed: ${eventTitle} (${churchName}) on ${prettyDate} at ${selectedSlot} for ${size} person(s).`;
      const adminMsg = `New booking: ${trimmedName} (${trimmedPhone}) for ${eventTitle} on ${prettyDate} at ${selectedSlot}, party size ${size}.`;

      await sendSms(trimmedPhone, userMsg);
      await sendSms(adminPhone, adminMsg);

      setSuccess('Booking confirmed! You will receive an SMS confirmation.');
      setName('');
      setPhone('');
      setAddress('');
      setPartySize(1);
      setSelectedSlot('');
    } catch (err) {
      console.error('Booking submit error', err);
      setError('Unexpected error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-3 rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="text-sm font-semibold text-slate-800">Book your pickup</h2>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <label className="block text-xs font-medium">Name</label>
          <input
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-medium">Phone</label>
          <input
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-1">
        <label className="block text-xs font-medium">Pickup address / location</label>
        <input
          className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />
      </div>

      <div className="space-y-1">
        <label className="block text-xs font-medium">Group size (people)</label>
        <input
          type="number"
          min={1}
          className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
          value={partySize}
          onChange={(e) => setPartySize(Math.max(1, Number(e.target.value) || 1))}
        />
      </div>

      <div className="space-y-1">
        <label className="block text-xs font-medium">Choose a pickup time</label>

        {availableSlots.length === 0 ? (
          <p className="text-xs text-red-600">
            No slots available that can fit your group size right now.
          </p>
        ) : (
          <div className="mt-1 flex flex-wrap gap-2">
            {allSlots.map((slot) => {
              const remaining = slotRemainingMap[slot] || 0;
              const disabled = remaining < Math.max(1, partySize || 1);
              const selected = selectedSlot === slot;

              return (
                <button
                  key={slot}
                  type="button"
                  disabled={disabled}
                  onClick={() => setSelectedSlot(slot)}
                  className={[
                    'rounded-full px-3 py-1 text-xs border',
                    selected ? 'bg-sky-600 text-white border-sky-600' : 'bg-white text-slate-700 border-slate-300',
                    disabled ? 'opacity-40 cursor-not-allowed' : 'hover:border-sky-500',
                  ].join(' ')}
                >
                  {slot} ({remaining} left)
                </button>
              );
            })}
          </div>
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {success && <p className="text-sm text-emerald-700">{success}</p>}

      <button
        type="submit"
        disabled={loading || !selectedSlot}
        className="inline-flex items-center rounded bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-60"
      >
        {loading ? 'Submitting…' : 'Confirm booking'}
      </button>
    </form>
  );
}
