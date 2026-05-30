import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  usePulls, pullsStore, isPullNeedingT3Reminder,
  methodLabel, statusConfig, type Pull, type PullStatus,
} from '@/lib/pullsStore';
import {
  ArrowDownLeft, ArrowUpRight, AlertCircle, Clock, Download, RotateCcw, Send,
  Bell, BellRing, CheckCircle2, CalendarDays, ChevronRight, X, Loader2,
  XCircle, CalendarClock,
} from 'lucide-react';

const TODAY = '2026-05-28';

/* ─── Utils ─────────────────────────────────────────────────────────── */
function dateOffset(base: string, days: number): string {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function dayLabel(iso: string): string {
  const d    = new Date(iso);
  const diff = Math.round((d.getTime() - new Date(TODAY).getTime()) / 86400000);
  if (diff === -1) return 'Yesterday';
  if (diff === 0)  return 'Today';
  if (diff === 1)  return 'Tomorrow';
  return d.toLocaleDateString('en-ZA', { weekday: 'short', month: 'short', day: 'numeric' });
}

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' });
}

/* ─── Retry modal ───────────────────────────────────────────────────── */
function RetryModal({ pull, onConfirm, onClose }: {
  pull: Pull;
  onConfirm: (newDate: string) => void;
  onClose: () => void;
}) {
  const defaultDate = dateOffset(TODAY, 3);
  const [newDate, setNewDate] = useState(defaultDate);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      style={{ animation: 'fade-in 0.2s ease-out both' }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-7"
        style={{ animation: 'scale-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) both' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
            <RotateCcw size={16} className="text-amber-600" />
          </div>
          <div>
            <p className="font-bold text-sm">{pull.borrowerName}</p>
            <p className="text-xs text-slate-400 font-mono">{pull.loanRef}</p>
          </div>
        </div>
        <p className="text-sm text-slate-600 mb-4 leading-relaxed">
          Schedule a retry debit order for <strong>{formatCurrency(pull.amount)}</strong>.
          The borrower will receive a new T-3 reminder automatically.
        </p>
        {pull.returnReason && (
          <div className="bg-red-50 border border-red-100 rounded-xl px-3 py-2 mb-4 text-xs text-red-600 font-medium">
            Previous failure: {pull.returnReason}
          </div>
        )}
        <label className="block text-xs font-semibold text-slate-600 mb-1.5">New collection date</label>
        <input
          type="date"
          value={newDate}
          min={dateOffset(TODAY, 1)}
          onChange={(e) => setNewDate(e.target.value)}
          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100 mb-5"
        />
        <div className="flex gap-2">
          <button
            onClick={() => onConfirm(newDate)}
            className="flex-1 bg-[var(--color-brand)] text-white py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            Schedule retry
          </button>
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Pull row ──────────────────────────────────────────────────────── */
function PullRow({ pull, today, onAction }: {
  pull: Pull;
  today: string;
  onAction: (type: 'retry' | 'cancel' | 'cleared' | 'returned', pull: Pull) => void;
}) {
  const cfg       = statusConfig[pull.status];
  const needsT3   = isPullNeedingT3Reminder(pull, today);
  const [acting, setActing] = useState(false);

  async function sendT3() {
    setActing(true);
    await new Promise((r) => window.setTimeout(r, 600)); // simulate latency
    pullsStore.sendReminderT3(pull.id);
    setActing(false);
  }

  return (
    <div
      className={`flex items-center gap-4 px-6 py-4 border-b border-slate-50 last:border-0 hover:bg-slate-50/60 transition-colors ${
        needsT3 ? 'bg-amber-50/30' : ''
      }`}
    >
      {/* Status dot */}
      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cfg.dot.replace('bg-', '') }}>
        <div className={`w-2 h-2 rounded-full ${cfg.dot}`} />
      </div>

      {/* Borrower */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-900 truncate">{pull.borrowerName}</p>
        <p className="text-xs text-slate-400 truncate">{pull.company} · <span className="font-mono">{pull.loanRef}</span> · Instalment {pull.instalmentNo}</p>
      </div>

      {/* Amount */}
      <p className="text-sm font-bold text-slate-900 tabular-nums shrink-0">{formatCurrency(pull.amount)}</p>

      {/* Method */}
      <p className="text-xs text-slate-500 w-24 shrink-0 hidden sm:block">{methodLabel[pull.method]}</p>

      {/* Status badge */}
      <div className="shrink-0">
        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${cfg.color}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
          {cfg.label}
        </span>
      </div>

      {/* T-3 reminder badge */}
      {needsT3 && (
        <button
          onClick={sendT3}
          disabled={acting}
          title="Send T-3 reminder"
          className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-100 text-amber-700 text-xs font-semibold hover:bg-amber-200 transition-colors disabled:opacity-60"
        >
          {acting ? <Loader2 size={11} className="animate-spin" /> : <BellRing size={11} />}
          {acting ? 'Sending…' : 'T-3 Remind'}
        </button>
      )}
      {pull.reminderT3SentAt && pull.status === 'scheduled' && (
        <span className="shrink-0 inline-flex items-center gap-1 text-[10px] text-emerald-600 font-medium">
          <Bell size={10} /> Reminded
        </span>
      )}

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        {pull.status === 'returned' && (
          <button
            onClick={() => onAction('retry', pull)}
            title="Retry collection"
            className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-600 transition-colors"
          >
            <RotateCcw size={14} />
          </button>
        )}
        {pull.status === 'sent' && (
          <>
            <button
              onClick={() => onAction('cleared', pull)}
              title="Mark as cleared"
              className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-600 transition-colors"
            >
              <CheckCircle2 size={14} />
            </button>
            <button
              onClick={() => onAction('returned', pull)}
              title="Mark as returned"
              className="p-1.5 rounded-lg hover:bg-red-50 text-red-600 transition-colors"
            >
              <XCircle size={14} />
            </button>
          </>
        )}
        {(pull.status === 'scheduled' || pull.status === 'sent') && (
          <button
            onClick={() => onAction('cancel', pull)}
            title="Cancel pull"
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
          >
            <X size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

/* ─── 14-day calendar strip ─────────────────────────────────────────── */
function CalendarStrip({ pulls, selectedDay, onSelectDay, today }: {
  pulls: Pull[];
  selectedDay: string;
  onSelectDay: (day: string) => void;
  today: string;
}) {
  const days = useMemo(() => {
    return Array.from({ length: 18 }, (_, i) => {
      const iso     = dateOffset(today, i - 2);
      const dayPulls = pulls.filter((p) => p.scheduledFor === iso && p.status !== 'cancelled');
      const total   = dayPulls.reduce((s, p) => s + p.amount, 0);
      const returned = dayPulls.some((p) => p.status === 'returned');
      const needsT3  = dayPulls.some((p) => isPullNeedingT3Reminder(p, today));
      return { iso, dayPulls, total, returned, needsT3 };
    });
  }, [pulls, today]);

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none -mx-1 px-1">
      {days.map(({ iso, dayPulls, total, returned, needsT3 }) => {
        const diff = Math.round((new Date(iso).getTime() - new Date(today).getTime()) / 86400000);
        const isToday = diff === 0;
        const isPast  = diff < 0;
        const isSelected = iso === selectedDay;
        const count  = dayPulls.length;

        return (
          <button
            key={iso}
            onClick={() => count > 0 && onSelectDay(iso)}
            className={`shrink-0 flex flex-col items-center gap-1 px-3 py-3 rounded-2xl text-center transition-all min-w-[70px] ${
              isSelected
                ? 'bg-[var(--color-brand)] text-white shadow-lg shadow-[var(--color-brand)]/20'
                : count === 0
                ? 'opacity-40 cursor-default'
                : 'bg-white border border-slate-200 hover:border-slate-300 hover:shadow-sm cursor-pointer'
            } ${isToday && !isSelected ? 'ring-2 ring-[var(--color-brand)]/30' : ''}`}
          >
            <span className={`text-[10px] font-semibold uppercase tracking-wide ${isSelected ? 'text-white/70' : isPast ? 'text-slate-400' : 'text-slate-500'}`}>
              {new Date(iso).toLocaleDateString('en-ZA', { weekday: 'short' })}
            </span>
            <span className={`text-lg font-bold leading-none ${isSelected ? 'text-white' : isPast ? 'text-slate-400' : 'text-slate-900'}`}>
              {new Date(iso).getDate()}
            </span>
            {count > 0 ? (
              <>
                <span className={`text-[10px] font-bold ${isSelected ? 'text-white' : isPast ? 'text-slate-400' : 'text-slate-700'}`}>
                  {count} pull{count > 1 ? 's' : ''}
                </span>
                <span className={`text-[9px] font-mono ${isSelected ? 'text-white/80' : 'text-slate-500'}`}>
                  {formatCurrency(total).replace('ZAR', 'R')}
                </span>
                {(returned || needsT3) && !isSelected && (
                  <span className={`w-1.5 h-1.5 rounded-full mt-0.5 ${returned ? 'bg-red-500' : 'bg-amber-400'}`} />
                )}
              </>
            ) : (
              <span className="text-[9px] text-slate-300">—</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ─── Debit Orders tab ──────────────────────────────────────────────── */
function DebitOrdersTab({ pulls, today }: { pulls: Pull[]; today: string }) {
  const [selectedDay, setSelectedDay] = useState(today);
  const [retryTarget, setRetryTarget] = useState<Pull | null>(null);
  const [returnTarget, setReturnTarget] = useState<Pull | null>(null);
  const [returnReason, setReturnReason] = useState('');

  const activePulls = pulls.filter((p) => p.status !== 'cancelled');

  const dayPulls = useMemo(
    () => activePulls.filter((p) => p.scheduledFor === selectedDay).sort((a, b) => {
      const order: Record<PullStatus, number> = { returned: 0, sent: 1, scheduled: 2, cleared: 3, cancelled: 4 };
      return order[a.status] - order[b.status];
    }),
    [activePulls, selectedDay],
  );

  const needsReminder = activePulls.filter((p) => isPullNeedingT3Reminder(p, today));
  const returned      = activePulls.filter((p) => p.status === 'returned');
  const upcoming7days = activePulls.filter((p) => {
    const diff = Math.round((new Date(p.scheduledFor).getTime() - new Date(today).getTime()) / 86400000);
    return diff >= 0 && diff <= 7;
  });
  const upcoming7value = upcoming7days.reduce((s, p) => s + p.amount, 0);

  function handleAction(type: 'retry' | 'cancel' | 'cleared' | 'returned', pull: Pull) {
    if (type === 'retry') {
      setRetryTarget(pull);
    } else if (type === 'cancel') {
      pullsStore.cancel(pull.id);
    } else if (type === 'cleared') {
      pullsStore.markCleared(pull.id);
    } else if (type === 'returned') {
      setReturnTarget(pull);
      setReturnReason('');
    }
  }

  function confirmReturn() {
    if (!returnTarget) return;
    pullsStore.markReturned(returnTarget.id, returnReason || 'Insufficient funds');
    setReturnTarget(null);
  }

  function confirmRetry(newDate: string) {
    if (!retryTarget) return;
    pullsStore.retry(retryTarget.id, newDate);
    setRetryTarget(null);
    setSelectedDay(newDate);
  }

  function sendAllT3() {
    needsReminder.forEach((p) => pullsStore.sendReminderT3(p.id));
  }

  return (
    <div className="space-y-5">
      {/* Retry modal */}
      {retryTarget && (
        <RetryModal pull={retryTarget} onConfirm={confirmRetry} onClose={() => setRetryTarget(null)} />
      )}

      {/* Return reason modal */}
      {returnTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={() => setReturnTarget(null)}
          style={{ animation: 'fade-in 0.2s ease-out both' }}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-7"
            style={{ animation: 'scale-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) both' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center mb-4">
              <XCircle size={16} className="text-red-600" />
            </div>
            <h3 className="font-bold text-base mb-1">Mark as returned</h3>
            <p className="text-sm text-slate-500 mb-4">{returnTarget.borrowerName} · {formatCurrency(returnTarget.amount)}</p>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Return reason</label>
            <select
              value={returnReason}
              onChange={(e) => setReturnReason(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100 mb-5"
            >
              <option value="Insufficient funds">Insufficient funds</option>
              <option value="Account closed">Account closed</option>
              <option value="Payment stopped">Payment stopped</option>
              <option value="Incorrect account details">Incorrect account details</option>
              <option value="Refer to drawer">Refer to drawer</option>
            </select>
            <div className="flex gap-2">
              <button onClick={confirmReturn} className="flex-1 bg-red-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-red-700">
                Confirm return
              </button>
              <button onClick={() => setReturnTarget(null)} className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Alert banners */}
      {returned.length > 0 && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-2xl px-5 py-3.5" style={{ animation: 'fade-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) both' }}>
          <AlertCircle size={16} className="text-red-600 shrink-0" />
          <p className="text-sm text-red-800 flex-1">
            <strong>{returned.length} returned debit{returned.length > 1 ? 's' : ''}</strong> — action required.
          </p>
          <button
            onClick={() => setSelectedDay(returned[0].scheduledFor)}
            className="text-xs font-semibold text-red-700 hover:text-red-900 flex items-center gap-1"
          >
            View <ChevronRight size={12} />
          </button>
        </div>
      )}

      {needsReminder.length > 0 && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-3.5" style={{ animation: 'fade-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) both', animationDelay: '60ms' }}>
          <BellRing size={16} className="text-amber-600 shrink-0" />
          <p className="text-sm text-amber-800 flex-1">
            <strong>{needsReminder.length} pull{needsReminder.length > 1 ? 's' : ''} need T-3 reminders</strong> — due in 3 days, borrowers not yet notified.
          </p>
          <button
            onClick={sendAllT3}
            className="text-xs font-semibold text-amber-700 hover:text-amber-900 flex items-center gap-1.5 bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded-lg transition-colors"
          >
            <Send size={11} /> Send all
          </button>
        </div>
      )}

      {/* KPI strip */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-5">
          <div className="flex items-center gap-2 text-purple-600 mb-2">
            <CalendarClock size={14} />
            <span className="text-xs font-semibold uppercase tracking-wide">Next 7 days</span>
          </div>
          <p className="text-2xl font-bold tracking-tight">{formatCurrency(upcoming7value)}</p>
          <p className="text-xs text-slate-400 mt-1">{upcoming7days.length} pull{upcoming7days.length !== 1 ? 's' : ''} scheduled</p>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-2 text-amber-600 mb-2">
            <BellRing size={14} />
            <span className="text-xs font-semibold uppercase tracking-wide">Reminders due</span>
          </div>
          <p className="text-2xl font-bold tracking-tight">{needsReminder.length}</p>
          <p className="text-xs text-slate-400 mt-1">T-3 not yet sent</p>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-2 text-red-600 mb-2">
            <AlertCircle size={14} />
            <span className="text-xs font-semibold uppercase tracking-wide">Returns to action</span>
          </div>
          <p className="text-2xl font-bold tracking-tight">{returned.length}</p>
          <p className="text-xs text-slate-400 mt-1">{returned.length === 0 ? 'No failures' : 'Retry or escalate'}</p>
        </Card>
      </div>

      {/* Calendar strip */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <CalendarDays size={14} className="text-slate-400" />
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Collection Calendar</span>
        </div>
        <CalendarStrip
          pulls={activePulls}
          selectedDay={selectedDay}
          onSelectDay={setSelectedDay}
          today={today}
        />
      </Card>

      {/* Day detail */}
      <Card className="overflow-hidden p-0">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <CalendarDays size={14} className="text-slate-400" />
            <span className="text-sm font-bold text-slate-900">{dayLabel(selectedDay)}</span>
            <span className="text-xs text-slate-400 font-mono">{shortDate(selectedDay)}</span>
          </div>
          <div className="flex items-center gap-3">
            {dayPulls.length > 0 && (
              <span className="text-xs text-slate-500">
                {formatCurrency(dayPulls.reduce((s, p) => s + p.amount, 0))} total
              </span>
            )}
            <span className="text-xs font-semibold text-slate-500">{dayPulls.length} pull{dayPulls.length !== 1 ? 's' : ''}</span>
          </div>
        </div>

        {dayPulls.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <div className="w-10 h-10 mx-auto rounded-xl bg-slate-100 flex items-center justify-center mb-3">
              <CalendarDays size={16} className="text-slate-400" />
            </div>
            <p className="text-sm text-slate-500">No pulls scheduled for this day.</p>
          </div>
        ) : (
          dayPulls.map((pull, i) => (
            <div key={pull.id} style={{ animation: 'fade-up 0.35s cubic-bezier(0.16, 1, 0.3, 1) both', animationDelay: `${i * 40}ms` }}>
              <PullRow pull={pull} today={today} onAction={handleAction} />
            </div>
          ))
        )}
      </Card>
    </div>
  );
}

/* ─── Instalments-In tab (existing data + pulls integration) ──────── */
interface IncomingPayment {
  id: string; client: string; company: string; loan: string;
  amount: number; date: string; method: string;
  status: 'cleared' | 'pending' | 'returned'; reason?: string;
}
interface OutgoingPayment {
  id: string; client: string; loan: string;
  amount: number; date: string; method: string;
  status: 'sent' | 'queued' | 'failed'; ref: string;
}

const INITIAL_INCOMING: IncomingPayment[] = [
  { id: 'IN-2026-1142', client: 'Thabo Nkosi',     company: 'Nkosi Holdings',    loan: 'LN-2025-0892', amount: 4640,  date: '2026-05-28', method: 'EFT',         status: 'cleared' },
  { id: 'IN-2026-1141', client: 'Zanele Mokoena',  company: 'Mokoena Retail',    loan: 'LN-2026-0115', amount: 9200,  date: '2026-05-28', method: 'EFT',         status: 'cleared' },
  { id: 'IN-2026-1140', client: 'Sipho Mahlangu',  company: 'Mahlangu Tech',     loan: 'LN-2026-0099', amount: 2870,  date: '2026-05-28', method: 'Debit Order', status: 'pending' },
  { id: 'IN-2026-1139', client: 'Nomvula Khumalo', company: 'NK Consulting',     loan: 'LN-2026-0098', amount: 6900,  date: '2026-05-28', method: 'Debit Order', status: 'pending' },
  { id: 'IN-2026-1138', client: 'Bongani Zulu',    company: 'Zulu Enterprises',  loan: 'LN-2026-0103', amount: 18500, date: '2026-05-27', method: 'Debit Order', status: 'returned', reason: 'Insufficient funds' },
];

const INITIAL_OUTGOING: OutgoingPayment[] = [
  { id: 'OUT-2026-0312', client: 'Velocity Trading',  loan: 'LN-2026-0114', amount: 75000,  date: '2026-05-28', method: 'EFT', status: 'sent',   ref: 'Loan disbursement' },
  { id: 'OUT-2026-0311', client: 'Phakisa Logistics', loan: 'LN-2026-0113', amount: 120000, date: '2026-05-28', method: 'EFT', status: 'sent',   ref: 'Loan disbursement' },
  { id: 'OUT-2026-0310', client: 'Greenline Foods',   loan: 'LN-2026-0112', amount: 45000,  date: '2026-05-27', method: 'EFT', status: 'sent',   ref: 'Loan disbursement' },
  { id: 'OUT-2026-0309', client: 'Mahlangu Tech',     loan: 'LN-2026-0099', amount: 5000,   date: '2026-05-26', method: 'EFT', status: 'queued', ref: 'Top-up' },
];

const incomingStatusCfg = {
  cleared:  { variant: 'success' as const, icon: CheckCircle2,  label: 'Cleared' },
  pending:  { variant: 'warning' as const, icon: Clock,         label: 'Pending' },
  returned: { variant: 'danger'  as const, icon: AlertCircle,   label: 'Returned' },
};
const outgoingStatusCfg = {
  sent:   { variant: 'success' as const, icon: CheckCircle2, label: 'Sent' },
  queued: { variant: 'warning' as const, icon: Clock,        label: 'Queued' },
  failed: { variant: 'danger'  as const, icon: AlertCircle,  label: 'Failed' },
};

/* ─── Main page ─────────────────────────────────────────────────────── */
export function PaymentsPage() {
  const pulls = usePulls();
  const [tab, setTab]           = useState<'pulls' | 'incoming' | 'outgoing'>('pulls');
  const [incoming, setIncoming] = useState<IncomingPayment[]>(INITIAL_INCOMING);
  const [outgoing, setOutgoing] = useState<OutgoingPayment[]>(INITIAL_OUTGOING);
  const [toast, setToast]       = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 3500);
  }

  function retryReturned(p: IncomingPayment) {
    setIncoming((prev) => prev.map((x) => (x.id === p.id ? { ...x, status: 'pending', reason: undefined } : x)));
    showToast(`${p.id} requeued for retry. ${p.client} notified via SMS.`);
  }

  function chaseClient(p: IncomingPayment) {
    showToast(`Payment reminder sent to ${p.client} via SMS + email.`);
  }

  function sendQueued(p: OutgoingPayment) {
    if (p.status !== 'queued') return;
    setOutgoing((prev) => prev.map((x) => (x.id === p.id ? { ...x, status: 'sent' } : x)));
    showToast(`${p.id} disbursed via Sure Systems · ${formatCurrency(p.amount)}.`);
  }

  function exportCSV() {
    const rows = tab === 'incoming'
      ? [
          ['ID', 'Borrower', 'Company', 'Loan', 'Amount', 'Method', 'Date', 'Status'].join(','),
          ...incoming.map((p) => [p.id, `"${p.client}"`, `"${p.company}"`, p.loan, p.amount, p.method, p.date, p.status].join(',')),
        ]
      : tab === 'outgoing'
      ? [
          ['ID', 'Beneficiary', 'Loan', 'Amount', 'Method', 'Date', 'Reference', 'Status'].join(','),
          ...outgoing.map((p) => [p.id, `"${p.client}"`, p.loan, p.amount, p.method, p.date, `"${p.ref}"`, p.status].join(',')),
        ]
      : [
          ['ID', 'Borrower', 'Loan', 'Amount', 'Method', 'Status', 'Scheduled', 'T-3 Sent'].join(','),
          ...pulls.map((p) => [p.id, `"${p.borrowerName}"`, p.loanRef, p.amount, p.method, p.status, p.scheduledFor, p.reminderT3SentAt ?? ''].join(',')),
        ];
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `algolend-payments-${tab}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Export downloaded.');
  }

  const totalIn   = incoming.filter((i) => i.status === 'cleared').reduce((s, i) => s + i.amount, 0);
  const totalOut  = outgoing.filter((i) => i.status === 'sent').reduce((s, i) => s + i.amount, 0);
  const returns   = incoming.filter((i) => i.status === 'returned').length;

  const TABS = [
    { id: 'pulls'    as const, label: 'Debit Orders',       count: pulls.filter((p) => p.status !== 'cancelled').length },
    { id: 'incoming' as const, label: 'Instalments In',     count: incoming.length },
    { id: 'outgoing' as const, label: 'Disbursements Out',  count: outgoing.length },
  ];

  return (
    <div className="space-y-6 page-enter">
      {/* Toast */}
      {toast ? (
        <div className="fixed top-6 right-6 z-50 px-4 py-3 rounded-2xl bg-slate-900 text-white text-sm shadow-xl" style={{ animation: 'slide-down 0.35s cubic-bezier(0.16, 1, 0.3, 1) both' }}>
          {toast}
        </div>
      ) : null}

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Payments</h1>
          <p className="text-slate-500 text-sm mt-1">Debit-order calendar · instalment collections · loan disbursements.</p>
        </div>
        <Button variant="outline" size="md" onClick={exportCSV}>
          <Download size={14} /> Export
        </Button>
      </div>

      {/* Top KPI strip (only on non-pulls tabs) */}
      {tab !== 'pulls' && (
        <div className="grid grid-cols-3 gap-4">
          <Card className="p-5">
            <div className="flex items-center gap-2 text-emerald-600 mb-2">
              <ArrowDownLeft size={14} />
              <span className="text-xs font-semibold uppercase tracking-wide">Collected today</span>
            </div>
            <p className="text-2xl font-bold text-slate-900 tracking-tight">{formatCurrency(totalIn)}</p>
            <p className="text-xs text-slate-400 mt-1">{incoming.filter((i) => i.status === 'cleared').length} payments cleared</p>
          </Card>
          <Card className="p-5">
            <div className="flex items-center gap-2 text-purple-600 mb-2">
              <ArrowUpRight size={14} />
              <span className="text-xs font-semibold uppercase tracking-wide">Disbursed today</span>
            </div>
            <p className="text-2xl font-bold text-slate-900 tracking-tight">{formatCurrency(totalOut)}</p>
            <p className="text-xs text-slate-400 mt-1">{outgoing.filter((i) => i.status === 'sent').length} loans funded</p>
          </Card>
          <Card className="p-5">
            <div className="flex items-center gap-2 text-red-600 mb-2">
              <AlertCircle size={14} />
              <span className="text-xs font-semibold uppercase tracking-wide">Returns to action</span>
            </div>
            <p className="text-2xl font-bold text-slate-900 tracking-tight">{returns}</p>
            <p className="text-xs text-slate-400 mt-1">{returns === 0 ? 'No failed debit orders' : 'Click Retry below'}</p>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`relative px-4 py-2.5 text-sm font-medium transition-colors ${
              tab === t.id ? 'text-[var(--color-brand)]' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.label}
            <span className="ml-1.5 text-xs text-slate-400">({t.count})</span>
            {tab === t.id && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--color-brand)] rounded-t" />}
          </button>
        ))}
      </div>

      {/* Debit Orders tab */}
      {tab === 'pulls' && <DebitOrdersTab pulls={pulls} today={TODAY} />}

      {/* Instalments In */}
      {tab === 'incoming' && (
        <Card className="overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                {['ID', 'Borrower', 'Loan', 'Amount', 'Method', 'Date', 'Status', ''].map((h) => (
                  <th key={h} className="px-6 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {incoming.map((p, i) => {
                const cfg  = incomingStatusCfg[p.status];
                const Icon = cfg.icon;
                return (
                  <tr key={p.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors" style={{ animation: 'fade-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) both', animationDelay: `${i * 40}ms` }}>
                    <td className="px-6 py-4 font-mono text-xs text-slate-400">{p.id}</td>
                    <td className="px-6 py-4">
                      <p className="font-semibold text-slate-900">{p.client}</p>
                      <p className="text-xs text-slate-400">{p.company}</p>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-500">{p.loan}</td>
                    <td className="px-6 py-4 font-bold text-emerald-600">+{formatCurrency(p.amount)}</td>
                    <td className="px-6 py-4 text-slate-500 text-xs">{p.method}</td>
                    <td className="px-6 py-4 text-slate-500 text-xs">{formatDate(p.date)}</td>
                    <td className="px-6 py-4">
                      <Badge variant={cfg.variant}><Icon size={11} /> {cfg.label}</Badge>
                      {p.status === 'returned' && p.reason ? <p className="text-[10px] text-red-500 mt-1">{p.reason}</p> : null}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 justify-end">
                        {p.status === 'returned' ? (
                          <>
                            <button title="Retry debit" onClick={() => retryReturned(p)} className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-600"><RotateCcw size={14} /></button>
                            <button title="Send reminder" onClick={() => chaseClient(p)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-600"><Send size={14} /></button>
                          </>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      {/* Disbursements Out */}
      {tab === 'outgoing' && (
        <Card className="overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                {['ID', 'Beneficiary', 'Loan', 'Amount', 'Reference', 'Date', 'Status', ''].map((h) => (
                  <th key={h} className="px-6 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {outgoing.map((p, i) => {
                const cfg  = outgoingStatusCfg[p.status];
                const Icon = cfg.icon;
                return (
                  <tr key={p.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors" style={{ animation: 'fade-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) both', animationDelay: `${i * 40}ms` }}>
                    <td className="px-6 py-4 font-mono text-xs text-slate-400">{p.id}</td>
                    <td className="px-6 py-4 font-semibold text-slate-900">{p.client}</td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-500">{p.loan}</td>
                    <td className="px-6 py-4 font-bold text-purple-600">-{formatCurrency(p.amount)}</td>
                    <td className="px-6 py-4 text-xs text-slate-500">{p.ref}</td>
                    <td className="px-6 py-4 text-slate-500 text-xs">{formatDate(p.date)}</td>
                    <td className="px-6 py-4">
                      <Badge variant={cfg.variant}><Icon size={11} /> {cfg.label}</Badge>
                    </td>
                    <td className="px-6 py-4">
                      {p.status === 'queued' ? (
                        <Button size="sm" onClick={() => sendQueued(p)}>
                          <Send size={12} /> Disburse
                        </Button>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
