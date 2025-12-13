import Link from 'next/link';
import { notFound } from 'next/navigation';
import { supabase } from '@/src/lib/supabaseClient';
import { AdminChurchSettingsForm } from '@/src/components/AdminChurchSettingsForm';

type PageProps = {
  params: Promise<{ churchSlug: string }>;
};

export default async function AdminSettingsPage({ params }: PageProps) {
  const { churchSlug } = await params;

  const { data: church, error } = await supabase
    .from('churches')
    .select('id, name, slug, sms_contact_phone')
    .eq('slug', churchSlug)
    .single();

  if (error || !church) {
    return notFound();
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-xl px-4 pt-6">
        {/* Back breadcrumb */}
        <Link
          href={`/${church.slug}/admin`}
          className="mb-3 inline-flex items-center text-sm text-slate-600 hover:text-sky-700"
        >
          ← Back to dashboard
        </Link>

        <h1 className="text-2xl font-bold mb-1">
          Church settings
        </h1>
        <p className="text-sm text-slate-600 mb-4">
          Manage notification and contact settings.
        </p>

        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <AdminChurchSettingsForm church={church} />
        </div>
      </div>
    </main>
  );
}
