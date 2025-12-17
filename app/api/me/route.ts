// app/api/me/route.ts
import { NextResponse } from 'next/server';
import { getCurrentChurchSession } from '@/src/lib/auth';

export async function GET() {
  try {
    const session = await getCurrentChurchSession();

    return NextResponse.json({
      session: session ?? null,
    });
  } catch (err) {
    console.error('API ERROR /api/me', err);
    // On any error, just treat as logged out
    return NextResponse.json({ session: null }, { status: 200 });
  }
}
