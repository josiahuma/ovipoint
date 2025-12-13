'use client';

import React, { useMemo, useState } from 'react';
import { supabase } from '@/src/lib/supabaseClient';

type ExistingBooking = {
  pickup_time: string; // "HH:MM:SS"
  party_size?: number | null;
};

type BookingFormProps = {
  eventId: number;
  capacity: number; // per time slot
  pickupStartTime: string;  // "HH:MM:SS"
  pickupEndTime: string;    // "HH:MM:SS"
  intervalMinutes: number;
  existingBookings: ExistingBooking[];
  adminPhone?: string | null;
  eventTitle: string;
  eventDate: string;   // "YYYY-MM-DD"
  churchName: string;
};

const formatTime = (time: string) => time.slice(0, 5);

const generateSlots = (
  startTime: string,
  endTime: string,
  intervalMinutes: number
): string[] => {
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);

  const startTotal = startH * 60 + startM;
  const endTotal = endH * 60 + endM;

  const slots: string[] = [];
  for (let t = startTotal; t <= endTotal; t += intervalMinutes) {
    const h = Math.floor(t / 60);
    const m = t % 60;
    const hh = String(h).padStart(2, '0');
    const mm = String(m).padStart(2, '0');
    slots.push(`${hh}:${mm}:00`);
  }
  return slots;
};

// helper to trigger SMS via API route
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
}: BookingFormProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [groupSize, setGroupSize] = useState<number>(1);
  const [pickupTime, setPickupTime] = useState(''); // "HH:MM"
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [bookings, setBookings] = useState<ExistingBooking[]>(existingBookings);

  // ---- Derived slot + capacity info ----
  const allSlots = useMemo(
    () => generateSlots(pickupStartTime, pickupEndTime, intervalMinutes),
    [pickupStartTime, pickupEndTime, intervalMinutes]
  );

  const { slotUsage, slotRemaining, totalUsed, totalCapacity } = useMemo(() => {
    const usage: Record<string, number> = {};

    bookings.forEach((b) => {
      const short = formatTime(b.pickup_time);
      const p = b.party_size ?? 1;
      usage[short] = (usage[short] || 0) + p;
    });

    const remaining: Record<string, number> = {};
    allSlots.forEach((slot) => {
      const short = formatTime(slot);
      const used = usage[short] || 0;
      remaining[short] = Math.max(0, capacity - used);
    });

    const totalCap = capacity * allSlots.length;
    const totalUsedSeats = Object.values(usage).reduce(
      (sum, n) => sum + n,
      0
    );

    return {
      slotUsage: usage,
      slotRemaining: remaining,
      totalUsed: totalUsedSeats,
      totalCapacity: totalCap,
    };
  }, [bookings, allSlots, capacity]);

  const anySeatsLeft = totalUsed < totalCapacity;

  const availableSlots = allSlots
    .map((slot) => formatTime(slot))
    .filter((short) => slotRemaining[short] > 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();
    const trimmedAddress = address.trim();
    const chosenTimeShort = pickupTime;

    if (!trimmedName || !trimmedPhone || !trimmedAddress || !chosenTimeShort) {
      setError('Please fill in all fields and choose a pickup time.');
      return;
    }

    const size = groupSize || 1;
    if (size < 1) {
      setError('Group size must be at least 1.');
      return;
    }

    // Simple front-end capacity check for chosen slot
    const frontRemaining = slotRemaining[chosenTimeShort] ?? 0;
    if (frontRemaining < size) {
      setError(
        'It looks like that time slot cannot fit your group size anymore. Please choose another time.'
      );
      return;
    }

    setSaving(true);

    try {
      // 1) Check if this phone already has a booking for this event
      const { data: existingForPhone, error: existErr } = await supabase
        .from('bookings')
        .select('id')
        .eq('pickup_event_id', eventId)
        .eq('phone', trimmedPhone);

      if (existErr) {
        console.error('existingForPhone error', existErr);
      }

      if (existingForPhone && existingForPhone.length > 0) {
        setError(
          'It looks like you already have a booking for this event with this phone number. Use "Find my booking" on the homepage to change it instead of creating another one.'
        );
        setSaving(false);
        return;
      }

      const fullTime =
        chosenTimeShort.length === 5
          ? `${chosenTimeShort}:00`
          : chosenTimeShort;

      // 2) Re-check capacity for that exact slot from DB (race-condition safety)
      const { data: latestSlotBookings, error: latestErr } = await supabase
        .from('bookings')
        .select('pickup_time, party_size')
        .eq('pickup_event_id', eventId)
        .eq('pickup_time', fullTime);

      if (latestErr) {
        console.error('latestSlotBookings error', latestErr);
      }

      if (latestSlotBookings) {
        const used = latestSlotBookings.reduce((sum, b) => {
          const p = (b as any).party_size ?? 1;
          return sum + p;
        }, 0);
        const remaining = capacity - used;

        if (remaining < size) {
          setError(
            'It looks like you already have a booking at that time, or that time has just filled up. Please choose another slot.'
          );
          setSaving(false);
          return;
        }
      }

      // 3) Insert booking
      const { error: insertError } = await supabase.from('bookings').insert({
        pickup_event_id: eventId,
        name: trimmedName,
        phone: trimmedPhone,
        address: trimmedAddress,
        pickup_time: fullTime,
        party_size: size,
      });

      if (insertError) {
        // In your console you were seeing `{}` – log the whole thing for debugging
        console.error('insertError', insertError);
        setError(
          'Something went wrong while saving your booking. Please try again in a moment.'
        );
        setSaving(false);
        return;
      }

      // 4) SMS notifications (best-effort)
      try {
        const eventDateObj = new Date(eventDate);
        const dateStr = eventDateObj.toLocaleDateString(undefined, {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        });

        const userMsg = `Your church bus pickup is booked: ${churchName} – ${eventTitle} on ${dateStr} at ${chosenTimeShort} for ${size} person(s).`;
        const adminMsg = `New bus pickup booking for ${churchName}: ${trimmedName} (${trimmedPhone}) on ${dateStr} at ${chosenTimeShort}, party size ${size}, address: ${trimmedAddress}.`;

        await sendSms(trimmedPhone, userMsg);
        await sendSms(adminPhone, adminMsg);
      } catch (smsErr) {
        console.error('Error while sending SMS notifications', smsErr);
        // Don’t block the booking because SMS failed.
      }

      setSuccess('Your pickup has been booked.');
      setName('');
      setPhone('');
      setAddress('');
      setGroupSize(1);
      setPickupTime('');

      // Refresh local bookings so the slot counts update
      const { data: newBookings, error: loadErr } = await supabase
        .from('bookings')
        .select('pickup_time, party_size')
        .eq('pickup_event_id', eventId);

      if (!loadErr && newBookings) {
        setBookings(newBookings as ExistingBooking[]);
      }
    } finally {
      setSaving(false);
    }
  };

  if (!anySeatsLeft) {
    return (
      <p className="mt-4 text-red-600">
        This event is fully booked across all time slots. Please choose another
        date.
      </p>
    );
  }

  return (
    <div className="mt-6">
      <h2 className="mb-3 text-lg font-semibold">Book your pickup</h2>

      {error && <p className="mb-2 text-red-600">{error}</p>}
      {success && <p className="mb-2 text-green-700">{success}</p>}

      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <input
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          placeholder="Phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />

        <input
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          placeholder="Pickup Address / Location"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />

        <div>
          <label className="mb-1 block text-sm font-medium">
            How many people (INCLUDING YOURSELF)?
          </label>
          <input
            type="number"
            min={1}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={groupSize}
            onChange={(e) => setGroupSize(Math.max(1, Number(e.target.value) || 1))}
          />
          <p className="mt-1 text-xs text-slate-500">
            Seats are reserved per person. If you’re booking for a group,
            include everyone travelling.
          </p>
        </div>

        <div>
          <p className="mb-1 text-sm">Pickup time:</p>
          {availableSlots.length === 0 ? (
            <p className="text-sm text-red-600">
              No time slots left that can fit your group. Try another date or
              reduce the group size.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {allSlots.map((slot) => {
                const short = formatTime(slot);
                const remaining = slotRemaining[short] ?? 0;
                const isFull = remaining <= 0;
                const selected = short === pickupTime;

                return (
                  <button
                    key={slot}
                    type="button"
                    disabled={isFull}
                    onClick={() => setPickupTime(short)}
                    className={[
                      'rounded-full border px-3 py-1 text-sm',
                      isFull
                        ? 'cursor-not-allowed bg-slate-100 text-slate-400 border-slate-200 line-through'
                        : selected
                        ? 'bg-sky-600 text-white border-sky-600'
                        : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200',
                    ].join(' ')}
                  >
                    {short}{' '}
                    {isFull ? '(full)' : `(${remaining} left)`}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={saving || availableSlots.length === 0}
          className="inline-flex items-center justify-center rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:bg-slate-400"
        >
          {saving ? 'Booking…' : 'Book Pickup'}
        </button>

        <p className="text-xs text-slate-500">
          Total seats left across all time slots:{' '}
          <strong>
            {totalCapacity - totalUsed} / {totalCapacity}
          </strong>{' '}
          ({capacity} seats per time slot)
        </p>
      </form>
    </div>
  );
}
