import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { supabaseAdmin } from '@/lib/supabase';
import { logAudit } from '@/lib/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

/** POST /api/clients/:id/rotate-lender-key — generate a new lender_api_key */
export async function POST(_req: NextRequest, { params }: Params) {
  const { id } = await params;

  const { data: client } = await supabaseAdmin
    .from('clients')
    .select('id')
    .eq('id', id)
    .single();

  if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 });

  const newKey = randomBytes(32).toString('hex');

  const { error } = await supabaseAdmin
    .from('clients')
    .update({ lender_api_key: newKey })
    .eq('id', id);

  if (error) {
    console.error('[rotate-lender-key] update failed', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  logAudit({ action: 'client.rotate_lender_key', resourceType: 'client', resourceId: id, meta: {} });

  return NextResponse.json({ ok: true, lender_api_key: newKey });
}
