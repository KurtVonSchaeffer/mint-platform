export type ClientStatus = 'active' | 'suspended' | 'trial' | 'churned';
export type BillingTier = 'core' | 'growth' | 'enterprise';

export type AlgoLendClient = {
  id: string;
  name: string;
  slug: string;
  domain: string;
  status: ClientStatus;
  tier: BillingTier;
  supabaseProjectId: string;
  vercelProjectId: string;
  features: Record<string, boolean>;
  mrr: number;
  activeUsers: number;
  apiCallsThisMonth: number;
  createdAt: string;
  contactEmail: string;
  contactName: string;
};

export type Lead = {
  id: string;
  company: string;
  contact: string;
  email: string;
  stage: 'new' | 'demo_booked' | 'proposal' | 'negotiation' | 'won' | 'lost';
  estimatedMrr: number;
  notes: string;
  createdAt: string;
};
