// app/page.tsx
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentChurchSession } from "@/src/lib/auth";

export const dynamic = "force-dynamic";


export default async function LandingPage() {
  // ✅ Session guard (no params needed on /)
  const session = await getCurrentChurchSession();
  const isLoggedIn = !!session;

  // If logged in, send them to THEIR dashboard (best UX)
  // If you prefer to show the homepage with the button changed, remove this redirect.
  // redirect(`/${session.slug}/admin`);

  return (
    <main className="min-h-screen bg-slate-50">
      {/* Hero */}
      <section className="border-b border-slate-200 bg-gradient-to-b from-sky-50 to-slate-50">
        <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-10 lg:flex-row lg:items-center">
          {/* Copy side */}
          <div className="flex-1 space-y-4">
            <span className="inline-flex items-center rounded-full bg-sky-100 px-3 py-1 text-sm font-semibold text-sky-700">
              New • pickup booking service for churches &amp; groups
            </span>

            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
              Let Ovipoint organise your local community pickups.
            </h1>

            <p className="text-sm text-slate-700 sm:text-base">
              <strong>Ovipoint</strong> gives every church, school or community
              group its own branded link for bus pickups. People choose a time
              slot, you see confirmed routes and capacity in one simple view.
            </p>

            <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center">
              {!isLoggedIn ? (
                <Link
                  href="/signup"
                  className="inline-flex items-center justify-center rounded-md bg-sky-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-sky-700"
                >
                  Get your organisation started
                </Link>
              ) : (
                <Link
                  href={`/${session!.slug}/admin`}
                  className="inline-flex items-center justify-center rounded-md bg-slate-900 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
                >
                  Go to dashboard
                </Link>
              )}

              <Link
                href="/book-pickup"
                className="inline-flex items-center justify-center rounded-md border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-100"
              >
                I&apos;m a passenger – book my pickup
              </Link>
            </div>

            {isLoggedIn && (
              <p className="text-sm text-slate-600">
                You&apos;re logged in. To create another organisation, log out first.
              </p>
            )}

            <p className="text-sm text-slate-500">
              No app download required. Each organisation gets a simple URL like{" "}
              <span className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[11px]">
                ovipoint.com/my-organisation
              </span>
              .
            </p>
          </div>

          {/* Image side */}
          <div className="flex-1">
            <div className="relative mx-auto h-60 w-full max-w-xl overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-sm sm:h-72 lg:h-80">
              <Image
                src="/ovipoint-hero-bus.jpg"
                alt="Passengers waiting at a bus stop while a minibus arrives"
                fill
                priority
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-10">
          <h2 className="mb-3 text-xl font-semibold">
            How Ovipoint works for transport teams
          </h2>
          <p className="mb-6 max-w-2xl text-sm text-slate-600">
            Ovipoint is built for Sunday services, youth nights, conferences and
            school shuttles. Each organisation has its own space with pickup
            dates, time slots and bookings.
          </p>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="mb-2 text-sm font-semibold text-sky-700">
                1. Create your space
              </div>
              <p className="text-sm text-slate-700">
                Sign up once, choose a URL like{' '}
                <span className="rounded bg-white px-1 font-mono text-sm">
                  ovipoint.com/your-church
                </span>{' '}
                and keep pickups for your community only.
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="mb-2 text-sm font-semibold text-sky-700">
                2. Add pickup dates &amp; slots
              </div>
              <p className="text-sm text-slate-700">
                Create recurring services and events with capacity, pickup
                windows and intervals (e.g. every 10–20 minutes).
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="mb-2 text-sm font-semibold text-sky-700">
                3. Riders book – you get clean lists
              </div>
              <p className="text-sm text-slate-700">
                Riders book their time. Your team gets phone numbers, addresses
                and time slots ready for drivers.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Admin vs riders */}
      <section className="border-b border-slate-200 bg-slate-50">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 md:grid-cols-2">
          <div>
            <h3 className="mb-2 text-lg font-semibold">
              For admins &amp; coordinators
            </h3>
            <ul className="space-y-2 text-sm text-slate-700">
              <li>• Create pickup events across multiple Sundays and dates</li>
              <li>• Set capacity and slot intervals per event</li>
              <li>• Pause / resume bookings when routes are full</li>
              <li>• View bookings with click-to-call and map links</li>
              <li>• Optional SMS alerts when new bookings arrive</li>
            </ul>
          </div>

          <div>
            <h3 className="mb-2 text-lg font-semibold">
              For riders &amp; families
            </h3>
            <ul className="space-y-2 text-sm text-slate-700">
              <li>• Simple web link – no app store, no login required</li>
              <li>• Choose a pickup time that works for you</li>
              <li>• Edit or cancel bookings via &ldquo;Find my booking&rdquo;</li>
              <li>• Get SMS or email confirmations</li>
            </ul>

            <div className="mt-4 rounded-lg border border-sky-100 bg-sky-50 px-3 py-2 text-sm text-sky-800">
              Already using Ovipoint?{' '}
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

      {/* Tiny footer */}
      <footer className="bg-slate-50">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} Ovipoint. Built to simplify bus
            pickups.
          </p>
          <p>
            Already onboarded? Use your church link like{' '}
            <span className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[11px]">
              ovipoint.com/my-organisation
            </span>
            .
          </p>
        </div>
      </footer>
    </main>
  );
}
