'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';

type Church = {
  id: number;
  name: string;
  slug: string;
  smsContactPhone: string | null;
};

type PickupEvent = {
  id: number;
  churchId: number;
  title: string;
  pickupDate: string; // YYYY-MM-DD
  capacity: number; // per-slot capacity
  pickupStartTime: string; // HH:MM:SS
  pickupEndTime: string; // HH:MM:SS
  intervalMinutes: number;
};

type Booking = {
  id: number;
  pickupEventId: number;
  name: string;
  phone: string;
  address: string;
  pickupTime: string; // HH:MM:SS
  partySize: number; // always a number in UI
};

type BookingWithEvent = {
  booking: Booking;
  event: PickupEvent;
};

type FindResponse = {
  results: BookingWithEvent[];
  church: Church | null;
};

type ByEventBookingsResponse = {
  bookings: Array<{ id: number; pickupTime: string; partySize: number }>;
};

const formatTime = (time: string) => time.slice(0, 5);

const generateSlots = (startTime: string, endTime: string, intervalMinutes: number): string[] => {
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);

  const startTotal = startH * 60 + startM;
  const endTotal = endH * 60 + endM;

  const slots: string[] = [];
  for (let t = startTotal; t <= endTotal; t += intervalMinutes) {
    const h = Math.floor(t / 60);
    const m = t % 60;
    slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`);
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
  // --- Organisation search ---
  const [orgQuery, setOrgQuery] = useState('');
  const [churches, setChurches] = useState<Church[]>([]);
  const [loadingChurches, setLoadingChurches] = useState(false);

  // Keep selected church object (not just id) so we always retain smsContactPhone
  const [selectedChurch, setSelectedChurch] = useState<Church | null>(null);

  // --- Search fields ---
  const [dateIso, setDateIso] = useState('');
  const [phone, setPhone] = useState('');

  // --- Search results ---
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [results, setResults] = useState<BookingWithEvent[]>([]);
  const [selected, setSelected] = useState<BookingWithEvent | null>(null);

  // --- Edit form state ---
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editPickupTime, setEditPickupTime] = useState(''); // HH:MM
  const [editPartySize, setEditPartySize] = useState<number>(1);

  const [eventBookings, setEventBookings] = useState<Array<{ id: number; pickupTime: string; partySize: number }>>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);

  // Abort controllers for search requests
  const churchSearchAbortRef = useRef<AbortController | null>(null);

  // --- Debounced church search via API ---
  useEffect(() => {
    const q = orgQuery.trim();

    // reset list when too short
    if (q.length < 2) {
      setChurches([]);
      setLoadingChurches(false);
      return;
    }

    const handle = setTimeout(async () => {
      try {
        // abort previous search
        if (churchSearchAbortRef.current) churchSearchAbortRef.current.abort();
        const ac = new AbortController();
        churchSearchAbortRef.current = ac;

        setLoadingChurches(true);

        const res = await fetch(`/api/churches/search?q=${encodeURIComponent(q)}`, {
          method: 'GET',
          signal: ac.signal,
          headers: { 'Accept': 'application/json' },
        });

        // even if not ok, we just show empty list (UX)
        const json = (await res.json().catch(() => null)) as { churches?: Church[] } | null;
        setChurches(Array.isArray(json?.churches) ? json!.churches : []);
      } catch (err) {
        // ignore abort errors
        if ((err as any)?.name !== 'AbortError') {
          console.error('Church search failed', err);
          setChurches([]);
        }
      } finally {
        setLoadingChurches(false);
      }
    }, 300);

    return () => clearTimeout(handle);
  }, [orgQuery]);

  // --- Find bookings (server-side) ---
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();

    setSearchError(null);
    setSaveError(null);
    setSaveSuccess(null);
    setResults([]);
    setSelected(null);
    setEventBookings([]);

    if (!selectedChurch || !dateIso || !phone.trim()) {
      setSearchError(
        'Please select your organisation, choose a date, and enter the phone number you used when booking.'
      );
      return;
    }

    setSearching(true);

    try {
      const res = await fetch('/api/bookings/find', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          churchId: selectedChurch.id,
          pickupDate: dateIso,
          phone: phone.trim(),
        }),
      });

      const json = (await res.json().catch(() => null)) as FindResponse | null;

      if (!res.ok) {
        setSearchError(json && (json as any)?.error ? (json as any).error : 'Failed to search. Please try again.');
        return;
      }

      const found = Array.isArray(json?.results) ? json!.results : [];
      setResults(found);

      // If exactly one, auto-select
      if (found.length === 1) {
        await handleSelectBooking(found[0]);
      } else if (found.length === 0) {
        setSearchError('No bookings found matching that phone number on this date.');
      }
    } catch (err) {
      console.error('Find booking error', err);
      setSearchError('Failed to search for bookings. Please try again.');
    } finally {
      setSearching(false);
    }
  };

  const handleSelectBooking = async (bw: BookingWithEvent) => {
    setSelected(bw);
    setSaveError(null);
    setSaveSuccess(null);

    // Prefill edit fields
    setEditName(bw.booking.name || '');
    setEditPhone(bw.booking.phone || '');
    setEditAddress(bw.booking.address || '');
    setEditPickupTime(formatTime(bw.booking.pickupTime)); // HH:MM
    setEditPartySize(bw.booking.partySize ?? 1);

    // Load all bookings for that event (for slot capacity checks)
    try {
      const res = await fetch(`/api/bookings/by-event?eventId=${encodeURIComponent(String(bw.event.id))}`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });

      const json = (await res.json().catch(() => null)) as ByEventBookingsResponse | null;
      const list = Array.isArray(json?.bookings) ? json!.bookings : [];
      setEventBookings(list);
    } catch (err) {
      console.error('Failed to load event bookings', err);
      setEventBookings([]);
    }
  };

  const handleExitEdit = () => {
    setSelected(null);
    setSaveError(null);
    setSaveSuccess(null);
    setEventBookings([]);
  };

  // --- Compute available slots during editing ---
  const { availableSlots, slotRemaining } = useMemo(() => {
    if (!selected) return { availableSlots: [] as string[], slotRemaining: {} as Record<string, number> };

    const ev = selected.event;
    const allSlots = generateSlots(ev.pickupStartTime, ev.pickupEndTime, ev.intervalMinutes);

    const originalTimeShort = formatTime(selected.booking.pickupTime);
    const partySize = editPartySize || 1;
    const perSlotCapacity = ev.capacity;

    // timeShort -> people count excluding current booking
    const peopleByTime: Record<string, number> = {};
    for (const b of eventBookings) {
      if (b.id === selected.booking.id) continue;
      const short = formatTime(b.pickupTime);
      peopleByTime[short] = (peopleByTime[short] || 0) + (b.partySize ?? 1);
    }

    const remainingMap: Record<string, number> = {};
    const available: string[] = [];

    for (const slot of allSlots) {
      const short = formatTime(slot);
      const used = peopleByTime[short] || 0;
      const remaining = Math.max(0, perSlotCapacity - used);
      remainingMap[short] = remaining;

      if (short === originalTimeShort) {
        available.push(short); // always keep original
        continue;
      }

      if (remaining >= partySize) {
        available.push(short);
      }
    }

    return { availableSlots: available, slotRemaining: remainingMap };
  }, [selected, eventBookings, editPartySize]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;

    setSaveError(null);
    setSaveSuccess(null);

    const trimmedName = editName.trim();
    const trimmedPhone = editPhone.trim();
    const trimmedAddress = editAddress.trim();
    const partySize = editPartySize || 1;

    if (!trimmedName || !trimmedPhone || !trimmedAddress || !editPickupTime) {
      setSaveError('Please fill in all fields before saving.');
      return;
    }

    if (partySize < 1) {
      setSaveError('Group size must be at least 1.');
      return;
    }

    if (availableSlots.length === 0) {
      setSaveError('No valid time slots are available for your group size.');
      return;
    }

    const fullTime = editPickupTime.length === 5 ? `${editPickupTime}:00` : editPickupTime;

    // client-side safety check using computed remaining map (server will also enforce)
    const slotShort = formatTime(fullTime);
    const originalShort = formatTime(selected.booking.pickupTime);
    const remaining = slotRemaining[slotShort] ?? 0;

    if (slotShort !== originalShort && remaining < partySize) {
      setSaveError('That time slot has just become full for your group size. Please choose another time.');
      return;
    }

    setSaving(true);

    try {
      const res = await fetch('/api/bookings/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          bookingId: selected.booking.id,
          // server validates + enforces capacity
          name: trimmedName,
          phone: trimmedPhone,
          address: trimmedAddress,
          pickupTime: fullTime,
          partySize,
        }),
      });

      const json = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;

      if (!res.ok || !json?.ok) {
        setSaveError(json?.error || 'Failed to update your booking. Please try again.');
        return;
      }

      // SMS notifications (best effort)
      try {
        const eventTimeStr = formatTime(fullTime);
        const eventDateStr = new Date(selected.event.pickupDate).toLocaleDateString(undefined, {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        });

        const userMsg = `Your bus pickup booking has been updated: ${selected.event.title} on ${eventDateStr} at ${eventTimeStr} for ${partySize} person(s).`;
        const adminMsg = `Booking updated: ${trimmedName} (${trimmedPhone}) for ${selected.event.title} on ${eventDateStr} at ${eventTimeStr}, party size ${partySize}.`;

        await sendSms(trimmedPhone, userMsg);
        await sendSms(selectedChurch?.smsContactPhone, adminMsg);
      } catch (smsErr) {
        console.error('SMS notification failed', smsErr);
      }

      setSaveSuccess('Your booking has been updated.');

      // Reload event bookings for fresh slot capacities
      const reload = await fetch(`/api/bookings/by-event?eventId=${encodeURIComponent(String(selected.event.id))}`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });

      const reloadJson = (await reload.json().catch(() => null)) as ByEventBookingsResponse | null;
      const list = Array.isArray(reloadJson?.bookings) ? reloadJson!.bookings : [];
      setEventBookings(list);

      // Also update the selected booking in UI (so it reflects the new values)
      const updated: BookingWithEvent = {
        ...selected,
        booking: {
          ...selected.booking,
          name: trimmedName,
          phone: trimmedPhone,
          address: trimmedAddress,
          pickupTime: fullTime,
          partySize,
        },
      };
      setSelected(updated);

      // Update the results list too
      setResults((prev) =>
        prev.map((r) => (r.booking.id === updated.booking.id ? updated : r))
      );
    } catch (err) {
      console.error('Update booking error', err);
      setSaveError('Failed to update your booking. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelBooking = async () => {
    if (!selected) return;

    const confirmed = window.confirm(
      'Are you sure you want to cancel this booking completely? This will free up your seats.'
    );
    if (!confirmed) return;

    setCancelLoading(true);
    setSaveError(null);
    setSaveSuccess(null);

    try {
      const res = await fetch('/api/bookings/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ bookingId: selected.booking.id }),
      });

      const json = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;

      if (!res.ok || !json?.ok) {
        setSaveError(json?.error || 'Failed to cancel your booking. Please try again.');
        return;
      }

      // SMS notifications (best effort)
      try {
        const eventTimeStr = formatTime(selected.booking.pickupTime);
        const eventDateStr = new Date(selected.event.pickupDate).toLocaleDateString(undefined, {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        });

        const partySize = selected.booking.partySize ?? 1;

        const userMsg = `Your bus pickup booking has been cancelled: ${selected.event.title} on ${eventDateStr} at ${eventTimeStr} for ${partySize} person(s).`;
        const adminMsg = `Booking cancelled: ${selected.booking.name} (${selected.booking.phone}) for ${selected.event.title} on ${eventDateStr} at ${eventTimeStr}, party size ${partySize}.`;

        await sendSms(selected.booking.phone, userMsg);
        await sendSms(selectedChurch?.smsContactPhone, adminMsg);
      } catch (smsErr) {
        console.error('SMS cancel notification failed', smsErr);
      }

      setSaveSuccess('Your booking has been cancelled.');
      setSelected(null);

      // remove from results list
      setResults((prev) => prev.filter((r) => r.booking.id !== selected.booking.id));
    } catch (err) {
      console.error('Cancel booking error', err);
      setSaveError('Failed to cancel your booking. Please try again.');
    } finally {
      setCancelLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search form */}
      <form onSubmit={handleSearch} className="space-y-3 border-b border-slate-200 pb-4">
        {/* Organisation search */}
        <div className="space-y-1">
          <label className="block text-sm font-medium">Search organisation</label>
          <input
            type="text"
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
            placeholder="Start typing your church or organisation name…"
            value={orgQuery}
            onChange={(e) => {
              setOrgQuery(e.target.value);
              // if user edits the query manually, clear selection (prevents mismatch)
              setSelectedChurch(null);
            }}
          />
          <p className="text-[11px] text-slate-500">
            Type at least 2 letters (for example &ldquo;Fresh&rdquo;).
          </p>

          {loadingChurches && (
            <p className="mt-1 text-xs text-slate-500">Searching organisations…</p>
          )}

          {!loadingChurches && orgQuery.trim().length >= 2 && churches.length === 0 && (
            <p className="mt-1 text-xs text-slate-500">
              No organisations found yet. Check the spelling or try another name.
            </p>
          )}

          {churches.length > 0 && (
            <ul className="mt-2 space-y-1 text-sm">
              {churches.map((c) => {
                const isSelected = selectedChurch?.id === c.id;
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedChurch(c);
                        setOrgQuery(c.name);
                      }}
                      className={[
                        'flex w-full items-center justify-between rounded border px-3 py-1.5 text-left',
                        isSelected
                          ? 'border-sky-500 bg-sky-50'
                          : 'border-slate-200 bg-slate-50 hover:border-sky-400',
                      ].join(' ')}
                    >
                      <span className="font-medium text-slate-800">{c.name}</span>
                      <span className="text-[11px] text-slate-500">{c.slug}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium">Service date</label>
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

        {searchError && <p className="text-sm text-red-600">{searchError}</p>}

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
              const d = new Date(r.event.pickupDate);
              return (
                <button
                  key={r.booking.id}
                  type="button"
                  onClick={() => handleSelectBooking(r)}
                  className="w-full rounded border border-slate-200 bg-slate-50 px-3 py-2 text-left text-sm hover:border-sky-500"
                >
                  <div className="font-medium">{r.event.title}</div>
                  <div className="text-xs text-slate-600">
                    {d.toLocaleDateString(undefined, {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}{' '}
                    · {formatTime(r.booking.pickupTime)} · {r.booking.address}
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
          <h2 className="mb-1 text-sm font-semibold">Edit your booking</h2>
          <p className="mb-2 text-xs text-slate-600">
            {selected.event.title} ·{' '}
            {new Date(selected.event.pickupDate).toLocaleDateString(undefined, {
              weekday: 'short',
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </p>

          <div className="space-y-1">
            <label className="block text-xs font-medium">Name</label>
            <input
              type="text"
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium">Phone</label>
            <input
              type="tel"
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
              value={editPhone}
              onChange={(e) => setEditPhone(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium">Pickup address / location</label>
            <input
              type="text"
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
              value={editAddress}
              onChange={(e) => setEditAddress(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium">Group size (people on this booking)</label>
            <input
              type="number"
              min={1}
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
              value={editPartySize}
              onChange={(e) => setEditPartySize(Math.max(1, Number(e.target.value) || 1))}
            />
            <p className="text-[11px] text-slate-500">
              This is how many people will be picked up with this booking.
            </p>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium">Pickup time</label>

            {availableSlots.length === 0 ? (
              <p className="text-xs text-red-600">
                No time slots are currently available for this event that can fit your group.
              </p>
            ) : (
              <div className="mt-1 flex flex-wrap gap-2">
                {availableSlots.map((slotShort) => {
                  const selectedSlot = slotShort === editPickupTime;
                  const remaining = slotRemaining[slotShort] ?? selected.event.capacity;

                  return (
                    <button
                      key={slotShort}
                      type="button"
                      onClick={() => setEditPickupTime(slotShort)}
                      className={[
                        'rounded-full border px-3 py-1 text-xs',
                        selectedSlot
                          ? 'border-sky-600 bg-sky-600 text-white'
                          : 'border-slate-300 bg-white text-slate-700 hover:border-sky-500',
                      ].join(' ')}
                    >
                      {slotShort} ({remaining} left)
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {saveError && <p className="text-xs text-red-600">{saveError}</p>}
          {saveSuccess && <p className="text-xs text-green-700">{saveSuccess}</p>}

          <div className="mt-2 flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={saving || availableSlots.length === 0}
              className="inline-flex items-center rounded bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {saving ? 'Saving changes…' : 'Save changes'}
            </button>

            <button
              type="button"
              onClick={handleExitEdit}
              className="inline-flex items-center rounded bg-slate-200 px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-300"
            >
              Close (keep booking)
            </button>

            <button
              type="button"
              disabled={cancelLoading}
              onClick={handleCancelBooking}
              className="inline-flex items-center rounded bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
            >
              {cancelLoading ? 'Cancelling…' : 'Cancel this booking'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
