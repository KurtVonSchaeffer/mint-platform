/**
 * Experian South Africa credit bureau wrapper.
 *
 * Env vars:
 *   EXPERIAN_API_KEY
 *   EXPERIAN_API_BASE  (default https://api.experian.co.za)
 *
 * Swap the real fetch call in for production; the normalise() function
 * maps whatever Experian returns into our standard CreditProfile shape.
 */

import type { CreditProfile } from '@mint/credit-engine';

const BASE = (process.env.EXPERIAN_API_BASE ?? 'https://api.experian.co.za').replace(/\/$/, '');

export interface ExperianInput {
  idNumber:  string;
  firstName: string;
  lastName:  string;
}

export async function pullExperianProfile(input: ExperianInput): Promise<Partial<CreditProfile>> {
  const apiKey = process.env.EXPERIAN_API_KEY;
  if (!apiKey) throw new Error('EXPERIAN_API_KEY is not set');

  const res = await fetch(`${BASE}/v2/consumer/creditreport`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      idNumber:  input.idNumber,
      firstName: input.firstName,
      lastName:  input.lastName,
      product:   'FULL_CREDIT_REPORT',
    }),
    cache: 'no-store',
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Experian ${res.status}: ${text}`);
  }

  const raw = await res.json();
  return { ...normalise(raw), raw: { experian: raw, sureSystems: null } };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalise(raw: any): Omit<Partial<CreditProfile>, 'raw'> {
  // Experian SA response shape (adapt field names to their actual API):
  const score = raw?.score?.value ?? raw?.creditScore ?? raw?.Score ?? 0;
  const defaults = raw?.defaultAccounts?.count ?? raw?.defaults ?? 0;
  const enquiries = raw?.enquiries?.last12Months ?? raw?.recentEnquiries ?? 0;
  const idVerified = raw?.idVerification?.status === 'VERIFIED' || raw?.idVerified === true;

  return {
    creditScore:              Number(score),
    openDefaults:             Number(defaults),
    enquiriesLast12Months:    Number(enquiries),
    idVerified,
  };
}
