// app/api/bookings/create/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/src/lib/prisma';

export const runtime = 'nodejs';

type Body = {
  eventId: number | string;
  name: string;
  phone: string;
  address: string;
  pickupTime: string; // "HH:MM" (or "HH:MM:SS")
  partySize?: number;
};

function normalizePhone(input: string) {
  return input.trim();
}

function toHHMMSS(input: string) {
  const t = input.trim();
  if (/^\d{2}:\d{2}:\d{2}$/.test(t)) return t;
  if (/^\d{2}:\d{2}$/.test(t)) return `${t}:00`;
  return '00:00:00';
}

function ymdUTC(d: Date) {
  return d.toISOString().slice(0, 10);
}

function slotDateTimeUTC(eventDate: Date, hhmmss: string) {
  // Store pickupTime as a DateTime using the event's date + selected time (UTC)
  const ymd = ymdUTC(eventDate);
  return new Date(`${ymd}T${hhmmss}.000Z`);
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;

    const name = (body.name || '').trim();
    const phone = normalizePhone(body.phone || '');
    const address = (body.address || '').trim();
    const partySize = Math.max(1, Number(body.partySize ?? 1));

    let eventIdBig: bigint;
    try {
      eventIdBig = BigInt(body.eventId as any);
    } catch {
      return NextResponse.json({ ok: false, error: 'Invalid event.' }, { status: 400 });
    }

    if (!name || !phone || !address) {
      return NextResponse.json(
        { ok: false, error: 'Please fill in name, phone, and address.' },
        { status: 400 }
      );
    }

    // Load event
    const event = await prisma.pickupEvent.findUnique({
      where: { id: eventIdBig },
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

    // If bookingsOpen is explicitly false, block bookings
    if (event.bookingsOpen === false) {
      return NextResponse.json(
        { ok: false, error: 'Bookings are currently paused for this event.' },
        { status: 403 }
      );
    }

    // Prevent booking in the past (simple date check)
    const todayStr = ymdUTC(new Date());
    const eventStr = ymdUTC(new Date(event.pickupDate));
    if (eventStr < todayStr) {
      return NextResponse.json({ ok: false, error: 'This pickup date has passed.' }, { status: 403 });
    }

    const hhmmss = toHHMMSS(body.pickupTime || '');
    const pickupTimeDT = slotDateTimeUTC(new Date(event.pickupDate), hhmmss);

    // 1) Duplicate check (same event + phone)
    const existingForPhone = await prisma.booking.findFirst({
      where: {
        pickupEventId: event.id,
        phone: phone,
      },
      select: { id: true },
    });

    if (existingForPhone) {
      return NextResponse.json(
        { ok: false, error: 'You already have a booking for this pickup date using that phone number.' },
        { status: 409 }
      );
    }

    // 2) Slot capacity check (people, not bookings)
    const slotBookings = await prisma.booking.findMany({
      where: {
        pickupEventId: event.id,
        pickupTime: pickupTimeDT,
      },
      select: { partySize: true },
    });

    let used = 0;
      for (const b of slotBookings) {
        used += b.partySize ?? 1;
      }

    const capacityPerSlot = Number(event.capacity ?? 0);
    const remaining = Math.max(0, capacityPerSlot - used);

    if (capacityPerSlot <= 0) {
      return NextResponse.json({ ok: false, error: 'This event has invalid capacity.' }, { status: 400 });
    }

    if (remaining < partySize) {
      return NextResponse.json(
        { ok: false, error: 'That time slot is full for your group size. Please choose another time.' },
        { status: 409 }
      );
    }

    // 3) Insert
    const created = await prisma.booking.create({
      data: {
        pickupEventId: event.id,
        name,
        phone,
        address,
        pickupTime: pickupTimeDT,
        partySize,
      },
      select: { id: true },
    });

    return NextResponse.json(
      {
        ok: true,
        bookingId: String(created.id),
      },
      { status: 200 }
    );
  } catch (err) {
    console.error('API ERROR /api/bookings/create', err);
    return NextResponse.json(
      { ok: false, error: 'Unexpected error while saving booking.' },
      { status: 500 }
    );
  }
}
