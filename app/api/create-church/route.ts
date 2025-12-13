import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/src/lib/supabaseAdmin';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, slug, sms_contact_phone } = body;

    if (!name || !slug) {
      return NextResponse.json(
        { error: 'Missing name or slug' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('churches')
      .insert({
        name,
        slug,
        sms_contact_phone,
      })
      .select()
      .single();

    if (error) {
      console.error('SERVER INSERT ERROR:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ church: data });
  } catch (err) {
    console.error('API ERROR:', err);
    return NextResponse.json(
      { error: 'Unexpected error' },
      { status: 500 }
    );
  }
}
