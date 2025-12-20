'use client';

import { useState } from 'react';

type Props = {
  church: {
    id: string | number; // can be BigInt serialized as string
    name: string;
    smsContactPhone?: string | null; // prisma field name
  };
};

export function AdminChurchSettingsForm({ church }: Props) {
  const [smsPhone, setSmsPhone] = useState(church.smsContactPhone || '');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch('/api/admin/church/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          churchId: String(church.id),
          smsContactPhone: smsPhone.trim() || null,
        }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        setError(json?.error || 'Failed to save settings.');
      } else {
        setSuccess('Settings saved.');
      }
    } catch (err) {
      console.error(err);
      setError('Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-3">
      <div className="space-y-1">
        <label className="block text-sm font-medium">Admin SMS contact phone</label>
        <input
          type="tel"
          className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
          placeholder="e.g. 07123 456789"
          value={smsPhone}
          onChange={(e) => setSmsPhone(e.target.value)}
        />
        <p className="text-sm text-slate-500">
          This number will receive SMS alerts when members book, update, or cancel pickups.
        </p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {success && <p className="text-sm text-green-700">{success}</p>}

      <button
        type="submit"
        disabled={saving}
        className="inline-flex items-center rounded bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-60"
      >
        {saving ? 'Saving…' : 'Save settings'}
      </button>
    </form>
  );
}
