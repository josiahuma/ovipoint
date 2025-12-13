// app/book-pickup/page.tsx
import { OrgSearchBooking } from '@/src/components/OrgSearchBooking';

export default function BookPickupPage() {
  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-3xl px-4 pt-8 pb-16">
        <h1 className="text-2xl font-bold mb-2">Book a pickup</h1>
        <p className="text-sm text-slate-600 mb-6">
          Start by finding your church or organisation. Then choose a pickup
          date and time that works for you.
        </p>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <OrgSearchBooking />
        </div>
      </div>
    </main>
  );
}
