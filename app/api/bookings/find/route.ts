import { NextResponse } from 'next/server';
import { prisma } from '@/src/lib/prisma';

export const runtime = 'nodejs';

type Body = {
  churchId: number | string;
  pickupDate: string; // "YYYY-MM-DD" from <input type="date" />
  phone: string;
};

function normalizePhone(input: string) {
  return String(input || '').trim();
}

function dayRangeUTC(ymd: string) {
  const start = new Date(`${ymd}T00:00:00.000Z`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
}

// ✅ type-guard helper for filter()
function notNull<T>(value: T | null): value is T {
  return value !== null;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<Body>;

    const phone = normalizePhone(body.phone || '');
    const pickupDate = String(body.pickupDate || '').trim();

    let churchIdBig: bigint;
    try {
      churchIdBig = BigInt(body.churchId as any);
    } catch {
      return NextResponse.json({ error: 'Invalid churchId.' }, { status: 400 });
    }

    if (!phone || !pickupDate) {
      return NextResponse.json(
        { error: 'Missing phone or pickupDate.' },
        { status: 400 }
      );
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(pickupDate)) {
      return NextResponse.json(
        { error: 'pickupDate must be YYYY-MM-DD.' },
        { status: 400 }
      );
    }

    const { start, end } = dayRangeUTC(pickupDate);

    const events = await prisma.pickupEvent.findMany({
      where: {
        churchId: churchIdBig,
        pickupDate: { gte: start, lt: end },
      },
      select: {
        id: true,
        churchId: true,
        title: true,
        pickupDate: true,
        capacity: true,
        pickupStartTime: true,
        pickupEndTime: true,
        intervalMinutes: true,
      },
      orderBy: { pickupDate: 'asc' },
    });

    if (events.length === 0) {
      return NextResponse.json({ results: [], church: null }, { status: 200 });
    }

    // ✅ typed param
    const eventIds = events.map((e: (typeof events)[number]) => e.id);

    const bookings = await prisma.booking.findMany({
      where: {
        pickupEventId: { in: eventIds },
        phone,
      },
      select: {
        id: true,
        pickupEventId: true,
        name: true,
        phone: true,
        address: true,
        pickupTime: true,
        partySize: true,
      },
      orderBy: { pickupTime: 'asc' },
    });

    const eventMap = new Map<string, (typeof events)[number]>();
    for (const ev of events) eventMap.set(String(ev.id), ev);

    const results = bookings
      .map((b: (typeof bookings)[number]) => {
        const ev = eventMap.get(String(b.pickupEventId));
        if (!ev) return null;

        return {
          booking: {
            id: Number(b.id),
            pickupEventId: Number(b.pickupEventId),
            name: b.name,
            phone: b.phone,
            address: b.address,
            pickupTime:
              b.pickupTime instanceof Date
                ? b.pickupTime.toISOString().slice(11, 19)
                : String(b.pickupTime).slice(0, 8),
            partySize: b.partySize ?? 1,
          },
          event: {
            id: Number(ev.id),
            churchId: Number(ev.churchId),
            title: ev.title,
            pickupDate: ev.pickupDate
              ? ev.pickupDate.toISOString().slice(0, 10)
              : pickupDate,
            capacity: ev.capacity ?? 0,
            pickupStartTime:
              ev.pickupStartTime instanceof Date
                ? ev.pickupStartTime.toISOString().slice(11, 19)
                : String(ev.pickupStartTime).slice(0, 8),
            pickupEndTime:
              ev.pickupEndTime instanceof Date
                ? ev.pickupEndTime.toISOString().slice(11, 19)
                : String(ev.pickupEndTime).slice(0, 8),
            intervalMinutes: ev.intervalMinutes ?? 0,
          },
        };
      })
      .filter(notNull); // ✅ proper narrowing

    return NextResponse.json({ results, church: null }, { status: 200 });
  } catch (err) {
    console.error('API ERROR /api/bookings/find', err);
    return NextResponse.json(
      { error: 'Unexpected error while searching.' },
      { status: 500 }
    );
  }
}
