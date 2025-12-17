// app/[churchSlug]/layout.tsx
import type { Metadata } from 'next';
import { prisma } from '@/src/lib/prisma';

type LayoutProps = {
  children: React.ReactNode;
  params: Promise<{ churchSlug: string }>;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ churchSlug: string }>;
}): Promise<Metadata> {
  const { churchSlug } = await params;

  try {
    const church = await prisma.church.findUnique({
      where: { slug: churchSlug },
      select: { name: true, slug: true },
    });

    if (!church) return {};

    const title = `${church.name} – Pickup Booking Service`;
    const description = `Book your pickup for ${church.name} services and events via Ovipoint.`;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        url: `https://www.ovipoint.com/${church.slug}`,
        siteName: 'Ovipoint',
        images: [
          {
            url: 'https://www.ovipoint.com/og/ovipoint-og.png',
            width: 1200,
            height: 630,
            alt: `${church.name} pickup booking service`,
          },
        ],
        type: 'website',
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: ['https://www.ovipoint.com/og/church-default.png'],
      },
    };
  } catch {
    return {};
  }
}

export default function ChurchLayout({ children }: LayoutProps) {
  return <>{children}</>;
}
