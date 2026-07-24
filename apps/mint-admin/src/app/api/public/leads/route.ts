import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Public endpoint — no auth required.
// Called by the MINT/AlgoLend marketing site when a visitor submits a demo booking or contact form.
// Leads land in the admin /leads queue with status 'new' and source 'marketing-site'.

const ALLOWED_ORIGINS = [
  'https://algolend.co.za',
  'https://www.algolend.co.za',
  'https://mymint.co.za',
  'https://www.mymint.co.za',
];

function corsHeaders(origin: string | null) {
  const allowed = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin':  allowed,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin');
  return new NextResponse(null, { status: 204, headers: corsHeaders(origin) });
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin');

  let body: Record<string, string>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400, headers: corsHeaders(origin) });
  }

  const { name, email, company, phone, message } = body;

  if (!name?.trim() || !email?.trim()) {
    return NextResponse.json(
      { error: 'name and email are required' },
      { status: 422, headers: corsHeaders(origin) },
    );
  }

  const { data, error } = await supabaseAdmin
    .from('leads')
    .insert({
      name:    name.trim(),
      email:   email.trim().toLowerCase(),
      company: company?.trim() ?? '',
      phone:   phone?.trim() ?? null,
      message: message?.trim() ?? null,
      source:  'marketing-site',
      status:  'new',
    })
    .select('id')
    .single();

  if (error) {
    return NextResponse.json(
      { error: 'Failed to create lead' },
      { status: 500, headers: corsHeaders(origin) },
    );
  }

  return NextResponse.json(
    { ok: true, id: data.id },
    { status: 201, headers: corsHeaders(origin) },
  );
}
