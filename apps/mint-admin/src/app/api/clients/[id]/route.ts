import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { ALL_FEATURES } from '@/lib/features';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

/** PATCH /api/clients/:id — update status or feature flags */
export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;

  let body: { status?: string; features?: Record<string, boolean>; api_quota?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const errors: string[] = [];

  // ── Status change ────────────────────────────────────────────────────
  if (body.status !== undefined) {
    const allowed = ['trial', 'active', 'suspended', 'churned'];
    if (!allowed.includes(body.status)) {
      return NextResponse.json({ error: `status must be one of: ${allowed.join(', ')}` }, { status: 422 });
    }

    const { error } = await supabaseAdmin
      .from('clients')
      .update({
        status: body.status,
        ...(body.status === 'suspended' ? { suspended_at: new Date().toISOString() } : {}),
        ...(body.status === 'active'    ? { activated_at: new Date().toISOString(), suspended_at: null } : {}),
      })
      .eq('id', id);

    if (error) {
      console.error('[clients] status update failed', error);
      errors.push(error.message);
    }
  }

  // ── API quota update ─────────────────────────────────────────────────
  if (body.api_quota !== undefined) {
    const quota = Math.max(100, Math.round(body.api_quota));
    const { error } = await supabaseAdmin
      .from('clients')
      .update({ api_quota: quota })
      .eq('id', id);
    if (error) {
      console.error('[clients] quota update failed', error);
      errors.push(error.message);
    }
  }

  // ── Feature flag upsert ──────────────────────────────────────────────
  if (body.features !== undefined) {
    // Only upsert flags that are in the DB enum
    const rows = ALL_FEATURES
      .filter((flag) => flag in body.features!)
      .map((flag) => ({
        client_id:  id,
        flag,
        enabled:    body.features![flag] ?? false,
        enabled_at: body.features![flag] ? new Date().toISOString() : null,
      }));

    if (rows.length > 0) {
      const { error } = await supabaseAdmin
        .from('client_features')
        .upsert(rows, { onConflict: 'client_id,flag' });

      if (error) {
        console.error('[clients] feature upsert failed', error);
        errors.push(error.message);
      }
    }
  }

  if (errors.length > 0) {
    return NextResponse.json({ error: errors.join('; ') }, { status: 500 });
  }

  // ── Optional: push MINT_ENABLED_FEATURES env var + redeploy ─────────
  // Reads vercel_project_id from the client record and updates the
  // MINT_ENABLED_FEATURES env var so build-time checks stay in sync.
  // Only runs when features changed AND the client has a vercel_project_id.
  if (body.features !== undefined) {
    const token  = process.env.VERCEL_API_TOKEN ?? process.env.VERCEL_TOKEN;
    const teamId = process.env.VERCEL_TEAM_ID;

    if (token) {
      try {
        const { data: clientRow } = await supabaseAdmin
          .from('clients')
          .select('vercel_project_id')
          .eq('id', id)
          .single();

        const projectId = clientRow?.vercel_project_id;

        if (projectId) {
          // Fetch the full enabled feature list for this client
          const { data: allFlags } = await supabaseAdmin
            .from('client_features')
            .select('flag, enabled')
            .eq('client_id', id);

          const enabledList = (allFlags ?? [])
            .filter((r) => r.enabled)
            .map((r) => r.flag)
            .join(',');

          const qs = teamId ? `?teamId=${teamId}` : '';

          // Upsert MINT_ENABLED_FEATURES env var on the Vercel project
          await fetch(`https://api.vercel.com/v10/projects/${projectId}/env${qs}`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              key:    'MINT_ENABLED_FEATURES',
              value:  enabledList,
              type:   'plain',
              target: ['production', 'preview'],
            }),
          });

          console.log(`[features] pushed MINT_ENABLED_FEATURES="${enabledList}" to project ${projectId}`);
        }
      } catch (e) {
        // Non-fatal — DB write already succeeded, Vercel sync is best-effort
        console.warn('[features] Vercel env sync failed:', e instanceof Error ? e.message : e);
      }
    }
  }

  return NextResponse.json({ ok: true });
}
