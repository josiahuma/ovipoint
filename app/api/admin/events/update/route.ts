// app/api/admin/events/update/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/src/lib/prisma';

export const runtime = 'nodejs';

type Body = {
  eventId: number | string;
  churchId?: number | string; // optional (if you send it)
  title: string;
  pickupDate: string; // "YYYY-MM-DD"
  capacity: number | string;
  pickupStartTime: string; // "HH:MM" or "HH:MM:SS"
  pickupEndTime: string;   // "HH:MM" or "HH:MM:SS"
  intervalMinutes: number | string;
};

function toHHMMSS(input: string) {
  const t = String(input || '').trim();
  if (/^\d{2}:\d{2}:\d{2}$/.test(t)) return t;
  if (/^\d{2}:\d{2}$/.test(t)) return `${t}:00`;
  return '';
}

function isYMD(input: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(input || '').trim());
}

function ymdUTC(d: Date) {
  return d.toISOString().slice(0, 10);
}

function dateTimeFromYMDAndTimeUTC(ymd: string, hhmmss: string) {
  // Example: "2025-12-21" + "09:00:00" => Date("2025-12-21T09:00:00.000Z")
  return new Date(`${ymd}T${hhmmss}.000Z`);
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<Body>;

    const title = String(body.title ?? '').trim();
    const pickupDateStr = String(body.pickupDate ?? '').trim();

    const capacity = Number(body.capacity);
    const intervalMinutes = Number(body.intervalMinutes);

    const startHHMMSS = toHHMMSS(String(body.pickupStartTime ?? ''));
    const endHHMMSS = toHHMMSS(String(body.pickupEndTime ?? ''));

    // Validate IDs
    let eventIdBig: bigint;
    try {
      eventIdBig = BigInt(body.eventId as any);
    } catch {
      return NextResponse.json({ ok: false, error: 'Invalid eventId.' }, { status: 400 });
    }

    if (!title) {
      return NextResponse.json({ ok: false, error: 'Event title is required.' }, { status: 400 });
    }

    if (!isYMD(pickupDateStr)) {
      return NextResponse.json({ ok: false, error: 'pickupDate must be YYYY-MM-DD.' }, { status: 400 });
    }

    if (!startHHMMSS || !endHHMMSS) {
      return NextResponse.json(
        { ok: false, error: 'Start and end time must be HH:MM or HH:MM:SS.' },
        { status: 400 }
      );
    }

    if (!Number.isFinite(capacity) || capacity <= 0) {
      return NextResponse.json({ ok: false, error: 'Capacity must be a number greater than 0.' }, { status: 400 });
    }

    if (!Number.isFinite(intervalMinutes) || intervalMinutes <= 0) {
      return NextResponse.json(
        { ok: false, error: 'Interval minutes must be a number greater than 0.' },
        { status: 400 }
      );
    }

    // Convert to real DateTime values for Prisma DateTime fields
    const pickupDate = new Date(`${pickupDateStr}T00:00:00.000Z`);
    const pickupStartTimeDT = dateTimeFromYMDAndTimeUTC(pickupDateStr, startHHMMSS);
    const pickupEndTimeDT = dateTimeFromYMDAndTimeUTC(pickupDateStr, endHHMMSS);

    // Basic sanity: end must be after start
    if (pickupEndTimeDT.getTime() <= pickupStartTimeDT.getTime()) {
      return NextResponse.json(
        { ok: false, error: 'Pickup end time must be after pickup start time.' },
        { status: 400 }
      );
    }

    // (Optional) If the date is invalid for any reason
    if (Number.isNaN(pickupDate.getTime())) {
      return NextResponse.json({ ok: false, error: 'Invalid pickupDate.' }, { status: 400 });
    }

    // Make sure the event exists first
    const existing = await prisma.pickupEvent.findUnique({
      where: { id: eventIdBig },
      select: { id: true, pickupDate: true },
    });

    if (!existing) {
      return NextResponse.json({ ok: false, error: 'Event not found.' }, { status: 404 });
    }

    // Update event
    await prisma.pickupEvent.update({
      where: { id: eventIdBig },
      data: {
        title,
        pickupDate,
        capacity,
        pickupStartTime: pickupStartTimeDT,
        pickupEndTime: pickupEndTimeDT,
        intervalMinutes,
      },
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error('API ERROR /api/admin/events/update', err);
    return NextResponse.json(
      { ok: false, error: 'Unexpected error while updating event.' },
      { status: 500 }
    );
  }
}
