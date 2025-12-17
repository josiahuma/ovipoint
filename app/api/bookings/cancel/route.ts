import { NextResponse } from 'next/server';
import { prisma } from '@/src/lib/prisma';

export const runtime = 'nodejs';

type Body = {
  bookingId: number | string;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<Body>;

    let bookingIdBig: bigint;
    try {
      bookingIdBig = BigInt(body.bookingId as any);
    } catch {
      return NextResponse.json({ ok: false, error: 'Invalid bookingId.' }, { status: 400 });
    }

    const existing = await prisma.booking.findUnique({
      where: { id: bookingIdBig },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ ok: false, error: 'Booking not found.' }, { status: 404 });
    }

    await prisma.booking.delete({
      where: { id: bookingIdBig },
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error('API ERROR /api/bookings/cancel', err);
    return NextResponse.json({ ok: false, error: 'Unexpected error while cancelling booking.' }, { status: 500 });
  }
}
