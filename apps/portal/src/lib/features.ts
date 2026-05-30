export const ALL_FEATURES = [
  'open_banking',
  'sacrra_bureau',
  'credit_scoring',
  'e_contracts',
  'multi_branch',
  'whatsapp_comms',
  'biometric_kyc',
  'employer_verification',
  'loan_calculator',
  'collections_workflow',
] as const;

export type FeatureFlag = typeof ALL_FEATURES[number];
export type Features = Partial<Record<FeatureFlag, boolean>>;

export const FEATURE_LABELS: Record<FeatureFlag, string> = {
  open_banking: 'Open Banking (TruID)',
  sacrra_bureau: 'SACRRA Bureau Reporting',
  credit_scoring: 'Credit Scoring Engine',
  e_contracts: 'E-Contracts (DocuSeal)',
  multi_branch: 'Multi-Branch Management',
  whatsapp_comms: 'WhatsApp Communications',
  biometric_kyc: 'Biometric KYC',
  employer_verification: 'Employer Verification',
  loan_calculator: 'Loan Calculator',
  collections_workflow: 'Collections Workflow',
};

export function parseFeatures(raw: string | undefined): Features {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return {};
    return parsed as Features;
  } catch {
    return {};
  }
}
