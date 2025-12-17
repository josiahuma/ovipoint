import { NextResponse } from 'next/server';
import { prisma } from '@/src/lib/prisma';

export const runtime = 'nodejs';

type EventResponseRow = {
  id: string; // bigint -> string for JSON safety
  title: string;
  pickup_date: string; // YYYY-MM-DD
  pickup_start_time: string; // HH:MM:SS
  pickup_end_time: string; // HH:MM:SS
  capacity: number;
};

function toYmdUTC(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function toTimeHHMMSS(value: Date | string | null): string {
  if (!value) return '00:00:00';

  // Prisma DateTime => Date
  if (value instanceof Date) {
    return value.toISOString().slice(11, 19); // HH:MM:SS
  }

  // Already a string like "09:00:00"
  if (typeof value === 'string') {
    // normalize to HH:MM:SS
    if (value.length >= 8) return value.slice(0, 8);
    if (value.length === 5) return `${value}:00`;
  }

  return '00:00:00';
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const churchIdStr = (searchParams.get('churchId') || '').trim();

    if (!churchIdStr) {
      return NextResponse.json({ events: [] }, { status: 200 });
    }

    const churchId = BigInt(churchIdStr);

    // ✅ DateTime-safe "today at 00:00:00Z"
    const today = new Date();
    const todayStartUTC = new Date(
      `${toYmdUTC(today)}T00:00:00.000Z`
    );

    const rows: {
      id: bigint;
      title: string;
      pickupDate: Date | null;
      pickupStartTime: Date | string | null;
      pickupEndTime: Date | string | null;
      capacity: number | null;
    }[] = await prisma.pickupEvent.findMany({
      where: {
        churchId,
        pickupDate: {
          gte: todayStartUTC, // ✅ Date, not "YYYY-MM-DD"
        },
      },
      select: {
        id: true,
        title: true,
        pickupDate: true,
        pickupStartTime: true,
        pickupEndTime: true,
        capacity: true,
      },
      orderBy: { pickupDate: 'asc' },
    });

    const safe: EventResponseRow[] = rows.map((e) => ({
      id: String(e.id),
      title: e.title,
      pickup_date: e.pickupDate ? toYmdUTC(e.pickupDate) : '',
      pickup_start_time: toTimeHHMMSS(e.pickupStartTime),
      pickup_end_time: toTimeHHMMSS(e.pickupEndTime),
      capacity: Number(e.capacity ?? 0),
    }));

    return NextResponse.json({ events: safe }, { status: 200 });
  } catch (err) {
    console.error('API ERROR /api/events/by-church', err);
    return NextResponse.json({ events: [] }, { status: 200 });
  }
}
