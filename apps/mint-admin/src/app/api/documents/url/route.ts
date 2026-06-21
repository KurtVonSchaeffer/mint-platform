import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const path = req.nextUrl.searchParams.get('path');
  if (!path) return NextResponse.json({ error: 'Missing path' }, { status: 400 });

  const { data, error } = await supabaseAdmin.storage
    .from('client-documents')
    .createSignedUrl(path, 60 * 60); // 1-hour expiry

  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: error?.message ?? 'Failed to generate URL' }, { status: 500 });
  }

  return NextResponse.json({ url: data.signedUrl });
}
