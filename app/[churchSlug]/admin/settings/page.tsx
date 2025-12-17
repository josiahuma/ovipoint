// app/[churchSlug]/admin/settings/page.tsx
// @ts-nocheck

import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { prisma } from '@/src/lib/prisma';
import { getCurrentChurchSession } from '@/src/lib/auth';
import { AdminChurchSettingsForm } from '@/src/components/AdminChurchSettingsForm';

type PageProps = {
  params: Promise<{ churchSlug: string }>;
};

export default async function AdminSettingsPage({ params }: PageProps) {
  const { churchSlug } = await params;

  if (!churchSlug) return notFound();

  // 🔒 Guard (JWT session)
  const session = await getCurrentChurchSession();
  if (!session) redirect(`/login?slug=${churchSlug}`);
  if (session.slug !== churchSlug) redirect(`/${session.slug}/admin`);

  // Load church via Prisma
  const church = await prisma.church.findUnique({
    where: { slug: churchSlug },
    select: {
      id: true, // BigInt (don’t render directly)
      name: true,
      slug: true,
      smsContactPhone: true, // Prisma field name
    },
  });

  if (!church) return notFound();

  // Shape to match old supabase form prop expectation
  const churchForForm = {
    id: church.id, // keep for server/client actions if your form needs it
    name: church.name,
    slug: church.slug,
    sms_contact_phone: church.smsContactPhone ?? null,
  };

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-xl px-4 pt-6">
        <Link
          href={`/${church.slug}/admin`}
          className="mb-3 inline-flex items-center text-sm text-slate-600 hover:text-sky-700"
        >
          ← Back to dashboard
        </Link>

        <h1 className="text-2xl font-bold mb-1">Church settings</h1>
        <p className="text-sm text-slate-600 mb-4">
          Manage notification and contact settings.
        </p>

        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <AdminChurchSettingsForm church={churchForForm} />
        </div>
      </div>
    </main>
  );
}
