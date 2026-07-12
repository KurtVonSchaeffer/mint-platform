import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BUCKET = 'biztech-documents';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ docId: string }> },
) {
  const { docId } = await params;

  const { data: doc, error: fetchError } = await supabaseAdmin
    .from('biztech_documents')
    .select('storage_path')
    .eq('id', docId)
    .single();

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 404 });

  await supabaseAdmin.storage.from(BUCKET).remove([doc.storage_path]);

  const { error } = await supabaseAdmin
    .from('biztech_documents')
    .delete()
    .eq('id', docId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
