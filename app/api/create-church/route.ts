// app/api/create-church/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/src/lib/prisma';
import bcrypt from 'bcryptjs';
import { createSessionToken, JWT_COOKIE_NAME } from '@/src/lib/auth';

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      name,
      slug,
      sms_contact_phone,
      email,
      password,
    }: {
      name?: string;
      slug?: string;
      sms_contact_phone?: string | null;
      email?: string;
      password?: string;
    } = body || {};

    const cleanName = (name ?? '').trim();
    const cleanSlug = (slug ?? '').trim().toLowerCase();
    const cleanEmail = (email ?? '').trim().toLowerCase();
    const cleanPhone = (sms_contact_phone ?? '').trim() || null;

    if (!cleanName || !cleanSlug || !cleanEmail || !password) {
      return NextResponse.json(
        { error: 'Missing name, email, slug or password.' },
        { status: 400 },
      );
    }

    // Ensure slug is unique
    const existing = await prisma.church.findUnique({
      where: { slug: cleanSlug },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'That URL is already taken. Please choose another.' },
        { status: 400 },
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const church = await prisma.church.create({
      data: {
        name: cleanName,
        slug: cleanSlug,
        smsContactPhone: cleanPhone,
        adminEmail: cleanEmail,
        passwordHash,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        adminEmail: true,
      },
    });

    // Create a session immediately after signup so the user lands in an
    // authenticated dashboard.
    const token = createSessionToken({
      churchId: Number(church.id),
      slug: church.slug,
      adminEmail: church.adminEmail!,
    });

    const res = NextResponse.json({
      church: {
        id: Number(church.id), // avoid BigInt → JSON error
        name: church.name,
        slug: church.slug,
        adminEmail: church.adminEmail,
      },
    });

    res.cookies.set(JWT_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return res;
  } catch (err) {
    console.error('API ERROR /api/create-church', err);
    return NextResponse.json(
      { error: 'Unexpected error creating church.' },
      { status: 500 },
    );
  }
}
