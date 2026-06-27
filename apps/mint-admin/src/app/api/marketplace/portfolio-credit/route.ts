import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function mintSupabase() {
  return createClient(
    process.env.MINT_SUPABASE_URL!,
    process.env.MINT_SUPABASE_SERVICE_KEY!,
  );
}

const STATUS_MAP: Record<string, string> = {
  in_progress: 'pending',
  pending:     'pending',
  approved:    'active',
  active:      'active',
  disbursed:   'active',
  repaid:      'repaid',
  settled:     'repaid',
  defaulted:   'defaulted',
  margin_call: 'margin_call',
};

export async function GET() {
  const db = mintSupabase();

  // 1. Secured loans
  const { data: loans, error: loansErr } = await db
    .from('loan_application')
    .select('id, user_id, principal_amount, amount_repayable, interest_rate, number_of_months, monthly_repayable, status, application_id, created_at, first_repayment_date')
    .eq('Secured_Unsecured', 'secured')
    .order('created_at', { ascending: false });

  if (loansErr) return NextResponse.json({ error: loansErr.message }, { status: 500 });
  if (!loans?.length) return NextResponse.json({ facilities: [] });

  const loanIds = loans.map(l => l.id);
  const userIds = [...new Set(loans.map(l => l.user_id))];

  // 2. Collateral pledges + profiles in parallel
  const [pledgesRes, profilesRes] = await Promise.all([
    db.from('pbc_collateral_pledges')
      .select('loan_application_id, symbol, pledged_value, loan_value, status')
      .in('loan_application_id', loanIds),
    db.from('profiles')
      .select('id, email, first_name, last_name')
      .in('id', userIds),
  ]);

  if (pledgesRes.error) return NextResponse.json({ error: pledgesRes.error.message }, { status: 500 });
  if (profilesRes.error) return NextResponse.json({ error: profilesRes.error.message }, { status: 500 });

  const profileMap = Object.fromEntries((profilesRes.data ?? []).map(p => [p.id, p]));

  const pledgesByLoan: Record<string, typeof pledgesRes.data> = {};
  for (const p of pledgesRes.data ?? []) {
    (pledgesByLoan[p.loan_application_id] ??= []).push(p);
  }

  const facilities = loans.map(loan => {
    const profile   = profileMap[loan.user_id];
    const pledges   = pledgesByLoan[loan.id] ?? [];
    const totalPledged = pledges.reduce((s, p) => s + (p.pledged_value ?? 0), 0);
    const ltv       = totalPledged > 0 ? loan.principal_amount / totalPledged : 0;
    const status    = STATUS_MAP[loan.status] ?? 'pending';

    return {
      id:                loan.id,
      mint_user_id:      loan.user_id,
      consumer_email:    profile?.email ?? '',
      consumer_name:     profile
        ? `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim() || null
        : null,
      portfolio_value:   totalPledged,
      collateral_type:   'equities',
      facility_amount:   loan.principal_amount,
      drawn_amount:      loan.principal_amount,
      ltv_ratio:         ltv,
      interest_rate_pct: loan.interest_rate,
      term_months:       loan.number_of_months,
      status,
      originated_at:     loan.created_at,
      repaid_at:         null,
      created_at:        loan.created_at,
      metadata: {
        application_id:       loan.application_id,
        amount_repayable:     loan.amount_repayable,
        monthly_repayable:    loan.monthly_repayable,
        first_repayment_date: loan.first_repayment_date,
        collateral_count:     pledges.length,
        symbols:              pledges.map(p => p.symbol),
      },
    };
  });

  return NextResponse.json({ facilities });
}
