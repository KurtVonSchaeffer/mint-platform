// Normalise to E.164 — South African numbers default to +27 if no country
// code. Shared by voice, SMS, and WhatsApp so all three outbound channels
// treat lead phone numbers (stored free-text, no format enforcement) the
// same way.
export function normalizePhoneSA(raw: string): string {
  let phone = raw.replace(/[\s\-().]/g, '');
  if (!phone.startsWith('+')) {
    phone = phone.startsWith('0') ? `+27${phone.slice(1)}` : `+${phone}`;
  }
  return phone;
}

export function isValidE164(phone: string): boolean {
  return /^\+\d{8,15}$/.test(phone);
}
