// src/components/FindBookingForm.tsx
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/src/lib/supabaseClient';

type Church = {
  id: number;
  name: string;
  slug: string;
  sms_contact_phone?: string | null;
};

type PickupEvent = {
  id: number;
  church_id: number;
  title: string;
  pickup_date: string; // YYYY-MM-DD
  capacity: number;
  pickup_start_time: string; // HH:MM:SS
  pickup_end_time: string;   // HH:MM:SS
  interval_minutes: number;
};

type Booking = {
  id: number;
  pickup_event_id: number;
  name: string;
  phone: string;
  address: string;
  pickup_time: string; // HH:MM:SS
};

type BookingWithEvent = {
  booking: Booking;
  event: PickupEvent;
};

// Helpers
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

// helper to send SMS via our API route
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

export function FindBookingForm() {
  // Step 1: search fields
  const [churches, setChurches] = useState<Church[]>([]);
  const [churchId, setChurchId] = useState<string>('');
  const [dateIso, setDateIso] = useState('');
  const [phone, setPhone] = useState('');

  const [loadingChurches, setLoadingChurches] = useState(true);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [results, setResults] = useState<BookingWithEvent[]>([]);
  const [selected, setSelected] = useState<BookingWithEvent | null>(null);

  // Step 2: edit state
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editPickupTime, setEditPickupTime] = useState(''); // HH:MM

  const [eventBookings, setEventBookings] = useState<Booking[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);

  // Load churches for dropdown
  useEffect(() => {
    const loadChurches = async () => {
      setLoadingChurches(true);
      const { data, error } = await supabase
        .from('churches')
        .select('id, name, slug, sms_contact_phone')
        .order('name', { ascending: true });

      if (error) {
        console.error(error);
        setChurches([]);
      } else {
        setChurches(data || []);
      }
      setLoadingChurches(false);
    };

    loadChurches();
  }, []);

  const currentChurch = churchId
    ? churches.find((c) => c.id === Number(churchId))
    : undefined;

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setSearchError(null);
    setSaveError(null);
    setSaveSuccess(null);
    setResults([]);
    setSelected(null);

    if (!churchId || !dateIso || !phone) {
      setSearchError('Please select church, date, and enter your phone number.');
      return;
    }

    setSearching(true);

    const churchIdNum = Number(churchId);

    // 1. Load events for that church & date
    const { data: events, error: eventsError } = await supabase
      .from('pickup_events')
      .select('*')
      .eq('church_id', churchIdNum)
      .eq('pickup_date', dateIso);

    if (eventsError) {
      console.error(eventsError);
      setSearchError('Failed to search for events. Please try again.');
      setSearching(false);
      return;
    }

    if (!events || events.length === 0) {
      setSearchError('No pickup events found for that church and date.');
      setSearching(false);
      return;
    }

    const eventIds = events.map((e) => e.id);

    // 2. Find bookings by phone across those events
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('id, pickup_event_id, name, phone, address, pickup_time')
      .eq('phone', phone.trim())
      .in('pickup_event_id', eventIds);

    if (bookingsError) {
      console.error(bookingsError);
      setSearchError('Failed to search for bookings. Please try again.');
      setSearching(false);
      return;
    }

    if (!bookings || bookings.length === 0) {
      setSearchError('No bookings found matching that phone and date.');
      setSearching(false);
      return;
    }

    // 3. Attach event details to each booking
    const bookingsWithEvent: BookingWithEvent[] = bookings
      .map((b) => {
        const ev = events.find((e) => e.id === b.pickup_event_id);
        if (!ev) return null;
        return { booking: b as Booking, event: ev as PickupEvent };
      })
      .filter(Boolean) as BookingWithEvent[];

    setResults(bookingsWithEvent);

    // If exactly one, auto-select it
    if (bookingsWithEvent.length === 1) {
      handleSelectBooking(bookingsWithEvent[0]);
    }

    setSearching(false);
  };

  const handleSelectBooking = async (bw: BookingWithEvent) => {
    setSelected(bw);
    setSaveError(null);
    setSaveSuccess(null);

    // Prefill edit fields
    setEditName(bw.booking.name || '');
    setEditPhone(bw.booking.phone || '');
    setEditAddress(bw.booking.address || '');
    setEditPickupTime(formatTime(bw.booking.pickup_time)); // HH:MM

    // Load all bookings for this event (to see taken times)
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select('id, pickup_time')
      .eq('pickup_event_id', bw.event.id);

    if (error) {
      console.error(error);
      setEventBookings([]);
    } else {
      setEventBookings((bookings || []) as Booking[]);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;

    setSaveError(null);
    setSaveSuccess(null);

    if (!editName || !editPhone || !editAddress || !editPickupTime) {
      setSaveError('Please fill in all fields before saving.');
      return;
    }

    setSaving(true);

    const fullTime =
      editPickupTime.length === 5 ? `${editPickupTime}:00` : editPickupTime;

    const { error } = await supabase
      .from('bookings')
      .update({
        name: editName.trim(),
        phone: editPhone.trim(),
        address: editAddress.trim(),
        pickup_time: fullTime,
      })
      .eq('id', selected.booking.id);

    if (error) {
      console.error(error);
      if (error.message?.toLowerCase().includes('unique')) {
        setSaveError(
          'That time slot has just been taken. Please choose another time.'
        );
      } else {
        setSaveError('Failed to update your booking. Please try again.');
      }
      setSaving(false);
      return;
    }

    // SMS notifications
    const eventTimeStr = formatTime(fullTime);
    const eventDateStr = new Date(selected.event.pickup_date).toLocaleDateString(
      undefined,
      { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }
    );

    const userMsg = `Your church bus pickup booking has been updated: ${selected.event.title} on ${eventDateStr} at ${eventTimeStr}.`;
    const adminMsg = `Booking updated: ${editName} (${editPhone}) for ${selected.event.title} on ${eventDateStr} at ${eventTimeStr}.`;

    await sendSms(editPhone, userMsg);
    await sendSms(currentChurch?.sms_contact_phone, adminMsg);

    setSaveSuccess('Your booking has been updated.');
    setSaving(false);

    // Refresh event bookings
    const { data: bookings, error: reloadErr } = await supabase
      .from('bookings')
      .select('id, pickup_time')
      .eq('pickup_event_id', selected.event.id);

    if (!reloadErr) {
      setEventBookings((bookings || []) as Booking[]);
    }
  };

  const handleCancelBooking = async () => {
    if (!selected) return;

    const confirmed = window.confirm(
      'Are you sure you want to cancel this booking? This will free up your seat.'
    );
    if (!confirmed) return;

    setCancelLoading(true);
    setSaveError(null);
    setSaveSuccess(null);

    const { error } = await supabase
      .from('bookings')
      .delete()
      .eq('id', selected.booking.id);

    if (error) {
      console.error(error);
      setSaveError('Failed to cancel your booking. Please try again.');
      setCancelLoading(false);
      return;
    }

    // SMS notifications
    const eventTimeStr = formatTime(selected.booking.pickup_time);
    const eventDateStr = new Date(selected.event.pickup_date).toLocaleDateString(
      undefined,
      { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }
    );

    const userMsg = `Your church bus pickup booking has been cancelled: ${selected.event.title} on ${eventDateStr} at ${eventTimeStr}.`;
    const adminMsg = `Booking cancelled: ${selected.booking.name} (${selected.booking.phone}) for ${selected.event.title} on ${eventDateStr} at ${eventTimeStr}.`;

    await sendSms(selected.booking.phone, userMsg);
    await sendSms(currentChurch?.sms_contact_phone, adminMsg);

    setSaveSuccess('Your booking has been cancelled.');
    setSelected(null);
    setResults((prev) =>
      prev.filter((r) => r.booking.id !== selected.booking.id)
    );
    setCancelLoading(false);
  };

  // Compute time slots for editing
  let availableSlots: string[] = [];
  let originalTimeShort = '';

  if (selected) {
    const ev = selected.event;
    const allSlots = generateSlots(
      ev.pickup_start_time,
      ev.pickup_end_time,
      ev.interval_minutes
    );

    originalTimeShort = formatTime(selected.booking.pickup_time);

    const bookedTimes = new Set(
      eventBookings
        .filter((b) => b.id !== selected.booking.id)
        .map((b) => formatTime(b.pickup_time))
    );

    availableSlots = allSlots
      .map((slot) => formatTime(slot))
      .filter((short) => {
        if (short === originalTimeShort) return true; // keep their current time even if "taken"
        return !bookedTimes.has(short);
      });
  }

  return (
    <div className="space-y-6">
      {/* Search form */}
      <form onSubmit={handleSearch} className="space-y-3 border-b border-slate-200 pb-4">
        <div className="space-y-1">
          <label className="block text-sm font-medium">
            Church
          </label>
          {loadingChurches ? (
            <p className="text-xs text-slate-500">Loading churches...</p>
          ) : (
            <select
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm bg-white"
              value={churchId}
              onChange={(e) => setChurchId(e.target.value)}
            >
              <option value="">Select church…</option>
              {churches.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium">
            Service date
          </label>
          <input
            type="date"
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
            value={dateIso}
            onChange={(e) => setDateIso(e.target.value)}
          />
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium">
            Phone number used when booking
          </label>
          <input
            type="tel"
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
            placeholder="e.g. 07123 456789"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>

        {searchError && (
          <p className="text-sm text-red-600">{searchError}</p>
        )}

        <button
          type="submit"
          disabled={searching}
          className="inline-flex items-center rounded bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-60"
        >
          {searching ? 'Searching…' : 'Find my booking'}
        </button>
      </form>

      {/* Search results list */}
      {results.length > 1 && !selected && (
        <div className="space-y-2">
          <p className="text-sm text-slate-700">
            We found multiple bookings. Please choose which one to edit:
          </p>
          <div className="space-y-2">
            {results.map((r) => {
              const d = new Date(r.event.pickup_date);
              return (
                <button
                  key={r.booking.id}
                  type="button"
                  onClick={() => handleSelectBooking(r)}
                  className="w-full text-left rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm hover:border-sky-500"
                >
                  <div className="font-medium">
                    {r.event.title}
                  </div>
                  <div className="text-xs text-slate-600">
                    {d.toLocaleDateString(undefined, {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}{' '}
                    · {formatTime(r.booking.pickup_time)} · {r.booking.address}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Edit form for selected booking */}
      {selected && (
        <form
          onSubmit={handleUpdate}
          className="space-y-3 rounded border border-slate-200 bg-slate-50 p-3"
        >
          <h2 className="text-sm font-semibold mb-1">
            Edit your booking
          </h2>
          <p className="text-xs text-slate-600 mb-2">
            {selected.event.title} ·{' '}
            {new Date(selected.event.pickup_date).toLocaleDateString(
              undefined,
              {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              }
            )}
          </p>

          <div className="space-y-1">
            <label className="block text-xs font-medium">
              Name
            </label>
            <input
              type="text"
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium">
              Phone
            </label>
            <input
              type="tel"
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
              value={editPhone}
              onChange={(e) => setEditPhone(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium">
              Pickup address / location
            </label>
            <input
              type="text"
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
              value={editAddress}
              onChange={(e) => setEditAddress(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium">
              Pickup time
            </label>

            {availableSlots.length === 0 ? (
              <p className="text-xs text-red-600">
                No time slots are currently available for this event.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2 mt-1">
                {availableSlots.map((slotShort) => {
                  const selectedSlot = slotShort === editPickupTime;
                  return (
                    <button
                      key={slotShort}
                      type="button"
                      onClick={() => setEditPickupTime(slotShort)}
                      className={[
                        'rounded-full px-3 py-1 text-xs border',
                        selectedSlot
                          ? 'bg-sky-600 text-white border-sky-600'
                          : 'bg-white text-slate-700 border-slate-300 hover:border-sky-500',
                      ].join(' ')}
                    >
                      {slotShort}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {saveError && (
            <p className="text-xs text-red-600">{saveError}</p>
          )}
          {saveSuccess && (
            <p className="text-xs text-green-700">{saveSuccess}</p>
          )}

          <div className="flex items-center gap-3 mt-2">
            <button
              type="submit"
              disabled={saving || availableSlots.length === 0}
              className="inline-flex items-center rounded bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {saving ? 'Saving changes…' : 'Save changes'}
            </button>

            <button
              type="button"
              disabled={cancelLoading}
              onClick={handleCancelBooking}
              className="inline-flex items-center rounded bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
            >
              {cancelLoading ? 'Cancelling…' : 'Cancel booking'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
