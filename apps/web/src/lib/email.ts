import { Resend } from 'resend';

const FROM   = process.env.RESEND_FROM_EMAIL ?? 'AlgoLend <noreply@algolend.co.za>';
const KEY    = process.env.RESEND_API_KEY;
const resend = KEY ? new Resend(KEY) : null;

export async function sendEmail(to: string, subject: string, html: string) {
  if (!resend) {
    console.log('[email] RESEND_API_KEY not set — would send:', subject, '→', to);
    return;
  }
  await resend.emails.send({ from: FROM, to, subject, html });
}
