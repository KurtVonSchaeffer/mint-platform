import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const supabase  = getSupabase();

  // Verify token
  const { data: lead } = await supabase
    .from('leads')
    .select('id')
    .eq('onboarding_token', token)
    .single();

  if (!lead) return NextResponse.json({ error: 'Invalid link' }, { status: 404 });

  const form    = await req.formData();
  const docType = form.get('doc_type') as string | null;
  const file    = form.get('file') as File | null;

  if (!docType || !file) {
    return NextResponse.json({ error: 'Missing doc_type or file' }, { status: 400 });
  }

  const ext    = file.name.split('.').pop() ?? 'bin';
  const path   = `leads/${lead.id}/${docType}/${Date.now()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: storageErr } = await supabase.storage
    .from('client-documents')
    .upload(path, buffer, { contentType: file.type, upsert: true });

  if (storageErr) {
    return NextResponse.json({ error: storageErr.message }, { status: 500 });
  }

  const { error: dbErr } = await supabase.from('lead_documents').insert({
    lead_id:      lead.id,
    type:         docType,
    file_name:    file.name,
    storage_path: path,
    status:       'pending',
  });

  if (dbErr) {
    return NextResponse.json({ error: dbErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, path });
}
