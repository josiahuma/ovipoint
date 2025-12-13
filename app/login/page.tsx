// app/login/page.tsx
'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/src/lib/supabaseClient';

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!email || !password) {
      setErrorMsg('Please enter your email and password.');
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        console.error(error);
        setErrorMsg(error.message || 'Failed to log in.');
        return;
      }

      const user = data.user;
      if (!user) {
        setErrorMsg('No user returned. Please try again.');
        return;
      }

      // Get slug from user metadata (set during signup)
      const meta = user.user_metadata as any;
      const slug = meta?.church_slug;

      if (slug) {
        router.push(`/${slug}/admin`);
      } else {
        // Fallback: just go to generic admin list if you ever add one
        router.push('/admin');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-md px-4 pt-10 pb-16">
        <h1 className="mb-2 text-2xl font-bold">Church admin login</h1>
        <p className="mb-6 text-sm text-slate-600">
          Log in to manage your pickup dates and view bookings.
        </p>

        <form
          onSubmit={handleSubmit}
          className="space-y-3 rounded-xl border border-slate-200 bg-white p-5"
        >
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

          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-700">
              Password
            </label>
            <input
              type="password"
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
              placeholder="Your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
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
            {loading ? 'Logging in…' : 'Login'}
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
