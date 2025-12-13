// src/components/SiteHeader.tsx
'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/src/lib/supabaseClient';
import Image from 'next/image';


type AuthState = 'loading' | 'loggedIn' | 'loggedOut';

export function SiteHeader() {
  const router = useRouter();

  const [authState, setAuthState] = useState<AuthState>('loading');
  const [churchSlug, setChurchSlug] = useState<string | null>(null);
  const [churchName, setChurchName] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  // Check current user + listen for changes
  useEffect(() => {
    let mounted = true;

    const applyUser = (user: any | null) => {
      if (!user) {
        setChurchSlug(null);
        setChurchName(null);
        setUserEmail(null);
        setAuthState('loggedOut');
        return;
      }

      const meta = user.user_metadata as any;
      setChurchSlug(meta?.church_slug ?? null);
      setChurchName(meta?.church_name ?? null);
      setUserEmail(user.email ?? null);
      setAuthState('loggedIn');
    };

    const loadUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (!mounted) return;
      applyUser(data.user);
    };

    loadUser();

    const { data: sub } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!mounted) return;
        applyUser(session?.user ?? null);
      }
    );

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setAuthState('loggedOut');
    setChurchSlug(null);
    setChurchName(null);
    setUserEmail(null);
    setMenuOpen(false);
    router.push('/');
  };

  const dashboardHref = churchSlug ? `/${churchSlug}/admin` : '/admin';

  const commonLinks = (
    <>
      <Link
        href="/"
        className="block px-3 py-2 text-sm text-slate-700 hover:text-sky-700"
        onClick={() => setMenuOpen(false)}
      >
        Home
      </Link>
      <Link
        href="/book-pickup"
        className="block px-3 py-2 text-sm text-slate-700 hover:text-sky-700"
        onClick={() => setMenuOpen(false)}
      >
        Book a ride
      </Link>
      <Link
        href="/find-booking"
        className="block px-3 py-2 text-sm text-slate-700 hover:text-sky-700"
        onClick={() => setMenuOpen(false)}
      >
        Find my booking
      </Link>
      <Link
        href="/pricing"
        className="block px-3 py-2 text-sm text-slate-700 hover:text-sky-700"
        onClick={() => setMenuOpen(false)}
      >
        Pricing
      </Link>
    </>
  );

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/80 backdrop-blur">
      {/* TOP BAR */}
      <div className="w-full bg-white/80 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4">
          {/* Main row */}
          <div className="flex items-center justify-between py-3">
            {/* Left: Logo */}
            <Link
              href="/"
              className="flex items-center gap-2"
              onClick={() => setMenuOpen(false)}
            >
              <div className="flex h-9 w-9 items-center justify-center">
                <Image
                  src="/logo.png"
                  alt="Ovipoint logo"
                  width={36}
                  height={36}
                  className="object-contain"
                  priority
                />
              </div>

              <div className="flex flex-col leading-tight">
                <span className="text-xl font-bold tracking-tight">Ovipoint</span>
                <span className="hidden text-xs text-slate-500 sm:inline">
                  Pickup booking for churches &amp; groups
                </span>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden items-center gap-8 text-sm md:flex">
              {/* Public Pages */}
              <div className="flex items-center gap-6">
                <Link href="/" className="text-slate-700 hover:text-sky-700">
                  Home
                </Link>
                <Link
                  href="/book-pickup"
                  className="text-slate-700 hover:text-sky-700"
                >
                  Book a ride
                </Link>
                <Link
                  href="/find-booking"
                  className="text-slate-700 hover:text-sky-700"
                >
                  Find my booking
                </Link>
                <Link href="/pricing" className="text-slate-700 hover:text-sky-700">
                  Pricing
                </Link>
              </div>

              {/* Admin Menu Cluster */}
              {authState === 'loggedIn' && churchSlug && (
                <div className="flex items-center gap-3 pl-6 border-l border-slate-200">
                  <Link
                    href={dashboardHref}
                    className="rounded-md border border-slate-300 px-3 py-1.5 hover:bg-slate-100"
                  >
                    Dashboard
                  </Link>

                  <Link
                    href={`/${churchSlug}/admin/events`}
                    className="rounded-md border border-slate-300 px-3 py-1.5 hover:bg-slate-100"
                  >
                    Events
                  </Link>

                  <Link
                    href={`/${churchSlug}/admin/events/new`}
                    className="rounded-md border border-sky-300 px-3 py-1.5 hover:bg-sky-50"
                  >
                    New event
                  </Link>

                  <Link
                    href={`/${churchSlug}/admin/settings`}
                    className="rounded-md border border-slate-300 px-3 py-1.5 hover:bg-slate-100"
                  >
                    Settings
                  </Link>

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="rounded-md bg-slate-900 px-4 py-1.5 text-sm font-semibold text-white hover:bg-slate-800"
                  >
                    Logout
                  </button>
                </div>
              )}

              {/* Logged out */}
              {authState === 'loggedOut' && (
                <div className="flex items-center gap-3 pl-6 border-l border-slate-200">
                  <Link
                    href="/login"
                    className="rounded-md border border-slate-300 px-3 py-1.5 text-slate-800 hover:bg-slate-100"
                  >
                    Login
                  </Link>
                  <Link
                    href="/signup"
                    className="rounded-md bg-sky-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-sky-700"
                  >
                    Get started
                  </Link>
                </div>
              )}
            </nav>

            {/* Mobile hamburger */}
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-md border border-slate-300 px-2 py-1 text-slate-700 hover:bg-slate-100 md:hidden"
              onClick={() => setMenuOpen((open) => !open)}
              aria-label="Toggle navigation"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor">
                {menuOpen ? (
                  <path
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="border-t border-slate-200 bg-white md:hidden">
          <nav className="mx-auto max-w-7xl px-2 py-2">
            {commonLinks}

            {authState === 'loggedIn' && churchSlug && (
              <>
                <Link
                  href={dashboardHref}
                  className="mt-1 block rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 hover:bg-slate-100"
                  onClick={() => setMenuOpen(false)}
                >
                  Dashboard
                </Link>
                <Link
                  href={`/${churchSlug}/admin/events`}
                  className="mt-1 block rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 hover:bg-slate-100"
                  onClick={() => setMenuOpen(false)}
                >
                  Events
                </Link>
                <Link
                  href={`/${churchSlug}/admin/events/new`}
                  className="mt-1 block rounded-md border border-sky-200 px-3 py-2 text-sm text-slate-800 hover:bg-sky-50"
                  onClick={() => setMenuOpen(false)}
                >
                  New event
                </Link>
                <Link
                  href={`/${churchSlug}/admin/settings`}
                  className="mt-1 block rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 hover:bg-slate-100"
                  onClick={() => setMenuOpen(false)}
                >
                  Settings
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="mt-2 block w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  Logout
                </button>
              </>
            )}

            {authState === 'loggedOut' && (
              <>
                <Link
                  href="/login"
                  className="mt-1 block rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 hover:bg-slate-100"
                  onClick={() => setMenuOpen(false)}
                >
                  Login
                </Link>
                <Link
                  href="/signup"
                  className="mt-2 block rounded-md bg-sky-600 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-700"
                  onClick={() => setMenuOpen(false)}
                >
                  Get started
                </Link>
              </>
            )}
          </nav>
        </div>
      )}

      {/* Logged-in strip */}
      {authState === 'loggedIn' && (
        <div className="w-full border-t border-slate-200 bg-slate-50 py-1 text-xs text-slate-600">
          <div className="mx-auto max-w-7xl px-4">
            You're logged in as{' '}
            <span className="font-medium">
              {userEmail ?? 'admin'}
            </span>
            {churchSlug && (
              <>
                {' '}
                · Organisation:{' '}
                <Link
                  href={`/${churchSlug}`}
                  className="font-medium text-sky-700 underline underline-offset-2"
                >
                  {churchName ?? churchSlug}
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
