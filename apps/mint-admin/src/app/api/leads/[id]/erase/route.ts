import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/leads/[id]/erase
 *
 * POPIA Section 24 — right to erasure / correction of personal information.
 *
 * This endpoint:
 *  1. Anonymises all PII in onboarding_data (names, ID numbers, phone,
 *     company name, directors, signature).
 *  2. Deletes all documents in Supabase storage under leads/{id}/.
 *  3. Removes the corresponding rows from the documents table.
 *  4. Sets deleted_at on the lead row so it is excluded from all dashboards.
 *
 * The lead row itself is retained for referential integrity and audit trail
 * (NCR requires lenders to keep application records for 5 years).
 * Only the PII fields are zeroed — the request outcome and dates remain.
 *
 * Should be called only by super_admin — caller auth is enforced upstream
 * by Supabase session middleware in the admin app.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (!id) {
    return NextResponse.json({ error: 'Lead ID required' }, { status: 400 });
  }

  // ── 1. Fetch the lead ────────────────────────────────────────────────
  const { data: lead, error: fetchErr } = await supabaseAdmin
    .from('leads')
    .select('id, onboarding_data, deleted_at')
    .eq('id', id)
    .maybeSingle();

  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  if (!lead)    return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
  if (lead.deleted_at) {
    return NextResponse.json({ error: 'Lead has already been erased' }, { status: 409 });
  }

  // ── 2. Anonymise onboarding_data — preserve non-PII audit fields ─────
  const existing = (lead.onboarding_data ?? {}) as Record<string, unknown>;
  const anonymised: Record<string, unknown> = {
    ...existing,
    // Contact PII
    contact_name:        '[ERASED]',
    company_name:        '[ERASED]',
    phone:               '[ERASED]',
    ncr_number:          '[ERASED]',
    // Directors — zero each director's name and ID number
    directors: Array.isArray(existing.directors)
      ? (existing.directors as Array<Record<string, unknown>>).map(() => ({
          name:      '[ERASED]',
          id_number: '[ERASED]',
        }))
      : [],
    // Agreement — keep accepted/signed_at for legal record, erase signature image
    agreement_signature: '[ERASED]',
    // Erasure audit trail
    erased_at:           new Date().toISOString(),
  };

  const { error: updateErr } = await supabaseAdmin
    .from('leads')
    .update({
      onboarding_data: anonymised,
      deleted_at:      new Date().toISOString(),
    })
    .eq('id', id);

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

  // ── 3. Delete documents from storage ─────────────────────────────────
  const { data: storageFiles, error: listErr } = await supabaseAdmin.storage
    .from('client-documents')
    .list(`leads/${id}`, { limit: 200 });

  let storageDeleted = 0;

  if (!listErr && storageFiles && storageFiles.length > 0) {
    // Storage .list() only returns top-level entries — need to recurse into subfolders
    const allPaths: string[] = [];
    for (const entry of storageFiles) {
      if (entry.id) {
        allPaths.push(`leads/${id}/${entry.name}`);
      } else {
        // It's a folder — list its contents
        const { data: sub } = await supabaseAdmin.storage
          .from('client-documents')
          .list(`leads/${id}/${entry.name}`, { limit: 200 });
        if (sub) {
          sub.forEach(f => allPaths.push(`leads/${id}/${entry.name}/${f.name}`));
        }
      }
    }

    if (allPaths.length > 0) {
      const { error: removeErr } = await supabaseAdmin.storage
        .from('client-documents')
        .remove(allPaths);
      if (removeErr) {
        console.error('[leads/erase] storage remove failed', removeErr.message);
      } else {
        storageDeleted = allPaths.length;
      }
    }
  }

  // ── 4. Delete document rows from DB ──────────────────────────────────
  const { error: docsErr } = await supabaseAdmin
    .from('documents')
    .delete()
    .eq('lead_id', id);

  if (docsErr) {
    console.error('[leads/erase] document rows delete failed', docsErr.message);
  }

  return NextResponse.json({
    ok:              true,
    lead_id:         id,
    erased_at:       anonymised.erased_at,
    storage_deleted: storageDeleted,
  });
}
