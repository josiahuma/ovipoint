// app/api/admin/events/create/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/src/lib/prisma';
import { getCurrentChurchSession } from '@/src/lib/auth';

export const runtime = 'nodejs';

type Body = {
  churchId?: string; // sent from client (we still verify)
  title: string;
  dates: string[]; // ["YYYY-MM-DD", ...]
  capacity: number;
  pickupStartTime: string; // "HH:MM" or "HH:MM:SS"
  pickupEndTime: string;   // "HH:MM" or "HH:MM:SS"
  intervalMinutes: number;
};

function normalizeTimeToHHMMSS(t: string): string {
  const s = (t || '').trim();
  if (!s) return '';
  if (/^\d{2}:\d{2}$/.test(s)) return `${s}:00`;
  if (/^\d{2}:\d{2}:\d{2}$/.test(s)) return s;
  return '';
}

// Build a real ISO datetime from date + time (UTC)
function toUtcDateTime(dateIso: string, timeHHMMSS: string): Date {
  // e.g. "2025-12-21T09:00:00.000Z"
  return new Date(`${dateIso}T${timeHHMMSS}.000Z`);
}

export async function POST(req: Request) {
  try {
    const session = await getCurrentChurchSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = (await req.json()) as Body;

    const churchId = String(body.churchId ?? '').trim();
    const title = String(body.title ?? '').trim();
    const dates = Array.isArray(body.dates) ? body.dates : [];
    const capacity = Number(body.capacity);
    const intervalMinutes = Number(body.intervalMinutes);

    const startHHMMSS = normalizeTimeToHHMMSS(body.pickupStartTime);
    const endHHMMSS = normalizeTimeToHHMMSS(body.pickupEndTime);

    if (!churchId || !title || dates.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // ✅ Security check: must match logged in church
    if (String(session.churchId) !== String(churchId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!Number.isFinite(capacity) || capacity <= 0) {
      return NextResponse.json({ error: 'Capacity must be a positive number' }, { status: 400 });
    }

    if (!Number.isFinite(intervalMinutes) || intervalMinutes <= 0) {
      return NextResponse.json({ error: 'Interval must be a positive number' }, { status: 400 });
    }

    if (!startHHMMSS || !endHHMMSS) {
      return NextResponse.json(
        { error: 'Start/end time must be HH:MM or HH:MM:SS' },
        { status: 400 }
      );
    }

    // Validate end > start
    const [sH, sM] = startHHMMSS.split(':').map(Number);
    const [eH, eM] = endHHMMSS.split(':').map(Number);
    const startTotal = sH * 60 + sM;
    const endTotal = eH * 60 + eM;
    if (endTotal <= startTotal) {
      return NextResponse.json(
        { error: 'Pickup end time must be after start time' },
        { status: 400 }
      );
    }

    // ✅ Convert to BigInt once
    const churchIdBig = BigInt(churchId);

    // ✅ Create events (IMPORTANT: pickupStartTime/pickupEndTime are DateTime in Prisma)
    await prisma.pickupEvent.createMany({
      data: dates.map((d) => {
        const dateIso = String(d).slice(0, 10); // "YYYY-MM-DD"
        return {
          churchId: churchIdBig,
          title,
          pickupDate: new Date(`${dateIso}T00:00:00.000Z`),
          capacity,
          pickupStartTime: toUtcDateTime(dateIso, startHHMMSS),
          pickupEndTime: toUtcDateTime(dateIso, endHHMMSS),
          intervalMinutes,
        };
      }),
    });

    // Fetch created IDs for share links
    const rows: { id: bigint }[] = await prisma.pickupEvent.findMany({
      where: {
        churchId: churchIdBig,
        title,
        pickupDate: {
          in: dates.map((d) => new Date(`${String(d).slice(0, 10)}T00:00:00.000Z`)),
        },
      },
      select: { id: true },
      orderBy: { pickupDate: 'asc' },
    });

    return NextResponse.json({
      ok: true,
      createdCount: rows.length,
      createdIds: rows.map((r) => String(r.id)),
    });
  } catch (err) {
    console.error('API ERROR /api/admin/events/create', err);
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}
