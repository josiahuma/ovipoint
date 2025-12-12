// src/components/BookingForm.tsx
'use client';

import React, { useState } from 'react';
import { supabase } from '@/src/lib/supabaseClient';

type BookingFormProps = {
  eventId: number;
  capacity: number;
  pickupStartTime: string;  // "HH:MM:SS"
  pickupEndTime: string;    // "HH:MM:SS"
  intervalMinutes: number;
  existingBookings: { pickup_time: string }[];
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
  const [pickupTime, setPickupTime] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [bookings, setBookings] = useState(existingBookings);

  const capacityLeft = Math.max(0, capacity - bookings.length);

  const allSlots = generateSlots(
    pickupStartTime,
    pickupEndTime,
    intervalMinutes
  );

  const bookedTimes = new Set(
    bookings.map((b) => formatTime(b.pickup_time))
  );

  const availableSlots = allSlots.filter((slot) => {
    const short = formatTime(slot);
    return !bookedTimes.has(short);
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!name || !phone || !address || !pickupTime) {
      setError('Please fill in all fields.');
      return;
    }
    if (capacityLeft <= 0) {
      setError('This event is fully booked.');
      return;
    }

    setSaving(true);

    const fullTime = pickupTime.length === 5 ? `${pickupTime}:00` : pickupTime;

    const { error: insertError } = await supabase.from('bookings').insert({
      pickup_event_id: eventId,
      name,
      phone,
      address,
      pickup_time: fullTime,
    });

    if (insertError) {
      console.error(insertError);
      if (insertError.message.includes('unique')) {
        setError('That time has just been taken. Please choose another slot.');
      } else {
        setError('Failed to save booking. Please try again.');
      }
      setSaving(false);
      return;
    }

    // SMS notifications
    try {
      const eventDateObj = new Date(eventDate);
      const dateStr = eventDateObj.toLocaleDateString(undefined, {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });

      const userMsg = `Your church bus pickup is booked: ${churchName} – ${eventTitle} on ${dateStr} at ${pickupTime}.`;
      const adminMsg = `New bus pickup booking for ${churchName}: ${name} (${phone}) on ${dateStr} at ${pickupTime}, address: ${address}.`;

      await sendSms(phone, userMsg);
      await sendSms(adminPhone, adminMsg);
    } catch (smsErr) {
      console.error('Error while sending SMS notifications', smsErr);
      // We don't block the booking because SMS failed.
    }

    setSuccess('Your pickup has been booked.');
    setName('');
    setPhone('');
    setAddress('');
    setPickupTime('');

    const { data: newBookings, error: loadErr } = await supabase
      .from('bookings')
      .select('pickup_time')
      .eq('pickup_event_id', eventId);

    if (!loadErr && newBookings) {
      setBookings(newBookings);
    }

    setSaving(false);
  };

  if (capacityLeft <= 0) {
    return (
      <p className="text-red-600 mt-4">
        This event is fully booked. Please choose another date.
      </p>
    );
  }

  return (
    <div className="mt-6">
      <h2 className="text-lg font-semibold mb-3">Book your pickup</h2>

      {error && <p className="text-red-600 mb-2">{error}</p>}
      {success && <p className="text-green-700 mb-2">{success}</p>}

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
          <p className="text-sm mb-1">Pickup time:</p>
          {availableSlots.length === 0 ? (
            <p className="text-red-600 text-sm">
              No time slots left. Try another date.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {availableSlots.map((slot) => {
                const short = formatTime(slot);
                const selected = short === pickupTime;
                return (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => setPickupTime(short)}
                    className={`px-3 py-1 rounded-full text-sm border ${
                      selected
                        ? 'bg-sky-600 text-white border-sky-600'
                        : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    {short}
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
          Capacity left: {capacityLeft} / {capacity}
        </p>
      </form>
    </div>
  );
}
