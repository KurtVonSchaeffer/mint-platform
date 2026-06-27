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

const STATUS: Record<FacilityStatus, { label: string; bg: string; text: string; border: string; icon: React.ReactNode }> = {
  pending:     { label: 'Pending',     bg: 'bg-amber-50',   text: 'text-amber-700',  border: 'border-amber-200', icon: <Clock size={11} /> },
  active:      { label: 'Active',      bg: 'bg-emerald-50', text: 'text-emerald-700',border: 'border-emerald-200',icon: <CheckCircle2 size={11} /> },
  margin_call: { label: 'Margin call', bg: 'bg-red-50',     text: 'text-red-600',    border: 'border-red-200',   icon: <AlertTriangle size={11} /> },
  repaid:      { label: 'Repaid',      bg: 'bg-slate-50',   text: 'text-slate-500',  border: 'border-slate-200', icon: <CheckCircle2 size={11} /> },
  defaulted:   { label: 'Defaulted',   bg: 'bg-red-50',     text: 'text-red-700',    border: 'border-red-300',   icon: <XCircle size={11} /> },
};

const COLLATERAL_LABELS: Record<string, string> = {
  equities:    'Equities',
  bonds:       'Bonds',
  mixed:       'Mixed portfolio',
  unit_trusts: 'Unit trusts',
};

function LtvBar({ ltv }: { ltv: number }) {
  const pctVal = Math.min(100, ltv * 100);
  const color = pctVal >= 80 ? 'bg-red-500' : pctVal >= 65 ? 'bg-amber-400' : 'bg-emerald-500';
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-gray-100">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pctVal}%` }} />
      </div>
      <span className={`text-xs font-semibold ${pctVal >= 80 ? 'text-red-600' : pctVal >= 65 ? 'text-amber-600' : 'text-emerald-600'}`}>
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

  const filtered = facilities.filter((f) => {
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
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">

        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
              <Landmark size={20} />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Portfolio-Backed Credit</h1>
              <p className="text-sm text-gray-500">Credit facilities secured against MINT investment portfolios</p>
            </div>
          </div>
          <button
            onClick={load}
            className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            <RefreshCw size={14} />Refresh
          </button>
        </div>

        {/* Margin call alert */}
        {marginCalls.length > 0 && (
          <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
            <AlertTriangle size={18} className="flex-shrink-0 text-red-500" />
            <p className="text-sm font-semibold text-red-700">
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
            <div key={s.label} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">{s.label}</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{s.value}</p>
              <p className="text-xs text-gray-400">{s.sub}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email…"
            className="flex-1 min-w-48 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-800 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
          />
          <div className="flex gap-1.5">
            {(['all', 'pending', 'active', 'margin_call', 'repaid', 'defaulted'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`rounded-lg px-3 py-2 text-xs font-medium capitalize transition ${
                  statusFilter === s
                    ? 'bg-violet-600 text-white'
                    : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                {s === 'all' ? 'All' : s === 'margin_call' ? 'Margin call' : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
          {loading ? (
            <div className="flex items-center justify-center py-20 text-gray-400">
              <Loader2 size={22} className="animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <Landmark size={32} className="mb-3 opacity-30" />
              <p className="text-sm">
                {search || statusFilter !== 'all'
                  ? 'No facilities match your filters.'
                  : 'No portfolio-backed credit facilities yet. They will appear here once MINT borrowers draw against their portfolios.'}
              </p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100 bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-400">
                <tr>
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
              <tbody className="divide-y divide-gray-50">
                {filtered.map((f) => {
                  const st   = STATUS[f.status] ?? STATUS.pending;
                  const open = expanded === f.id;
                  return (
                    <>
                      <tr key={f.id} className={`hover:bg-gray-50/60 ${f.status === 'margin_call' ? 'bg-red-50/40' : ''}`}>
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900">{f.consumer_name || '—'}</p>
                          <p className="text-xs text-gray-400">{f.consumer_email}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-800">{fmt(f.portfolio_value)}</p>
                          <p className="text-xs text-gray-400">{COLLATERAL_LABELS[f.collateral_type] ?? f.collateral_type}</p>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-900">{fmt(f.facility_amount)}</td>
                        <td className="px-4 py-3 text-right text-gray-700">{fmt(f.drawn_amount)}</td>
                        <td className="px-4 py-3"><LtvBar ltv={f.ltv_ratio} /></td>
                        <td className="px-4 py-3 text-right text-gray-700">{f.interest_rate_pct?.toFixed(1)}%</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${st.bg} ${st.text} ${st.border}`}>
                            {st.icon}{st.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs">
                          {f.originated_at
                            ? formatDistanceToNow(new Date(f.originated_at), { addSuffix: true })
                            : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => setExpanded(open ? null : f.id)}
                            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                          >
                            {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>
                        </td>
                      </tr>

                      {open && (
                        <tr key={`${f.id}-detail`}>
                          <td colSpan={9} className="bg-gray-50/80 px-4 pb-5 pt-3">
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
                                  <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400">{label}</p>
                                  <p className="mt-0.5 text-sm font-medium text-gray-800 break-all">{value}</p>
                                </div>
                              ))}
                            </div>
                            {Object.keys(f.metadata).length > 0 && (
                              <details className="mt-3">
                                <summary className="cursor-pointer text-[11px] font-medium text-gray-400 hover:text-gray-600">Metadata</summary>
                                <pre className="mt-1 rounded-lg bg-gray-100 p-3 text-[11px] text-gray-600 overflow-auto">
                                  {JSON.stringify(f.metadata, null, 2)}
                                </pre>
                              </details>
                            )}
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
        <div className="flex items-center gap-6 text-xs text-gray-400">
          <span className="font-medium text-gray-500">LTV guide:</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500" />Safe (&lt;65%)</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-400" />Watch (65–80%)</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-red-500" />Margin call (&gt;80%)</span>
        </div>

      </div>
    </Shell>
  );
}
