import { sendEmail, newSupportTicketAdminEmail } from '@/lib/email';

const SUPPORT_TICKET_NOTIFY_EMAIL = process.env.SUPPORT_TICKET_NOTIFY_EMAIL ?? 'support@mymint.co.za';
const PORTAL_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://admin.algolend.co.za';

export async function notifyAdminNewSupportTicket(opts: {
  clientName: string;
  ticketId:   string;
  subject:    string;
  message:    string;
  category:   string;
  priority:   string;
  submittedByName?:  string | null;
  submittedByEmail?: string | null;
}) {
  const html = newSupportTicketAdminEmail({
    clientName: opts.clientName,
    ticket: {
      id:               opts.ticketId,
      subject:          opts.subject,
      message:          opts.message,
      category:         opts.category,
      priority:         opts.priority,
      submittedByName:  opts.submittedByName,
      submittedByEmail: opts.submittedByEmail,
    },
    portalUrl: PORTAL_URL,
  });

  await sendEmail({
    to:      SUPPORT_TICKET_NOTIFY_EMAIL,
    subject: `${opts.priority === 'urgent' ? '🔴 URGENT — ' : ''}New support ticket: ${opts.subject} — ${opts.clientName}`,
    html,
  });
}
