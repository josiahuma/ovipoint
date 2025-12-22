import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/src/lib/prisma";
import { getCurrentChurchSession } from "@/src/lib/auth";

type PageProps = {
  params: Promise<{ churchSlug: string; bookingId: string }>;
};

function formatDate(value: Date | null | undefined): string {
  if (!value) return "No date";
  return value.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function toHHMM(value: Date | string | null | undefined): string {
  if (!value) return "00:00";
  if (value instanceof Date) return value.toISOString().slice(11, 16);
  if (typeof value === "string") return value.slice(0, 5);
  return "00:00";
}

function mapsUrl(address: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

function wazeUrl(address: string) {
  return `https://waze.com/ul?q=${encodeURIComponent(address)}&navigate=yes`;
}

export default async function BookingDetailPage({ params }: PageProps) {
  const { churchSlug, bookingId } = await params;

  // 🔒 Session guard
  const session = await getCurrentChurchSession();
  if (!session) redirect(`/login?slug=${churchSlug}`);
  if (session.slug !== churchSlug) redirect(`/${session.slug}/admin`);

  const church = await prisma.church.findUnique({
    where: { slug: churchSlug },
    select: { id: true, name: true, slug: true },
  });
  if (!church) return notFound();

  const booking = await prisma.booking.findUnique({
    where: { id: BigInt(bookingId) },
    select: {
      id: true,
      pickupEventId: true,
      name: true,
      phone: true,
      address: true,
      pickupTime: true,
      partySize: true,
    },
  });

  if (!booking) return notFound();

  // Make sure booking belongs to this church (via event)
  const ev = await prisma.pickupEvent.findUnique({
    where: { id: booking.pickupEventId },
    select: { id: true, churchId: true, title: true, pickupDate: true },
  });

  if (!ev || ev.churchId !== church.id) return notFound();

  const size = booking.partySize ?? 1;
  const time = toHHMM(booking.pickupTime);

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-3xl px-4 pt-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Booking details</h1>
            <p className="text-sm text-slate-600">
              {ev.title} · {formatDate(ev.pickupDate)} · {time}
            </p>
          </div>

          <Link
            href={`/${church.slug}/admin`}
            className="text-sm text-sky-700 hover:underline"
          >
            ← Back to dashboard
          </Link>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-2">
          <div>
            <p className="text-xs text-slate-500">Name</p>
            <p className="font-semibold">{booking.name}</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-xs text-slate-500">Phone</p>
              <a className="text-sky-700 hover:underline" href={`tel:${booking.phone}`}>
                {booking.phone}
              </a>
            </div>

            <div>
              <p className="text-xs text-slate-500">Party size</p>
              <p className="font-semibold">{size}</p>
            </div>
          </div>

          <div>
            <p className="text-xs text-slate-500">Pickup address</p>
            <p className="text-slate-800">{booking.address}</p>

            <div className="mt-2 flex flex-wrap gap-2">
              <a
                href={mapsUrl(booking.address)}
                target="_blank"
                rel="noreferrer"
                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs hover:bg-slate-100"
              >
                Open in Google Maps
              </a>
              <a
                href={wazeUrl(booking.address)}
                target="_blank"
                rel="noreferrer"
                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs hover:bg-slate-100"
              >
                Open in Waze
              </a>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
