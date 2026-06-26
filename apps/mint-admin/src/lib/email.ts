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
    AlgoLend · Mint Platforms (Pty) Ltd · <a href="https://mintplatforms.co.za" style="color:#7C3AED">mintplatforms.co.za</a>
  </div>
</div>
</body></html>`;
}

export function invoiceReminderEmail(inv: {
  reference: string; clientName: string; contact: string;
  totalCents: number; dueDate: string; daysOverdue: number;
}) {
  const fmt = (c: number) =>
    new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', minimumFractionDigits: 2 }).format(c / 100);
  const isOverdue = inv.daysOverdue > 0;

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
      <p style="color:#888;font-size:13px;margin:4px 0 0">Amount due</p>
    </div>
    <p style="color:#555;font-size:14px">Please arrange payment at your earliest convenience. If you have already paid, please disregard this message.</p>
  </div>
  <div style="background:#f5f6fa;padding:20px;text-align:center;font-size:12px;color:#aaa">
    AlgoLend · Mint Platforms (Pty) Ltd
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
    AlgoLend · Mint Platforms (Pty) Ltd
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
    AlgoLend · Mint Platforms (Pty) Ltd
  </div>
</div>
</body></html>`;
}

export function invoiceReadyEmail(inv: {
  reference: string; clientName: string; contact: string;
  periodStart: string; periodEnd: string;
  subtotalCents: number; vatCents: number; totalCents: number;
  dueDate: string; lineCount: number;
}) {
  const fmt = (c: number) =>
    new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', minimumFractionDigits: 2 }).format(c / 100);
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
      Please find your invoice for the period <strong>${inv.periodStart} – ${inv.periodEnd}</strong> attached below.
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
    <p style="color:#555;font-size:14px;line-height:1.6">Payment is due by <strong>${inv.dueDate}</strong>. Please use <strong>${inv.reference}</strong> as your payment reference.</p>
    <p style="color:#888;font-size:13px;margin-top:16px">Questions? Reply to this email or contact <a href="mailto:accounts@algolend.co.za" style="color:#7C3AED">accounts@algolend.co.za</a>.</p>
  </div>
  <div style="background:#f5f6fa;padding:20px;text-align:center;font-size:12px;color:#aaa">
    AlgoLend · Mint Platforms (Pty) Ltd · accounts@algolend.co.za
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
    AlgoLend · Mint Platforms (Pty) Ltd — this is an internal notification
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
    AlgoLend · Mint Platforms (Pty) Ltd
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
    AlgoLend · Mint Platforms (Pty) Ltd
  </div>
</div>
</body></html>`;
}
