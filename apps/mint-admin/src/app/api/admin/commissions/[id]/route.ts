import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { supabaseAdmin } from '@/lib/supabase';
import { sendEmail, commissionUpdateEmail } from '@/lib/email';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const VALID_STATUSES = ['Pending Collection', 'Pending Payroll', 'Payroll Ready', 'Paid'];

type Params = { params: Promise<{ id: string }> };

async function isAuthorized(): Promise<boolean> {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } },
  );
  const { data: { user } } = await supabase.auth.getUser();
  const role = (user?.user_metadata?.role as string | undefined) ?? '';
  return ['super_admin', 'admin', 'finance', 'manager'].includes(role);
}

export async function PATCH(req: NextRequest, { params }: Params) {
  if (!await isAuthorized()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json() as {
    status?: string;
    payroll_date?: string | null;
    commission_amount?: number;
    loan_amount?: number | null;
  };

  const update: Record<string, unknown> = {};

  if (body.status !== undefined) {
    if (!VALID_STATUSES.includes(body.status)) {
      return NextResponse.json({ error: `status must be one of: ${VALID_STATUSES.join(', ')}` }, { status: 422 });
    }
    update.status = body.status;
    if (body.status === 'Paid') {
      update.paid_at = new Date().toISOString();
    }
  }

  if ('payroll_date' in body)       update.payroll_date       = body.payroll_date       ?? null;
  if ('commission_amount' in body)  update.commission_amount  = body.commission_amount;
  if ('loan_amount' in body)        update.loan_amount        = body.loan_amount        ?? null;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 422 });
  }

  const { data, error } = await supabaseAdmin
    .from('commissions')
    .update(update)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Notify TM when commission is approved for payroll or paid
  if (body.status === 'Payroll Ready' || body.status === 'Paid') {
    const agentId = data.agent_id as string | undefined;
    if (agentId) {
      const agentRes = await supabaseAdmin.auth.admin.getUserById(agentId);
      const agentEmail = agentRes.data.user?.email;
      const agentName  = (agentRes.data.user?.user_metadata?.full_name as string | undefined)
        ?? agentRes.data.user?.email?.split('@')[0]
        ?? 'there';
      if (agentEmail) {
        const statusLabel = body.status as 'Payroll Ready' | 'Paid';
        sendEmail({
          to:      agentEmail,
          subject: body.status === 'Paid'
            ? `Commission paid — ${data.client_name}`
            : `Commission approved for payroll — ${data.client_name}`,
          html: commissionUpdateEmail({
            agentName,
            clientName:       data.client_name,
            commissionAmount: data.commission_amount ?? 0,
            status:           statusLabel,
            payrollDate:      data.payroll_date ?? null,
          }),
        }).catch(() => {/* non-blocking */});
      }
    }
  }

  return NextResponse.json({ commission: data });
}
