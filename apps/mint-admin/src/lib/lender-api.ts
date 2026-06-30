/**
 * Calls a lender's scoped loan-intake API instead of connecting to their
 * Supabase database directly (see migration 020_client_lender_api.sql).
 *
 * The lender API key only grants access to create loan applications via
 * one endpoint — unlike a Supabase service role key, it cannot read or
 * write any other table in the lender's database.
 */

import { supabaseAdmin } from './supabase';

export interface LenderLoanPushInput {
  idNumber: string;
  fullName: string;
  phone?: string | null;
  email?: string | null;
  amount: number;
  termMonths: number;
  purpose?: string | null;
  source?: string;
}

export interface LenderLoanPushResult {
  ok: boolean;
  applicationId?: string;
  userId?: string;
  error?: string;
}

export async function pushLoanToLender(clientId: string, input: LenderLoanPushInput): Promise<LenderLoanPushResult> {
  const { data: client } = await supabaseAdmin
    .from('clients')
    .select('lender_api_base_url, lender_api_key')
    .eq('id', clientId)
    .single();

  const baseUrl = client?.lender_api_base_url as string | null;
  const apiKey  = client?.lender_api_key as string | null;

  if (!baseUrl || !apiKey) {
    return { ok: false, error: `Lender ${clientId} has no lender_api_base_url/lender_api_key configured` };
  }

  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, '')}/api/integrations/loans`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        idNumber:   input.idNumber,
        fullName:   input.fullName,
        phone:      input.phone ?? undefined,
        email:      input.email ?? undefined,
        amount:     input.amount,
        termMonths: input.termMonths,
        purpose:    input.purpose ?? undefined,
        source:     input.source ?? 'mint_marketplace',
      }),
    });

    const body = await res.json().catch(() => ({}));

    if (!res.ok) {
      return { ok: false, error: body?.error ?? `Lender API returned ${res.status}` };
    }

    return { ok: true, applicationId: body.applicationId, userId: body.userId };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}
