import { Receipt, Send, CheckCircle, AlertCircle, Clock } from 'lucide-react';

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'void';
export type InvoiceType   = 'monthly_licence' | 'setup' | 'usage' | 'add_on' | 'activation';

export interface LineItem {
  id:               string;
  description:      string;
  quantity:         number;
  unit_price_cents: number;
  total_cents:      number;
  service:          string | null;
}

export interface InvoiceClient {
  id:   string;
  name: string;
  slug: string;
}

export interface Invoice {
  id:             string;
  reference:      string;
  type:           InvoiceType;
  status:         InvoiceStatus;
  subtotal_cents: number;
  vat_cents:      number;
  total_cents:    number;
  period_start:   string | null;
  period_end:     string | null;
  issued_at:      string | null;
  due_at:         string | null;
  paid_at:        string | null;
  void_at:        string | null;
  notes:          string | null;
  clients:        InvoiceClient | null;
  invoice_line_items: LineItem[];
}

export const statusStyle: Record<InvoiceStatus, { label: string; bg: string; border: string; color: string; icon: typeof Clock }> = {
  draft:   { label: 'Draft',   bg: 'rgba(75,80,128,0.15)',   border: 'rgba(75,80,128,0.3)',    color: 'var(--color-text3)', icon: Receipt     },
  sent:    { label: 'Sent',    bg: 'rgba(96,165,250,0.1)',   border: 'rgba(96,165,250,0.25)',  color: 'var(--color-sky)',   icon: Send        },
  paid:    { label: 'Paid',    bg: 'rgba(52,211,153,0.1)',   border: 'rgba(52,211,153,0.25)',  color: 'var(--color-green)', icon: CheckCircle },
  overdue: { label: 'Overdue', bg: 'rgba(248,113,113,0.1)',  border: 'rgba(248,113,113,0.25)', color: 'var(--color-red)',   icon: AlertCircle },
  void:    { label: 'Void',    bg: 'rgba(75,80,128,0.1)',    border: 'rgba(75,80,128,0.2)',    color: 'var(--color-text3)', icon: Receipt     },
};

export const typeStyle: Record<InvoiceType, { label: string; color: string }> = {
  monthly_licence: { label: 'Licence',    color: 'var(--color-text3)'  },
  setup:           { label: 'Setup',      color: 'var(--color-violet)'  },
  activation:      { label: 'Activation', color: 'var(--color-green)'   },
  usage:           { label: 'Usage',      color: 'var(--color-amber)'   },
  add_on:          { label: 'Add-on',     color: 'var(--color-sky)'     },
};

export function fmt(cents: number) {
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', minimumFractionDigits: 2 }).format(cents / 100);
}

export function fmtDate(iso: string | null | undefined) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function daysOverdue(dueAt: string | null): number {
  if (!dueAt) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(dueAt).getTime()) / 86400000));
}
