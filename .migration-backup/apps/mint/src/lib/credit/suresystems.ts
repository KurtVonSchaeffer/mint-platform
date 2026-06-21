/**
 * Sure Systems payroll & employment verification wrapper.
 *
 * Env vars:
 *   SURESYSTEMS_API_KEY
 *   SURESYSTEMS_API_BASE  (default https://api.suresystems.co.za)
 *
 * Returns income and employment data to feed into DSR checks.
 */

import type { CreditProfile } from '@mint/credit-engine';

const BASE = (process.env.SURESYSTEMS_API_BASE ?? 'https://api.suresystems.co.za').replace(/\/$/, '');

export interface SureSystemsInput {
  idNumber: string;
  mobile?:  string;
}

export async function pullSureSystemsProfile(input: SureSystemsInput): Promise<Partial<CreditProfile>> {
  const apiKey = process.env.SURESYSTEMS_API_KEY;
  if (!apiKey) throw new Error('SURESYSTEMS_API_KEY is not set');

  const res = await fetch(`${BASE}/v1/employment/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
    body: JSON.stringify({ idNumber: input.idNumber, mobile: input.mobile }),
    cache: 'no-store',
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`SureSystems ${res.status}: ${text}`);
  }

  const raw = await res.json();
  return { ...normalise(raw), raw: { experian: null, sureSystems: raw } };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalise(raw: any): Omit<Partial<CreditProfile>, 'raw'> {
  const grossSalary     = raw?.salary?.gross ?? raw?.monthlySalary ?? raw?.grossIncome ?? 0;
  const obligations     = raw?.deductions?.loanRepayments ?? raw?.monthlyObligations ?? 0;
  const employmentStatus = mapStatus(raw?.employmentStatus ?? raw?.status);
  const employer        = raw?.employer?.name ?? raw?.employerName ?? null;

  return {
    monthlyIncome:              Number(grossSalary),
    existingMonthlyObligations: Number(obligations),
    employmentStatus,
    employer,
  };
}

function mapStatus(raw: string | undefined): CreditProfile['employmentStatus'] {
  const s = (raw ?? '').toUpperCase();
  if (s.includes('EMPLOYED') && !s.includes('SELF'))  return 'employed';
  if (s.includes('SELF'))                              return 'self_employed';
  if (s.includes('UNEMPLOY'))                         return 'unemployed';
  return 'unknown';
}
