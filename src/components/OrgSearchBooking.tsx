'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type Church = {
  id: number;
  name: string;
  slug: string;
};

type PickupEvent = {
  id: string;
  title: string;
  pickup_date: string;
  pickup_start_time: string;
  pickup_end_time: string;
  capacity: number;
};

export function OrgSearchBooking() {
  const [query, setQuery] = useState('');
  const [churches, setChurches] = useState<Church[]>([]);
  const [loadingChurches, setLoadingChurches] = useState(false);

  const [selectedChurch, setSelectedChurch] = useState<Church | null>(null);
  const [events, setEvents] = useState<PickupEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);

  // Search churches (debounced)
  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setChurches([]);
      setSelectedChurch(null);
      setEvents([]);
      return;
    }

    const handle = setTimeout(async () => {
      setLoadingChurches(true);

      try {
        const res = await fetch(
          `/api/churches/search?q=${encodeURIComponent(query.trim())}`
        );
        const json = await res.json();

        if (res.ok) {
          setChurches(json.churches || []);
        } else {
          setChurches([]);
        }
      } finally {
        setLoadingChurches(false);
      }
    }, 300);

    return () => clearTimeout(handle);
  }, [query]);

  const loadEventsForChurch = async (church: Church) => {
    setSelectedChurch(church);
    setLoadingEvents(true);
    setEvents([]);

    try {
      const res = await fetch(
        `/api/events/by-church?churchId=${church.id}`
      );
      const json = await res.json();

      if (res.ok) {
        setEvents(json.events || []);
      }
    } finally {
      setLoadingEvents(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="space-y-1">
        <label className="block text-xs font-medium text-slate-700">
          Search for your church or organisation
        </label>
        <input
          type="text"
          className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
          placeholder="Start typing the name…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <p className="text-[11px] text-slate-500">
          Type at least 2 letters.
        </p>
      </div>

      {/* Churches */}
      <div className="space-y-2">
        {loadingChurches && (
          <p className="text-sm text-slate-500">Searching organisations…</p>
        )}

        {!loadingChurches && query && churches.length === 0 && (
          <p className="text-sm text-slate-500">
            No organisations found.
          </p>
        )}

        {churches.length > 0 && (
          <ul className="space-y-2">
            {churches.map((church) => (
              <li key={church.id}>
                <button
                  type="button"
                  onClick={() => loadEventsForChurch(church)}
                  className={`flex w-full items-center justify-between rounded border px-3 py-2 text-left text-sm ${
                    selectedChurch?.id === church.id
                      ? 'border-sky-500 bg-sky-50'
                      : 'border-slate-200 bg-slate-50 hover:border-sky-400'
                  }`}
                >
                  <span className="font-medium">{church.name}</span>
                  <span className="text-[11px] text-slate-500">
                    ovipoint.com/{church.slug}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Events */}
      {selectedChurch && (
        <div className="mt-4 border-t border-slate-200 pt-4">
          <h3 className="text-sm font-semibold mb-2">
            Upcoming pickups for {selectedChurch.name}
          </h3>

          {loadingEvents && (
            <p className="text-sm text-slate-500">
              Loading upcoming events…
            </p>
          )}

          {!loadingEvents && events.length === 0 && (
            <p className="text-sm text-slate-500">
              No upcoming pickup dates yet.
            </p>
          )}

          {events.length > 0 && (
            <ul className="space-y-2">
              {events.map((event) => {
                const date = new Date(event.pickup_date);
                return (
                  <li key={event.id}>
                    <Link
                      href={`/${selectedChurch.slug}/events/${event.id}`}
                      className="block rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm hover:border-sky-500 hover:bg-white"
                    >
                      <div className="flex justify-between">
                        <span className="font-medium">{event.title}</span>
                        <span className="text-[11px] text-slate-500">
                          Capacity: {event.capacity}
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-slate-600">
                        {date.toLocaleDateString(undefined, {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}{' '}
                        · {event.pickup_start_time.slice(0, 5)} –{' '}
                        {event.pickup_end_time.slice(0, 5)}
                      </div>
                      <p className="mt-1 text-[11px] text-sky-700">
                        Tap to choose a pickup time →
                      </p>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
