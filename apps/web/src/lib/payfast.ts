import crypto from 'crypto';

export const PAYFAST_HOST = process.env.PAYFAST_SANDBOX === 'true'
  ? 'https://sandbox.payfast.co.za'
  : 'https://www.payfast.co.za';

export const PAYFAST_PROCESS_URL = `${PAYFAST_HOST}/eng/process`;

export function buildSignature(params: Record<string, string>, passphrase?: string): string {
  const pairs = Object.entries(params)
    .filter(([k]) => k !== 'signature' && params[k] !== '')
    .map(([k, v]) => `${k}=${encodeURIComponent(v.trim()).replace(/%20/g, '+')}`)
    .join('&');
  const str = passphrase
    ? `${pairs}&passphrase=${encodeURIComponent(passphrase.trim()).replace(/%20/g, '+')}`
    : pairs;
  return crypto.createHash('md5').update(str).digest('hex');
}

export function buildInvoiceForm(p: {
  invoiceId:    string;
  reference:    string;
  clientName:   string;
  contactEmail: string;
  amountCents:  number;
}): Record<string, string> {
  const base   = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://algolend.co.za').replace(/\/$/, '');
  const amount = (p.amountCents / 100).toFixed(2);

  const params: Record<string, string> = {
    merchant_id:          process.env.PAYFAST_MERCHANT_ID  ?? '',
    merchant_key:         process.env.PAYFAST_MERCHANT_KEY ?? '',
    return_url:           `${base}/pay/${p.invoiceId}?status=complete`,
    cancel_url:           `${base}/pay/${p.invoiceId}?status=cancelled`,
    // ITN goes to admin so it can mark the invoice paid
    notify_url:           process.env.PAYFAST_NOTIFY_URL ?? 'https://admin.algolend.co.za/api/payfast/notify',
    m_payment_id:         p.invoiceId,
    amount,
    item_name:            `AlgoLend Invoice ${p.reference}`,
    item_description:     `Platform invoice for ${p.clientName}`,
    name_first:           p.clientName.split(' ')[0] ?? p.clientName,
    name_last:            p.clientName.split(' ').slice(1).join(' ') || p.clientName,
    email_address:        p.contactEmail,
    email_confirmation:   '1',
    confirmation_address: 'accounts@algolend.co.za',
  };
  params.signature = buildSignature(params, process.env.PAYFAST_PASSPHRASE);
  return params;
}
