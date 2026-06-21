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

export const CHECK_CATALOG = [
  { id: 'cipc',      label: 'CIPC Data: Employment',                      baseRate: 2.66  },
  { id: 'bureau',    label: 'Bureau Enquiry (Standard)',                   baseRate: 6.67  },
  { id: 'banking',   label: 'Bank Account Linking',                       baseRate: 8.50  },
  { id: 'contracts', label: 'Automated Contracts',                        baseRate: 3.60  },
  { id: 'liveness',  label: 'Liveness & ID Check + Phone Verification',   baseRate: 5.40  },
  { id: 'homeaff',   label: 'Liveness + Home Affairs Check',              baseRate: 15.50 },
  { id: 'watchlist', label: 'Watchlist PEPs & Sanctions (Adverse Media)', baseRate: 1.95  },
  { id: 'address',   label: 'Address Verification',                       baseRate: 1.74  },
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
  const tier        = VOLUME_TIERS.find((t) => t.id === volumeTierId) ?? VOLUME_TIERS[0];
  const adjVolume   = tier.volume * (1 - PKG_DISCOUNT);
  const checksCost  = selectedChecks.reduce((sum, id) => {
    const check = CHECK_CATALOG.find((c) => c.id === id);
    return sum + (check ? rateWithMargin(check.baseRate) * adjVolume : 0);
  }, 0);
  return Math.round(checksCost + ADMIN_FEE + branches * BRANCH_RATE);
}

export function fmtR(n: number): string {
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: 0 }).format(n);
}

export function fmtRc(n: number): string {
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', minimumFractionDigits: 2 }).format(n);
}
