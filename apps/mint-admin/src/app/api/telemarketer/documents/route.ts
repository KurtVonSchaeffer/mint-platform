import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const agentId = searchParams.get('agent_id');
  const leadId  = searchParams.get('lead_id');

  let query = supabaseAdmin
    .from('lead_documents')
    .select('*, leads(name, company)')
    .order('created_at', { ascending: false });

  if (agentId) query = query.eq('agent_id', agentId);
  if (leadId)  query = query.eq('lead_id', leadId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ documents: data });
}

export async function POST(req: NextRequest) {
  const contentType = req.headers.get('content-type') ?? '';

  if (contentType.includes('multipart/form-data')) {
    const form     = await req.formData();
    const file     = form.get('file') as File | null;
    const lead_id  = form.get('lead_id') as string | null;
    const agent_id = form.get('agent_id') as string | null;

    if (!file || !lead_id || !agent_id) {
      return NextResponse.json({ error: 'file, lead_id, agent_id required' }, { status: 422 });
    }

    const ext  = file.name.split('.').pop() ?? 'bin';
    const path = `${agent_id}/${lead_id}/${Date.now()}.${ext}`;
    const buf  = await file.arrayBuffer();

    const { error: uploadError } = await supabaseAdmin.storage
      .from('lead-documents')
      .upload(path, buf, { contentType: file.type });

    if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

    const { data, error } = await supabaseAdmin
      .from('lead_documents')
      .insert({ lead_id, agent_id, name: file.name, storage_path: path, file_type: file.type, file_size: file.size })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ document: data }, { status: 201 });
  }

  const body = await req.json();
  const { lead_id, agent_id, name, storage_path, file_type, file_size } = body;

  if (!lead_id || !agent_id || !name || !storage_path) {
    return NextResponse.json({ error: 'lead_id, agent_id, name, storage_path required' }, { status: 422 });
  }

  const { data, error } = await supabaseAdmin
    .from('lead_documents')
    .insert({ lead_id, agent_id, name, storage_path, file_type: file_type ?? null, file_size: file_size ?? null })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ document: data }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 422 });

  const { data: doc } = await supabaseAdmin
    .from('lead_documents')
    .select('storage_path')
    .eq('id', id)
    .single();

  if (doc?.storage_path) {
    await supabaseAdmin.storage.from('lead-documents').remove([doc.storage_path]);
  }

  const { error } = await supabaseAdmin.from('lead_documents').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
