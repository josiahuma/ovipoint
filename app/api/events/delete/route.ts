// app/api/events/delete/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/src/lib/prisma';
import type { Prisma } from '@prisma/client';

type DeleteEventBody = {
  eventId: number | string;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<DeleteEventBody>;
    const eventIdRaw = body.eventId;

    if (!eventIdRaw) {
      return NextResponse.json({ error: 'Missing eventId.' }, { status: 400 });
    }

    const eventId = BigInt(Number(eventIdRaw));

    const ev = await prisma.pickupEvent.findUnique({
      where: { id: eventId },
      select: { id: true },
    });

    if (!ev) {
      return NextResponse.json({ error: 'Event not found.' }, { status: 404 });
    }

    // Delete bookings first (FK safe), then delete event
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.booking.deleteMany({
        where: { pickupEventId: eventId },
      });

      await tx.pickupEvent.delete({
        where: { id: eventId },
      });
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err: unknown) {
    console.error('API ERROR /api/events/delete', err);
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}
