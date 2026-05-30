/**
 * Application store — Supabase-backed.
 *
 * Replaces the previous localStorage prototype. The hook surface
 * (`useApplications`, `applicationStore.add()`, `applicationStore.updateStatus()`)
 * is preserved so React pages don't need to change.
 *
 * RLS in the database means callers automatically see only their own
 * tenant's applications — no client_id juggling at the app layer.
 *
 * Falls back gracefully to localStorage if Supabase queries fail (e.g.
 * during dev before migrations have run). This keeps the demo workable
 * while the database is being provisioned.
 */

import { useEffect, useState, useSyncExternalStore } from 'react';
import { supabase } from '@/lib/supabase';

export type ApplicationStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'awaiting_documents'
  | 'approved'
  | 'declined';

export interface LoanApplication {
  id:             string;
  applicantName:  string;
  company:        string;
  amount:         number;
  termMonths:     number;
  purpose:        string;
  status:         ApplicationStatus;
  score:          number;
  submittedAt:    string;
  decisionAt?:    string;
  declineReason?: string;
}

/* ─── Local-store fallback (used until Supabase migrations are applied) ─ */

const STORAGE_KEY = 'algolend.applications.v1';

const SEED: LoanApplication[] = [
  { id: 'APP-2026-014', applicantName: 'Thabo Nkosi',     company: 'Nkosi Holdings',     amount: 50_000,  termMonths: 12, purpose: 'Working capital',         status: 'under_review',      score: 72, submittedAt: '2026-05-22T10:14:00Z' },
  { id: 'APP-2026-013', applicantName: 'Lerato Dlamini',  company: 'Dlamini Logistics',  amount: 120_000, termMonths: 24, purpose: 'Fleet expansion',         status: 'awaiting_documents', score: 64, submittedAt: '2026-05-21T15:32:00Z' },
  { id: 'APP-2026-012', applicantName: 'Sipho Mahlangu',  company: 'Mahlangu Tech',      amount: 30_000,  termMonths: 6,  purpose: 'Inventory purchase',      status: 'approved',           score: 81, submittedAt: '2026-05-19T09:08:00Z', decisionAt: '2026-05-20T11:22:00Z' },
  { id: 'APP-2026-011', applicantName: 'Nomvula Khumalo', company: 'NK Consulting',      amount: 75_000,  termMonths: 12, purpose: 'Office equipment',        status: 'declined',           score: 42, submittedAt: '2026-05-18T14:00:00Z', decisionAt: '2026-05-19T08:00:00Z', declineReason: 'Insufficient cash flow per Sept-Mar bank statements.' },
];

type Listener = () => void;

class ApplicationStore {
  private apps: LoanApplication[] = [];
  private listeners = new Set<Listener>();
  private loaded = false;
  private supaTried = false;
  private supaAvailable = false;

  /* Local persistence (fallback only) */
  private loadLocal() {
    if (typeof window === 'undefined') { this.apps = SEED; return; }
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      this.apps = raw ? (JSON.parse(raw) as LoanApplication[]) : SEED;
    } catch { this.apps = SEED; }
  }
  private persistLocal() {
    if (typeof window === 'undefined') return;
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.apps)); } catch { /* quota */ }
  }
  private emit() { for (const l of this.listeners) l(); }

  /* Try Supabase; on any error, fall back to localStorage. */
  private async tryLoadFromSupabase() {
    if (this.supaTried) return;
    this.supaTried = true;
    try {
      const { data, error } = await supabase
        .from('loan_applications')
        .select('id, reference, amount, term_months, purpose, status, composite_score, submitted_at, decision_at, status_reason, business_name, profiles!inner(full_name)')
        .is('deleted_at', null)
        .order('submitted_at', { ascending: false, nullsFirst: false });

      if (error) throw error;
      if (!data) return;

      this.supaAvailable = true;
      this.apps = data.map(rowToApplication);
      this.emit();
    } catch (err) {
      // Tables don't exist yet, RLS denies, or network — keep using local fallback.
      console.info('[applicationStore] Supabase unavailable; using local fallback.', err);
    }
  }

  private ensureLoaded() {
    if (this.loaded) return;
    this.loadLocal();
    this.loaded = true;
    void this.tryLoadFromSupabase();
  }

  getSnapshot = (): LoanApplication[] => {
    this.ensureLoaded();
    return this.apps;
  };

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };

  /** Synchronous (optimistic). Returns the new application immediately; Supabase sync is fire-and-forget. */
  add(input: Omit<LoanApplication, 'id' | 'submittedAt' | 'status' | 'score'> & { status?: ApplicationStatus; score?: number }): LoanApplication {
    this.ensureLoaded();
    const reference = `APP-${new Date().getFullYear()}-${String(this.apps.length + 15).padStart(3, '0')}`;
    const optimistic: LoanApplication = {
      ...input,
      id:          reference,
      status:      input.status ?? 'submitted',
      score:       input.score  ?? Math.round(50 + Math.random() * 40),
      submittedAt: new Date().toISOString(),
    };

    this.apps = [optimistic, ...this.apps];
    this.persistLocal();
    this.emit();

    // Fire-and-forget Supabase persistence
    void this.syncInsert(optimistic).catch((err) =>
      console.warn('[applicationStore] insert failed in Supabase; keeping local copy', err),
    );

    return optimistic;
  }

  /** Synchronous (optimistic). Supabase update is fire-and-forget. */
  updateStatus(id: string, status: ApplicationStatus, opts: { declineReason?: string } = {}): void {
    this.ensureLoaded();

    this.apps = this.apps.map((a) =>
      a.id === id
        ? {
            ...a,
            status,
            decisionAt:    status === 'approved' || status === 'declined' ? new Date().toISOString() : a.decisionAt,
            declineReason: status === 'declined' ? opts.declineReason ?? 'Did not meet credit policy.' : undefined,
          }
        : a,
    );
    this.persistLocal();
    this.emit();

    void this.syncStatus(id, status, opts).catch((err) =>
      console.warn('[applicationStore] status update failed in Supabase', err),
    );
  }

  /* ── Background Supabase sync helpers ──────────────────────────── */

  private async syncInsert(app: LoanApplication): Promise<void> {
    if (!this.supaAvailable) return;
    const { data, error } = await supabase
      .from('loan_applications')
      .insert({
        reference:        app.id,
        amount:           app.amount,
        term_months:      app.termMonths,
        purpose:          app.purpose,
        business_name:    app.company,
        composite_score:  app.score,
        status:           app.status,
        submitted_at:     app.submittedAt,
        interest_rate:    20,
      })
      .select('id, reference, amount, term_months, purpose, status, composite_score, submitted_at, decision_at, status_reason, business_name, profiles!inner(full_name)')
      .single();

    if (error) throw error;
    if (data) {
      const real = rowToApplication(data);
      this.apps = this.apps.map((a) => (a.id === app.id ? real : a));
      this.persistLocal();
      this.emit();
    }
  }

  private async syncStatus(reference: string, status: ApplicationStatus, opts: { declineReason?: string }): Promise<void> {
    if (!this.supaAvailable) return;
    const { error } = await supabase
      .from('loan_applications')
      .update({
        status,
        status_reason: status === 'declined' ? opts.declineReason ?? null : null,
        decision_at:   status === 'approved' || status === 'declined' ? new Date().toISOString() : null,
      })
      .eq('reference', reference);

    if (error) throw error;
  }
}

function rowToApplication(row: {
  reference: string;
  amount: number;
  term_months: number;
  purpose: string;
  status: ApplicationStatus;
  composite_score: number | null;
  submitted_at: string | null;
  decision_at: string | null;
  status_reason: string | null;
  business_name: string | null;
  profiles: { full_name: string } | { full_name: string }[];
}): LoanApplication {
  const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
  return {
    id:             row.reference,
    applicantName:  profile?.full_name ?? 'Unknown',
    company:        row.business_name ?? '—',
    amount:         Number(row.amount),
    termMonths:     row.term_months,
    purpose:        row.purpose,
    status:         row.status,
    score:          row.composite_score ?? 0,
    submittedAt:    row.submitted_at ?? new Date().toISOString(),
    decisionAt:     row.decision_at ?? undefined,
    declineReason:  row.status_reason ?? undefined,
  };
}

export const applicationStore = new ApplicationStore();

/* ─── React hooks ────────────────────────────────────────────────── */

const SERVER_SNAPSHOT: LoanApplication[] = SEED;

export function useApplications(): LoanApplication[] {
  return useSyncExternalStore(
    applicationStore.subscribe,
    applicationStore.getSnapshot,
    () => SERVER_SNAPSHOT,
  );
}

export function useMyApplications(applicantName: string): LoanApplication[] {
  const all = useApplications();
  const [mine, setMine] = useState<LoanApplication[]>([]);
  useEffect(() => {
    setMine(all.filter((a) => a.applicantName === applicantName));
  }, [all, applicantName]);
  return mine;
}

/* ─── Status display helpers ─────────────────────────────────────── */

export const statusLabel: Record<ApplicationStatus, string> = {
  draft:              'Draft',
  submitted:          'Submitted',
  under_review:       'Under review',
  awaiting_documents: 'Awaiting docs',
  approved:           'Approved',
  declined:           'Declined',
};

export const statusBadgeClass: Record<ApplicationStatus, string> = {
  draft:              'bg-slate-100 text-slate-600',
  submitted:          'bg-blue-50 text-blue-700',
  under_review:       'bg-amber-50 text-amber-700',
  awaiting_documents: 'bg-purple-50 text-purple-700',
  approved:           'bg-emerald-50 text-emerald-700',
  declined:           'bg-red-50 text-red-600',
};
