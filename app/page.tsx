// app/page.tsx
import Link from 'next/link';

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-slate-50">
      {/* Hero */}
      <section className="border-b border-slate-200 bg-gradient-to-b from-sky-50 to-slate-50">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10 lg:flex-row lg:items-center">
          <div className="flex-1 space-y-4">
            <span className="inline-flex items-center rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700">
              New • Multi-church bus pickup platform
            </span>

            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
              Run church bus pickups without spreadsheets or WhatsApp chaos.
            </h1>

            <p className="text-sm text-slate-700 sm:text-base">
              <strong>Ovipoint</strong> gives every church its own branded link
              to manage Sunday service and event pickups. Members choose a
              pickup time, you see confirmed routes and capacity in one place.
            </p>

            <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center">
              <a
                href="#get-started"
                className="inline-flex items-center justify-center rounded-md bg-sky-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-sky-700"
              >
                Get your church started
              </a>
              <Link
                href="/find-booking"
                className="inline-flex items-center justify-center rounded-md border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-100"
              >
                I&apos;m a member – find my booking
              </Link>
            </div>

            <p className="text-xs text-slate-500">
              No app download required. Each church gets a simple URL like{' '}
              <span className="font-mono text-[11px] bg-slate-100 px-1 py-0.5 rounded">
                ovipoint.com/fresh-fountain
              </span>
              .
            </p>
          </div>

          <div className="flex-1">
            <div className="mx-auto max-w-md rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase text-slate-500 mb-2">
                Live church example
              </p>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between rounded border border-slate-200 bg-slate-50 px-3 py-2">
                  <div>
                    <p className="font-semibold text-slate-800">
                      Fresh Fountain Church
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Sunday 10:00am service
                    </p>
                  </div>
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200">
                    12 / 18 seats
                  </span>
                </div>
                <div className="rounded border border-slate-200 px-3 py-2">
                  <p className="text-[11px] font-semibold text-slate-600 mb-1">
                    Member booking flow
                  </p>
                  <ol className="list-decimal pl-4 space-y-1 text-[11px] text-slate-700">
                    <li>Open your church&apos;s Ovipoint link</li>
                    <li>Pick your service date</li>
                    <li>Select a pickup time slot</li>
                    <li>Enter name, phone &amp; pickup location</li>
                    <li>Receive SMS confirmation</li>
                  </ol>
                </div>
                <p className="text-[11px] text-slate-500">
                  Ovipoint takes care of capacity, duplicate slots, and driver
                  pickup lists – so your team can focus on ministry.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-10">
          <h2 className="text-xl font-semibold mb-3">
            How Ovipoint works for churches
          </h2>
          <p className="text-sm text-slate-600 mb-6 max-w-2xl">
            Ovipoint is built specifically for church transport teams. Each
            church gets a private space with its own pickup dates, time slots
            and bookings.
          </p>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="mb-2 text-xs font-semibold text-sky-700">
                1. Create your church space
              </div>
              <p className="text-sm text-slate-700">
                Sign up your church once. We give you a clean URL like{' '}
                <span className="font-mono text-xs bg-white px-1 rounded">
                  ovipoint.com/your-church
                </span>{' '}
                that only shows your pickup events.
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="mb-2 text-xs font-semibold text-sky-700">
                2. Add pickup dates &amp; time slots
              </div>
              <p className="text-sm text-slate-700">
                Set Sunday services or special events with capacity, pickup
                windows and intervals (e.g. every 10–15 minutes).
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="mb-2 text-xs font-semibold text-sky-700">
                3. Members book &amp; you get clear lists
              </div>
              <p className="text-sm text-slate-700">
                Members book their pickup. Your team sees addresses, contact
                numbers and times in one driver-friendly view.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* For admins + members */}
      <section className="border-b border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-10 grid gap-6 md:grid-cols-2">
          <div>
            <h3 className="text-lg font-semibold mb-2">
              For church admins &amp; transport teams
            </h3>
            <ul className="space-y-2 text-sm text-slate-700">
              <li>• Create pickup events across multiple Sundays</li>
              <li>• Set capacity and time slot intervals</li>
              <li>• Pause / resume bookings when buses are full</li>
              <li>• See all bookings with phone and map-ready address links</li>
              <li>• Receive SMS alerts when new bookings are made</li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">
              For members &amp; families
            </h3>
            <ul className="space-y-2 text-sm text-slate-700">
              <li>• Simple link – no app store, no login required</li>
              <li>• Choose a pickup time that works for you</li>
              <li>• Edit or cancel your booking via &ldquo;Find my booking&rdquo;</li>
              <li>• Receive SMS confirmation and updates</li>
            </ul>

            <div className="mt-4 rounded-lg border border-sky-100 bg-sky-50 px-3 py-2 text-xs text-sky-800">
              Already a member of a church using Ovipoint?{' '}
              <Link
                href="/find-booking"
                className="font-semibold underline underline-offset-2"
              >
                Find your booking here
              </Link>
              .
            </div>
          </div>
        </div>
      </section>

      {/* Get started CTA for churches */}
      <section
        id="get-started"
        className="border-b border-slate-200 bg-white"
      >
        <div className="mx-auto max-w-4xl px-4 py-10">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 md:p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="max-w-xl">
                <h2 className="text-xl font-semibold mb-1">
                  Get your church started with Ovipoint
                </h2>
                <p className="text-sm text-slate-600 mb-3">
                  Fill in a few details and we&apos;ll set up your church space
                  with a unique URL. You can immediately create pickup events
                  and share the link with your members.
                </p>
                <p className="text-xs text-slate-500">
                  (In the next step we&apos;ll connect this form directly to
                  Supabase to automatically create your church record and slug.)
                </p>
              </div>

              <form className="w-full max-w-sm space-y-3">

                <div className="space-y-1">
                  <label className="block text-xs font-medium text-slate-700">
                    Church name
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                    placeholder="e.g. Fresh Fountain Church"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-medium text-slate-700">
                    Preferred church URL
                  </label>
                  <div className="flex rounded border border-slate-300 bg-white text-sm">
                    <span className="inline-flex items-center px-2 text-slate-500 border-r border-slate-200">
                      ovipoint.com/
                    </span>
                    <input
                      type="text"
                      required
                      className="flex-1 px-2 py-2 outline-none"
                      placeholder="fresh-fountain"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Lowercase letters, numbers and dashes only.
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-medium text-slate-700">
                    Contact email
                  </label>
                  <input
                    type="email"
                    required
                    className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                    placeholder="transport@yourchurch.org"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-medium text-slate-700">
                    Admin mobile (for SMS alerts)
                  </label>
                  <input
                    type="tel"
                    className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                    placeholder="e.g. 07123 456789"
                  />
                </div>

                <button
                  type="button"
                  className="w-full rounded-md bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700"
                >
                  Request church space
                </button>


                <p className="text-[11px] text-slate-500">
                  We&apos;ll review your details and send setup information to
                  your contact email.
                </p>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Tiny footer */}
      <footer className="bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-6 text-xs text-slate-500 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Ovipoint. Built for church transport teams.</p>
          <p>
            Already using Ovipoint? Use your church link like{' '}
            <span className="font-mono text-[11px] bg-slate-100 px-1 py-0.5 rounded">
              ovipoint.com/fresh-fountain
            </span>
          </p>
        </div>
      </footer>
    </main>
  );
}
