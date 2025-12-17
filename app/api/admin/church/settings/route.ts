import { NextResponse } from 'next/server';
import { prisma } from '@/src/lib/prisma';
import { getCurrentChurchSession } from '@/src/lib/auth';

export async function POST(req: Request) {
  try {
    const session = await getCurrentChurchSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await req.json();
    const { churchId, smsContactPhone } = body as {
      churchId: string;
      smsContactPhone: string | null;
    };

    if (!churchId) {
      return NextResponse.json({ error: 'Missing churchId' }, { status: 400 });
    }

    // Make sure the logged in admin is updating THEIR church only
    if (String(session.churchId) !== String(churchId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await prisma.church.update({
      where: { id: BigInt(churchId) },
      data: {
        smsContactPhone: smsContactPhone?.trim() || null,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('API ERROR /api/admin/church/settings', err);
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}
