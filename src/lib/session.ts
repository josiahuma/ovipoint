// src/lib/session.ts
import { cookies } from 'next/headers';
import { JWT_COOKIE_NAME, verifySessionToken } from './auth';
import { prisma } from './prisma';

export async function getCurrentChurchSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(JWT_COOKIE_NAME)?.value;

  if (!token) return null;

  const payload = verifySessionToken(token);
  if (!payload) return null;

  const church = await prisma.church.findUnique({
    where: { id: BigInt(payload.churchId) },
    select: { id: true, name: true, slug: true, adminEmail: true },
  });

  if (!church) return null;

  return {
    churchId: Number(church.id),
    slug: church.slug,
    name: church.name,
    adminEmail: church.adminEmail,
  };
}
