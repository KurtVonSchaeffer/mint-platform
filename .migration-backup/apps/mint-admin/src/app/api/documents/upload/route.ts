import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const form      = await req.formData();
    const clientId  = form.get('client_id') as string | null;
    const docType   = form.get('doc_type') as string | null;
    const file      = form.get('file') as File | null;

    if (!clientId || !docType || !file) {
      return NextResponse.json({ error: 'Missing client_id, doc_type, or file' }, { status: 400 });
    }

    const ext      = file.name.split('.').pop() ?? 'bin';
    const path     = `${clientId}/${docType}/${Date.now()}.${ext}`;
    const buffer   = Buffer.from(await file.arrayBuffer());

    const { error: storageError } = await supabaseAdmin.storage
      .from('client-documents')
      .upload(path, buffer, { contentType: file.type, upsert: true });

    if (storageError) {
      return NextResponse.json({ error: storageError.message }, { status: 500 });
    }

    const { error: dbError } = await supabaseAdmin
      .from('documents')
      .insert({
        client_id:    clientId,
        type:         docType,
        file_name:    file.name,
        storage_path: path,
        status:       'pending',
      });

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    return NextResponse.json({ path });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
