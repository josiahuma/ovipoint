import { NextResponse } from 'next/server';
import { prisma } from '@/src/lib/prisma';
import { getCurrentChurchSession } from '@/src/lib/auth';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const session = await getCurrentChurchSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = (await req.json()) as {
      eventId?: string;
      bookingsOpen?: boolean;
    };

    const eventIdStr = (body.eventId || '').trim();
    if (!eventIdStr) {
      return NextResponse.json({ error: 'Missing eventId' }, { status: 400 });
    }

    const eventId = BigInt(eventIdStr);
    const bookingsOpen = !!body.bookingsOpen;

    // Ensure the event belongs to this church
    const ev = await prisma.pickupEvent.findUnique({
      where: { id: eventId },
      select: { id: true, churchId: true },
    });

    if (!ev) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    if (String(ev.churchId) !== String(session.churchId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await prisma.pickupEvent.update({
      where: { id: eventId },
      data: { bookingsOpen },
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error('API ERROR /api/admin/events/toggle-bookings', err);
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}
