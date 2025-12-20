// src/lib/auth.ts
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

export const JWT_COOKIE_NAME = 'ovipoint_admin_session';

export type ChurchSession = {
  churchId: number;
  slug: string;
  adminEmail: string | null;
};

const JWT_SECRET = process.env.JWT_SECRET!;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is not defined in environment variables.');
}

// Create a signed JWT for the admin session
export function createSessionToken(payload: ChurchSession): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

// Verify a JWT and return the session payload (or null if invalid/expired)
export function verifySessionToken(token: string): ChurchSession | null {
  try {
    return jwt.verify(token, JWT_SECRET) as ChurchSession;
  } catch {
    return null;
  }
}

// Read the current admin session from the HttpOnly cookie (server-side)
export async function getCurrentChurchSession(): Promise<ChurchSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(JWT_COOKIE_NAME)?.value;

  if (!token) return null;

  const session = verifySessionToken(token);
  return session;
}
