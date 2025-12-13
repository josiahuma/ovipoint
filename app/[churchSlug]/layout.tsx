// app/[churchSlug]/layout.tsx
import type { Metadata } from 'next';
import { supabase } from '@/src/lib/supabaseClient';

type LayoutProps = {
  children: React.ReactNode;
  params: Promise<{ churchSlug: string }>;
};

export async function generateMetadata(
  { params }: { params: Promise<{ churchSlug: string }> }
): Promise<Metadata> {
  // ⬇️ params is a Promise in Next 16 with the App Router
  const { churchSlug } = await params;

  try {
    const { data: church } = await supabase
      .from('churches')
      .select('name, slug')
      .eq('slug', churchSlug)
      .single();

    if (!church) {
      return {};
    }

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
    // If Supabase or anything else fails, just don’t block rendering
    return {};
  }
}

// Layout component – must be the default export
export default function ChurchLayout({ children }: LayoutProps) {
  return <>{children}</>;
}
