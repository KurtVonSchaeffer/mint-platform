import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BUCKET = 'biztech-documents';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const { data: docs, error } = await supabaseAdmin
    .from('biztech_documents')
    .select('id, name, storage_path, type, created_at')
    .eq('client_id', id)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const withUrls = await Promise.all(
    (docs ?? []).map(async doc => {
      const { data: signed } = await supabaseAdmin.storage
        .from(BUCKET)
        .createSignedUrl(doc.storage_path, 3600);
      return { ...doc, signed_url: signed?.signedUrl ?? null };
    }),
  );

  return NextResponse.json({ documents: withUrls });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const form = await req.formData();
  const file = form.get('file') as File | null;
  const type = form.get('type') as string | null;

  if (!file) {
    return NextResponse.json({ error: 'file required' }, { status: 422 });
  }

  const ext    = file.name.split('.').pop() ?? 'bin';
  const path   = `${id}/${Date.now()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: storageError } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType: file.type, upsert: true });

  if (storageError) return NextResponse.json({ error: storageError.message }, { status: 500 });

  const { data, error } = await supabaseAdmin
    .from('biztech_documents')
    .insert({ client_id: id, name: file.name, storage_path: path, type })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ document: data }, { status: 201 });
}
