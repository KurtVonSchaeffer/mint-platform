export const MARGIN        = 0.38;
export const PKG_DISCOUNT  = 0.05;
export const ADMIN_FEE     = 1000;   // R/month
export const BRANCH_RATE   = 250;    // R/branch/month

// Legacy internal 5-step quoting scale. No longer marketed or shown to staff
// as selectable presets — kept only so parseQuota() can read old quote rows
// that still store one of these tier ids (e.g. '151-300').
const LEGACY_VOLUME_TIERS = [
  { id: '0-50',      label: 'Starter',    volume: 50   },
  { id: '50-150',    label: 'Medium',     volume: 150  },
  { id: '151-300',   label: 'Scale',      volume: 300  },
  { id: '500-1000',  label: 'Growth',     volume: 1000 },
  { id: '1000-5000', label: 'Enterprise', volume: 5000 },
] as const;

// The 2 packages actually marketed on the public pricing page (see
// app/pricing/page.tsx TIERS). Used for quick-select presets and the
// nearest-label badge in the quote builder.
export const PUBLISHED_PACKAGES = [
  { id: 'starter',    label: 'Starter',    volume: 0    },
  { id: 'enterprise', label: 'Enterprise', volume: 2000 },
] as const;

export function parseQuota(raw: string | number | null | undefined): number {
  if (raw === null || raw === undefined || raw === '') return PUBLISHED_PACKAGES[0].volume;
  const legacyTier = LEGACY_VOLUME_TIERS.find((t) => t.id === raw);
  if (legacyTier) return legacyTier.volume;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : PUBLISHED_PACKAGES[0].volume;
}

export function nearestTierLabel(quota: number): string {
  let best: typeof PUBLISHED_PACKAGES[number] = PUBLISHED_PACKAGES[0];
  for (const t of PUBLISHED_PACKAGES) {
    if (Math.abs(t.volume - quota) < Math.abs(best.volume - quota)) best = t;
  }
  return best.label;
}

// baseRate  = what we pay the provider (internal, super_admin only)
// clientRate = published client-facing price per check (shown on quotes)
// firstFree  = complimentary calls per month (promotional)
export const CHECK_CATALOG = [
  { id: 'bureau',    label: 'Standard Bureau Check (Experian)',              baseRate: 6.67,  clientRate: 9.20,  firstFree: 0   },
  { id: 'banking',   label: 'Bank Account Linking (TruID)',                  baseRate: 8.50,  clientRate: 11.00, firstFree: 0   },
  { id: 'contracts', label: 'E-Contracts',                                   baseRate: 0,     clientRate: 0.30,  firstFree: 0   },
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
  quota:          number,
  branches:       number,
): number {
  const adjVolume = quota * (1 - PKG_DISCOUNT);
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
