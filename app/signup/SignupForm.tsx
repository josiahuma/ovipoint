// app/signup/page.tsx
'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function SignupPage() {
  const router = useRouter();

  const [orgName, setOrgName] = useState('');
  const [slug, setSlug] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [adminMobile, setAdminMobile] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // app/signup/page.tsx (only the handleSubmit + validation part changes)
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanSlug = slug.trim().toLowerCase();
    const cleanEmail = email.trim();

    if (!orgName || !cleanSlug || !cleanEmail || !password) {
      setErrorMsg('Please fill in church name, URL, email and password.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/create-church', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: orgName.trim(),
          slug: cleanSlug,
          sms_contact_phone: adminMobile.trim() || null,
          email: cleanEmail,
          password,
        }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        console.error('create-church error', json);
        setErrorMsg(
          json?.error || 'Failed to create church space. Please try again.',
        );
        return;
      }

      // At this point the API has created the church AND set a session cookie.
      setSuccessMsg('Church created. Taking you to your admin area…');
      router.push(`/${cleanSlug}/admin`);
    } catch (err) {
      console.error('Signup error:', err);
      setErrorMsg('Unexpected error. Please try again.');
    } finally {
      setLoading(false);
    }
  };


  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-lg px-4 pt-10 pb-16">
        <h1 className="mb-2 text-2xl font-bold">Create your Ovipoint admin</h1>
        <p className="mb-6 text-sm text-slate-600">
          This will create a dedicated URL for your church or organisation.
          Admin login will be added shortly as part of the new database setup.
        </p>

        <form
          onSubmit={handleSubmit}
          className="space-y-3 rounded-xl border border-slate-200 bg-white p-5"
        >
          {/* church name */}
          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-700">
              Church or organisation name
            </label>
            <input
              type="text"
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
              placeholder="e.g. Fresh Fountain Church"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
            />
          </div>

          {/* slug */}
          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-700">
              Preferred URL
            </label>
            <div className="flex rounded border border-slate-300 bg-white text-sm">
              <span className="inline-flex items-center border-r border-slate-200 px-2 text-slate-500">
                ovipoint.com/
              </span>
              <input
                type="text"
                className="flex-1 px-2 py-2 outline-none"
                placeholder="fresh-fountain"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
              />
            </div>
            <p className="text-[11px] text-slate-500">
              Lowercase letters, numbers and dashes only.
            </p>
          </div>

          {/* email (collected for future auth) */}
          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-700">
              Admin email
            </label>
            <input
              type="email"
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
              placeholder="you@yourchurch.org"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {/* password (not used yet) */}
          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-700">
              Password
            </label>
            <input
              type="password"
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
              placeholder="We&apos;ll enable secure login soon"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {/* mobile */}
          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-700">
              Admin mobile (optional, for SMS alerts later)
            </label>
            <input
              type="tel"
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
              placeholder="e.g. 07123 456789"
              value={adminMobile}
              onChange={(e) => setAdminMobile(e.target.value)}
            />
          </div>

          {errorMsg && (
            <p className="text-sm text-red-600">{errorMsg}</p>
          )}
          {successMsg && (
            <p className="text-sm text-emerald-700">{successMsg}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full rounded-md bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-60"
          >
            {loading ? 'Creating church…' : 'Sign up for Ovipoint'}
          </button>

          <p className="text-[11px] text-slate-500">
            Already have a church space?{' '}
            <Link href="/login" className="font-semibold text-sky-700">
              Go to login
            </Link>
            .
          </p>
        </form>
      </div>
    </main>
  );
}
