// app/login/page.tsx
'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [slug, setSlug] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanSlug = slug.trim().toLowerCase();

    if (!email || !cleanSlug || !password) {
      setErrorMsg('Please enter your email, church URL and password.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          slug: cleanSlug,
          password,
        }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        setErrorMsg(json?.error || 'Failed to log in.');
        return;
      }

      // Cookie is set by the API, so just go to the admin area
      router.push(`/${cleanSlug}/admin`);
    } catch (err) {
      console.error('Login error:', err);
      setErrorMsg('Unexpected error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-md px-4 pt-10 pb-16">
        <h1 className="mb-2 text-2xl font-bold">Church admin login</h1>
        <p className="mb-6 text-sm text-slate-600">
          Log in with your admin email, password and the Ovipoint URL slug for your church.
        </p>

        <form
          onSubmit={handleSubmit}
          className="space-y-3 rounded-xl border border-slate-200 bg-white p-5"
        >
          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">
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

          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">
              Password
            </label>
            <input
              type="password"
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
              placeholder="Your admin password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">
              Church URL
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
              Use the same slug you chose during signup.
            </p>
          </div>

          {errorMsg && (
            <p className="text-sm text-red-600">
              {errorMsg}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full rounded-md bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-60"
          >
            {loading ? 'Logging in…' : 'Go to admin area'}
          </button>

          <p className="text-[11px] text-slate-500">
            Need to onboard your church?{' '}
            <Link href="/signup" className="font-semibold text-sky-700">
              Create an admin account
            </Link>
            .
          </p>
        </form>
      </div>
    </main>
  );
}
