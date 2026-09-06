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
  attachments?: Array<{
    filename: string;
    content:  Buffer | string;
  }>;
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

// ── Shared visual shell ─────────────────────────────────────────────
// One card design for every transactional email: hero header image, big
// heading, greeting + intro, a content slot, an optional pill CTA button,
// and a consistent footer. Modeled on the template proven out in
// MyMintAdmin (api/_orderbook.js → buildEmailHtml) so every email this app
// sends — AlgoLend and BizTech alike — looks like one product family.

const HEADER_IMG = 'https://admin.algolend.co.za/images/email-header.jpg';

function emailShell(opts: {
  eyebrow?:      string;
  heading:       string;
  headingColor?: string;
  contact?:      string;
  introHtml?:    string;
  bodyHtml:      string;
  ctaLabel?:     string;
  ctaUrl?:       string;
  ctaColor?:     string;
  footerNote?:   string;
  preheader?:    string;
  brand?:        string;
  siteUrl?:      string;
}): string {
  const {
    eyebrow, heading, headingColor = '#0f172a', contact, introHtml, bodyHtml,
    ctaLabel, ctaUrl, ctaColor = '#7C3AED', footerNote, preheader,
    brand = 'AlgoLend', siteUrl = 'https://admin.algolend.co.za',
  } = opts;
  const preheaderText = (preheader ?? introHtml ?? heading).replace(/<[^>]+>/g, '');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only">
<title>${heading}</title>
</head>
<body style="margin:0;padding:0;background:#f5f6fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<span style="display:none!important;visibility:hidden;mso-hide:all;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${preheaderText}</span>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#f5f6fa" style="background:#f5f6fa;">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 8px 32px rgba(15,23,42,0.08);">
<tr><td style="padding:0;">
<img src="${HEADER_IMG}" alt="${brand}" width="600" style="width:100%;max-width:600px;height:auto;display:block;border-radius:18px 18px 0 0;" />
</td></tr>
<tr><td style="padding:32px 36px 0 36px;">
${eyebrow ? `<p style="margin:0 0 8px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#7C3AED;">${eyebrow}</p>` : ''}
<h1 style="margin:0;color:${headingColor};font-size:24px;line-height:1.25;font-weight:800;letter-spacing:-0.4px;">${heading}</h1>
</td></tr>
${(contact || introHtml) ? `<tr><td style="padding:18px 36px 0 36px;">
${contact ? `<p style="margin:0 0 8px 0;font-size:15px;color:#1e293b;font-weight:600;">Hi ${contact},</p>` : ''}
${introHtml ? `<p style="margin:0;font-size:14px;color:#475569;line-height:1.6;">${introHtml}</p>` : ''}
</td></tr>` : ''}
<tr><td style="padding:20px 36px 0 36px;">
${bodyHtml}
</td></tr>
${(ctaLabel && ctaUrl) ? `<tr><td style="padding:28px 36px 4px 36px;text-align:center;">
<table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center"><tr>
<td style="border-radius:999px;background:${ctaColor};">
<a href="${ctaUrl}" target="_blank" style="display:inline-block;padding:14px 36px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:999px;letter-spacing:0.2px;">${ctaLabel}</a>
</td></tr></table>
</td></tr>` : ''}
<tr><td style="padding:24px 36px 32px 36px;border-top:1px solid #f0f0f3;">
${footerNote ? `<p style="margin:0 0 10px 0;font-size:12px;color:#94a3b8;line-height:1.6;">${footerNote}</p>` : ''}
<p style="margin:0;font-size:11px;color:#94a3b8;">&copy; ${new Date().getFullYear()} ${brand} &middot; MINT Platforms (Pty) Ltd &middot; <a href="${siteUrl}" style="color:#94a3b8;text-decoration:underline;">${siteUrl.replace(/^https?:\/\//, '')}</a></p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

/** Row of 2-3 labelled cells in a light-violet info banner (reference, due date, etc). */
function emailBanner(cells: { label: string; value: string; mono?: boolean }[], opts?: { bg?: string; border?: string; labelColor?: string }): string {
  const bg         = opts?.bg ?? '#faf7ff';
  const border     = opts?.border ?? '#ede5ff';
  const labelColor = opts?.labelColor ?? '#7C3AED';
  const width      = Math.floor(100 / cells.length);
  return `<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:${bg};border:1px solid ${border};border-radius:12px;">
<tr>${cells.map((c, i) => `<td style="padding:16px 20px;text-align:center;${i < cells.length - 1 ? `border-right:1px solid ${border};` : ''}width:${width}%;">
<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:${labelColor};margin-bottom:4px;">${c.label}</div>
<div style="font-size:13px;font-weight:700;color:#0f172a;${c.mono ? 'font-family:monospace,monospace;' : ''}">${c.value}</div>
</td>`).join('')}</tr>
</table>`;
}

/** Big centered callout — amount due, quota %, etc. */
function emailCallout(value: string, sub: string, opts?: { bg?: string; border?: string; color?: string }): string {
  const bg    = opts?.bg ?? '#faf7ff';
  const border = opts?.border ?? '#ede5ff';
  const color = opts?.color ?? '#7C3AED';
  return `<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:${bg};border:1px solid ${border};border-radius:12px;">
<tr><td style="padding:20px;text-align:center;">
<p style="font-size:30px;font-weight:800;color:${color};margin:0;">${value}</p>
<p style="font-size:13px;color:#64748b;margin:6px 0 0;">${sub}</p>
</td></tr>
</table>`;
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

  return emailShell({
    eyebrow:   'Platform Quote',
    heading:   'Your AlgoLend proposal',
    contact:   q.contact,
    introHtml: `Thank you for your interest in AlgoLend. Please find your custom proposal for <strong>${q.client}</strong> below.`,
    bodyHtml: `
<div style="background:#faf7ff;border:1px solid #ede5ff;border-radius:12px;padding:20px;">
  <p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#7C3AED;margin:0 0 12px">Quote ${q.id}</p>
  <table style="width:100%;border-collapse:collapse">
    <tr><td style="padding:6px 0;color:#475569;font-size:14px">One-off implementation fee</td><td style="text-align:right;font-weight:600;font-size:14px;color:#0f172a">${fmt(q.setupFee)}</td></tr>
    <tr><td style="padding:6px 0;color:#475569;font-size:14px">Monthly platform licence</td><td style="text-align:right;font-weight:600;font-size:14px;color:#0f172a">${fmt(q.monthlyFee)}/mo</td></tr>
    ${q.addOns.length ? `<tr><td style="padding:6px 0;color:#475569;font-size:14px">Add-ons</td><td style="text-align:right;font-size:13px;color:#64748b">${q.addOns.join(', ')}</td></tr>` : ''}
    <tr style="border-top:2px solid #7C3AED"><td style="padding:12px 0 0;font-weight:700;font-size:16px;color:#0f172a">Year-one total</td><td style="text-align:right;font-weight:800;font-size:18px;color:#7C3AED;padding-top:12px">${fmt(year1)}</td></tr>
  </table>
</div>
<p style="color:#64748b;font-size:13px;margin:16px 0 0">This proposal is valid until <strong>${q.validUntil}</strong>.</p>
<p style="color:#475569;font-size:14px;line-height:1.6;margin-top:12px">
  To proceed, simply reply to this email or contact your AlgoLend account manager. We'll have you live within days.
</p>`,
  });
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

  return emailShell({
    eyebrow:      inv.reference,
    heading:      isOverdue ? `Invoice overdue — ${inv.daysOverdue} days` : 'Invoice payment reminder',
    headingColor: isOverdue ? '#dc2626' : undefined,
    contact:      inv.contact,
    introHtml:    isOverdue
      ? `Your invoice <strong>${inv.reference}</strong> for <strong>${fmt(inv.totalCents)}</strong> was due on <strong>${inv.dueDate}</strong> and is now <strong>${inv.daysOverdue} days overdue</strong>.`
      : `This is a friendly reminder that invoice <strong>${inv.reference}</strong> for <strong>${fmt(inv.totalCents)}</strong> is due on <strong>${inv.dueDate}</strong>.`,
    bodyHtml: `
${emailCallout(fmt(inv.totalCents), `Amount due &middot; Reference: ${inv.reference}`)}
${paymentUrl ? `
<p style="color:#94a3b8;font-size:12px;text-align:center;margin:14px 0 0">Card, instant EFT, or SnapScan — secured by PayFast</p>
<p style="color:#94a3b8;font-size:13px;line-height:1.6;border-top:1px solid #f0f0f3;padding-top:20px;margin-top:20px">
  Prefer to pay via bank transfer? Use reference <strong style="color:#475569">${inv.reference}</strong> and email your proof of payment to
  <a href="mailto:accounts@algolend.co.za" style="color:#7C3AED">accounts@algolend.co.za</a>.
</p>` : `
<p style="color:#475569;font-size:14px;margin-top:16px">Please arrange payment at your earliest convenience. If you have already paid, please disregard this message.</p>`}`,
    ctaLabel: paymentUrl ? `Pay ${fmt(inv.totalCents)} now →` : undefined,
    ctaUrl:   paymentUrl ?? undefined,
  });
}

export function quotaWarningEmail(q: {
  clientName: string; contact: string; slug: string;
  used: number; limit: number; pct: number;
}) {
  return emailShell({
    eyebrow:      `${q.clientName} · AlgoLend Platform`,
    heading:      'API quota warning',
    headingColor: '#d97706',
    contact:      q.contact,
    introHtml:    `Your AlgoLend deployment has used <strong>${q.pct}%</strong> of its monthly API quota.`,
    bodyHtml: `
${emailCallout(`${q.pct}%`, `${q.used.toLocaleString()} of ${q.limit.toLocaleString()} calls used this month`, { bg: '#fffbeb', border: '#fde68a', color: '#d97706' })}
<p style="color:#475569;font-size:14px;line-height:1.6;margin-top:16px">
  At current usage, you may reach your limit before the end of the month. Contact your AlgoLend account manager to top up your quota and avoid any service interruption.
</p>
<p style="color:#94a3b8;font-size:13px;margin-top:12px">
  Email <a href="mailto:support@mintplatforms.co.za" style="color:#7C3AED">support@mintplatforms.co.za</a> to arrange a top-up.
</p>`,
  });
}

export function quotaExceededEmail(q: {
  clientName: string; contact: string; slug: string;
  used: number; limit: number;
}) {
  return emailShell({
    eyebrow:      `${q.clientName} · AlgoLend Platform`,
    heading:      'API quota exhausted — service paused',
    headingColor: '#dc2626',
    contact:      q.contact,
    introHtml:    `Your AlgoLend deployment has reached its monthly API quota of <strong>${q.limit.toLocaleString()} calls</strong>. External API calls (Experian, TruID, SureSystems) are <strong>blocked</strong> until your quota is topped up or the month resets.`,
    bodyHtml: `
${emailCallout('100%', `${q.used.toLocaleString()} calls — monthly limit reached`, { bg: '#fef2f2', border: '#fecaca', color: '#dc2626' })}
<p style="color:#475569;font-size:14px;line-height:1.6;margin-top:16px">
  <strong>To restore service immediately</strong>, contact your AlgoLend account manager to purchase additional quota. Your manager can add units within minutes.
</p>
<p style="color:#94a3b8;font-size:13px;margin-top:12px">Quota resets automatically on the 1st of next month.</p>`,
    ctaLabel: 'Request top-up →',
    ctaUrl:   `mailto:support@mintplatforms.co.za?subject=Quota%20Top-Up%20Request%20—%20${encodeURIComponent(q.slug)}`,
  });
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

  return emailShell({
    eyebrow:   'Tax Invoice',
    heading:   'Your AlgoLend invoice',
    contact:   inv.contact,
    introHtml: `Please find your invoice for the period <strong>${inv.periodStart} – ${inv.periodEnd}</strong> below.`,
    bodyHtml: `
<div style="background:#faf7ff;border:1px solid #ede5ff;border-radius:12px;padding:20px;">
  <p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#7C3AED;margin:0 0 12px">${inv.reference}</p>
  <table style="width:100%;border-collapse:collapse">
    <tr><td style="padding:5px 0;color:#475569;font-size:14px">${inv.lineCount} line item${inv.lineCount !== 1 ? 's' : ''}</td><td style="text-align:right;color:#64748b;font-size:13px">subtotal</td></tr>
    <tr><td style="padding:5px 0;color:#475569;font-size:14px">Subtotal</td><td style="text-align:right;font-weight:600;color:#0f172a">${fmt(inv.subtotalCents)}</td></tr>
    <tr><td style="padding:5px 0;color:#475569;font-size:14px">VAT (15%)</td><td style="text-align:right;color:#0f172a">${fmt(inv.vatCents)}</td></tr>
    <tr style="border-top:2px solid #7C3AED"><td style="padding:10px 0 0;font-weight:700;font-size:16px;color:#0f172a">Total Due</td><td style="text-align:right;font-weight:800;font-size:18px;color:#7C3AED;padding-top:10px">${fmt(inv.totalCents)}</td></tr>
  </table>
</div>
${paymentUrl ? `
<p style="color:#94a3b8;font-size:12px;text-align:center;margin:14px 0 0">Card, instant EFT, or SnapScan — secured by PayFast</p>
<p style="color:#94a3b8;font-size:13px;line-height:1.6;border-top:1px solid #f0f0f3;padding-top:20px;margin-top:20px">
  Prefer a bank transfer? Use reference <strong style="color:#475569">${inv.reference}</strong> and email your proof of payment to
  <a href="mailto:accounts@algolend.co.za" style="color:#7C3AED">accounts@algolend.co.za</a>.
</p>` : `
<p style="color:#475569;font-size:14px;line-height:1.6;margin-top:16px">Payment is due by <strong>${inv.dueDate}</strong>. Please use <strong>${inv.reference}</strong> as your payment reference.</p>
<p style="color:#94a3b8;font-size:13px;margin-top:12px">Questions? Reply to this email or contact <a href="mailto:accounts@algolend.co.za" style="color:#7C3AED">accounts@algolend.co.za</a>.</p>`}`,
    ctaLabel: paymentUrl ? `Pay ${fmt(inv.totalCents)} now →` : undefined,
    ctaUrl:   paymentUrl ?? undefined,
  });
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

  return emailShell({
    eyebrow: `${req.clientName} — ${req.tier} tier`,
    heading: 'Upgrade request',
    bodyHtml: `
<p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 12px">${detail}</p>
${req.note ? `<div style="background:#faf7ff;border-left:3px solid #7C3AED;padding:12px 16px;margin:12px 0;font-size:14px;color:#475569;border-radius:0 8px 8px 0;">"${req.note}"</div>` : ''}
<p style="color:#475569;font-size:14px;margin-top:8px">Contact: <strong>${req.contact}</strong></p>`,
    ctaLabel:   'View in admin →',
    ctaUrl:     'https://admin.algolend.co.za/clients',
    footerNote: 'This is an internal notification.',
  });
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
  return emailShell({
    eyebrow:   inv.clientName,
    heading:   `You're invited to AlgoLend`,
    contact:   inv.fullName,
    introHtml: `You've been invited to join <strong>${inv.clientName}</strong> on the AlgoLend platform as a <strong>${roleLabel[inv.role] ?? inv.role}</strong>. Click the button below to set your password and get started.`,
    bodyHtml: `
<p style="color:#94a3b8;font-size:13px;text-align:center;margin:0">
  This link expires in 24 hours. If you didn't expect this email, you can safely ignore it.
</p>
<hr style="border:none;border-top:1px solid #f0f0f3;margin:24px 0">
<p style="color:#94a3b8;font-size:12px;margin:0">
  Invited to: ${inv.email}<br>
  Platform: <a href="https://admin.algolend.co.za" style="color:#7C3AED">admin.algolend.co.za</a>
</p>`,
    ctaLabel: 'Accept invitation →',
    ctaUrl:   inv.inviteUrl,
  });
}

export function welcomeClientEmail(client: {
  name: string; contact: string; slug: string; portalUrl: string;
}) {
  return emailShell({
    eyebrow:   'Your lending platform is ready',
    heading:   'Welcome to AlgoLend!',
    contact:   client.contact,
    introHtml: `We're excited to welcome <strong>${client.name}</strong> to the AlgoLend platform. Your deployment is live and ready to use.`,
    bodyHtml: `
<p style="color:#94a3b8;font-size:13px;margin:0">Your portal URL: <a href="${client.portalUrl}" style="color:#7C3AED">${client.portalUrl}</a></p>
<p style="color:#475569;font-size:14px;line-height:1.6;margin-top:16px">
  Your dedicated account manager will be in touch shortly to walk you through the platform. In the meantime, feel free to reach out to <a href="mailto:support@mintplatforms.co.za" style="color:#7C3AED">support@mintplatforms.co.za</a>.
</p>`,
    ctaLabel: 'Access your portal →',
    ctaUrl:   client.portalUrl,
  });
}

export function biztechInvoiceReminderEmail(inv: {
  reference: string; clientName: string; contact: string;
  totalCents: number; dueDate: string; daysOverdue: number;
  invoiceId?: string;
}) {
  const fmt = (c: number) =>
    new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', minimumFractionDigits: 2 }).format(c / 100);
  const isOverdue = inv.daysOverdue > 0;
  const payUrl    = inv.invoiceId ? `https://algolend.co.za/biztech-invoice/${inv.invoiceId}` : null;

  return emailShell({
    brand:        'MINT BizTech',
    siteUrl:      'https://www.mymint.co.za',
    eyebrow:      inv.reference,
    heading:      isOverdue ? `Invoice overdue — ${inv.daysOverdue} days` : 'Invoice payment reminder',
    headingColor: isOverdue ? '#dc2626' : undefined,
    contact:      inv.contact,
    introHtml:    isOverdue
      ? `Your invoice <strong>${inv.reference}</strong> for <strong>${fmt(inv.totalCents)}</strong> was due on <strong>${inv.dueDate}</strong> and is now <strong>${inv.daysOverdue} days overdue</strong>.`
      : `This is a friendly reminder that invoice <strong>${inv.reference}</strong> for <strong>${fmt(inv.totalCents)}</strong> is due on <strong>${inv.dueDate}</strong>.`,
    bodyHtml: `
${emailCallout(fmt(inv.totalCents), `Amount due &middot; Reference: ${inv.reference}`, { bg: '#f5f2ff', border: '#e5e0ff', color: '#5C3BCF' })}
<p style="color:#94a3b8;font-size:13px;line-height:1.6;border-top:1px solid #f0f0f3;padding-top:20px;margin-top:20px">
  Prefer a bank transfer? Use reference <strong style="color:#475569">${inv.reference}</strong> and email your proof of payment to
  <a href="mailto:accounts@mymint.co.za" style="color:#5C3BCF">accounts@mymint.co.za</a>.
</p>`,
    ctaLabel: payUrl ? `View & pay ${fmt(inv.totalCents)} →` : undefined,
    ctaUrl:   payUrl ?? undefined,
    ctaColor: '#5C3BCF',
  });
}

export function biztechInvoiceReadyEmail(inv: {
  reference: string; clientName: string; contact: string;
  totalCents: number; dueDate: string; invoiceId: string;
}) {
  const fmt = (c: number) =>
    new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', minimumFractionDigits: 2 }).format(c / 100);
  const payUrl = `https://algolend.co.za/biztech-invoice/${inv.invoiceId}`;

  return emailShell({
    brand:     'MINT BizTech',
    siteUrl:   'https://www.mymint.co.za',
    eyebrow:   'Tax Invoice',
    heading:   'Your MINT BizTech invoice',
    contact:   inv.contact,
    introHtml: 'Please find your invoice from MINT BizTech below.',
    bodyHtml:  emailBanner(
      [{ label: 'Reference', value: inv.reference, mono: true }, { label: 'Due', value: inv.dueDate }],
      { bg: '#f5f2ff', border: '#e5e0ff', labelColor: '#5C3BCF' },
    ) + `
<div style="text-align:center;margin-top:16px">
  <p style="font-size:28px;font-weight:800;color:#5C3BCF;margin:0">${fmt(inv.totalCents)}</p>
</div>
<p style="color:#94a3b8;font-size:13px;line-height:1.6;border-top:1px solid #f0f0f3;padding-top:20px;margin-top:20px">
  Prefer a bank transfer? Use reference <strong style="color:#475569">${inv.reference}</strong> and email your proof of payment to
  <a href="mailto:accounts@mymint.co.za" style="color:#5C3BCF">accounts@mymint.co.za</a>.
</p>`,
    ctaLabel: `View & pay ${fmt(inv.totalCents)} →`,
    ctaUrl:   payUrl,
    ctaColor: '#5C3BCF',
  });
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
    <tr style="border-bottom:1px solid #f0f0f3">
      <td style="padding:10px 8px;font-size:14px;color:#0f172a">${c.clientName}</td>
      <td style="padding:10px 8px;font-size:14px;color:#475569;text-align:right">${c.loanAmount ? fmtR(c.loanAmount) : '—'}</td>
      <td style="padding:10px 8px;font-size:14px;font-weight:600;color:#7C3AED;text-align:right">${fmtR(c.commissionAmount)}</td>
      <td style="padding:10px 8px;text-align:center">
        <span style="font-size:11px;font-weight:700;padding:2px 8px;border-radius:20px;
          background:${c.status === 'Paid' ? '#d1fae5' : c.status === 'Payroll Ready' ? '#dbeafe' : '#fef3c7'};
          color:${c.status === 'Paid' ? '#065f46' : c.status === 'Payroll Ready' ? '#1e40af' : '#92400e'}">
          ${c.status}
        </span>
      </td>
      <td style="padding:10px 8px;font-size:13px;color:#94a3b8;text-align:right">
        ${c.payrollDate ? new Date(c.payrollDate + 'T00:00:00').toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
      </td>
    </tr>`).join('');

  return emailShell({
    eyebrow:   'AlgoLend',
    heading:   'Commission statement',
    contact:   stmt.agentName,
    introHtml: `Please find your commission statement for <strong>${stmt.month}</strong> below. Commission becomes payable once a client's first deduction is successful.`,
    bodyHtml: `
<table style="width:100%;border-collapse:collapse;margin-bottom:20px">
  <tr>
    <td style="width:25%;padding:16px;background:#faf7ff;border-radius:8px;text-align:center">
      <p style="font-size:18px;font-weight:700;color:#7C3AED;margin:0">${fmtR(total)}</p>
      <p style="font-size:11px;color:#94a3b8;margin:4px 0 0;text-transform:uppercase;letter-spacing:1px">Total</p>
    </td>
    <td style="width:4%"></td>
    <td style="width:22%;padding:16px;background:#fffbeb;border-radius:8px;text-align:center">
      <p style="font-size:16px;font-weight:700;color:#92400e;margin:0">${fmtR(pending)}</p>
      <p style="font-size:11px;color:#94a3b8;margin:4px 0 0;text-transform:uppercase;letter-spacing:1px">Pending</p>
    </td>
    <td style="width:4%"></td>
    <td style="width:22%;padding:16px;background:#dbeafe;border-radius:8px;text-align:center">
      <p style="font-size:16px;font-weight:700;color:#1e40af;margin:0">${fmtR(payrollReady)}</p>
      <p style="font-size:11px;color:#94a3b8;margin:4px 0 0;text-transform:uppercase;letter-spacing:1px">Payroll Ready</p>
    </td>
    <td style="width:4%"></td>
    <td style="width:22%;padding:16px;background:#d1fae5;border-radius:8px;text-align:center">
      <p style="font-size:16px;font-weight:700;color:#065f46;margin:0">${fmtR(paid)}</p>
      <p style="font-size:11px;color:#94a3b8;margin:4px 0 0;text-transform:uppercase;letter-spacing:1px">Paid</p>
    </td>
  </tr>
</table>
<table style="width:100%;border-collapse:collapse;font-size:13px">
  <thead>
    <tr style="background:#f5f6fa">
      <th style="padding:10px 8px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#94a3b8">Client</th>
      <th style="padding:10px 8px;text-align:right;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#94a3b8">Loan Amount</th>
      <th style="padding:10px 8px;text-align:right;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#94a3b8">Commission</th>
      <th style="padding:10px 8px;text-align:center;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#94a3b8">Status</th>
      <th style="padding:10px 8px;text-align:right;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#94a3b8">Payroll Date</th>
    </tr>
  </thead>
  <tbody>${rows}</tbody>
  <tfoot>
    <tr style="background:#faf7ff">
      <td colspan="2" style="padding:12px 8px;font-weight:700;font-size:14px;color:#0f172a">Total Commission — ${stmt.month}</td>
      <td style="padding:12px 8px;text-align:right;font-weight:700;font-size:16px;color:#7C3AED">${fmtR(total)}</td>
      <td colspan="2"></td>
    </tr>
  </tfoot>
</table>
<p style="color:#94a3b8;font-size:13px;line-height:1.6;margin-top:20px;border-top:1px solid #f0f0f3;padding-top:16px">
  Questions about your commission? Contact your manager or email
  <a href="mailto:hr@algolend.co.za" style="color:#7C3AED">hr@algolend.co.za</a>.
</p>`,
    footerNote: 'This is a confidential commission statement.',
  });
}

export function demoBookingEmail(info: {
  leadName: string;
  leadCompany: string;
  leadEmail: string;
  agentName: string;
}) {
  return emailShell({
    eyebrow:   'AlgoLend · Telemarketer Pipeline',
    heading:   'Demo booked',
    introHtml: `<strong>${info.agentName}</strong> has booked a demo for a new prospect.`,
    bodyHtml: `
<div style="background:#faf7ff;border:1px solid #ede5ff;border-radius:12px;padding:20px;">
  <table style="width:100%;border-collapse:collapse">
    <tr><td style="padding:5px 0;color:#94a3b8;font-size:13px;width:110px">Contact</td><td style="padding:5px 0;font-weight:600;color:#0f172a">${info.leadName}</td></tr>
    <tr><td style="padding:5px 0;color:#94a3b8;font-size:13px">Company</td><td style="padding:5px 0;font-weight:600;color:#0f172a">${info.leadCompany}</td></tr>
    <tr><td style="padding:5px 0;color:#94a3b8;font-size:13px">Email</td><td style="padding:5px 0"><a href="mailto:${info.leadEmail}" style="color:#7C3AED">${info.leadEmail}</a></td></tr>
    <tr><td style="padding:5px 0;color:#94a3b8;font-size:13px">Agent</td><td style="padding:5px 0;color:#0f172a">${info.agentName}</td></tr>
  </table>
</div>`,
    ctaLabel:   'View lead in admin →',
    ctaUrl:     'https://admin.mintplatforms.co.za/leads',
    footerNote: 'Internal notification.',
  });
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

  return emailShell({
    eyebrow:      `AlgoLend · ${info.clientName}`,
    heading:      isPaid ? 'Commission paid' : 'Commission approved for payroll',
    headingColor: isPaid ? '#059669' : undefined,
    contact:      info.agentName,
    introHtml:    isPaid
      ? `Great news — your commission for <strong>${info.clientName}</strong> has been paid.`
      : `Your commission for <strong>${info.clientName}</strong> has been approved and added to the next payroll run.`,
    bodyHtml: `
${emailCallout(fmtR(info.commissionAmount), `${info.clientName} · ${info.status}${info.payrollDate ? ` · Payroll date: ${info.payrollDate}` : ''}`, isPaid ? { bg: '#f0fdf4', border: '#bbf7d0', color: '#059669' } : undefined)}
<p style="color:#94a3b8;font-size:13px;line-height:1.6;margin-top:16px">
  Questions about your commission? Contact your manager or email
  <a href="mailto:hr@algolend.co.za" style="color:#7C3AED">hr@algolend.co.za</a>.
</p>`,
    footerNote: 'This is a confidential commission notification.',
  });
}

export function newLeadNotificationEmail(info: {
  agentName: string;
  lead: {
    id:      string;
    name:    string;
    company: string;
    phone:   string | null;
    email:   string | null;
    message: string | null;
  };
  portalUrl: string;
}) {
  const leadUrl = `${info.portalUrl}/telemarketer/leads/${info.lead.id}`;
  return emailShell({
    eyebrow:   'AlgoLend',
    heading:   'New lead assigned to you',
    contact:   info.agentName,
    introHtml: 'A new lead has been assigned to you. Reach out as soon as possible — early contact dramatically improves conversion.',
    bodyHtml: `
<div style="background:#faf7ff;border:1px solid #ede5ff;border-radius:12px;padding:20px;">
  <table style="width:100%;border-collapse:collapse">
    <tr><td style="padding:6px 0;color:#94a3b8;font-size:13px;width:90px">Name</td><td style="padding:6px 0;font-weight:600;font-size:15px;color:#0f172a">${info.lead.name}</td></tr>
    <tr><td style="padding:6px 0;color:#94a3b8;font-size:13px">Company</td><td style="padding:6px 0;color:#0f172a">${info.lead.company}</td></tr>
    ${info.lead.phone ? `<tr><td style="padding:6px 0;color:#94a3b8;font-size:13px">Phone</td><td style="padding:6px 0"><a href="tel:${info.lead.phone}" style="color:#7C3AED;font-weight:600">${info.lead.phone}</a></td></tr>` : ''}
    <tr><td style="padding:6px 0;color:#94a3b8;font-size:13px">Email</td><td style="padding:6px 0"><a href="mailto:${info.lead.email}" style="color:#7C3AED">${info.lead.email}</a></td></tr>
    ${info.lead.message ? `<tr><td style="padding:6px 0;color:#94a3b8;font-size:13px;vertical-align:top">Message</td><td style="padding:6px 0;color:#475569;font-style:italic">"${info.lead.message}"</td></tr>` : ''}
  </table>
</div>`,
    ctaLabel:   'Open lead →',
    ctaUrl:     leadUrl,
    footerNote: 'Log your first call in the portal to move this lead out of "New Lead" stage. &middot; New lead notification.',
  });
}

export function newWebsiteLeadAdminEmail(info: {
  agentName: string;
  lead: {
    id:      string;
    name:    string;
    company: string;
    phone:   string | null;
    email:   string | null;
    message: string | null;
  };
  portalUrl: string;
}) {
  const leadUrl = `${info.portalUrl}/leads/${info.lead.id}`;
  return emailShell({
    eyebrow:   'AlgoLend',
    heading:   'New website lead',
    introHtml: `A new lead came in through algolend.co.za and was auto-assigned to <strong>${info.agentName}</strong>.`,
    bodyHtml: `
<div style="background:#faf7ff;border:1px solid #ede5ff;border-radius:12px;padding:20px;">
  <table style="width:100%;border-collapse:collapse">
    <tr><td style="padding:6px 0;color:#94a3b8;font-size:13px;width:90px">Name</td><td style="padding:6px 0;font-weight:600;font-size:15px;color:#0f172a">${info.lead.name}</td></tr>
    <tr><td style="padding:6px 0;color:#94a3b8;font-size:13px">Company</td><td style="padding:6px 0;color:#0f172a">${info.lead.company}</td></tr>
    ${info.lead.phone ? `<tr><td style="padding:6px 0;color:#94a3b8;font-size:13px">Phone</td><td style="padding:6px 0"><a href="tel:${info.lead.phone}" style="color:#7C3AED;font-weight:600">${info.lead.phone}</a></td></tr>` : ''}
    <tr><td style="padding:6px 0;color:#94a3b8;font-size:13px">Email</td><td style="padding:6px 0"><a href="mailto:${info.lead.email}" style="color:#7C3AED">${info.lead.email}</a></td></tr>
    <tr><td style="padding:6px 0;color:#94a3b8;font-size:13px">Assigned to</td><td style="padding:6px 0;color:#0f172a">${info.agentName}</td></tr>
    ${info.lead.message ? `<tr><td style="padding:6px 0;color:#94a3b8;font-size:13px;vertical-align:top">Message</td><td style="padding:6px 0;color:#475569;font-style:italic">"${info.lead.message}"</td></tr>` : ''}
  </table>
</div>`,
    ctaLabel:   'Open lead →',
    ctaUrl:     leadUrl,
    footerNote: 'New website lead notification.',
  });
}

export function newSupportTicketAdminEmail(info: {
  clientName: string;
  ticket: {
    id:       string;
    subject:  string;
    message:  string;
    category: string;
    priority: string;
    submittedByName?:  string | null;
    submittedByEmail?: string | null;
  };
  portalUrl: string;
}) {
  const ticketUrl = `${info.portalUrl}/support/${info.ticket.id}`;
  const priorityColor =
    info.ticket.priority === 'urgent' ? '#dc2626' :
    info.ticket.priority === 'high'   ? '#d97706' : '#7C3AED';
  return emailShell({
    eyebrow:   'AlgoLend',
    heading:   'New support ticket',
    introHtml: `<strong>${info.clientName}</strong> submitted a new support ticket, marked <span style="color:${priorityColor};font-weight:700;text-transform:capitalize">${info.ticket.priority}</span> priority.`,
    bodyHtml: `
<div style="background:#faf7ff;border:1px solid #ede5ff;border-radius:12px;padding:20px;">
  <table style="width:100%;border-collapse:collapse">
    <tr><td style="padding:6px 0;color:#94a3b8;font-size:13px;width:90px">Client</td><td style="padding:6px 0;font-weight:600;font-size:15px;color:#0f172a">${info.clientName}</td></tr>
    <tr><td style="padding:6px 0;color:#94a3b8;font-size:13px">Subject</td><td style="padding:6px 0;color:#0f172a;font-weight:600">${info.ticket.subject}</td></tr>
    <tr><td style="padding:6px 0;color:#94a3b8;font-size:13px">Category</td><td style="padding:6px 0;color:#0f172a;text-transform:capitalize">${info.ticket.category.replace(/_/g, ' ')}</td></tr>
    ${info.ticket.submittedByName ? `<tr><td style="padding:6px 0;color:#94a3b8;font-size:13px">From</td><td style="padding:6px 0;color:#0f172a">${info.ticket.submittedByName}${info.ticket.submittedByEmail ? ` (${info.ticket.submittedByEmail})` : ''}</td></tr>` : ''}
    <tr><td style="padding:6px 0;color:#94a3b8;font-size:13px;vertical-align:top">Message</td><td style="padding:6px 0;color:#475569;font-style:italic">"${info.ticket.message}"</td></tr>
  </table>
</div>`,
    ctaLabel:   'Open ticket →',
    ctaUrl:     ticketUrl,
    footerNote: 'New support ticket notification.',
  });
}

export function supportTicketReplyEmail(info: {
  recipientName: string;
  subject:       string;
  replyMessage:  string;
  staffName:     string;
}) {
  return emailShell({
    eyebrow:   'AlgoLend Support',
    heading:   `Re: ${info.subject}`,
    contact:   info.recipientName,
    bodyHtml: `
<p style="color:#334155;line-height:1.7;white-space:pre-wrap;font-size:14px;margin:0">${info.replyMessage}</p>
<p style="color:#94a3b8;font-size:13px;margin-top:20px">— ${info.staffName}, AlgoLend Support</p>`,
    footerNote: 'Reply to this email to continue the conversation.',
  });
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
  return emailShell({
    eyebrow:   'Demo Confirmation',
    heading:   'Your AlgoLend demo is confirmed',
    contact:   info.leadName,
    introHtml: `We're looking forward to showing you what we can do for <strong>${info.company}</strong>.`,
    bodyHtml: `
<div style="background:#faf7ff;border:1px solid #ede5ff;border-radius:12px;padding:20px;">
  <table style="width:100%;border-collapse:collapse">
    <tr><td style="padding:6px 0;color:#94a3b8;font-size:13px;width:100px">Date</td><td style="padding:6px 0;font-weight:600;color:#0f172a">${dateLabel}</td></tr>
    ${info.demoTime ? `<tr><td style="padding:6px 0;color:#94a3b8;font-size:13px">Time</td><td style="padding:6px 0;font-weight:600;color:#0f172a">${info.demoTime} SAST</td></tr>` : ''}
    <tr><td style="padding:6px 0;color:#94a3b8;font-size:13px">Platform</td><td style="padding:6px 0;color:#0f172a">${info.platform}</td></tr>
    <tr><td style="padding:6px 0;color:#94a3b8;font-size:13px">Your host</td><td style="padding:6px 0;color:#0f172a">${info.agentName} · <a href="mailto:${info.agentEmail}" style="color:#7C3AED">${info.agentEmail}</a></td></tr>
  </table>
</div>
${info.meetingLink ? `<p style="color:#94a3b8;font-size:12px;margin:14px 0 0">${info.meetingLink}</p>` : ''}
<p style="color:#475569;font-size:14px;line-height:1.6;margin-top:16px">
  If you need to reschedule, reply to this email or contact ${info.agentName} directly at
  <a href="mailto:${info.agentEmail}" style="color:#7C3AED">${info.agentEmail}</a>.
</p>`,
    ctaLabel: info.meetingLink ? 'Join meeting →' : undefined,
    ctaUrl:   info.meetingLink ?? undefined,
  });
}

export function staleLeadDigestEmail(info: {
  agentName: string;
  leads: { id: string; name: string; company: string; tmStatus: string; daysSince: number }[];
  portalUrl: string;
}) {
  const rows = info.leads.map(l => `
    <tr style="border-bottom:1px solid #f0f0f3">
      <td style="padding:10px 8px">
        <a href="${info.portalUrl}/telemarketer/leads/${l.id}" style="font-weight:600;color:#7C3AED;text-decoration:none;font-size:14px">${l.name}</a>
        <p style="margin:2px 0 0;font-size:12px;color:#94a3b8">${l.company}</p>
      </td>
      <td style="padding:10px 8px;font-size:13px;color:#475569">${l.tmStatus}</td>
      <td style="padding:10px 8px;text-align:right">
        <span style="font-size:11px;font-weight:700;padding:3px 8px;border-radius:20px;background:#fef2f2;color:#dc2626">
          ${l.daysSince}d stale
        </span>
      </td>
    </tr>`).join('');

  return emailShell({
    eyebrow:      'AlgoLend · Weekly pipeline health check',
    heading:      `${info.leads.length} lead${info.leads.length !== 1 ? 's' : ''} need attention`,
    headingColor: '#d97706',
    contact:      info.agentName,
    introHtml:    "These leads in your pipeline haven't been updated in 14+ days. A quick check-in call can keep deals alive.",
    bodyHtml: `
<table style="width:100%;border-collapse:collapse">
  <thead>
    <tr style="background:#f5f6fa">
      <th style="padding:10px 8px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#94a3b8">Lead</th>
      <th style="padding:10px 8px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#94a3b8">Stage</th>
      <th style="padding:10px 8px;text-align:right;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#94a3b8">Idle</th>
    </tr>
  </thead>
  <tbody>${rows}</tbody>
</table>`,
    ctaLabel:   'Review my leads →',
    ctaUrl:     `${info.portalUrl}/telemarketer/leads`,
    ctaColor:   '#d97706',
    footerNote: 'Weekly pipeline health.',
  });
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
  return emailShell({
    eyebrow:      'AlgoLend · High-value deal',
    heading:      'Proposal approval required',
    headingColor: '#0369a1',
    contact:      info.managerName,
    introHtml:    `<strong>${info.agentName}</strong> has submitted a high-value proposal that requires your approval before it can be sent to the client.`,
    bodyHtml: `
<div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:12px;padding:20px;">
  <table style="width:100%;border-collapse:collapse">
    <tr><td style="padding:6px 0;color:#94a3b8;font-size:13px;width:100px">Lead</td><td style="padding:6px 0;font-weight:600;color:#0f172a">${info.leadName}</td></tr>
    <tr><td style="padding:6px 0;color:#94a3b8;font-size:13px">Company</td><td style="padding:6px 0;color:#0f172a">${info.company}</td></tr>
    <tr><td style="padding:6px 0;color:#94a3b8;font-size:13px">Agent</td><td style="padding:6px 0;color:#0f172a">${info.agentName}</td></tr>
    <tr><td style="padding:6px 0;color:#94a3b8;font-size:13px">Amount</td><td style="padding:6px 0;font-size:18px;font-weight:700;color:#0369a1">${fmt(info.amountCents)}</td></tr>
  </table>
</div>`,
    ctaLabel:   'Review & approve →',
    ctaUrl:     approvalUrl,
    ctaColor:   '#0369a1',
    footerNote: 'Internal approval request.',
  });
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
  return emailShell({
    eyebrow:      `${info.leadName} · ${info.company}`,
    heading:      `Proposal ${info.approved ? 'approved' : 'not approved'}`,
    headingColor: info.approved ? '#059669' : '#dc2626',
    contact:      info.agentName,
    introHtml:    info.approved
      ? `Your proposal for <strong>${fmt(info.amountCents)}</strong> to <strong>${info.company}</strong> has been approved. You can now send it to the client.`
      : `Your proposal for <strong>${fmt(info.amountCents)}</strong> to <strong>${info.company}</strong> was not approved by your manager.`,
    bodyHtml: `
${!info.approved && info.rejectionNote ? `
<div style="background:#fef2f2;border-left:3px solid #dc2626;padding:14px 16px;border-radius:0 8px 8px 0;margin-bottom:16px">
  <p style="font-size:13px;color:#475569;margin:0;font-style:italic">"${info.rejectionNote}"</p>
</div>` : ''}
<p style="color:#94a3b8;font-size:13px;line-height:1.6;margin:0">
  ${info.approved
    ? 'Log into the portal to send the proposal to your client.'
    : 'Please review the feedback and update the proposal before resubmitting.'}
</p>`,
  });
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
    <tr style="border-bottom:1px solid #f0f0f3">
      <td style="padding:12px 8px;vertical-align:top">
        <p style="margin:0;font-weight:600;font-size:14px;color:#0f172a">
          <a href="${info.portalUrl}/telemarketer/leads/${f.leadId}" style="color:#7C3AED;text-decoration:none">${f.leadName}</a>
        </p>
        <p style="margin:2px 0 0;font-size:12px;color:#94a3b8">${f.company}</p>
      </td>
      <td style="padding:12px 8px;font-size:13px;color:#475569;vertical-align:top">
        <a href="tel:${f.phone}" style="color:#0f172a;text-decoration:none">${f.phone}</a>
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
        ${f.note ? `<p style="margin:4px 0 0;font-size:12px;color:#94a3b8;font-style:italic">"${f.note}"</p>` : ''}
      </td>
    </tr>`).join('');

  const overdueCount = info.followUps.filter(f => f.isOverdue).length;
  const todayCount   = info.followUps.length - overdueCount;

  return emailShell({
    eyebrow:   'AlgoLend',
    heading:   `${info.followUps.length} follow-up${info.followUps.length !== 1 ? 's' : ''} need your attention`,
    contact:   info.agentName,
    introHtml: `Here's your follow-up summary for ${info.todayLabel}.
      ${overdueCount > 0 ? `<strong style="color:#dc2626">${overdueCount} overdue</strong> and ` : ''}
      ${todayCount > 0 ? `<strong>${todayCount} due today</strong>.` : ''}`,
    bodyHtml: `
<table style="width:100%;border-collapse:collapse">
  <thead>
    <tr style="background:#f5f6fa">
      <th style="padding:10px 8px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#94a3b8">Lead</th>
      <th style="padding:10px 8px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#94a3b8">Phone</th>
      <th style="padding:10px 8px;text-align:center;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#94a3b8">Type</th>
      <th style="padding:10px 8px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#94a3b8">Status / Note</th>
    </tr>
  </thead>
  <tbody>${rows}</tbody>
</table>`,
    ctaLabel:   'Open follow-ups →',
    ctaUrl:     `${info.portalUrl}/telemarketer/follow-ups`,
    footerNote: 'Mark each follow-up complete in the portal once done. &middot; Daily follow-up digest.',
  });
}

export function biztechQuoteEmail(q: {
  reference: string; clientName: string; contact: string;
  totalCents: number; validUntil: string | null; quoteId: string;
}) {
  const fmt = (c: number) =>
    new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', minimumFractionDigits: 2 }).format(c / 100);
  const viewUrl = `https://algolend.co.za/biztech-quote/${q.quoteId}`;

  return emailShell({
    brand:     'MINT BizTech',
    siteUrl:   'https://www.mymint.co.za',
    eyebrow:   'Quote',
    heading:   'Your MINT BizTech quote',
    contact:   q.contact,
    introHtml: `Please find your quote from MINT BizTech below${q.validUntil ? `, valid until <strong>${q.validUntil}</strong>` : ''}.`,
    bodyHtml: `
${emailCallout(fmt(q.totalCents), q.reference, { bg: '#f5f2ff', border: '#e5e0ff', color: '#5C3BCF' })}
<p style="color:#94a3b8;font-size:13px;line-height:1.6;margin-top:16px">
  Questions? Reply to this email or contact <a href="mailto:accounts@mymint.co.za" style="color:#5C3BCF">accounts@mymint.co.za</a>.
</p>`,
    ctaLabel: 'View quote & respond →',
    ctaUrl:   viewUrl,
    ctaColor: '#5C3BCF',
  });
}
