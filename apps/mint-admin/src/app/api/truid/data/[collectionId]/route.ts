import { NextRequest, NextResponse } from 'next/server';
import { getCollectionStatus, getAffordabilityData } from '@/lib/trueid';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/truid/data/:collectionId?applicationRef=<uuid>
 *
 * Polls TruID for collection status.
 * - If not yet complete → returns { status: 'pending', complete: false }
 * - If complete        → fetches affordability data, optionally persists to
 *   loan_applications.trueid_data (when ?applicationRef= is provided),
 *   and returns the full TruIDAffordability payload.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ collectionId: string }> },
) {
  const { collectionId } = await params;
  const applicationRef = req.nextUrl.searchParams.get('applicationRef') ?? undefined;

  if (!collectionId) {
    return NextResponse.json({ error: 'collectionId is required' }, { status: 400 });
  }

  try {
    const { complete, status } = await getCollectionStatus(collectionId);

    if (!complete) {
      return NextResponse.json({ status, complete: false }, { status: 200 });
    }

    // Consent granted — pull affordability data
    const affordability = await getAffordabilityData(collectionId);

    // Persist to Supabase if we know which application this belongs to
    if (applicationRef && supabaseAdmin) {
      const { error } = await supabaseAdmin
        .from('loan_applications')
        .update({ trueid_data: affordability as unknown as Record<string, unknown> })
        .eq('id', applicationRef);

      if (error) {
        // Non-fatal — log but still return the data to the portal
        console.error('[truid/data] Supabase update failed:', error.message);
      }
    }

    return NextResponse.json(affordability, { status: 200 });
  } catch (err) {
    console.error('[truid/data]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
