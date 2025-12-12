// app/find-booking/page.tsx
import { FindBookingForm } from '@/src/components/FindBookingForm';

export default function FindBookingPage() {
  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-xl px-4 pt-6">
        <h1 className="text-2xl font-bold mb-2">Find my booking</h1>
        <p className="text-slate-600 text-sm mb-6">
          Enter your church, service date, and phone number to view your bus pickup booking.
        </p>

        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <FindBookingForm />
        </div>
      </div>
    </main>
  );
}
