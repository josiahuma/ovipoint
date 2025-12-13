// app/pricing/page.tsx
export default function PricingPage() {
  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-5xl px-4 pt-10 pb-16">
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight mb-2">
            Simple pricing for growing churches &amp; groups
          </h1>
          <p className="text-sm text-slate-600 max-w-2xl mx-auto">
            Start free, then upgrade when your bus pickups grow. No contracts,
            cancel anytime.
          </p>
        </header>

        <div className="grid gap-5 md:grid-cols-3">
          {/* Free */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 flex flex-col">
            <h2 className="text-base font-semibold mb-1">Starter</h2>
            <p className="text-sm text-slate-600 mb-4">
              Perfect for a single bus or small church.
            </p>
            <p className="mb-4 text-2xl font-bold">Free</p>
            <ul className="mb-6 flex-1 space-y-2 text-sm text-slate-700">
              <li>• 1 organisation space</li>
              <li>• Unlimited pickup events</li>
              <li>• Up to 100 bookings / month</li>
              <li>• Basic email support</li>
            </ul>
            <button className="w-full rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-100">
              Start on Starter
            </button>
          </div>

          {/* Church Plus */}
          <div className="rounded-xl border border-sky-400 bg-sky-50 p-5 shadow-sm flex flex-col">
            <h2 className="text-base font-semibold mb-1">Church Plus</h2>
            <p className="text-sm text-slate-600 mb-4">
              For churches running regular Sunday buses.
            </p>
            <p className="mb-1 text-2xl font-bold">£9.99</p>
            <p className="mb-4 text-xs text-slate-500">per month, per church</p>
            <ul className="mb-6 flex-1 space-y-2 text-sm text-slate-700">
              <li>• Everything in Starter</li>
              <li>• Up to 1,000 bookings / month</li>
              <li>• SMS alerts to admin mobile</li>
              <li>• Priority email support</li>
            </ul>
            <button className="w-full rounded-md bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700">
              Upgrade to Church Plus
            </button>
          </div>

          {/* Multi-site */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 flex flex-col">
            <h2 className="text-base font-semibold mb-1">Multi-site</h2>
            <p className="text-sm text-slate-600 mb-4">
              For networks, schools or organisations with multiple locations.
            </p>
            <p className="mb-4 text-2xl font-bold">Talk to us</p>
            <ul className="mb-6 flex-1 space-y-2 text-sm text-slate-700">
              <li>• Multiple organisation spaces</li>
              <li>• Higher booking limits</li>
              <li>• Dedicated onboarding</li>
              <li>• Custom reporting options</li>
            </ul>
            <button className="w-full rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-100">
              Contact sales
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
