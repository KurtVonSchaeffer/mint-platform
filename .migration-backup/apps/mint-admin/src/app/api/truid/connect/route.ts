import { NextRequest, NextResponse } from 'next/server';
import { createCollection } from '@/lib/trueid';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/truid/connect
 * Body: { name?, idNumber?, email?, mobile? }
 *
 * Initiates a TruID open-banking consent collection.
 * Returns { collectionId, consumerUrl } — the portal opens consumerUrl
 * in a new tab / embedded frame for the applicant to grant consent.
 */
export async function POST(req: NextRequest) {
  let body: { name?: string; idNumber?: string; email?: string; mobile?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  try {
    const collection = await createCollection({
      name:     body.name,
      idNumber: body.idNumber,
      email:    body.email,
      mobile:   body.mobile,
    });

    return NextResponse.json(
      { collectionId: collection.collectionId, consumerUrl: collection.consumerUrl },
      { status: 201 },
    );
  } catch (err) {
    console.error('[truid/connect]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
