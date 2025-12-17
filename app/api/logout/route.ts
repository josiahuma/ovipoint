// app/api/logout/route.ts
import { NextResponse } from 'next/server';
import { JWT_COOKIE_NAME } from '@/src/lib/auth';

export async function POST() {
  try {
    const res = NextResponse.json({ ok: true });

    // Clear the auth cookie
    res.cookies.set(JWT_COOKIE_NAME, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    });

    return res;
  } catch (err) {
    console.error('API ERROR /api/logout', err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
