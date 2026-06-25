export const MARGIN        = 0.38;
export const PKG_DISCOUNT  = 0.05;
export const ADMIN_FEE     = 1000;   // R/month
export const BRANCH_RATE   = 250;    // R/branch/month

export const VOLUME_TIERS = [
  { id: '0-50',      label: 'Starter',    volume: 50   },
  { id: '50-150',    label: 'Medium',     volume: 150  },
  { id: '151-300',   label: 'Scale',      volume: 300  },
  { id: '500-1000',  label: 'Growth',     volume: 1000 },
  { id: '1000-5000', label: 'Enterprise', volume: 5000 },
] as const;

export type VolumeTierId = typeof VOLUME_TIERS[number]['id'];

// baseRate  = what we pay the provider (internal, super_admin only)
// clientRate = published client-facing price per check (shown on quotes)
// firstFree  = complimentary calls per month (promotional)
export const CHECK_CATALOG = [
  { id: 'cipc',      label: 'CIPC Data: Employment',                        baseRate: 2.66,  clientRate: 3.50,  firstFree: 0   },
  { id: 'bureau',    label: 'Standard Bureau Check (Experian)',              baseRate: 6.67,  clientRate: 9.20,  firstFree: 0   },
  { id: 'banking',   label: 'Bank Account Linking (TruID)',                  baseRate: 8.50,  clientRate: 11.00, firstFree: 0   },
  { id: 'contracts', label: 'E-Contracts',                                   baseRate: 3.60,  clientRate: 0.30,  firstFree: 0   },
  { id: 'liveness',  label: 'Full KYC — Liveness, ID & Phone Verification', baseRate: 5.40,  clientRate: 6.50,  firstFree: 500 },
  { id: 'homeaff',   label: 'Liveness + Home Affairs (DHA)',                 baseRate: 15.50, clientRate: 20.00, firstFree: 0   },
  { id: 'watchlist', label: 'AML / Watchlist — PEPs & Sanctions',           baseRate: 1.95,  clientRate: 0,     firstFree: 0   },
  { id: 'address',   label: 'Address Verification',                          baseRate: 1.74,  clientRate: 3.50,  firstFree: 0   },
] as const;

export type CheckId = typeof CHECK_CATALOG[number]['id'];

export function rateWithMargin(baseRate: number): number {
  return baseRate * (1 + MARGIN);
}

export function computeMonthlyFee(
  selectedChecks: CheckId[],
  volumeTierId:   VolumeTierId,
  branches:       number,
): number {
  const tier      = VOLUME_TIERS.find((t) => t.id === volumeTierId) ?? VOLUME_TIERS[0];
  const adjVolume = tier.volume * (1 - PKG_DISCOUNT);
  const checksCost = selectedChecks.reduce((sum, id) => {
    const check = CHECK_CATALOG.find((c) => c.id === id);
    // Use published client rate; skip free-tier calls
    const billableVolume = Math.max(0, adjVolume - (check?.firstFree ?? 0));
    return sum + (check ? check.clientRate * billableVolume : 0);
  }, 0);
  return Math.round(checksCost + ADMIN_FEE + branches * BRANCH_RATE);
}

export function fmtR(n: number): string {
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: 0 }).format(n);
}

export function fmtRc(n: number): string {
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', minimumFractionDigits: 2 }).format(n);
}
