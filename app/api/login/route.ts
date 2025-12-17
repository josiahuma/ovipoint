// app/api/login/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/src/lib/prisma';
import bcrypt from 'bcryptjs';
import { createSessionToken, JWT_COOKIE_NAME } from '@/src/lib/auth';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, slug, password } = body;

    if (!email || !slug || !password) {
      return NextResponse.json(
        { error: 'Missing email, slug or password.' },
        { status: 400 }
      );
    }

    const church = await prisma.church.findUnique({
      where: { slug },
    });

    if (!church || !church.adminEmail || !church.passwordHash) {
      return NextResponse.json(
        { error: 'Invalid login details.' },
        { status: 401 }
      );
    }

    if (church.adminEmail.toLowerCase() !== email.toLowerCase()) {
      return NextResponse.json(
        { error: 'Invalid login details.' },
        { status: 401 }
      );
    }

    const ok = await bcrypt.compare(password, church.passwordHash);
    if (!ok) {
      return NextResponse.json(
        { error: 'Invalid login details.' },
        { status: 401 }
      );
    }

    const token = createSessionToken({
      churchId: Number(church.id),
      slug: church.slug,
      adminEmail: church.adminEmail,
    });

    const res = NextResponse.json({
      church: {
        id: Number(church.id),
        slug: church.slug,
        name: church.name,
      },
    });

    res.cookies.set(JWT_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    return res;
  } catch (err) {
    console.error('API ERROR /api/login', err);
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}
