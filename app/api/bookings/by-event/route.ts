import { NextResponse } from 'next/server';
import { prisma } from '@/src/lib/prisma';

export const runtime = 'nodejs';

type BookingRow = {
  id: bigint;
  pickupTime: Date | string | null;
  partySize: number | null;
};

function pickupTimeToHHMMSS(value: any): string {
  if (!value) return '00:00:00';
  if (value instanceof Date) return value.toISOString().slice(11, 19); // HH:MM:SS
  const s = String(value);
  if (/^\d{2}:\d{2}:\d{2}$/.test(s)) return s;
  if (/^\d{2}:\d{2}$/.test(s)) return `${s}:00`;
  return s.slice(0, 8);
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const eventIdRaw = searchParams.get('eventId');

    if (!eventIdRaw) {
      return NextResponse.json({ ok: false, error: 'Missing eventId.' }, { status: 400 });
    }

    let eventIdBig: bigint;
    try {
      eventIdBig = BigInt(eventIdRaw);
    } catch {
      return NextResponse.json({ ok: false, error: 'Invalid eventId.' }, { status: 400 });
    }

    const bookings = await prisma.booking.findMany({
      where: { pickupEventId: eventIdBig },
      select: { id: true, pickupTime: true, partySize: true },
      orderBy: { pickupTime: 'asc' },
    });

    return NextResponse.json(
      {
        ok: true,
        bookings: bookings.map((b: BookingRow) => ({
          id: Number(b.id),
          pickupTime: pickupTimeToHHMMSS(b.pickupTime),
          partySize: b.partySize ?? 1,
        })),
      },
      { status: 200 }
    );
  } catch (err) {
    console.error('API ERROR /api/bookings/by-event', err);
    return NextResponse.json({ ok: false, error: 'Unexpected error.' }, { status: 500 });
  }
}
