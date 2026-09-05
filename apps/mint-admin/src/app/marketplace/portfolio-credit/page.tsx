'use client';

import { useState, useEffect, useCallback } from 'react';
import { Shell } from '@/components/Shell';
import {
  Landmark, RefreshCw, Loader2, ChevronDown, ChevronUp,
  TrendingUp, AlertTriangle, CheckCircle2, Clock, XCircle,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

function fmt(n: number) {
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: 0 }).format(n);
}

function pct(n: number) {
  return (n * 100).toFixed(1) + '%';
}

type FacilityStatus = 'pending' | 'active' | 'margin_call' | 'repaid' | 'defaulted';

interface Facility {
  id:                 string;
  mint_user_id:       string;
  consumer_email:     string;
  consumer_name:      string | null;
  portfolio_value:    number;
  collateral_type:    string;
  facility_amount:    number;
  drawn_amount:       number;
  ltv_ratio:          number;
  interest_rate_pct:  number;
  term_months:        number | null;
  status:             FacilityStatus;
  originated_at:      string | null;
  repaid_at:          string | null;
  created_at:         string;
  metadata:           Record<string, unknown>;
}

const STATUS: Record<FacilityStatus, { label: string; bg: string; color: string; border: string; icon: React.ReactNode }> = {
  pending:     { label: 'Pending',     bg: 'rgba(251,191,36,0.1)',  color: 'var(--color-amber)', border: 'rgba(251,191,36,0.25)', icon: <Clock size={11} /> },
  active:      { label: 'Active',      bg: 'rgba(52,211,153,0.1)',  color: 'var(--color-green)', border: 'rgba(52,211,153,0.25)', icon: <CheckCircle2 size={11} /> },
  margin_call: { label: 'Margin call', bg: 'rgba(248,113,113,0.1)', color: 'var(--color-red)',   border: 'rgba(248,113,113,0.25)',icon: <AlertTriangle size={11} /> },
  repaid:      { label: 'Repaid',      bg: 'rgba(155,159,184,0.15)',color: '#9B9FB8',            border: 'rgba(155,159,184,0.25)',icon: <CheckCircle2 size={11} /> },
  defaulted:   { label: 'Defaulted',   bg: 'rgba(220,38,38,0.12)',  color: '#dc2626',             border: 'rgba(220,38,38,0.3)',   icon: <XCircle size={11} /> },
};

const COLLATERAL_LABELS: Record<string, string> = {
  equities:    'Equities',
  bonds:       'Bonds',
  mixed:       'Mixed portfolio',
  unit_trusts: 'Unit trusts',
};

function LtvBar({ ltv }: { ltv: number }) {
  const pctVal = Math.min(100, ltv * 100);
  const color = pctVal >= 80 ? 'var(--color-red)' : pctVal >= 65 ? 'var(--color-amber)' : 'var(--color-green)';
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 overflow-hidden rounded-full" style={{ background: 'var(--color-fill-subtle)' }}>
        <div className="h-full rounded-full" style={{ width: `${pctVal}%`, background: color }} />
      </div>
      <span className="text-xs font-semibold" style={{ color }}>
        {pct(ltv)}
      </span>
    </div>
  );
}

export default function PortfolioCreditPage() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading]       = useState(true);
  const [expanded, setExpanded]     = useState<string | null>(null);
  const [search, setSearch]         = useState('');
  const [statusFilter, setStatusFilter] = useState<FacilityStatus | 'all'>('all');
  const [viewMode, setViewMode]     = useState<'active' | 'history'>('active');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch('/api/marketplace/portfolio-credit');
      const json = await res.json();
      if (res.ok) setFacilities(json.facilities ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const ACTIVE_STATUSES:  FacilityStatus[] = ['pending', 'active', 'margin_call'];
  const HISTORY_STATUSES: FacilityStatus[] = ['repaid', 'defaulted'];

  const filtered = facilities.filter((f) => {
    const inView = viewMode === 'active'
      ? ACTIVE_STATUSES.includes(f.status)
      : HISTORY_STATUSES.includes(f.status);
    if (!inView) return false;
    if (statusFilter !== 'all' && f.status !== statusFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (f.consumer_email ?? '').toLowerCase().includes(q) ||
      (f.consumer_name  ?? '').toLowerCase().includes(q) ||
      (f.mint_user_id   ?? '').toLowerCase().includes(q)
    );
  });

  const active       = facilities.filter(f => f.status === 'active');
  const marginCalls  = facilities.filter(f => f.status === 'margin_call');
  const totalDrawn   = active.reduce((s, f) => s + (f.drawn_amount ?? 0), 0);
  const totalCollateral = active.reduce((s, f) => s + (f.portfolio_value ?? 0), 0);
  const avgLtv       = active.length
    ? active.reduce((s, f) => s + (f.ltv_ratio ?? 0), 0) / active.length
    : 0;

  return (
    <Shell>
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 page-enter">

        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: 'rgba(124,58,237,0.12)', color: 'var(--color-violet)' }}>
              <Landmark size={20} />
            </div>
            <div>
              <h1 className="text-xl font-semibold" style={{ color: 'var(--color-text)' }}>Portfolio-Backed Credit</h1>
              <p className="text-sm" style={{ color: 'var(--color-text3)' }}>Credit facilities secured against MINT investment portfolios</p>
            </div>
          </div>
          <button
            onClick={load}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors"
            style={{ border: '1px solid var(--color-border2)', background: 'var(--color-surface)', color: 'var(--color-text3)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--color-card-hover)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--color-surface)'; }}
          >
            <RefreshCw size={14} />Refresh
          </button>
        </div>

        {/* Active / History toggle */}
        <div className="flex gap-1 rounded-xl p-1 w-fit" style={{ border: '1px solid var(--color-border2)', background: 'var(--color-ink)' }}>
          {(['active', 'history'] as const).map((v) => (
            <button
              key={v}
              onClick={() => { setViewMode(v); setStatusFilter('all'); }}
              className="px-4 py-1.5 rounded-lg text-sm font-medium transition-all capitalize"
              style={viewMode === v
                ? { background: 'var(--color-surface)', color: 'var(--color-text)', boxShadow: '0 1px 3px rgba(0,0,0,0.25)' }
                : { color: 'var(--color-text3)' }}
            >
              {v === 'active' ? 'Active' : 'History'}
              <span className="ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{
                background: viewMode === v ? (v === 'history' ? 'rgba(248,113,113,0.15)' : 'rgba(124,58,237,0.15)') : 'var(--color-fill-subtle)',
                color: viewMode === v ? (v === 'history' ? 'var(--color-red)' : 'var(--color-violet)') : 'var(--color-text3)',
              }}>
                {v === 'active'
                  ? facilities.filter(f => ACTIVE_STATUSES.includes(f.status)).length
                  : facilities.filter(f => HISTORY_STATUSES.includes(f.status)).length}
              </span>
            </button>
          ))}
        </div>

        {/* Margin call alert */}
        {marginCalls.length > 0 && (
          <div className="flex items-center gap-3 rounded-xl px-4 py-3" style={{ border: '1px solid rgba(248,113,113,0.25)', background: 'rgba(248,113,113,0.08)' }}>
            <AlertTriangle size={18} className="flex-shrink-0" style={{ color: 'var(--color-red)' }} />
            <p className="text-sm font-semibold" style={{ color: 'var(--color-red)' }}>
              {marginCalls.length} facility{marginCalls.length > 1 ? 'ies' : ''} in margin call —
              portfolio value has dropped below the minimum collateral threshold.
            </p>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            { label: 'Active facilities', value: String(active.length),         sub: 'currently drawn' },
            { label: 'Total drawn',       value: fmt(totalDrawn),               sub: 'across all facilities' },
            { label: 'Total collateral',  value: fmt(totalCollateral),          sub: 'portfolio value at origin' },
            { label: 'Avg LTV',           value: active.length ? pct(avgLtv) : '—', sub: 'loan-to-value ratio' },
          ].map((s) => (
            <div key={s.label} className="bento-card p-4">
              <p className="eyebrow mb-1">{s.label}</p>
              <p className="mt-1 text-2xl font-bold" style={{ color: 'var(--color-text)' }}>{s.value}</p>
              <p className="text-xs" style={{ color: 'var(--color-text3)' }}>{s.sub}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email…"
            className="field-input flex-1 min-w-48"
          />
          <div className="flex gap-1.5">
            {(['all', ...(viewMode === 'active' ? ACTIVE_STATUSES : HISTORY_STATUSES)] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s as FacilityStatus | 'all')}
                className="rounded-lg px-3 py-2 text-xs font-medium capitalize transition-all"
                style={statusFilter === s
                  ? { background: 'var(--color-purple)', color: '#fff' }
                  : { border: '1px solid var(--color-border2)', background: 'var(--color-surface)', color: 'var(--color-text3)' }}
              >
                {s === 'all' ? 'All' : s === 'margin_call' ? 'Margin call' : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="bento-card overflow-hidden p-0">
          {loading ? (
            <div className="flex items-center justify-center py-20" style={{ color: 'var(--color-text3)' }}>
              <Loader2 size={22} className="animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20" style={{ color: 'var(--color-text3)' }}>
              <Landmark size={32} className="mb-3 opacity-30" />
              <p className="text-sm">
                {search || statusFilter !== 'all'
                  ? 'No facilities match your filters.'
                  : viewMode === 'history'
                    ? 'No closed facilities yet — repaid and defaulted accounts will appear here.'
                    : 'No active facilities yet. They will appear here once MINT borrowers draw against their portfolios.'}
              </p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead style={{ borderBottom: '1px solid var(--color-border2)', background: 'var(--color-ink)' }}>
                <tr className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--color-text3)' }}>
                  <th className="px-4 py-3 text-left">Borrower</th>
                  <th className="px-4 py-3 text-left">Collateral</th>
                  <th className="px-4 py-3 text-right">Facility</th>
                  <th className="px-4 py-3 text-right">Drawn</th>
                  <th className="px-4 py-3 text-left">LTV</th>
                  <th className="px-4 py-3 text-right">Rate</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Originated</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((f) => {
                  const st   = STATUS[f.status] ?? STATUS.pending;
                  const open = expanded === f.id;
                  const rowTint = f.status === 'margin_call' || f.status === 'defaulted'
                    ? 'rgba(248,113,113,0.04)'
                    : f.status === 'repaid' ? 'rgba(155,159,184,0.04)' : undefined;
                  return (
                    <>
                      <tr key={f.id} style={{ borderTop: '1px solid var(--color-row-border)', background: rowTint }}>
                        <td className="px-4 py-3">
                          <p className="font-medium" style={{ color: 'var(--color-text)' }}>{f.consumer_name || '—'}</p>
                          <p className="text-xs" style={{ color: 'var(--color-text3)' }}>{f.consumer_email}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium" style={{ color: 'var(--color-text2)' }}>{fmt(f.portfolio_value)}</p>
                          <p className="text-xs" style={{ color: 'var(--color-text3)' }}>{COLLATERAL_LABELS[f.collateral_type] ?? f.collateral_type}</p>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold" style={{ color: 'var(--color-text)' }}>{fmt(f.facility_amount)}</td>
                        <td className="px-4 py-3 text-right" style={{ color: 'var(--color-text2)' }}>{fmt(f.drawn_amount)}</td>
                        <td className="px-4 py-3"><LtvBar ltv={f.ltv_ratio} /></td>
                        <td className="px-4 py-3 text-right" style={{ color: 'var(--color-text2)' }}>{f.interest_rate_pct?.toFixed(1)}%</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold" style={{ background: st.bg, color: st.color, border: `1px solid ${st.border}` }}>
                            {st.icon}{st.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs" style={{ color: 'var(--color-text3)' }}>
                          {f.originated_at
                            ? formatDistanceToNow(new Date(f.originated_at), { addSuffix: true })
                            : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => setExpanded(open ? null : f.id)}
                            className="rounded-lg p-1 transition-colors"
                            style={{ color: 'var(--color-text3)' }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--color-fill-subtle)'; (e.currentTarget as HTMLElement).style.color = 'var(--color-text)'; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--color-text3)'; }}
                          >
                            {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>
                        </td>
                      </tr>

                      {open && (
                        <tr key={`${f.id}-detail`}>
                          <td colSpan={9} className="px-4 pb-5 pt-3" style={{ background: 'var(--color-ink)' }}>
                            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                              {[
                                { label: 'Full name',         value: f.consumer_name || '—' },
                                { label: 'Email',             value: f.consumer_email },
                                { label: 'MINT user ID',      value: f.mint_user_id },
                                { label: 'Collateral type',   value: COLLATERAL_LABELS[f.collateral_type] ?? f.collateral_type },
                                { label: 'Portfolio value',   value: fmt(f.portfolio_value) },
                                { label: 'Facility limit',    value: fmt(f.facility_amount) },
                                { label: 'Drawn amount',      value: fmt(f.drawn_amount) },
                                { label: 'LTV ratio',         value: pct(f.ltv_ratio) },
                                { label: 'Interest rate',     value: `${f.interest_rate_pct?.toFixed(1)}% p.a.` },
                                { label: 'Term',              value: f.term_months ? `${f.term_months} months` : 'Revolving' },
                                { label: 'Originated',        value: f.originated_at ? new Date(f.originated_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }) : '—' },
                                { label: f.status === 'repaid' ? 'Repaid' : 'Status updated', value: (f.repaid_at ? new Date(f.repaid_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }) : null) ?? st.label },
                              ].map(({ label, value }) => (
                                <div key={label}>
                                  <p className="text-[10px] font-medium uppercase tracking-wide" style={{ color: 'var(--color-text3)' }}>{label}</p>
                                  <p className="mt-0.5 text-sm font-medium break-all" style={{ color: 'var(--color-text2)' }}>{value}</p>
                                </div>
                              ))}
                            </div>
                            {/* Collateral basket */}
                            {(() => {
                              const symbols = f.metadata?.symbols as string[] | undefined;
                              const count   = f.metadata?.collateral_count as number | undefined;
                              const repayable = f.metadata?.amount_repayable as number | undefined;
                              const monthly   = f.metadata?.monthly_repayable as number | undefined;
                              const firstDate = f.metadata?.first_repayment_date as string | undefined;
                              if (!symbols?.length && !repayable) return null;
                              return (
                                <div className="mt-4 rounded-xl p-4 space-y-3" style={{ border: '1px solid var(--color-border2)', background: 'var(--color-surface)' }}>
                                  <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--color-text3)' }}>
                                    Collateral basket{count ? ` — ${count} holding${count !== 1 ? 's' : ''}` : ''}
                                  </p>
                                  {symbols?.length ? (
                                    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(symbols.length, 4)}, 1fr)` }}>
                                      {symbols.map((sym) => {
                                        const assetValue  = f.portfolio_value / symbols.length;
                                        const assetLtv    = f.drawn_amount / f.portfolio_value;
                                        const ltvPct      = Math.min(100, assetLtv * 100);
                                        const barColor    = ltvPct >= 80 ? 'var(--color-red)' : ltvPct >= 65 ? 'var(--color-amber)' : 'var(--color-green)';
                                        const sharePct    = (100 / symbols.length).toFixed(1);
                                        return (
                                          <div key={sym} className="rounded-lg p-3 space-y-2" style={{ border: '1px solid var(--color-border2)', background: 'var(--color-surface2)' }}>
                                            <div className="flex items-center justify-between">
                                              <span className="text-xs font-bold" style={{ color: 'var(--color-violet)' }}>{sym}</span>
                                              <span className="text-[10px]" style={{ color: 'var(--color-text3)' }}>{sharePct}%</span>
                                            </div>
                                            <p className="text-sm font-semibold" style={{ color: 'var(--color-text2)' }}>{fmt(assetValue)}</p>
                                            <div>
                                              <div className="flex items-center justify-between mb-1">
                                                <span className="text-[10px]" style={{ color: 'var(--color-text3)' }}>LTV</span>
                                                <span className="text-[10px] font-semibold" style={{ color: barColor }}>{ltvPct.toFixed(1)}%</span>
                                              </div>
                                              <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: 'var(--color-fill-subtle)' }}>
                                                <div className="h-full rounded-full transition-all" style={{ width: `${ltvPct}%`, background: barColor }} />
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  ) : null}
                                  {(repayable || monthly || firstDate) && (
                                    <div className="grid grid-cols-3 gap-3 pt-1" style={{ borderTop: '1px solid var(--color-border2)' }}>
                                      {repayable && (
                                        <div>
                                          <p className="text-[10px] font-medium uppercase tracking-wide" style={{ color: 'var(--color-text3)' }}>Total repayable</p>
                                          <p className="mt-0.5 text-sm font-semibold" style={{ color: 'var(--color-text2)' }}>{fmt(repayable)}</p>
                                        </div>
                                      )}
                                      {monthly && (
                                        <div>
                                          <p className="text-[10px] font-medium uppercase tracking-wide" style={{ color: 'var(--color-text3)' }}>Monthly instalment</p>
                                          <p className="mt-0.5 text-sm font-semibold" style={{ color: 'var(--color-text2)' }}>{fmt(monthly)}</p>
                                        </div>
                                      )}
                                      {firstDate && (
                                        <div>
                                          <p className="text-[10px] font-medium uppercase tracking-wide" style={{ color: 'var(--color-text3)' }}>First repayment</p>
                                          <p className="mt-0.5 text-sm font-semibold" style={{ color: 'var(--color-text2)' }}>
                                            {new Date(firstDate).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}
                                          </p>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* LTV legend */}
        <div className="flex items-center gap-6 text-xs" style={{ color: 'var(--color-text3)' }}>
          <span className="font-medium" style={{ color: 'var(--color-text2)' }}>LTV guide:</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: 'var(--color-green)' }} />Safe (&lt;65%)</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: 'var(--color-amber)' }} />Watch (65–80%)</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: 'var(--color-red)' }} />Margin call (&gt;80%)</span>
        </div>

      </div>
    </Shell>
  );
}
