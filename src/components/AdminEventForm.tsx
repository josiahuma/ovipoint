'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type PickupEvent = {
  id: string | number;          // allow BigInt serialized as string
  title: string;
  pickupDate: string;           // "YYYY-MM-DD"
  capacity: number;
  pickupStartTime: string;      // "HH:MM:SS" or "HH:MM"
  pickupEndTime: string;        // "HH:MM:SS" or "HH:MM"
  intervalMinutes: number;
};

type AdminEventFormProps = {
  churchId: string | number;
  churchSlug: string;
  initialEvent?: PickupEvent;
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

  const [title, setTitle] = useState('');
  const [dateIso, setDateIso] = useState('');

  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>('single');
  const [multiDateInput, setMultiDateInput] = useState('');
  const [multiDates, setMultiDates] = useState<string[]>([]);

  const [capacity, setCapacity] = useState<string>('20');
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('10:30');
  const [intervalMinutes, setIntervalMinutes] = useState<string>('15');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [shareLink, setShareLink] = useState<string | null>(null);

  useEffect(() => {
    if (!initialEvent) return;

    setTitle(initialEvent.title);
    setDateIso(initialEvent.pickupDate || '');

    setCapacity(String(initialEvent.capacity));

    // accept "HH:MM:SS" or "HH:MM"
    setStartTime(String(initialEvent.pickupStartTime).slice(0, 5));
    setEndTime(String(initialEvent.pickupEndTime).slice(0, 5));

    setIntervalMinutes(String(initialEvent.intervalMinutes));

    setRecurrenceType('single');
    setMultiDates([]);
    setMultiDateInput('');
    setSuccessMessage(null);
    setError(null);
    setShareLink(null);
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

    try {
      if (isEditMode && initialEvent) {
        const res = await fetch('/api/admin/events/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            churchId: String(churchId),
            eventId: String(initialEvent.id),
            title,
            pickupDate: datesToCreate[0],
            capacity: capacityNum,
            pickupStartTime: `${startTime}:00`,
            pickupEndTime: `${endTime}:00`,
            intervalMinutes: intervalNum,
          }),
        });

        const json = await res.json().catch(() => null);

        if (!res.ok) {
          setError(json?.error || 'Failed to update event. Please try again.');
        } else {
          setSuccessMessage('Event updated successfully.');
          if (returnTo) router.push(returnTo);
          else router.refresh();
        }
      } else {
        const res = await fetch('/api/admin/events/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            churchId: String(churchId),
            title,
            dates: datesToCreate,
            capacity: capacityNum,
            pickupStartTime: `${startTime}:00`,
            pickupEndTime: `${endTime}:00`,
            intervalMinutes: intervalNum,
          }),
        });

        const json = await res.json().catch(() => null);

        if (!res.ok) {
          setError(json?.error || 'Failed to create event(s). Please try again.');
        } else {
          const createdIds: string[] = json?.createdIds || [];
          if (createdIds.length === 1) {
            setSuccessMessage('Pickup event created.');
            setShareLink(`/${churchSlug}/events/${createdIds[0]}`);
          } else {
            setSuccessMessage(`Created ${createdIds.length} pickup events for the selected dates.`);
          }

          resetForm();
          router.refresh();
        }
      }
    } catch (err) {
      console.error(err);
      setError('Unexpected error. Please try again.');
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
                onChange={(e) => setRecurrenceType(e.target.value as RecurrenceType)}
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

                  {multiDates.length > 0 ? (
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
                  ) : (
                    <p className="text-xs text-slate-500">
                      Add each date this event should run on (e.g. all Sundays in a month).
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
            This applies to each pickup time (e.g. 08:00, 08:15 etc.), not the whole event.
          </p>
        </div>
      </div>

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

      <div className="space-y-1">
        <label className="block text-sm font-medium">Time interval (minutes)</label>
        <input
          type="number"
          min={1}
          className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
          value={intervalMinutes}
          onChange={(e) => setIntervalMinutes(e.target.value)}
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {successMessage && <p className="text-sm text-green-700">{successMessage}</p>}
      {shareLink && (
        <p className="text-xs text-slate-600">
          Share this link with your members:{' '}
          <code className="rounded bg-slate-100 px-2 py-1">{shareLink}</code>
        </p>
      )}

      <button
        type="submit"
        disabled={saving}
        className="inline-flex items-center rounded bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-60"
      >
        {saving ? (isEditMode ? 'Updating...' : 'Creating...') : isEditMode ? 'Update event' : 'Create event(s)'}
      </button>
    </form>
  );
}
