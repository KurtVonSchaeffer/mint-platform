import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const { data: docs, error } = await supabaseAdmin
    .from('lead_documents')
    .select('id, type, file_name, storage_path, status, created_at')
    .eq('lead_id', id)
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const withUrls = await Promise.all(
    (docs ?? []).map(async doc => {
      const { data: signed } = await supabaseAdmin.storage
        .from('client-documents')
        .createSignedUrl(doc.storage_path, 3600);
      return { ...doc, signed_url: signed?.signedUrl ?? null };
    }),
  );

  return NextResponse.json({ documents: withUrls });
}
