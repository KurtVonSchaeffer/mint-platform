/**
 * Thin Resend wrapper.
 * All emails fall back to a console log if RESEND_API_KEY is not set,
 * so the app works locally without Resend credentials.
 */
import { Resend } from 'resend';

const FROM    = process.env.RESEND_FROM_EMAIL ?? 'AlgoLend <noreply@algolend.co.za>';
const KEY     = process.env.RESEND_API_KEY;
const resend  = KEY ? new Resend(KEY) : null;

export interface EmailPayload {
  to:      string | string[];
  subject: string;
  html:    string;
  replyTo?: string;
}

export async function sendEmail(payload: EmailPayload): Promise<{ ok: boolean; id?: string; error?: string }> {
  if (!resend) {
    console.log('[email] RESEND_API_KEY not set — would have sent:', payload.subject, '→', payload.to);
    return { ok: true, id: 'simulated' };
  }
  const { data, error } = await resend.emails.send({ from: FROM, ...payload });
  if (error) {
    console.error('[email] send failed:', error);
    return { ok: false, error: error.message };
  }
  return { ok: true, id: data?.id };
}

// ── Email templates ───────────────────────────────────────────────────

export function quoteEmail(q: {
  id: string; client: string; contact: string;
  setupFee: number; monthlyFee: number; addOns: string[];
  validUntil: string;
}) {
  const fmt = (n: number) =>
    new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: 0 }).format(n);
  const year1 = q.setupFee + q.monthlyFee * 12;

  return `<!DOCTYPE html>
<html><body style="font-family:Arial,sans-serif;color:#1a1f36;background:#f5f6fa;margin:0;padding:24px">
<div style="max-width:600px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.08)">
  <div style="background:linear-gradient(135deg,#7C3AED,#9B5CF6);padding:32px;text-align:center">
    <p style="color:#fff;font-size:24px;font-weight:700;margin:0">AlgoLend</p>
    <p style="color:rgba(255,255,255,0.7);font-size:12px;letter-spacing:3px;text-transform:uppercase;margin:4px 0 0">Platform Quote</p>
  </div>
  <div style="padding:32px">
    <p style="font-size:16px;margin:0 0 8px">Hi ${q.contact},</p>
    <p style="color:#555;line-height:1.6;margin:0 0 24px">
      Thank you for your interest in AlgoLend. Please find your custom proposal for <strong>${q.client}</strong> below.
    </p>
    <div style="background:#f9f7ff;border:1px solid #e5e0ff;border-radius:12px;padding:20px;margin-bottom:24px">
      <p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#7C3AED;margin:0 0 12px">Quote ${q.id}</p>
      <table style="width:100%;border-collapse:collapse">
        <tr><td style="padding:6px 0;color:#555">One-off implementation fee</td><td style="text-align:right;font-weight:600">${fmt(q.setupFee)}</td></tr>
        <tr><td style="padding:6px 0;color:#555">Monthly platform licence</td><td style="text-align:right;font-weight:600">${fmt(q.monthlyFee)}/mo</td></tr>
        ${q.addOns.length ? `<tr><td style="padding:6px 0;color:#555">Add-ons</td><td style="text-align:right;font-size:13px;color:#888">${q.addOns.join(', ')}</td></tr>` : ''}
        <tr style="border-top:2px solid #7C3AED"><td style="padding:12px 0 0;font-weight:700;font-size:16px">Year-one total</td><td style="text-align:right;font-weight:700;font-size:18px;color:#7C3AED;padding-top:12px">${fmt(year1)}</td></tr>
      </table>
    </div>
    <p style="color:#888;font-size:13px;margin-bottom:24px">This proposal is valid until <strong>${q.validUntil}</strong>.</p>
    <p style="color:#555;font-size:14px;line-height:1.6">
      To proceed, simply reply to this email or contact your AlgoLend account manager. We'll have you live within days.
    </p>
  </div>
  <div style="background:#f5f6fa;padding:20px;text-align:center;font-size:12px;color:#aaa">
    AlgoLend · MINT Platforms (Pty) Ltd · <a href="https://mintplatforms.co.za" style="color:#7C3AED">mintplatforms.co.za</a>
  </div>
</div>
</body></html>`;
}

export function invoiceReminderEmail(inv: {
  reference: string; clientName: string; contact: string;
  totalCents: number; dueDate: string; daysOverdue: number;
  invoiceId?: string;
}) {
  const fmt = (c: number) =>
    new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', minimumFractionDigits: 2 }).format(c / 100);
  const isOverdue  = inv.daysOverdue > 0;
  const paymentUrl = inv.invoiceId ? `https://algolend.co.za/pay/${inv.invoiceId}` : null;

  return `<!DOCTYPE html>
<html><body style="font-family:Arial,sans-serif;color:#1a1f36;background:#f5f6fa;margin:0;padding:24px">
<div style="max-width:600px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.08)">
  <div style="background:${isOverdue ? '#dc2626' : '#7C3AED'};padding:24px 32px">
    <p style="color:#fff;font-size:18px;font-weight:700;margin:0">${isOverdue ? `⚠ Invoice Overdue — ${inv.daysOverdue} days` : 'Invoice Payment Reminder'}</p>
    <p style="color:rgba(255,255,255,0.8);font-size:13px;margin:4px 0 0">${inv.reference}</p>
  </div>
  <div style="padding:32px">
    <p>Hi ${inv.contact},</p>
    <p style="color:#555;line-height:1.6">
      ${isOverdue
        ? `Your invoice <strong>${inv.reference}</strong> for <strong>${fmt(inv.totalCents)}</strong> was due on <strong>${inv.dueDate}</strong> and is now <strong>${inv.daysOverdue} days overdue</strong>.`
        : `This is a friendly reminder that invoice <strong>${inv.reference}</strong> for <strong>${fmt(inv.totalCents)}</strong> is due on <strong>${inv.dueDate}</strong>.`
      }
    </p>
    <div style="background:#f9f7ff;border-radius:12px;padding:20px;margin:20px 0;text-align:center">
      <p style="font-size:28px;font-weight:700;color:#7C3AED;margin:0">${fmt(inv.totalCents)}</p>
      <p style="color:#888;font-size:13px;margin:4px 0 0">Amount due · Reference: ${inv.reference}</p>
    </div>
    ${paymentUrl ? `
    <div style="text-align:center;margin:24px 0">
      <a href="${paymentUrl}" style="background:#7C3AED;color:#fff;padding:13px 32px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;display:inline-block">
        Pay ${fmt(inv.totalCents)} now →
      </a>
      <p style="color:#888;font-size:12px;margin:10px 0 0">Card, instant EFT, or SnapScan — secured by PayFast</p>
    </div>
    <p style="color:#888;font-size:13px;line-height:1.6;border-top:1px solid #eee;padding-top:20px">
      Prefer to pay via bank transfer? Use reference <strong>${inv.reference}</strong> and email your proof of payment to
      <a href="mailto:accounts@algolend.co.za" style="color:#7C3AED">accounts@algolend.co.za</a>.
    </p>` : `
    <p style="color:#555;font-size:14px">Please arrange payment at your earliest convenience. If you have already paid, please disregard this message.</p>`}
  </div>
  <div style="background:#f5f6fa;padding:20px;text-align:center;font-size:12px;color:#aaa">
    AlgoLend · MINT Platforms (Pty) Ltd
  </div>
</div>
</body></html>`;
}

export function quotaWarningEmail(q: {
  clientName: string; contact: string; slug: string;
  used: number; limit: number; pct: number;
}) {
  return `<!DOCTYPE html>
<html><body style="font-family:Arial,sans-serif;color:#1a1f36;background:#f5f6fa;margin:0;padding:24px">
<div style="max-width:580px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.08)">
  <div style="background:#d97706;padding:28px 32px">
    <p style="color:#fff;font-size:20px;font-weight:700;margin:0">⚠️ API Quota Warning</p>
    <p style="color:rgba(255,255,255,0.85);font-size:13px;margin:4px 0 0">${q.clientName} · AlgoLend Platform</p>
  </div>
  <div style="padding:28px 32px">
    <p>Hi ${q.contact},</p>
    <p style="color:#555;line-height:1.6">Your AlgoLend deployment has used <strong>${q.pct}%</strong> of its monthly API quota.</p>
    <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:20px;text-align:center;margin:20px 0">
      <p style="font-size:36px;font-weight:700;color:#d97706;margin:0">${q.pct}%</p>
      <p style="color:#666;font-size:13px;margin:4px 0 0">${q.used.toLocaleString()} of ${q.limit.toLocaleString()} calls used this month</p>
    </div>
    <p style="color:#555;font-size:14px;line-height:1.6">
      At current usage, you may reach your limit before the end of the month. Contact your AlgoLend account manager to top up your quota and avoid any service interruption.
    </p>
    <p style="color:#888;font-size:13px;margin-top:16px">
      Email <a href="mailto:support@mintplatforms.co.za" style="color:#7C3AED">support@mintplatforms.co.za</a> to arrange a top-up.
    </p>
  </div>
  <div style="background:#f5f6fa;padding:16px;text-align:center;font-size:11px;color:#aaa">
    AlgoLend · MINT Platforms (Pty) Ltd
  </div>
</div>
</body></html>`;
}

export function quotaExceededEmail(q: {
  clientName: string; contact: string; slug: string;
  used: number; limit: number;
}) {
  return `<!DOCTYPE html>
<html><body style="font-family:Arial,sans-serif;color:#1a1f36;background:#f5f6fa;margin:0;padding:24px">
<div style="max-width:580px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.08)">
  <div style="background:#dc2626;padding:28px 32px">
    <p style="color:#fff;font-size:20px;font-weight:700;margin:0">🚨 API Quota Exhausted — Service Paused</p>
    <p style="color:rgba(255,255,255,0.85);font-size:13px;margin:4px 0 0">${q.clientName} · AlgoLend Platform</p>
  </div>
  <div style="padding:28px 32px">
    <p>Hi ${q.contact},</p>
    <p style="color:#555;line-height:1.6">
      Your AlgoLend deployment has reached its monthly API quota of <strong>${q.limit.toLocaleString()} calls</strong>.
      External API calls (Experian, TruID, SureSystems) are <strong>blocked</strong> until your quota is topped up or the month resets.
    </p>
    <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:20px;text-align:center;margin:20px 0">
      <p style="font-size:36px;font-weight:700;color:#dc2626;margin:0">100%</p>
      <p style="color:#666;font-size:13px;margin:4px 0 0">${q.used.toLocaleString()} calls — monthly limit reached</p>
    </div>
    <p style="color:#555;font-size:14px;line-height:1.6">
      <strong>To restore service immediately</strong>, contact your AlgoLend account manager to purchase additional quota. Your manager can add units within minutes.
    </p>
    <div style="margin-top:24px;text-align:center">
      <a href="mailto:support@mintplatforms.co.za?subject=Quota%20Top-Up%20Request%20—%20${encodeURIComponent(q.slug)}" style="background:#7C3AED;color:#fff;padding:12px 28px;border-radius:10px;text-decoration:none;font-weight:700;font-size:14px">
        Request Top-Up →
      </a>
    </div>
    <p style="color:#888;font-size:13px;margin-top:20px">Quota resets automatically on the 1st of next month.</p>
  </div>
  <div style="background:#f5f6fa;padding:16px;text-align:center;font-size:11px;color:#aaa">
    AlgoLend · MINT Platforms (Pty) Ltd
  </div>
</div>
</body></html>`;
}

export function invoiceReadyEmail(inv: {
  reference: string; clientName: string; contact: string;
  periodStart: string; periodEnd: string;
  subtotalCents: number; vatCents: number; totalCents: number;
  dueDate: string; lineCount: number;
  invoiceId?: string;
}) {
  const fmt = (c: number) =>
    new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', minimumFractionDigits: 2 }).format(c / 100);
  const paymentUrl = inv.invoiceId ? `https://algolend.co.za/pay/${inv.invoiceId}` : null;
  return `<!DOCTYPE html>
<html><body style="font-family:Arial,sans-serif;color:#1a1f36;background:#f5f6fa;margin:0;padding:24px">
<div style="max-width:600px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.08)">
  <div style="background:linear-gradient(135deg,#7C3AED,#9B5CF6);padding:32px;text-align:center">
    <p style="color:#fff;font-size:24px;font-weight:700;margin:0">AlgoLend</p>
    <p style="color:rgba(255,255,255,0.7);font-size:12px;letter-spacing:3px;text-transform:uppercase;margin:4px 0 0">Tax Invoice</p>
  </div>
  <div style="padding:32px">
    <p style="font-size:16px;margin:0 0 8px">Hi ${inv.contact},</p>
    <p style="color:#555;line-height:1.6;margin:0 0 24px">
      Please find your invoice for the period <strong>${inv.periodStart} – ${inv.periodEnd}</strong> below.
    </p>
    <div style="background:#f9f7ff;border:1px solid #e5e0ff;border-radius:12px;padding:20px;margin-bottom:24px">
      <p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#7C3AED;margin:0 0 12px">${inv.reference}</p>
      <table style="width:100%;border-collapse:collapse">
        <tr><td style="padding:5px 0;color:#555">${inv.lineCount} line item${inv.lineCount !== 1 ? 's' : ''}</td><td style="text-align:right;color:#888;font-size:13px">subtotal</td></tr>
        <tr><td style="padding:5px 0;color:#555">Subtotal</td><td style="text-align:right;font-weight:600">${fmt(inv.subtotalCents)}</td></tr>
        <tr><td style="padding:5px 0;color:#555">VAT (15%)</td><td style="text-align:right">${fmt(inv.vatCents)}</td></tr>
        <tr style="border-top:2px solid #7C3AED"><td style="padding:10px 0 0;font-weight:700;font-size:16px">Total Due</td><td style="text-align:right;font-weight:700;font-size:18px;color:#7C3AED;padding-top:10px">${fmt(inv.totalCents)}</td></tr>
      </table>
    </div>
    ${paymentUrl ? `
    <div style="text-align:center;margin:24px 0">
      <a href="${paymentUrl}" style="background:#7C3AED;color:#fff;padding:14px 36px;border-radius:10px;text-decoration:none;font-weight:700;font-size:16px;display:inline-block">
        Pay ${fmt(inv.totalCents)} now →
      </a>
      <p style="color:#888;font-size:12px;margin:10px 0 0">Card, instant EFT, or SnapScan — secured by PayFast</p>
    </div>
    <p style="color:#888;font-size:13px;line-height:1.6;border-top:1px solid #eee;padding-top:20px">
      Prefer a bank transfer? Use reference <strong>${inv.reference}</strong> and email your proof of payment to
      <a href="mailto:accounts@algolend.co.za" style="color:#7C3AED">accounts@algolend.co.za</a>.
    </p>` : `
    <p style="color:#555;font-size:14px;line-height:1.6">Payment is due by <strong>${inv.dueDate}</strong>. Please use <strong>${inv.reference}</strong> as your payment reference.</p>
    <p style="color:#888;font-size:13px;margin-top:16px">Questions? Reply to this email or contact <a href="mailto:accounts@algolend.co.za" style="color:#7C3AED">accounts@algolend.co.za</a>.</p>`}
  </div>
  <div style="background:#f5f6fa;padding:20px;text-align:center;font-size:12px;color:#aaa">
    AlgoLend · MINT Platforms (Pty) Ltd · accounts@algolend.co.za
  </div>
</div>
</body></html>`;
}

export function upgradeRequestEmail(req: {
  clientName: string; contact: string; tier: string;
  type: 'quota' | 'feature';
  currentQuota?: number; requestedQuota?: number;
  feature?: string; note?: string;
}) {
  const detail = req.type === 'quota'
    ? `Quota upgrade: <strong>${(req.currentQuota ?? 0).toLocaleString()}</strong> → <strong>${(req.requestedQuota ?? 0).toLocaleString()}</strong> calls/month`
    : `Feature request: <strong>${req.feature}</strong>`;

  return `<!DOCTYPE html>
<html><body style="font-family:Arial,sans-serif;color:#1a1f36;background:#f5f6fa;margin:0;padding:24px">
<div style="max-width:580px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.08)">
  <div style="background:#7C3AED;padding:28px 32px">
    <p style="color:#fff;font-size:20px;font-weight:700;margin:0">Upgrade Request</p>
    <p style="color:rgba(255,255,255,0.8);font-size:13px;margin:4px 0 0">${req.clientName} — ${req.tier} tier</p>
  </div>
  <div style="padding:28px 32px">
    <p style="color:#555;line-height:1.6">${detail}</p>
    ${req.note ? `<div style="background:#f9f7ff;border-left:3px solid #7C3AED;padding:12px 16px;margin:16px 0;font-size:14px;color:#555">"${req.note}"</div>` : ''}
    <p style="color:#555;font-size:14px">Contact: <strong>${req.contact}</strong></p>
    <div style="margin-top:24px;text-align:center">
      <a href="https://admin.algolend.co.za/clients" style="background:#7C3AED;color:#fff;padding:12px 28px;border-radius:10px;text-decoration:none;font-weight:700;font-size:14px">
        View in Admin →
      </a>
    </div>
  </div>
  <div style="background:#f5f6fa;padding:16px;text-align:center;font-size:11px;color:#aaa">
    AlgoLend · MINT Platforms (Pty) Ltd — this is an internal notification
  </div>
</div>
</body></html>`;
}

export function userInviteEmail(inv: {
  fullName: string;
  email: string;
  clientName: string;
  role: string;
  inviteUrl: string;
}) {
  const roleLabel: Record<string, string> = {
    loan_officer: 'Loan Officer',
    admin:        'Administrator',
    viewer:       'Viewer',
  };
  return `<!DOCTYPE html>
<html><body style="font-family:Arial,sans-serif;color:#1a1f36;background:#f5f6fa;margin:0;padding:24px">
<div style="max-width:600px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.08)">
  <div style="background:linear-gradient(135deg,#7C3AED,#9B5CF6);padding:40px 32px;text-align:center">
    <p style="color:#fff;font-size:26px;font-weight:700;margin:0">You're invited to AlgoLend</p>
    <p style="color:rgba(255,255,255,0.8);margin:8px 0 0;font-size:14px">${inv.clientName}</p>
  </div>
  <div style="padding:32px">
    <p style="font-size:16px;margin:0 0 16px">Hi ${inv.fullName},</p>
    <p style="color:#555;line-height:1.6;margin:0 0 24px">
      You've been invited to join <strong>${inv.clientName}</strong> on the AlgoLend platform as a
      <strong>${roleLabel[inv.role] ?? inv.role}</strong>. Click the button below to set your password and get started.
    </p>
    <div style="text-align:center;margin:28px 0">
      <a href="${inv.inviteUrl}" style="background:#7C3AED;color:#fff;padding:14px 36px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;display:inline-block">
        Accept invitation →
      </a>
    </div>
    <p style="color:#888;font-size:13px;text-align:center;margin:0">
      This link expires in 24 hours. If you didn't expect this email, you can safely ignore it.
    </p>
    <hr style="border:none;border-top:1px solid #eee;margin:28px 0">
    <p style="color:#aaa;font-size:12px;margin:0">
      Invited to: ${inv.email}<br>
      Platform: <a href="https://admin.algolend.co.za" style="color:#7C3AED">admin.algolend.co.za</a>
    </p>
  </div>
  <div style="background:#f5f6fa;padding:20px;text-align:center;font-size:12px;color:#aaa">
    AlgoLend · MINT Platforms (Pty) Ltd
  </div>
</div>
</body></html>`;
}

export function welcomeClientEmail(client: {
  name: string; contact: string; slug: string; portalUrl: string;
}) {
  return `<!DOCTYPE html>
<html><body style="font-family:Arial,sans-serif;color:#1a1f36;background:#f5f6fa;margin:0;padding:24px">
<div style="max-width:600px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.08)">
  <div style="background:linear-gradient(135deg,#7C3AED,#9B5CF6);padding:40px 32px;text-align:center">
    <p style="color:#fff;font-size:28px;font-weight:700;margin:0">Welcome to AlgoLend!</p>
    <p style="color:rgba(255,255,255,0.8);margin:8px 0 0">Your lending platform is ready</p>
  </div>
  <div style="padding:32px">
    <p style="font-size:16px">Hi ${client.contact},</p>
    <p style="color:#555;line-height:1.6">
      We're excited to welcome <strong>${client.name}</strong> to the AlgoLend platform. Your deployment is live and ready to use.
    </p>
    <div style="text-align:center;margin:28px 0">
      <a href="${client.portalUrl}" style="background:#7C3AED;color:#fff;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:700;font-size:16px">
        Access Your Portal →
      </a>
    </div>
    <p style="color:#888;font-size:13px">Your portal URL: <a href="${client.portalUrl}" style="color:#7C3AED">${client.portalUrl}</a></p>
    <p style="color:#555;line-height:1.6;margin-top:20px">
      Your dedicated account manager will be in touch shortly to walk you through the platform. In the meantime, feel free to reach out to <a href="mailto:support@mintplatforms.co.za" style="color:#7C3AED">support@mintplatforms.co.za</a>.
    </p>
  </div>
  <div style="background:#f5f6fa;padding:20px;text-align:center;font-size:12px;color:#aaa">
    AlgoLend · MINT Platforms (Pty) Ltd
  </div>
</div>
</body></html>`;
}

export function biztechInvoiceReminderEmail(inv: {
  reference: string; clientName: string; contact: string;
  totalCents: number; dueDate: string; daysOverdue: number;
  invoiceId?: string;
}) {
  const fmt = (c: number) =>
    new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', minimumFractionDigits: 2 }).format(c / 100);
  const isOverdue = inv.daysOverdue > 0;
  const payUrl = inv.invoiceId ? `https://algolend.co.za/biztech-invoice/${inv.invoiceId}` : null;

  return `<!DOCTYPE html>
<html><body style="font-family:Arial,sans-serif;color:#1a1f36;background:#f5f6fa;margin:0;padding:24px">
<div style="max-width:600px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.08)">
  <div style="background:${isOverdue ? '#dc2626' : '#5C3BCF'};padding:24px 32px">
    <p style="color:#fff;font-size:18px;font-weight:700;margin:0">${isOverdue ? `⚠ Invoice Overdue — ${inv.daysOverdue} days` : 'Invoice Payment Reminder'}</p>
    <p style="color:rgba(255,255,255,0.8);font-size:13px;margin:4px 0 0">${inv.reference}</p>
  </div>
  <div style="padding:32px">
    <p>Hi ${inv.contact},</p>
    <p style="color:#555;line-height:1.6">
      ${isOverdue
        ? `Your invoice <strong>${inv.reference}</strong> for <strong>${fmt(inv.totalCents)}</strong> was due on <strong>${inv.dueDate}</strong> and is now <strong>${inv.daysOverdue} days overdue</strong>.`
        : `This is a friendly reminder that invoice <strong>${inv.reference}</strong> for <strong>${fmt(inv.totalCents)}</strong> is due on <strong>${inv.dueDate}</strong>.`
      }
    </p>
    <div style="background:#f5f2ff;border-radius:12px;padding:20px;margin:20px 0;text-align:center">
      <p style="font-size:28px;font-weight:700;color:#5C3BCF;margin:0">${fmt(inv.totalCents)}</p>
      <p style="color:#888;font-size:13px;margin:4px 0 0">Amount due · Reference: ${inv.reference}</p>
    </div>
    ${payUrl ? `
    <div style="text-align:center;margin:24px 0">
      <a href="${payUrl}" style="background:#5C3BCF;color:#fff;padding:13px 32px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;display:inline-block">
        View &amp; pay ${fmt(inv.totalCents)} →
      </a>
    </div>` : ''}
    <p style="color:#888;font-size:13px;line-height:1.6;border-top:1px solid #eee;padding-top:20px">
      Prefer a bank transfer? Use reference <strong>${inv.reference}</strong> and email your proof of payment to
      <a href="mailto:accounts@mymint.co.za" style="color:#5C3BCF">accounts@mymint.co.za</a>.
    </p>
  </div>
  <div style="background:#f5f6fa;padding:20px;text-align:center;font-size:12px;color:#aaa">
    MINT BizTech · MINT Platforms (Pty) Ltd
  </div>
</div>
</body></html>`;
}

export function biztechInvoiceReadyEmail(inv: {
  reference: string; clientName: string; contact: string;
  totalCents: number; dueDate: string; invoiceId: string;
}) {
  const fmt = (c: number) =>
    new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', minimumFractionDigits: 2 }).format(c / 100);
  const payUrl = `https://algolend.co.za/biztech-invoice/${inv.invoiceId}`;

  return `<!DOCTYPE html>
<html><body style="font-family:Arial,sans-serif;color:#1a1f36;background:#f5f6fa;margin:0;padding:24px">
<div style="max-width:600px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.08)">
  <div style="background:linear-gradient(135deg,#31005E,#5C3BCF);padding:32px;text-align:center">
    <p style="color:#fff;font-size:24px;font-weight:700;margin:0">MINT<span style="color:#DDC357">BizTech</span></p>
    <p style="color:rgba(255,255,255,0.7);font-size:12px;letter-spacing:3px;text-transform:uppercase;margin:4px 0 0">Tax Invoice</p>
  </div>
  <div style="padding:32px">
    <p style="font-size:16px;margin:0 0 8px">Hi ${inv.contact},</p>
    <p style="color:#555;line-height:1.6;margin:0 0 24px">
      Please find your invoice from MINT BizTech below.
    </p>
    <div style="background:#f5f2ff;border:1px solid #e5e0ff;border-radius:12px;padding:20px;margin-bottom:24px;text-align:center">
      <p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#5C3BCF;margin:0 0 12px">${inv.reference}</p>
      <p style="font-size:28px;font-weight:700;color:#5C3BCF;margin:0">${fmt(inv.totalCents)}</p>
      <p style="color:#888;font-size:13px;margin:6px 0 0">Due ${inv.dueDate}</p>
    </div>
    <div style="text-align:center;margin:24px 0">
      <a href="${payUrl}" style="background:#5C3BCF;color:#fff;padding:14px 36px;border-radius:10px;text-decoration:none;font-weight:700;font-size:16px;display:inline-block">
        View &amp; pay ${fmt(inv.totalCents)} →
      </a>
    </div>
    <p style="color:#888;font-size:13px;line-height:1.6;border-top:1px solid #eee;padding-top:20px">
      Prefer a bank transfer? Use reference <strong>${inv.reference}</strong> and email your proof of payment to
      <a href="mailto:accounts@mymint.co.za" style="color:#5C3BCF">accounts@mymint.co.za</a>.
    </p>
  </div>
  <div style="background:#f5f6fa;padding:20px;text-align:center;font-size:12px;color:#aaa">
    MINT BizTech · MINT Platforms (Pty) Ltd · accounts@mymint.co.za
  </div>
</div>
</body></html>`;
}

export function commissionStatementEmail(stmt: {
  agentName: string;
  month: string;
  commissions: {
    clientName: string;
    loanAmount: number | null;
    commissionAmount: number;
    status: string;
    payrollDate: string | null;
  }[];
}) {
  const fmtR = (n: number) =>
    new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', minimumFractionDigits: 2 }).format(n);

  const total        = stmt.commissions.reduce((s, c) => s + c.commissionAmount, 0);
  const pending      = stmt.commissions.filter(c => c.status === 'Pending Collection').reduce((s, c) => s + c.commissionAmount, 0);
  const payrollReady = stmt.commissions.filter(c => c.status === 'Payroll Ready').reduce((s, c) => s + c.commissionAmount, 0);
  const paid         = stmt.commissions.filter(c => c.status === 'Paid').reduce((s, c) => s + c.commissionAmount, 0);

  const rows = stmt.commissions.map(c => `
    <tr style="border-bottom:1px solid #eee">
      <td style="padding:10px 8px;font-size:14px;color:#1a1f36">${c.clientName}</td>
      <td style="padding:10px 8px;font-size:14px;color:#555;text-align:right">${c.loanAmount ? fmtR(c.loanAmount) : '—'}</td>
      <td style="padding:10px 8px;font-size:14px;font-weight:600;color:#7C3AED;text-align:right">${fmtR(c.commissionAmount)}</td>
      <td style="padding:10px 8px;text-align:center">
        <span style="font-size:11px;font-weight:700;padding:2px 8px;border-radius:20px;
          background:${c.status === 'Paid' ? '#d1fae5' : c.status === 'Payroll Ready' ? '#dbeafe' : '#fef3c7'};
          color:${c.status === 'Paid' ? '#065f46' : c.status === 'Payroll Ready' ? '#1e40af' : '#92400e'}">
          ${c.status}
        </span>
      </td>
      <td style="padding:10px 8px;font-size:13px;color:#888;text-align:right">
        ${c.payrollDate ? new Date(c.payrollDate + 'T00:00:00').toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
      </td>
    </tr>`).join('');

  return `<!DOCTYPE html>
<html><body style="font-family:Arial,sans-serif;color:#1a1f36;background:#f5f6fa;margin:0;padding:24px">
<div style="max-width:640px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.08)">

  <div style="background:linear-gradient(135deg,#7C3AED,#9B5CF6);padding:36px 32px">
    <p style="color:rgba(255,255,255,0.7);font-size:11px;letter-spacing:3px;text-transform:uppercase;margin:0 0 6px">AlgoLend</p>
    <p style="color:#fff;font-size:22px;font-weight:700;margin:0">Commission Statement</p>
    <p style="color:rgba(255,255,255,0.85);font-size:14px;margin:6px 0 0">${stmt.month}</p>
  </div>

  <div style="padding:32px">
    <p style="font-size:16px;margin:0 0 6px">Hi ${stmt.agentName},</p>
    <p style="color:#555;line-height:1.6;margin:0 0 28px">
      Please find your commission statement for <strong>${stmt.month}</strong> below.
      Commission becomes payable once a client's first deduction is successful.
    </p>

    <!-- Summary strip -->
    <table style="width:100%;border-collapse:collapse;margin-bottom:28px">
      <tr>
        <td style="width:25%;padding:16px;background:#f9f7ff;border-radius:8px;text-align:center">
          <p style="font-size:18px;font-weight:700;color:#7C3AED;margin:0">${fmtR(total)}</p>
          <p style="font-size:11px;color:#888;margin:4px 0 0;text-transform:uppercase;letter-spacing:1px">Total</p>
        </td>
        <td style="width:4%"></td>
        <td style="width:22%;padding:16px;background:#fffbeb;border-radius:8px;text-align:center">
          <p style="font-size:16px;font-weight:700;color:#92400e;margin:0">${fmtR(pending)}</p>
          <p style="font-size:11px;color:#888;margin:4px 0 0;text-transform:uppercase;letter-spacing:1px">Pending</p>
        </td>
        <td style="width:4%"></td>
        <td style="width:22%;padding:16px;background:#dbeafe;border-radius:8px;text-align:center">
          <p style="font-size:16px;font-weight:700;color:#1e40af;margin:0">${fmtR(payrollReady)}</p>
          <p style="font-size:11px;color:#888;margin:4px 0 0;text-transform:uppercase;letter-spacing:1px">Payroll Ready</p>
        </td>
        <td style="width:4%"></td>
        <td style="width:22%;padding:16px;background:#d1fae5;border-radius:8px;text-align:center">
          <p style="font-size:16px;font-weight:700;color:#065f46;margin:0">${fmtR(paid)}</p>
          <p style="font-size:11px;color:#888;margin:4px 0 0;text-transform:uppercase;letter-spacing:1px">Paid</p>
        </td>
      </tr>
    </table>

    <!-- Commission table -->
    <table style="width:100%;border-collapse:collapse;font-size:13px">
      <thead>
        <tr style="background:#f5f6fa">
          <th style="padding:10px 8px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#888">Client</th>
          <th style="padding:10px 8px;text-align:right;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#888">Loan Amount</th>
          <th style="padding:10px 8px;text-align:right;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#888">Commission</th>
          <th style="padding:10px 8px;text-align:center;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#888">Status</th>
          <th style="padding:10px 8px;text-align:right;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#888">Payroll Date</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
      <tfoot>
        <tr style="background:#f9f7ff">
          <td colspan="2" style="padding:12px 8px;font-weight:700;font-size:14px">Total Commission — ${stmt.month}</td>
          <td style="padding:12px 8px;text-align:right;font-weight:700;font-size:16px;color:#7C3AED">${fmtR(total)}</td>
          <td colspan="2"></td>
        </tr>
      </tfoot>
    </table>

    <p style="color:#888;font-size:13px;line-height:1.6;margin-top:28px;border-top:1px solid #eee;padding-top:20px">
      Questions about your commission? Contact your manager or email
      <a href="mailto:hr@algolend.co.za" style="color:#7C3AED">hr@algolend.co.za</a>.
    </p>
  </div>

  <div style="background:#f5f6fa;padding:20px;text-align:center;font-size:12px;color:#aaa">
    AlgoLend · MINT Platforms (Pty) Ltd · This is a confidential commission statement.
  </div>
</div>
</body></html>`;
}

export function demoBookingEmail(info: {
  leadName: string;
  leadCompany: string;
  leadEmail: string;
  agentName: string;
}) {
  return `<!DOCTYPE html>
<html><body style="font-family:Arial,sans-serif;color:#1a1f36;background:#f5f6fa;margin:0;padding:24px">
<div style="max-width:580px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.08)">
  <div style="background:linear-gradient(135deg,#7C3AED,#9B5CF6);padding:28px 32px">
    <p style="color:#fff;font-size:20px;font-weight:700;margin:0">Demo Booked</p>
    <p style="color:rgba(255,255,255,0.8);font-size:13px;margin:4px 0 0">AlgoLend · Telemarketer Pipeline</p>
  </div>
  <div style="padding:28px 32px">
    <p style="color:#555;line-height:1.6">
      <strong>${info.agentName}</strong> has booked a demo for a new prospect.
    </p>
    <div style="background:#f9f7ff;border:1px solid #e5e0ff;border-radius:12px;padding:20px;margin:20px 0">
      <table style="width:100%;border-collapse:collapse">
        <tr><td style="padding:5px 0;color:#888;font-size:13px;width:110px">Contact</td><td style="padding:5px 0;font-weight:600">${info.leadName}</td></tr>
        <tr><td style="padding:5px 0;color:#888;font-size:13px">Company</td><td style="padding:5px 0;font-weight:600">${info.leadCompany}</td></tr>
        <tr><td style="padding:5px 0;color:#888;font-size:13px">Email</td><td style="padding:5px 0"><a href="mailto:${info.leadEmail}" style="color:#7C3AED">${info.leadEmail}</a></td></tr>
        <tr><td style="padding:5px 0;color:#888;font-size:13px">Agent</td><td style="padding:5px 0">${info.agentName}</td></tr>
      </table>
    </div>
    <div style="text-align:center;margin:20px 0">
      <a href="https://admin.mintplatforms.co.za/leads" style="background:#7C3AED;color:#fff;padding:12px 28px;border-radius:10px;text-decoration:none;font-weight:700;font-size:14px;display:inline-block">
        View lead in admin →
      </a>
    </div>
  </div>
  <div style="background:#f5f6fa;padding:16px;text-align:center;font-size:11px;color:#aaa">
    AlgoLend · MINT Platforms (Pty) Ltd — internal notification
  </div>
</div>
</body></html>`;
}

export function commissionUpdateEmail(info: {
  agentName: string;
  clientName: string;
  commissionAmount: number;
  status: 'Payroll Ready' | 'Paid';
  payrollDate?: string | null;
}) {
  const fmtR = (n: number) =>
    new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', minimumFractionDigits: 2 }).format(n);
  const isPaid = info.status === 'Paid';

  return `<!DOCTYPE html>
<html><body style="font-family:Arial,sans-serif;color:#1a1f36;background:#f5f6fa;margin:0;padding:24px">
<div style="max-width:580px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.08)">
  <div style="background:${isPaid ? 'linear-gradient(135deg,#059669,#34D399)' : 'linear-gradient(135deg,#7C3AED,#9B5CF6)'};padding:28px 32px">
    <p style="color:#fff;font-size:20px;font-weight:700;margin:0">${isPaid ? 'Commission Paid' : 'Commission Approved for Payroll'}</p>
    <p style="color:rgba(255,255,255,0.8);font-size:13px;margin:4px 0 0">AlgoLend · ${info.clientName}</p>
  </div>
  <div style="padding:28px 32px">
    <p style="font-size:16px;margin:0 0 8px">Hi ${info.agentName},</p>
    <p style="color:#555;line-height:1.6;margin:0 0 20px">
      ${isPaid
        ? `Great news — your commission for <strong>${info.clientName}</strong> has been paid.`
        : `Your commission for <strong>${info.clientName}</strong> has been approved and added to the next payroll run.`}
    </p>
    <div style="background:${isPaid ? '#f0fdf4' : '#f9f7ff'};border:1px solid ${isPaid ? '#bbf7d0' : '#e5e0ff'};border-radius:12px;padding:20px;margin-bottom:20px;text-align:center">
      <p style="font-size:32px;font-weight:700;color:${isPaid ? '#059669' : '#7C3AED'};margin:0">${fmtR(info.commissionAmount)}</p>
      <p style="color:#888;font-size:13px;margin:4px 0 0">${info.clientName} · ${info.status}</p>
      ${info.payrollDate ? `<p style="color:#888;font-size:12px;margin:4px 0 0">Payroll date: ${info.payrollDate}</p>` : ''}
    </div>
    <p style="color:#888;font-size:13px;line-height:1.6">
      Questions about your commission? Contact your manager or email
      <a href="mailto:hr@algolend.co.za" style="color:#7C3AED">hr@algolend.co.za</a>.
    </p>
  </div>
  <div style="background:#f5f6fa;padding:16px;text-align:center;font-size:11px;color:#aaa">
    AlgoLend · MINT Platforms (Pty) Ltd · This is a confidential commission notification.
  </div>
</div>
</body></html>`;
}

export function newLeadNotificationEmail(info: {
  agentName: string;
  lead: {
    id:      string;
    name:    string;
    company: string;
    phone:   string | null;
    email:   string;
    message: string | null;
  };
  portalUrl: string;
}) {
  const leadUrl = `${info.portalUrl}/telemarketer/leads/${info.lead.id}`;
  return `<!DOCTYPE html>
<html><body style="font-family:Arial,sans-serif;color:#1a1f36;background:#f5f6fa;margin:0;padding:24px">
<div style="max-width:580px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.08)">
  <div style="background:linear-gradient(135deg,#7C3AED,#9B5CF6);padding:28px 32px">
    <p style="color:rgba(255,255,255,0.7);font-size:11px;letter-spacing:3px;text-transform:uppercase;margin:0 0 4px">AlgoLend</p>
    <p style="color:#fff;font-size:20px;font-weight:700;margin:0">New lead assigned to you</p>
  </div>
  <div style="padding:28px 32px">
    <p style="font-size:15px;margin:0 0 6px">Hi ${info.agentName},</p>
    <p style="color:#555;line-height:1.6;margin:0 0 24px">
      A new lead has been assigned to you. Reach out as soon as possible — early contact dramatically improves conversion.
    </p>
    <div style="background:#f9f7ff;border:1px solid #e5e0ff;border-radius:12px;padding:20px;margin-bottom:24px">
      <table style="width:100%;border-collapse:collapse">
        <tr><td style="padding:6px 0;color:#888;font-size:13px;width:90px">Name</td><td style="padding:6px 0;font-weight:600;font-size:15px;color:#1a1f36">${info.lead.name}</td></tr>
        <tr><td style="padding:6px 0;color:#888;font-size:13px">Company</td><td style="padding:6px 0;color:#1a1f36">${info.lead.company}</td></tr>
        ${info.lead.phone ? `<tr><td style="padding:6px 0;color:#888;font-size:13px">Phone</td><td style="padding:6px 0"><a href="tel:${info.lead.phone}" style="color:#7C3AED;font-weight:600">${info.lead.phone}</a></td></tr>` : ''}
        <tr><td style="padding:6px 0;color:#888;font-size:13px">Email</td><td style="padding:6px 0"><a href="mailto:${info.lead.email}" style="color:#7C3AED">${info.lead.email}</a></td></tr>
        ${info.lead.message ? `<tr><td style="padding:6px 0;color:#888;font-size:13px;vertical-align:top">Message</td><td style="padding:6px 0;color:#555;font-style:italic">"${info.lead.message}"</td></tr>` : ''}
      </table>
    </div>
    <div style="text-align:center">
      <a href="${leadUrl}" style="background:#7C3AED;color:#fff;padding:13px 32px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;display:inline-block">
        Open lead →
      </a>
    </div>
    <p style="color:#aaa;font-size:12px;text-align:center;margin-top:16px">
      Log your first call in the portal to move this lead out of "New Lead" stage.
    </p>
  </div>
  <div style="background:#f5f6fa;padding:16px;text-align:center;font-size:11px;color:#aaa">
    AlgoLend · MINT Platforms (Pty) Ltd — new lead notification
  </div>
</div>
</body></html>`;
}

export function demoConfirmationEmail(info: {
  leadName:    string;
  company:     string;
  agentName:   string;
  agentEmail:  string;
  demoDate:    string;
  demoTime:    string | null;
  platform:    string;
  meetingLink: string | null;
}) {
  const dateLabel = new Date(info.demoDate + 'T00:00:00').toLocaleDateString('en-ZA', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
  return `<!DOCTYPE html>
<html><body style="font-family:Arial,sans-serif;color:#1a1f36;background:#f5f6fa;margin:0;padding:24px">
<div style="max-width:580px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.08)">
  <div style="background:linear-gradient(135deg,#7C3AED,#9B5CF6);padding:32px;text-align:center">
    <p style="color:#fff;font-size:24px;font-weight:700;margin:0">AlgoLend</p>
    <p style="color:rgba(255,255,255,0.7);font-size:12px;letter-spacing:3px;text-transform:uppercase;margin:6px 0 0">Demo Confirmation</p>
  </div>
  <div style="padding:32px">
    <p style="font-size:16px;margin:0 0 8px">Hi ${info.leadName},</p>
    <p style="color:#555;line-height:1.6;margin:0 0 24px">
      Your AlgoLend platform demo has been confirmed. We're looking forward to showing you what we can do for <strong>${info.company}</strong>.
    </p>
    <div style="background:#f9f7ff;border:1px solid #e5e0ff;border-radius:12px;padding:20px;margin-bottom:24px">
      <table style="width:100%;border-collapse:collapse">
        <tr><td style="padding:6px 0;color:#888;font-size:13px;width:100px">Date</td><td style="padding:6px 0;font-weight:600">${dateLabel}</td></tr>
        ${info.demoTime ? `<tr><td style="padding:6px 0;color:#888;font-size:13px">Time</td><td style="padding:6px 0;font-weight:600">${info.demoTime} SAST</td></tr>` : ''}
        <tr><td style="padding:6px 0;color:#888;font-size:13px">Platform</td><td style="padding:6px 0">${info.platform}</td></tr>
        <tr><td style="padding:6px 0;color:#888;font-size:13px">Your host</td><td style="padding:6px 0">${info.agentName} · <a href="mailto:${info.agentEmail}" style="color:#7C3AED">${info.agentEmail}</a></td></tr>
      </table>
    </div>
    ${info.meetingLink ? `
    <div style="text-align:center;margin-bottom:24px">
      <a href="${info.meetingLink}" style="background:#7C3AED;color:#fff;padding:13px 32px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;display:inline-block">
        Join meeting →
      </a>
      <p style="color:#888;font-size:12px;margin:10px 0 0">${info.meetingLink}</p>
    </div>` : ''}
    <p style="color:#555;font-size:14px;line-height:1.6">
      If you need to reschedule, reply to this email or contact ${info.agentName} directly at
      <a href="mailto:${info.agentEmail}" style="color:#7C3AED">${info.agentEmail}</a>.
    </p>
  </div>
  <div style="background:#f5f6fa;padding:20px;text-align:center;font-size:12px;color:#aaa">
    AlgoLend · MINT Platforms (Pty) Ltd · <a href="https://mintplatforms.co.za" style="color:#7C3AED">mintplatforms.co.za</a>
  </div>
</div>
</body></html>`;
}

export function staleLeadDigestEmail(info: {
  agentName: string;
  leads: { id: string; name: string; company: string; tmStatus: string; daysSince: number }[];
  portalUrl: string;
}) {
  const rows = info.leads.map(l => `
    <tr style="border-bottom:1px solid #eee">
      <td style="padding:10px 8px">
        <a href="${info.portalUrl}/telemarketer/leads/${l.id}" style="font-weight:600;color:#7C3AED;text-decoration:none;font-size:14px">${l.name}</a>
        <p style="margin:2px 0 0;font-size:12px;color:#888">${l.company}</p>
      </td>
      <td style="padding:10px 8px;font-size:13px;color:#555">${l.tmStatus}</td>
      <td style="padding:10px 8px;text-align:right">
        <span style="font-size:11px;font-weight:700;padding:3px 8px;border-radius:20px;background:#fef2f2;color:#dc2626">
          ${l.daysSince}d stale
        </span>
      </td>
    </tr>`).join('');

  return `<!DOCTYPE html>
<html><body style="font-family:Arial,sans-serif;color:#1a1f36;background:#f5f6fa;margin:0;padding:24px">
<div style="max-width:620px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.08)">
  <div style="background:#d97706;padding:24px 32px">
    <p style="color:#fff;font-size:18px;font-weight:700;margin:0">Stale lead alert — ${info.leads.length} lead${info.leads.length !== 1 ? 's' : ''} need attention</p>
    <p style="color:rgba(255,255,255,0.85);font-size:13px;margin:4px 0 0">AlgoLend · Weekly pipeline health check</p>
  </div>
  <div style="padding:28px 32px">
    <p style="font-size:15px;margin:0 0 6px">Hi ${info.agentName},</p>
    <p style="color:#555;line-height:1.6;margin:0 0 24px">
      These leads in your pipeline haven't been updated in 14+ days. A quick check-in call can keep deals alive.
    </p>
    <table style="width:100%;border-collapse:collapse">
      <thead>
        <tr style="background:#f5f6fa">
          <th style="padding:10px 8px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#888">Lead</th>
          <th style="padding:10px 8px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#888">Stage</th>
          <th style="padding:10px 8px;text-align:right;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#888">Idle</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <div style="text-align:center;margin-top:28px">
      <a href="${info.portalUrl}/telemarketer/leads" style="background:#d97706;color:#fff;padding:12px 28px;border-radius:10px;text-decoration:none;font-weight:700;font-size:14px;display:inline-block">
        Review my leads →
      </a>
    </div>
  </div>
  <div style="background:#f5f6fa;padding:16px;text-align:center;font-size:11px;color:#aaa">
    AlgoLend · MINT Platforms (Pty) Ltd — weekly pipeline health
  </div>
</div>
</body></html>`;
}

export function managerApprovalRequestEmail(info: {
  managerName: string;
  agentName:   string;
  leadName:    string;
  company:     string;
  amountCents: number;
  proposalId:  string;
  adminUrl:    string;
}) {
  const fmt = (c: number) =>
    new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', minimumFractionDigits: 0 }).format(c / 100);
  const approvalUrl = `${info.adminUrl}/approvals`;
  return `<!DOCTYPE html>
<html><body style="font-family:Arial,sans-serif;color:#1a1f36;background:#f5f6fa;margin:0;padding:24px">
<div style="max-width:580px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.08)">
  <div style="background:linear-gradient(135deg,#0369a1,#0ea5e9);padding:28px 32px">
    <p style="color:#fff;font-size:20px;font-weight:700;margin:0">Proposal approval required</p>
    <p style="color:rgba(255,255,255,0.8);font-size:13px;margin:4px 0 0">AlgoLend · High-value deal</p>
  </div>
  <div style="padding:28px 32px">
    <p style="font-size:15px;margin:0 0 6px">Hi ${info.managerName},</p>
    <p style="color:#555;line-height:1.6;margin:0 0 20px">
      <strong>${info.agentName}</strong> has submitted a high-value proposal that requires your approval before it can be sent to the client.
    </p>
    <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:12px;padding:20px;margin-bottom:24px">
      <table style="width:100%;border-collapse:collapse">
        <tr><td style="padding:6px 0;color:#888;font-size:13px;width:100px">Lead</td><td style="padding:6px 0;font-weight:600">${info.leadName}</td></tr>
        <tr><td style="padding:6px 0;color:#888;font-size:13px">Company</td><td style="padding:6px 0">${info.company}</td></tr>
        <tr><td style="padding:6px 0;color:#888;font-size:13px">Agent</td><td style="padding:6px 0">${info.agentName}</td></tr>
        <tr><td style="padding:6px 0;color:#888;font-size:13px">Amount</td><td style="padding:6px 0;font-size:18px;font-weight:700;color:#0369a1">${fmt(info.amountCents)}</td></tr>
      </table>
    </div>
    <div style="text-align:center">
      <a href="${approvalUrl}" style="background:#0369a1;color:#fff;padding:13px 32px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;display:inline-block">
        Review &amp; approve →
      </a>
    </div>
  </div>
  <div style="background:#f5f6fa;padding:16px;text-align:center;font-size:11px;color:#aaa">
    AlgoLend · MINT Platforms (Pty) Ltd — internal approval request
  </div>
</div>
</body></html>`;
}

export function proposalApprovalResultEmail(info: {
  agentName:  string;
  leadName:   string;
  company:    string;
  amountCents: number;
  approved:   boolean;
  rejectionNote?: string;
}) {
  const fmt = (c: number) =>
    new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', minimumFractionDigits: 0 }).format(c / 100);
  return `<!DOCTYPE html>
<html><body style="font-family:Arial,sans-serif;color:#1a1f36;background:#f5f6fa;margin:0;padding:24px">
<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.08)">
  <div style="background:${info.approved ? 'linear-gradient(135deg,#059669,#34D399)' : '#dc2626'};padding:28px 32px">
    <p style="color:#fff;font-size:20px;font-weight:700;margin:0">
      Proposal ${info.approved ? 'approved' : 'not approved'}
    </p>
    <p style="color:rgba(255,255,255,0.8);font-size:13px;margin:4px 0 0">${info.leadName} · ${info.company}</p>
  </div>
  <div style="padding:28px 32px">
    <p style="font-size:15px;margin:0 0 6px">Hi ${info.agentName},</p>
    <p style="color:#555;line-height:1.6;margin:0 0 20px">
      ${info.approved
        ? `Your proposal for <strong>${fmt(info.amountCents)}</strong> to <strong>${info.company}</strong> has been approved. You can now send it to the client.`
        : `Your proposal for <strong>${fmt(info.amountCents)}</strong> to <strong>${info.company}</strong> was not approved by your manager.`}
    </p>
    ${!info.approved && info.rejectionNote ? `
    <div style="background:#fef2f2;border-left:3px solid #dc2626;padding:14px 16px;border-radius:0 8px 8px 0;margin-bottom:20px">
      <p style="font-size:13px;color:#555;margin:0;font-style:italic">"${info.rejectionNote}"</p>
    </div>` : ''}
    <p style="color:#888;font-size:13px;line-height:1.6">
      ${info.approved
        ? 'Log into the portal to send the proposal to your client.'
        : 'Please review the feedback and update the proposal before resubmitting.'}
    </p>
  </div>
  <div style="background:#f5f6fa;padding:16px;text-align:center;font-size:11px;color:#aaa">
    AlgoLend · MINT Platforms (Pty) Ltd
  </div>
</div>
</body></html>`;
}

export function followUpReminderEmail(info: {
  agentName: string;
  todayLabel: string;
  followUps: {
    leadId:   string;
    leadName: string;
    company:  string;
    phone:    string;
    type:     string;
    note:     string | null;
    dueDate:  string;
    isOverdue: boolean;
  }[];
  portalUrl: string;
}) {
  const rows = info.followUps.map(f => `
    <tr style="border-bottom:1px solid #eee">
      <td style="padding:12px 8px;vertical-align:top">
        <p style="margin:0;font-weight:600;font-size:14px;color:#1a1f36">
          <a href="${info.portalUrl}/telemarketer/leads/${f.leadId}" style="color:#7C3AED;text-decoration:none">${f.leadName}</a>
        </p>
        <p style="margin:2px 0 0;font-size:12px;color:#888">${f.company}</p>
      </td>
      <td style="padding:12px 8px;font-size:13px;color:#555;vertical-align:top">
        <a href="tel:${f.phone}" style="color:#1a1f36;text-decoration:none">${f.phone}</a>
      </td>
      <td style="padding:12px 8px;vertical-align:top;text-align:center">
        <span style="font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px;background:rgba(124,58,237,0.1);color:#7C3AED;white-space:nowrap">
          ${f.type}
        </span>
      </td>
      <td style="padding:12px 8px;vertical-align:top">
        ${f.isOverdue
          ? `<span style="font-size:11px;font-weight:700;padding:3px 8px;border-radius:20px;background:#fef2f2;color:#dc2626">Overdue · ${f.dueDate}</span>`
          : `<span style="font-size:11px;font-weight:700;padding:3px 8px;border-radius:20px;background:#fefce8;color:#92400e">Today</span>`}
        ${f.note ? `<p style="margin:4px 0 0;font-size:12px;color:#888;font-style:italic">"${f.note}"</p>` : ''}
      </td>
    </tr>`).join('');

  const overdueCount = info.followUps.filter(f => f.isOverdue).length;
  const todayCount   = info.followUps.length - overdueCount;

  return `<!DOCTYPE html>
<html><body style="font-family:Arial,sans-serif;color:#1a1f36;background:#f5f6fa;margin:0;padding:24px">
<div style="max-width:660px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.08)">
  <div style="background:linear-gradient(135deg,#7C3AED,#9B5CF6);padding:28px 32px">
    <p style="color:rgba(255,255,255,0.7);font-size:11px;letter-spacing:3px;text-transform:uppercase;margin:0 0 4px">AlgoLend</p>
    <p style="color:#fff;font-size:20px;font-weight:700;margin:0">
      ${info.followUps.length} follow-up${info.followUps.length !== 1 ? 's' : ''} need your attention
    </p>
    <p style="color:rgba(255,255,255,0.8);font-size:13px;margin:6px 0 0">${info.todayLabel}</p>
  </div>
  <div style="padding:32px">
    <p style="font-size:15px;margin:0 0 6px">Hi ${info.agentName},</p>
    <p style="color:#555;line-height:1.6;margin:0 0 24px">
      Here's your follow-up summary for today.
      ${overdueCount > 0 ? `<strong style="color:#dc2626">${overdueCount} overdue</strong> and ` : ''}
      ${todayCount > 0 ? `<strong>${todayCount} due today</strong>.` : ''}
    </p>

    <table style="width:100%;border-collapse:collapse">
      <thead>
        <tr style="background:#f5f6fa">
          <th style="padding:10px 8px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#888">Lead</th>
          <th style="padding:10px 8px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#888">Phone</th>
          <th style="padding:10px 8px;text-align:center;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#888">Type</th>
          <th style="padding:10px 8px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#888">Status / Note</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>

    <div style="text-align:center;margin:28px 0 16px">
      <a href="${info.portalUrl}/telemarketer/follow-ups"
        style="background:#7C3AED;color:#fff;padding:13px 32px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;display:inline-block">
        Open follow-ups →
      </a>
    </div>
    <p style="color:#aaa;font-size:12px;text-align:center;margin:0">
      Mark each follow-up complete in the portal once done.
    </p>
  </div>
  <div style="background:#f5f6fa;padding:20px;text-align:center;font-size:12px;color:#aaa">
    AlgoLend · MINT Platforms (Pty) Ltd — daily follow-up digest
  </div>
</div>
</body></html>`;
}

export function biztechQuoteEmail(q: {
  reference: string; clientName: string; contact: string;
  totalCents: number; validUntil: string | null; quoteId: string;
}) {
  const fmt = (c: number) =>
    new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', minimumFractionDigits: 2 }).format(c / 100);
  const viewUrl = `https://algolend.co.za/biztech-quote/${q.quoteId}`;

  return `<!DOCTYPE html>
<html><body style="font-family:Arial,sans-serif;color:#1a1f36;background:#f5f6fa;margin:0;padding:24px">
<div style="max-width:600px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.08)">
  <div style="background:linear-gradient(135deg,#31005E,#5C3BCF);padding:32px;text-align:center">
    <p style="color:#fff;font-size:24px;font-weight:700;margin:0">MINT<span style="color:#DDC357">BizTech</span></p>
    <p style="color:rgba(255,255,255,0.7);font-size:12px;letter-spacing:3px;text-transform:uppercase;margin:4px 0 0">Quote</p>
  </div>
  <div style="padding:32px">
    <p style="font-size:16px;margin:0 0 8px">Hi ${q.contact},</p>
    <p style="color:#555;line-height:1.6;margin:0 0 24px">
      Please find your quote from MINT BizTech below${q.validUntil ? `, valid until <strong>${q.validUntil}</strong>` : ''}.
    </p>
    <div style="background:#f5f2ff;border:1px solid #e5e0ff;border-radius:12px;padding:20px;margin-bottom:24px;text-align:center">
      <p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#5C3BCF;margin:0 0 12px">${q.reference}</p>
      <p style="font-size:28px;font-weight:700;color:#5C3BCF;margin:0">${fmt(q.totalCents)}</p>
    </div>
    <div style="text-align:center;margin:24px 0">
      <a href="${viewUrl}" style="background:#5C3BCF;color:#fff;padding:14px 36px;border-radius:10px;text-decoration:none;font-weight:700;font-size:16px;display:inline-block">
        View quote &amp; respond →
      </a>
    </div>
    <p style="color:#888;font-size:13px;line-height:1.6">
      Questions? Reply to this email or contact <a href="mailto:accounts@mymint.co.za" style="color:#5C3BCF">accounts@mymint.co.za</a>.
    </p>
  </div>
  <div style="background:#f5f6fa;padding:20px;text-align:center;font-size:12px;color:#aaa">
    MINT BizTech · MINT Platforms (Pty) Ltd
  </div>
</div>
</body></html>`;
}
