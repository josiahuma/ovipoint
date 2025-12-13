// app/find-booking/page.tsx
import { FindBookingForm } from '@/src/components/FindBookingForm';

export default function FindBookingPage() {
  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-xl px-4 pt-6">
        <h1 className="mb-2 text-2xl font-bold">Find my booking</h1>
        <p className="mb-6 text-sm text-slate-600">
          Search for your church or organisation, choose the service date, and enter
          the phone number you used when booking.
        </p>

        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <FindBookingForm />
        </div>
      </div>
    </main>
  );
}
