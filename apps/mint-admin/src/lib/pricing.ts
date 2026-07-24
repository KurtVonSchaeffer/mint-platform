/**
 * AlgoLend service rate card.
 * Sourced from Book1.xlsx — Monthly Cost Calculator.
 * Update these values when provider contracts change.
 *
 * All prices in ZAR cents.
 */

export interface ServiceRate {
  id:             string;
  name:           string;
  description:    string;
  providerCents:  number;        // What we pay the provider (internal, super_admin only)
  publishedCents: number;        // Published client-facing rate per check
  firstFree:      number;        // Complimentary calls per month (0 = none)
  featureFlag:    string | null;
  category:       'kyc' | 'credit' | 'banking' | 'compliance' | 'contracts';
  enterpriseOnly: boolean;
}

export const SERVICE_RATES: ServiceRate[] = [
  {
    id:             'bureau_enquiry',
    name:           'Standard Bureau Check (Experian)',
    description:    'Credit bureau data contribution + enquiry (Experian)',
    providerCents:  667,
    publishedCents: 920,
    firstFree:      0,
    featureFlag:    'credit_scoring',
    category:       'credit',
    enterpriseOnly: false,
  },
  {
    id:             'bank_linking',
    name:           'Bank Account Linking (TruID)',
    description:    'Confirms bank details, salary dates, and fetches actual client budget',
    providerCents:  850,
    publishedCents: 1100,
    firstFree:      0,
    featureFlag:    'open_banking',
    category:       'banking',
    enterpriseOnly: false,
  },
  {
    id:             'automated_contracts',
    name:           'E-Contracts',
    description:    'E-contract generation, issuing, and digital signing',
    providerCents:  0,
    publishedCents: 30,
    firstFree:      0,
    featureFlag:    'e_contracts',
    category:       'contracts',
    enterpriseOnly: false,
  },
  {
    id:             'liveness_id_phone',
    name:           'Full KYC — Liveness, ID & Phone',
    description:    'Biometric liveness check, ID scan, and phone number verification',
    providerCents:  540,
    publishedCents: 650,
    firstFree:      500,
    featureFlag:    'biometric_kyc',
    category:       'kyc',
    enterpriseOnly: false,
  },
  {
    id:             'liveness_dha',
    name:           'Liveness + Home Affairs (DHA)',
    description:    'Liveness check with DHA population register verification',
    providerCents:  1550,
    publishedCents: 2000,
    firstFree:      0,
    featureFlag:    'biometric_kyc',
    category:       'kyc',
    enterpriseOnly: true,
  },
  {
    id:             'watchlist_peps',
    name:           'AML / Watchlist — PEPs & Sanctions',
    description:    'Politically Exposed Persons, sanctions screening, and adverse media',
    providerCents:  195,
    publishedCents: 0,
    firstFree:      0,
    featureFlag:    'credit_scoring',
    category:       'compliance',
    enterpriseOnly: false,
  },
  {
    id:             'address_verification',
    name:           'Address Verification',
    description:    'Physical address verification against authoritative sources',
    providerCents:  174,
    publishedCents: 350,
    firstFree:      0,
    featureFlag:    null,
    category:       'kyc',
    enterpriseOnly: false,
  },
];

// ── Pricing config ─────────────────────────────────────────────────────
export const PRICING_CONFIG = {
  markupPct:          0.38,   // 38% markup on provider cost
  packageDiscountPct: 0.05,   // 5% package discount
};

// Volume tiers — name, monthly check range, representative midpoint volume
export const VOLUME_TIERS = [
  { id: 'starter',    label: 'Starter',    min: 0,   max: 50,  volume: 25,  monthlyAdminFee: 100000 },
  { id: 'medium',     label: 'Medium',     min: 51,  max: 150, volume: 100, monthlyAdminFee: 100000 },
  { id: 'scale',      label: 'Scale',      min: 151, max: 300, volume: 285, monthlyAdminFee: 100000 },
  { id: 'growth',     label: 'Growth',     min: 301, max: 500, volume: 400, monthlyAdminFee: 150000 },
  { id: 'enterprise', label: 'Enterprise', min: 501, max: null, volume: 600, monthlyAdminFee: 200000 },
] as const;

export type VolumeTierId = typeof VOLUME_TIERS[number]['id'];

// ── Helpers ────────────────────────────────────────────────────────────

/** Published client-facing price per check in cents */
export function sellingPrice(service: ServiceRate): number {
  return service.publishedCents;
}

/** Monthly cost for a service at a given check volume, in cents */
export function monthlyCost(service: ServiceRate, volume: number): number {
  return sellingPrice(service) * volume;
}

/** Full monthly bill for a client — selected services + admin */
export function calculateMonthlyBill({
  selectedServiceIds,
  monthlyVolume,
  numBranches = 1,
  branchFeeCents = 25000,
  platformLicenceCents = 800000,
}: {
  selectedServiceIds: string[];
  monthlyVolume:      number;
  numBranches?:       number;
  branchFeeCents?:    number;
  platformLicenceCents?: number;
}) {
  const selectedServices = SERVICE_RATES.filter(s => selectedServiceIds.includes(s.id));

  const checkCosts = selectedServices.map(s => ({
    serviceId: s.id,
    name:      s.name,
    perCheck:  sellingPrice(s),
    monthly:   monthlyCost(s, monthlyVolume),
  }));

  const checkTotal        = checkCosts.reduce((sum, c) => sum + c.monthly, 0);
  const adminTotal        = platformLicenceCents + (branchFeeCents * numBranches);
  const grandTotal        = checkTotal + adminTotal;
  const perCheckBlended   = monthlyVolume > 0 ? Math.round(checkTotal / monthlyVolume) : 0;

  return {
    checkCosts,
    checkTotal,
    adminTotal,
    grandTotal,
    perCheckBlended,
    breakdown: {
      platformLicence: platformLicenceCents,
      branchFees:      branchFeeCents * numBranches,
    },
  };
}
