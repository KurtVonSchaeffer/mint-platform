import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { ALL_FEATURES } from '@/lib/features';
import { logAudit } from '@/lib/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

/** GET /api/clients/:id — fetch single client with invoices + usage */
export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;

  const [clientRes, invoicesRes, usageRes, agreementsRes] = await Promise.all([
    supabaseAdmin
      .from('clients')
      .select('id, name, slug, subdomain, domain, tier, status, contact_email, contact_name, monthly_fee_cents, primary_color, secondary_color, ncr_number, created_at, activated_at, api_quota, client_features(flag, enabled)')
      .eq('id', id)
      .single(),

    supabaseAdmin
      .from('invoices')
      .select('id, reference, type, status, subtotal_cents, vat_cents, total_cents, period_start, period_end, issued_at, due_at, paid_at, notes, invoice_line_items(id, description, quantity, unit_price_cents, total_cents, service)')
      .eq('client_id', id)
      .order('issued_at', { ascending: false, nullsFirst: false })
      .limit(50),

    supabaseAdmin
      .from('usage_monthly_rollup')
      .select('month, service, total_quantity, total_cost_cents')
      .eq('client_id', id)
      .order('month', { ascending: false })
      .limit(60),

    supabaseAdmin
      .from('documents')
      .select('id, type, file_name, storage_path, status, created_at')
      .eq('client_id', id)
      .eq('type', 'onboarding_agreement')
      .order('created_at', { ascending: false }),
  ]);

  if (clientRes.error) return NextResponse.json({ error: clientRes.error.message }, { status: 404 });

  return NextResponse.json({
    client:     clientRes.data,
    invoices:   invoicesRes.data ?? [],
    usage:      usageRes.data ?? [],
    agreements: agreementsRes.data ?? [],
  });
}

/** PATCH /api/clients/:id — update status or feature flags */
export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;

  let body: { status?: string; features?: Record<string, boolean>; api_quota?: number; topup?: { units: number; price_per_1k_cents: number } };
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
    } else {
      const action = body.status === 'suspended' ? 'client.suspend'
        : body.status === 'active' ? 'client.activate'
        : 'client.update';
      logAudit({ action, resourceType: 'client', resourceId: id, meta: { status: body.status } });
    }

    // Push MINT_ACCOUNT_STATUS env var to the client's Vercel project so the
    // running server reads it within the 60s cache TTL — no redeploy required.
    const token  = process.env.VERCEL_API_TOKEN ?? process.env.VERCEL_TOKEN;
    const teamId = process.env.VERCEL_TEAM_ID;
    if (token && !error) {
      try {
        const { data: cRow } = await supabaseAdmin
          .from('clients')
          .select('vercel_project_id')
          .eq('id', id)
          .single();
        if (cRow?.vercel_project_id) {
          const qs = teamId ? `?teamId=${teamId}` : '';
          await fetch(`https://api.vercel.com/v10/projects/${cRow.vercel_project_id}/env${qs}`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              key:    'MINT_ACCOUNT_STATUS',
              value:  body.status,
              type:   'plain',
              target: ['production'],
            }),
          });
          console.log(`[status] pushed MINT_ACCOUNT_STATUS="${body.status}" to Vercel project ${cRow.vercel_project_id}`);
        }
      } catch (e) {
        console.warn('[status] Vercel env sync failed (non-fatal):', e instanceof Error ? e.message : e);
      }
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

  // ── Quota top-up ─────────────────────────────────────────────────────
  if (body.topup !== undefined) {
    const { units, price_per_1k_cents } = body.topup;
    if (!Number.isInteger(units) || units < 100) {
      return NextResponse.json({ error: 'topup.units must be an integer ≥ 100' }, { status: 422 });
    }

    // Read current quota
    const { data: clientRow, error: fetchErr } = await supabaseAdmin
      .from('clients')
      .select('id, name, slug, contact_email, api_quota')
      .eq('id', id)
      .single();

    if (fetchErr || !clientRow) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    const newQuota = (clientRow.api_quota ?? 10000) + units;

    // Update quota
    const { error: quotaErr } = await supabaseAdmin
      .from('clients')
      .update({ api_quota: newQuota })
      .eq('id', id);

    if (quotaErr) {
      console.error('[topup] quota update failed', quotaErr);
      return NextResponse.json({ error: quotaErr.message }, { status: 500 });
    }

    // Generate add-on invoice
    const unitCents    = Math.round((units / 1000) * (price_per_1k_cents ?? 50000));
    const vatCents     = Math.round(unitCents * 0.15);
    const totalCents   = unitCents + vatCents;
    const now          = new Date();
    const reference    = `INV-TOPUP-${clientRow.slug}-${now.toISOString().slice(0, 10)}`;

    const { error: invErr } = await supabaseAdmin.from('invoices').insert({
      reference,
      client_id:      id,
      type:           'add_on',
      status:         'draft',
      subtotal_cents: unitCents,
      vat_cents:      vatCents,
      total_cents:    totalCents,
      issued_at:      now.toISOString(),
      due_at:         new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      notes:          `API quota top-up: +${units.toLocaleString()} calls`,
    });

    if (invErr) {
      console.warn('[topup] invoice creation failed (quota still updated):', invErr.message);
    }

    // Sync API_QUOTA env var to Vercel project so the deployment picks it up
    const token  = process.env.VERCEL_API_TOKEN ?? process.env.VERCEL_TOKEN;
    const teamId = process.env.VERCEL_TEAM_ID;
    if (token) {
      const { data: vRow } = await supabaseAdmin
        .from('clients').select('vercel_project_id').eq('id', id).single();
      if (vRow?.vercel_project_id) {
        const qs = teamId ? `?teamId=${teamId}` : '';
        fetch(`https://api.vercel.com/v10/projects/${vRow.vercel_project_id}/env${qs}`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: 'API_QUOTA', value: String(newQuota), type: 'plain', target: ['production'] }),
        }).catch(e => console.warn('[topup] Vercel env sync failed:', e.message));
      }
    }

    logAudit({ action: 'quota.update', resourceType: 'client', resourceId: id, meta: { units, newQuota } });
    return NextResponse.json({ ok: true, newQuota, invoiceReference: invErr ? null : reference });
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

  if (body.features !== undefined && errors.length === 0) {
    logAudit({ action: 'feature.toggle', resourceType: 'client', resourceId: id, meta: { features: body.features } });
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
