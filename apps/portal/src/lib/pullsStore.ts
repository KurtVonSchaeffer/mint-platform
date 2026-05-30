/**
 * Pulls store — tracks debit-order / payment-pull attempts.
 *
 * Mirrors the `pulls` table from 005_repayments.sql.
 * Supabase-backed with localStorage fallback (same pattern as applicationStore).
 *
 * Status pipeline: scheduled → sent → cleared | returned → (retry → scheduled)
 * T-3 reminder: pulls 3 days from today that haven't had reminder_t_minus_3_sent_at set.
 */

import { useSyncExternalStore } from 'react';
import { supabase } from '@/lib/supabase';

export type PullStatus  = 'scheduled' | 'sent' | 'cleared' | 'returned' | 'cancelled';
export type PullMethod  = 'debit_order' | 'eft' | 'card' | 'cash' | 'wallet';

export interface Pull {
  id:                string;
  loanRef:           string;       // e.g. LN-2026-014
  borrowerName:      string;
  company:           string;
  amount:            number;
  method:            PullMethod;
  status:            PullStatus;
  scheduledFor:      string;       // ISO date, e.g. "2026-05-31"
  attemptedAt?:      string;
  clearedAt?:        string;
  returnReason?:     string;
  externalRef?:      string;
  reminderT3SentAt?: string;       // null = reminder not yet sent
  reminderT0SentAt?: string;
  instalmentNo:      number;
}

/* ─── Seed data (today = 2026-05-28) ───────────────────────────────── */

const TODAY = '2026-05-28';

function dateOffset(days: number): string {
  const d = new Date(TODAY);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

const SEED_PULLS: Pull[] = [
  // Yesterday — one cleared, one returned
  { id: 'PL-001', loanRef: 'LN-2025-0892', borrowerName: 'Thabo Nkosi',     company: 'Nkosi Holdings',    amount: 4640,  method: 'debit_order', status: 'cleared',   scheduledFor: dateOffset(-1), clearedAt:   `${dateOffset(-1)}T09:42:00Z`, reminderT3SentAt: dateOffset(-4), instalmentNo: 5 },
  { id: 'PL-002', loanRef: 'LN-2026-0103', borrowerName: 'Bongani Zulu',    company: 'Zulu Enterprises',  amount: 18500, method: 'debit_order', status: 'returned',  scheduledFor: dateOffset(-1), attemptedAt: `${dateOffset(-1)}T09:44:00Z`, returnReason: 'Insufficient funds', reminderT3SentAt: dateOffset(-4), instalmentNo: 2 },

  // Today — sent (submitted to bank, awaiting confirmation)
  { id: 'PL-003', loanRef: 'LN-2026-0099', borrowerName: 'Sipho Mahlangu',  company: 'Mahlangu Tech',     amount: 2870,  method: 'debit_order', status: 'sent',      scheduledFor: TODAY, attemptedAt: `${TODAY}T08:00:00Z`, reminderT3SentAt: dateOffset(-3), reminderT0SentAt: `${TODAY}T07:00:00Z`, instalmentNo: 3 },
  { id: 'PL-004', loanRef: 'LN-2026-0098', borrowerName: 'Nomvula Khumalo', company: 'NK Consulting',     amount: 6900,  method: 'debit_order', status: 'sent',      scheduledFor: TODAY, attemptedAt: `${TODAY}T08:00:00Z`, reminderT3SentAt: dateOffset(-3), reminderT0SentAt: `${TODAY}T07:00:00Z`, instalmentNo: 4 },
  { id: 'PL-005', loanRef: 'LN-2026-0115', borrowerName: 'Zanele Mokoena',  company: 'Mokoena Retail',    amount: 9200,  method: 'eft',         status: 'cleared',   scheduledFor: TODAY, clearedAt:   `${TODAY}T10:15:00Z`, reminderT3SentAt: dateOffset(-3), instalmentNo: 1 },

  // Tomorrow (T+1)
  { id: 'PL-006', loanRef: 'LN-2026-0107', borrowerName: 'Lungelo Dube',    company: 'Dube Agri',         amount: 7400,  method: 'debit_order', status: 'scheduled', scheduledFor: dateOffset(1), instalmentNo: 6 },
  { id: 'PL-007', loanRef: 'LN-2026-0110', borrowerName: 'Keitumetse Pule', company: 'Pule & Partners',   amount: 14200, method: 'debit_order', status: 'scheduled', scheduledFor: dateOffset(1), instalmentNo: 3 },

  // T+2
  { id: 'PL-008', loanRef: 'LN-2026-0104', borrowerName: 'Ayanda Shabalala',company: 'Shabalala Group',   amount: 5500,  method: 'debit_order', status: 'scheduled', scheduledFor: dateOffset(2), instalmentNo: 8 },

  // T+3 — CRITICAL: T-3 reminders must be sent today
  { id: 'PL-009', loanRef: 'LN-2026-0101', borrowerName: 'Lerato Dlamini',  company: 'Dlamini Logistics', amount: 11200, method: 'debit_order', status: 'scheduled', scheduledFor: dateOffset(3), instalmentNo: 7 },
  { id: 'PL-010', loanRef: 'LN-2026-0112', borrowerName: 'Busi Ntuli',      company: 'Ntuli Constructions',amount: 22400, method: 'debit_order', status: 'scheduled', scheduledFor: dateOffset(3), instalmentNo: 4 },
  { id: 'PL-011', loanRef: 'LN-2026-0116', borrowerName: 'Neo Seleka',      company: 'Seleka Media',      amount: 8750,  method: 'debit_order', status: 'scheduled', scheduledFor: dateOffset(3), instalmentNo: 2 },

  // T+5
  { id: 'PL-012', loanRef: 'LN-2026-0108', borrowerName: 'Teboho Mosia',    company: 'Mosia Transport',   amount: 16000, method: 'debit_order', status: 'scheduled', scheduledFor: dateOffset(5), instalmentNo: 5 },
  { id: 'PL-013', loanRef: 'LN-2026-0109', borrowerName: 'Precious Sithole',company: 'Sithole Foods',     amount: 6300,  method: 'debit_order', status: 'scheduled', scheduledFor: dateOffset(5), instalmentNo: 9 },

  // T+7
  { id: 'PL-014', loanRef: 'LN-2025-0890', borrowerName: 'Mpho Ramokgopa', company: 'Ramokgopa Motors',  amount: 8900,  method: 'debit_order', status: 'scheduled', scheduledFor: dateOffset(7), instalmentNo: 11 },

  // T+10
  { id: 'PL-015', loanRef: 'LN-2026-0105', borrowerName: 'Sibongile Cele',  company: 'Cele Holdings',     amount: 31500, method: 'debit_order', status: 'scheduled', scheduledFor: dateOffset(10), instalmentNo: 6 },

  // T+14
  { id: 'PL-016', loanRef: 'LN-2026-0113', borrowerName: 'Phakisa Ndlovu', company: 'Phakisa Logistics', amount: 11500, method: 'debit_order', status: 'scheduled', scheduledFor: dateOffset(14), instalmentNo: 3 },
];

/* ─── Store ──────────────────────────────────────────────────────────── */

const STORAGE_KEY = 'algolend.pulls.v1';
type Listener = () => void;

class PullsStore {
  private pulls: Pull[] = [];
  private listeners = new Set<Listener>();
  private loaded = false;
  private supaTried = false;

  private loadLocal() {
    if (typeof window === 'undefined') { this.pulls = SEED_PULLS; return; }
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      this.pulls = raw ? (JSON.parse(raw) as Pull[]) : SEED_PULLS;
    } catch { this.pulls = SEED_PULLS; }
  }

  private persistLocal() {
    if (typeof window === 'undefined') return;
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.pulls)); } catch { /* quota */ }
  }

  private emit() { for (const l of this.listeners) l(); }

  private async tryLoadFromSupabase() {
    if (this.supaTried) return;
    this.supaTried = true;
    try {
      const { data, error } = await supabase
        .from('pulls')
        .select(`
          id, amount, method, status, scheduled_for, attempted_at, cleared_at,
          return_reason, external_reference, reminder_t_minus_3_sent_at, reminder_t_zero_sent_at,
          loans(reference, term_months),
          profiles!pulls_borrower_id_fkey(full_name)
        `)
        .in('status', ['scheduled', 'sent', 'cleared', 'returned'])
        .gte('scheduled_for', dateOffset(-7))
        .order('scheduled_for', { ascending: true });

      if (error) throw error;
      if (!data || data.length === 0) return;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.pulls = (data as any[]).map(rowToPull);
      this.emit();
    } catch (err) {
      console.info('[pullsStore] Supabase unavailable; using local seed.', err);
    }
  }

  private ensureLoaded() {
    if (this.loaded) return;
    this.loadLocal();
    this.loaded = true;
    void this.tryLoadFromSupabase();
  }

  getSnapshot = (): Pull[] => {
    this.ensureLoaded();
    return this.pulls;
  };

  subscribe = (listener: Listener) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };

  private update(id: string, patch: Partial<Pull>) {
    this.pulls = this.pulls.map((p) => (p.id === id ? { ...p, ...patch } : p));
    this.persistLocal();
    this.emit();
  }

  /** Mark the T-3 reminder as sent for a pull. */
  sendReminderT3(id: string): void {
    const now = new Date().toISOString();
    this.update(id, { reminderT3SentAt: now });
    void supabase.from('pulls').update({ reminder_t_minus_3_sent_at: now }).eq('id', id);
  }

  /** Mark the day-of reminder as sent. */
  sendReminderT0(id: string): void {
    const now = new Date().toISOString();
    this.update(id, { reminderT0SentAt: now });
    void supabase.from('pulls').update({ reminder_t_zero_sent_at: now }).eq('id', id);
  }

  /** Move pull to 'sent' (submitted to bank). */
  markSent(id: string, externalRef?: string): void {
    const patch: Partial<Pull> = { status: 'sent', attemptedAt: new Date().toISOString() };
    if (externalRef) patch.externalRef = externalRef;
    this.update(id, patch);
    void supabase.from('pulls').update({ status: 'sent', attempted_at: patch.attemptedAt, external_reference: externalRef ?? null }).eq('id', id);
  }

  /** Mark as cleared (payment received). */
  markCleared(id: string): void {
    const now = new Date().toISOString();
    this.update(id, { status: 'cleared', clearedAt: now });
    void supabase.from('pulls').update({ status: 'cleared', cleared_at: now }).eq('id', id);
  }

  /** Mark as returned (failed debit). */
  markReturned(id: string, reason: string): void {
    this.update(id, { status: 'returned', returnReason: reason, attemptedAt: new Date().toISOString() });
    void supabase.from('pulls').update({ status: 'returned', return_reason: reason, attempted_at: new Date().toISOString() }).eq('id', id);
  }

  /** Re-schedule a returned pull for the given date (creates a new attempt). */
  retry(originalId: string, newDate: string): Pull {
    const original = this.pulls.find((p) => p.id === originalId)!;
    const newPull: Pull = {
      ...original,
      id:               `${originalId}-r${Date.now()}`,
      status:           'scheduled',
      scheduledFor:     newDate,
      attemptedAt:      undefined,
      clearedAt:        undefined,
      returnReason:     undefined,
      reminderT3SentAt: undefined,
      reminderT0SentAt: undefined,
    };
    this.pulls = [newPull, ...this.pulls];
    this.persistLocal();
    this.emit();
    return newPull;
  }

  /** Cancel a scheduled/sent pull. */
  cancel(id: string): void {
    this.update(id, { status: 'cancelled' });
    void supabase.from('pulls').update({ status: 'cancelled' }).eq('id', id);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToPull(row: any): Pull {
  const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
  const loan    = Array.isArray(row.loans)    ? row.loans[0]    : row.loans;
  return {
    id:                row.id,
    loanRef:           loan?.reference ?? '—',
    borrowerName:      profile?.full_name ?? 'Unknown',
    company:           '—',
    amount:            Number(row.amount),
    method:            row.method as PullMethod,
    status:            row.status as PullStatus,
    scheduledFor:      row.scheduled_for,
    attemptedAt:       row.attempted_at ?? undefined,
    clearedAt:         row.cleared_at ?? undefined,
    returnReason:      row.return_reason ?? undefined,
    externalRef:       row.external_reference ?? undefined,
    reminderT3SentAt:  row.reminder_t_minus_3_sent_at ?? undefined,
    reminderT0SentAt:  row.reminder_t_zero_sent_at ?? undefined,
    instalmentNo:      0,
  };
}

export const pullsStore = new PullsStore();

/* ─── Hooks ──────────────────────────────────────────────────────────── */

export function usePulls(): Pull[] {
  return useSyncExternalStore(pullsStore.subscribe, pullsStore.getSnapshot, () => SEED_PULLS);
}

/* ─── Helpers ────────────────────────────────────────────────────────── */

export function isPullNeedingT3Reminder(pull: Pull, today: string): boolean {
  const t3 = new Date(pull.scheduledFor);
  t3.setDate(t3.getDate() - 3);
  return (
    pull.status === 'scheduled' &&
    t3.toISOString().slice(0, 10) <= today &&
    !pull.reminderT3SentAt
  );
}

export const methodLabel: Record<PullMethod, string> = {
  debit_order: 'Debit Order',
  eft:         'EFT',
  card:        'Card',
  cash:        'Cash',
  wallet:      'Wallet',
};

export const statusConfig: Record<PullStatus, { label: string; color: string; dot: string }> = {
  scheduled: { label: 'Scheduled', color: 'bg-blue-50 text-blue-700',    dot: 'bg-blue-500' },
  sent:      { label: 'Submitted', color: 'bg-amber-50 text-amber-700',  dot: 'bg-amber-500' },
  cleared:   { label: 'Cleared',   color: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
  returned:  { label: 'Returned',  color: 'bg-red-50 text-red-600',      dot: 'bg-red-500' },
  cancelled: { label: 'Cancelled', color: 'bg-slate-100 text-slate-400', dot: 'bg-slate-400' },
};
