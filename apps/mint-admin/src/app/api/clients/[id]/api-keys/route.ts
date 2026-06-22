import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { createHash, randomBytes } from 'crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function hashKey(raw: string) {
  return createHash('sha256').update(raw).digest('hex');
}

/** GET /api/clients/[id]/api-keys — list keys (prefix + metadata only, never hash) */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { data, error } = await supabaseAdmin
    .from('client_api_keys')
    .select('id, name, key_prefix, last_used_at, created_at, revoked_at')
    .eq('client_id', id)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ keys: data ?? [] });
}

/**
 * POST /api/clients/[id]/api-keys — generate a new key.
 *
 * Pass ?rotate=true to atomically revoke all existing active keys before
 * creating the new one. Use this for key rotation so there is never a
 * window where both old and new keys are simultaneously valid.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rotate = req.nextUrl.searchParams.get('rotate') === 'true';

  let body: { name?: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { name = 'Default' } = body;

  // Verify client exists
  const { data: client } = await supabaseAdmin
    .from('clients')
    .select('id')
    .eq('id', id)
    .is('deleted_at', null)
    .single();
  if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 });

  // Rotate: revoke all active keys before issuing a new one
  if (rotate) {
    const { error: revokeErr } = await supabaseAdmin
      .from('client_api_keys')
      .update({ revoked_at: new Date().toISOString() })
      .eq('client_id', id)
      .is('revoked_at', null);
    if (revokeErr) return NextResponse.json({ error: revokeErr.message }, { status: 500 });
  }

  // Generate: "alg_" prefix + 32 random hex chars
  const raw = `alg_${randomBytes(16).toString('hex')}`;
  const prefix = raw.slice(0, 12);   // "alg_" + 8 chars
  const hash = hashKey(raw);

  const { data: keyRow, error: insertErr } = await supabaseAdmin
    .from('client_api_keys')
    .insert({ client_id: id, name, key_prefix: prefix, key_hash: hash })
    .select('id, name, key_prefix, created_at')
    .single();

  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });

  return NextResponse.json({
    ...keyRow,
    key:     raw,
    rotated: rotate,
    warning: 'Save this key now — it will not be shown again.',
  }, { status: 201 });
}

/** DELETE /api/clients/[id]/api-keys/[keyId] — revoke a key */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const keyId = req.nextUrl.pathname.split('/').pop();

  const { error } = await supabaseAdmin
    .from('client_api_keys')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', keyId)
    .eq('client_id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
