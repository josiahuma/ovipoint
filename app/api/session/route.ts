// app/api/session/route.ts
import { NextResponse } from 'next/server';
import { getCurrentChurchSession } from '@/src/lib/session';

export async function GET() {
  const session = await getCurrentChurchSession();

  if (!session) {
    return NextResponse.json({ authenticated: false });
  }

  return NextResponse.json({
    authenticated: true,
    slug: session.slug,
    name: session.name,
    adminEmail: session.adminEmail,
  });
}
