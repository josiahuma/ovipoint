import { NextResponse } from 'next/server';
import { prisma } from '@/src/lib/prisma';

export const runtime = 'nodejs';

type Body = {
  bookingId: number | string;
  name: string;
  phone: string;
  address: string;
  pickupTime: string; // "HH:MM" or "HH:MM:SS"
  partySize?: number;
};

function toHHMMSS(input: string) {
  const t = String(input || '').trim();
  if (/^\d{2}:\d{2}:\d{2}$/.test(t)) return t;
  if (/^\d{2}:\d{2}$/.test(t)) return `${t}:00`;
  return '';
}

function ymdUTC(d: Date) {
  return d.toISOString().slice(0, 10);
}

function slotDateTimeUTC(eventDate: Date, hhmmss: string) {
  const ymd = ymdUTC(eventDate);
  return new Date(`${ymd}T${hhmmss}.000Z`);
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<Body>;

    const name = String(body.name ?? '').trim();
    const phone = String(body.phone ?? '').trim();
    const address = String(body.address ?? '').trim();
    const partySize = Math.max(1, Number(body.partySize ?? 1));

    let bookingIdBig: bigint;
    try {
      bookingIdBig = BigInt(body.bookingId as any);
    } catch {
      return NextResponse.json({ ok: false, error: 'Invalid bookingId.' }, { status: 400 });
    }

    const hhmmss = toHHMMSS(String(body.pickupTime ?? ''));
    if (!name || !phone || !address || !hhmmss) {
      return NextResponse.json(
        { ok: false, error: 'Please provide name, phone, address and a valid pickup time.' },
        { status: 400 }
      );
    }

    // 1) Load booking + event (need event date + capacity)
    const booking = await prisma.booking.findUnique({
      where: { id: bookingIdBig },
      select: {
        id: true,
        pickupEventId: true,
      },
    });

    if (!booking) {
      return NextResponse.json({ ok: false, error: 'Booking not found.' }, { status: 404 });
    }

    const event = await prisma.pickupEvent.findUnique({
      where: { id: booking.pickupEventId },
      select: {
        id: true,
        pickupDate: true,
        capacity: true,
        bookingsOpen: true,
      },
    });

    if (!event || !event.pickupDate) {
      return NextResponse.json({ ok: false, error: 'Event not found.' }, { status: 404 });
    }

    if (event.bookingsOpen === false) {
      return NextResponse.json(
        { ok: false, error: 'Bookings are currently paused for this event.' },
        { status: 403 }
      );
    }

    const capacityPerSlot = Number(event.capacity ?? 0);
    if (!Number.isFinite(capacityPerSlot) || capacityPerSlot <= 0) {
      return NextResponse.json({ ok: false, error: 'This event has invalid capacity.' }, { status: 400 });
    }

    const newPickupTimeDT = slotDateTimeUTC(new Date(event.pickupDate), hhmmss);

    // 2) Prevent phone duplicates on same event (excluding this booking)
    const dup = await prisma.booking.findFirst({
      where: {
        pickupEventId: event.id,
        phone,
        NOT: { id: booking.id },
      },
      select: { id: true },
    });

    if (dup) {
      return NextResponse.json(
        { ok: false, error: 'Another booking already exists for this event with that phone number.' },
        { status: 409 }
      );
    }

    // 3) Slot capacity check (people sum for that slot, excluding this booking)
    const sameSlotBookings = await prisma.booking.findMany({
      where: {
        pickupEventId: event.id,
        pickupTime: newPickupTimeDT,
        NOT: { id: booking.id },
      },
      select: { partySize: true },
    });

    const used = sameSlotBookings.reduce((sum: number, b: { partySize: number | null }) => {
    return sum + (b.partySize ?? 1);
    }, 0);

    const remaining = Math.max(0, capacityPerSlot - used);

    if (remaining < partySize) {
      return NextResponse.json(
        { ok: false, error: 'That time slot is full for your group size. Please choose another time.' },
        { status: 409 }
      );
    }

    // 4) Update
    await prisma.booking.update({
      where: { id: booking.id },
      data: {
        name,
        phone,
        address,
        pickupTime: newPickupTimeDT,
        partySize,
      },
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error('API ERROR /api/bookings/update', err);
    return NextResponse.json(
      { ok: false, error: 'Unexpected error while updating booking.' },
      { status: 500 }
    );
  }
}
