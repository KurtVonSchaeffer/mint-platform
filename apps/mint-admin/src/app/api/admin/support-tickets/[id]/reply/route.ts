import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { supabaseAdmin } from '@/lib/supabase';
import { sendEmail, supportTicketReplyEmail } from '@/lib/email';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

async function getSessionUser() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } },
  );
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// POST — staff reply to a ticket. Emails the submitter (if we have their
// email) and moves the ticket to in_progress if it was still open.
export async function POST(req: NextRequest, { params }: Params) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;

  const body = await req.json() as { message?: string };
  const message = body.message?.trim();
  if (!message) return NextResponse.json({ error: 'message is required' }, { status: 422 });

  const { data: ticket } = await supabaseAdmin
    .from('client_support_tickets')
    .select('id, subject, status, submitted_by_name, submitted_by_email')
    .eq('id', id)
    .single();

  if (!ticket) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });

  const staffName = (user.user_metadata?.full_name as string | undefined) ?? user.email?.split('@')[0] ?? 'AlgoLend Support';

  const { data: reply, error } = await supabaseAdmin
    .from('client_support_ticket_replies')
    .insert({
      ticket_id:   id,
      author_type: 'admin',
      author_name: staffName,
      author_email: user.email ?? null,
      message,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (ticket.status === 'open') {
    await supabaseAdmin.from('client_support_tickets')
      .update({ status: 'in_progress', updated_at: new Date().toISOString() })
      .eq('id', id);
  } else {
    await supabaseAdmin.from('client_support_tickets')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', id);
  }

  if (ticket.submitted_by_email) {
    sendEmail({
      to:      ticket.submitted_by_email,
      subject: `Re: ${ticket.subject}`,
      html:    supportTicketReplyEmail({
        recipientName: ticket.submitted_by_name || 'there',
        subject:       ticket.subject,
        replyMessage:  message,
        staffName,
      }),
    }).catch(() => {/* swallow — email is best-effort */});
  }

  return NextResponse.json({ reply }, { status: 201 });
}
