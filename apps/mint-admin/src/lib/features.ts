// Must stay in sync with the `feature_flag` enum in 001_clients.sql
export const ALL_FEATURES = [
  'open_banking',
  'e_contracts',
  'credit_scoring',
  'sacrra_bureau',
  'multi_branch',
  'working_capital',
  'term_loans',
  'invoice_finance',
  'whatsapp_notify',
  'advanced_analytics',
  'sure_systems',
  'biometric_kyc',
] as const;

export type FeatureFlag = typeof ALL_FEATURES[number];

export const FEATURE_LABELS: Record<FeatureFlag, string> = {
  open_banking:       'Open Banking (TruID)',
  e_contracts:        'E-Contracts',
  credit_scoring:     'Credit Scoring Engine',
  sacrra_bureau:      'SACRRA Bureau Reporting',
  multi_branch:       'Multi-Branch Management',
  working_capital:    'Working Capital Loans',
  term_loans:         'Term Loans',
  invoice_finance:    'Invoice Finance',
  whatsapp_notify:    'WhatsApp Notifications',
  advanced_analytics: 'Advanced Analytics',
  sure_systems:       'Sure Systems Integration',
  biometric_kyc:      'Biometric KYC',
};
