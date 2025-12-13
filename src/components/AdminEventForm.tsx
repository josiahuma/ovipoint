// src/components/AdminEventForm.tsx
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/src/lib/supabaseClient';
import { useRouter } from 'next/navigation';

type PickupEvent = {
  id: number;
  title: string;
  pickup_date: string; // "YYYY-MM-DD"
  capacity: number; // capacity PER TIME SLOT
  pickup_start_time: string; // "HH:MM:SS"
  pickup_end_time: string;   // "HH:MM:SS"
  interval_minutes: number;
};

type AdminEventFormProps = {
  churchId: number;
  churchSlug: string; // used to build shareable links
  /** If provided, the form acts in "edit" mode instead of "create" */
  initialEvent?: PickupEvent;
  /** Optional URL to redirect to after successful save (e.g. "/fresh-fountain/admin") */
  returnTo?: string;
};

type RecurrenceType = 'single' | 'multiple';

export function AdminEventForm({
  churchId,
  churchSlug,
  initialEvent,
  returnTo,
}: AdminEventFormProps) {
  const router = useRouter();

  const isEditMode = !!initialEvent;

  // ----- Form state -----
  const [title, setTitle] = useState('');
  const [dateIso, setDateIso] = useState(''); // "YYYY-MM-DD" for single-date mode

  // multi-date recurring mode
  const [recurrenceType, setRecurrenceType] =
    useState<RecurrenceType>('single');
  const [multiDateInput, setMultiDateInput] = useState('');
  const [multiDates, setMultiDates] = useState<string[]>([]);

  const [capacity, setCapacity] = useState<string>('20'); // per time slot
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('10:30');
  const [intervalMinutes, setIntervalMinutes] = useState<string>('15');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [shareLink, setShareLink] = useState<string | null>(null);

  // Prefill when editing an existing event
  useEffect(() => {
    if (!initialEvent) return;

    setTitle(initialEvent.title);
    setDateIso(initialEvent.pickup_date || '');
    setCapacity(String(initialEvent.capacity));

    // Convert "HH:MM:SS" to "HH:MM"
    setStartTime(initialEvent.pickup_start_time.slice(0, 5));
    setEndTime(initialEvent.pickup_end_time.slice(0, 5));

    setIntervalMinutes(String(initialEvent.interval_minutes));
    setSuccessMessage(null);
    setError(null);

    // Edit mode keeps things simple: single date
    setRecurrenceType('single');
    setMultiDates([]);
    setMultiDateInput('');
  }, [initialEvent]);

  const resetForm = () => {
    setTitle('');
    setDateIso('');
    setCapacity('20');
    setStartTime('08:00');
    setEndTime('10:30');
    setIntervalMinutes('15');
    setRecurrenceType('single');
    setMultiDates([]);
    setMultiDateInput('');
    setShareLink(null);
  };

  const handleAddMultiDate = () => {
    if (!multiDateInput) return;
    if (multiDates.includes(multiDateInput)) return;

    setMultiDates((prev) =>
      [...prev, multiDateInput].sort((a, b) => (a < b ? -1 : 1))
    );
    setMultiDateInput('');
  };

  const handleRemoveMultiDate = (date: string) => {
    setMultiDates((prev) => prev.filter((d) => d !== date));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setShareLink(null);

    if (!title || !capacity || !startTime || !endTime || !intervalMinutes) {
      setError('Please fill in all fields.');
      return;
    }

    // Which dates?
    let datesToCreate: string[] = [];

    if (isEditMode && initialEvent) {
      if (!dateIso) {
        setError('Please choose a pickup date.');
        return;
      }
      datesToCreate = [dateIso];
    } else {
      if (recurrenceType === 'single') {
        if (!dateIso) {
          setError('Please choose a pickup date.');
          return;
        }
        datesToCreate = [dateIso];
      } else {
        if (multiDates.length === 0) {
          setError('Please add at least one pickup date.');
          return;
        }
        datesToCreate = multiDates;
      }
    }

    // Validate times: end must be after start
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);
    const startTotal = startH * 60 + startM;
    const endTotal = endH * 60 + endM;
    if (endTotal <= startTotal) {
      setError('Pickup end time must be after start time.');
      return;
    }

    const capacityNum = Number(capacity);
    const intervalNum = Number(intervalMinutes);

    if (!Number.isFinite(capacityNum) || capacityNum <= 0) {
      setError('Capacity per time slot must be a positive number.');
      return;
    }

    if (!Number.isFinite(intervalNum) || intervalNum <= 0) {
      setError('Interval must be a positive number of minutes.');
      return;
    }

    setSaving(true);

    const basePayload = {
      church_id: churchId,
      title,
      capacity: capacityNum, // per time slot
      pickup_start_time: `${startTime}:00`,
      pickup_end_time: `${endTime}:00`,
      interval_minutes: intervalNum,
    };

    try {
      if (isEditMode && initialEvent) {
        // UPDATE
        const payload = {
          ...basePayload,
          pickup_date: datesToCreate[0],
        };

        const { error: updateError } = await supabase
          .from('pickup_events')
          .update(payload)
          .eq('id', initialEvent.id);

        if (updateError) {
          console.error(updateError);
          setError('Failed to update event. Please try again.');
        } else {
          setSuccessMessage('Event updated successfully.');

          if (returnTo) {
            router.push(returnTo);
          } else {
            router.refresh();
          }
        }
      } else {
        // CREATE one or many
        const payloads = datesToCreate.map((date) => ({
          ...basePayload,
          pickup_date: date,
        }));

        const { data, error: insertError } = await supabase
          .from('pickup_events')
          .insert(payloads)
          .select('id, pickup_date');

        if (insertError) {
          console.error(insertError);
          setError('Failed to create event(s). Please try again.');
        } else {
          if (payloads.length === 1 && data && data.length > 0) {
            const created = data[0];
            setSuccessMessage('Pickup event created.');
            setShareLink(`/${churchSlug}/events/${created.id}`);
          } else {
            setSuccessMessage(
              `Created ${payloads.length} pickup events for the selected dates.`
            );
          }

          resetForm();
          router.refresh();
        }
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-1">
        <label className="block text-sm font-medium">Event title</label>
        <input
          type="text"
          className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
          placeholder="e.g. Sunday Service – 12 Jan"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      {/* Dates / recurrence */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="space-y-2">
          <label className="block text-sm font-medium">Pickup dates</label>

          {isEditMode ? (
            <input
              type="date"
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
              value={dateIso}
              onChange={(e) => setDateIso(e.target.value)}
            />
          ) : (
            <>
              <select
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                value={recurrenceType}
                onChange={(e) =>
                  setRecurrenceType(e.target.value as RecurrenceType)
                }
              >
                <option value="single">Single date</option>
                <option value="multiple">Multiple selected dates</option>
              </select>

              {recurrenceType === 'single' && (
                <input
                  type="date"
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                  value={dateIso}
                  onChange={(e) => setDateIso(e.target.value)}
                />
              )}

              {recurrenceType === 'multiple' && (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="date"
                      className="flex-1 rounded border border-slate-300 px-3 py-2 text-sm"
                      value={multiDateInput}
                      onChange={(e) => setMultiDateInput(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={handleAddMultiDate}
                      className="rounded bg-slate-200 px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-300"
                    >
                      Add date
                    </button>
                  </div>
                  {multiDates.length > 0 && (
                    <ul className="space-y-1 text-xs text-slate-700">
                      {multiDates.map((d) => (
                        <li
                          key={d}
                          className="flex items-center justify-between rounded bg-slate-50 px-2 py-1"
                        >
                          <span>{d}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveMultiDate(d)}
                            className="text-[11px] text-red-600 hover:underline"
                          >
                            Remove
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  {multiDates.length === 0 && (
                    <p className="text-xs text-slate-500">
                      Add each date this event should run on (e.g. all Sundays in
                      a month).
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium">
            Capacity per time slot (number of seats)
          </label>
          <input
            type="number"
            min={1}
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
          />
          <p className="text-[11px] text-slate-500">
            This applies to each pickup time (e.g. 08:00, 08:15 etc.), not the
            whole event.
          </p>
        </div>
      </div>

      {/* Times */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <label className="block text-sm font-medium">Pickup start time</label>
          <input
            type="time"
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
          />
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium">Pickup end time</label>
          <input
            type="time"
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
          />
        </div>
      </div>

      {/* Interval */}
      <div className="space-y-1">
        <label className="block text-sm font-medium">
          Time interval (minutes)
        </label>
        <input
          type="number"
          min={1}
          className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
          value={intervalMinutes}
          onChange={(e) => setIntervalMinutes(e.target.value)}
        />
      </div>

      {/* Messages */}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {successMessage && (
        <p className="text-sm text-green-700">{successMessage}</p>
      )}
      {shareLink && (
        <p className="text-xs text-slate-600">
          Share this link with your members:{' '}
          <code className="rounded bg-slate-100 px-2 py-1">{shareLink}</code>
        </p>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={saving}
        className="inline-flex items-center rounded bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-60"
      >
        {saving
          ? isEditMode
            ? 'Updating...'
            : 'Creating...'
          : isEditMode
          ? 'Update event'
          : 'Create event(s)'}
      </button>
    </form>
  );
}
