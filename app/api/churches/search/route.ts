// app/api/churches/search/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/src/lib/prisma';

export const runtime = 'nodejs';

type ChurchRow = {
  id: bigint;
  name: string;
  slug: string;
};

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get('q') || '').trim();

    if (q.length < 2) {
      return NextResponse.json({ churches: [] }, { status: 200 });
    }

    const churches: ChurchRow[] = await prisma.church.findMany({
      where: {
        name: {
          contains: q, // ✅ MySQL: case-insensitive depends on collation (usually already CI)
        },
      },
      select: {
        id: true,
        name: true,
        slug: true,
      },
      orderBy: { name: 'asc' },
      take: 10,
    });

    const safe = churches.map((c: ChurchRow) => ({
      id: Number(c.id),
      name: c.name,
      slug: c.slug,
    }));

    return NextResponse.json({ churches: safe }, { status: 200 });
  } catch (err) {
    console.error('API ERROR /api/churches/search', err);
    return NextResponse.json({ churches: [] }, { status: 200 });
  }
}
