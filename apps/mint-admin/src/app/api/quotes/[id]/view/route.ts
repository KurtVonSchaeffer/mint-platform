import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// 1×1 transparent GIF
const PIXEL = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64',
);

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const { data: existing } = await supabaseAdmin
    .from('sales_quotes')
    .select('status, viewed_at')
    .eq('id', id)
    .single();

  if (existing && !existing.viewed_at) {
    const patch: Record<string, unknown> = { viewed_at: new Date().toISOString() };
    if (existing.status === 'sent') patch.status = 'viewed';

    await supabaseAdmin
      .from('sales_quotes')
      .update(patch)
      .eq('id', id);
  }

  return new NextResponse(PIXEL, {
    status: 200,
    headers: {
      'Content-Type':  'image/gif',
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      'Pragma':        'no-cache',
    },
  });
}
