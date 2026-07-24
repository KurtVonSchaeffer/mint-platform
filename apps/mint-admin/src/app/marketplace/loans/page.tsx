'use client';

import { Fragment, useState, useEffect, useCallback } from 'react';
import { Shell } from '@/components/Shell';
import {
  HandCoins, RefreshCw, Loader2, ChevronDown, ChevronUp,
  User, Mail, Calendar, TrendingUp, Building2, Clock, Search,
  Percent,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

function fmt(n: number) {
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: 0 }).format(n);
}

function fmtShortDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' });
}

interface ScoreHistoryPoint { credit_score: number; evaluated_at: string }

function ScoreHistoryChart({ requestId }: { requestId: string }) {
  const [points, setPoints]     = useState<ScoreHistoryPoint[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/marketplace/borrower-score-history?requestId=${requestId}`)
      .then((r) => r.json())
      .then((j) => { if (!cancelled) setPoints(j.history ?? []); })
      .catch((e) => { if (!cancelled) setLoadError(e.message); });
    return () => { cancelled = true; };
  }, [requestId]);

  if (loadError || !points || points.length < 2) return null;

  const W = 480, H = 110, PL = 32, PR = 12, PT = 12, PB = 20;
  const plotW = W - PL - PR, plotH = H - PT - PB;

  const scores   = points.map((p) => p.credit_score);
  const dataMin  = Math.min(...scores), dataMax = Math.max(...scores);
  const yMin = Math.max(300, dataMin - 20);
  const yMax = Math.min(999, Math.max(dataMax + 20, yMin + 40));
  const tMin = new Date(points[0].evaluated_at).getTime();
  const tMax = new Date(points[points.length - 1].evaluated_at).getTime();
  const tSpan = Math.max(1, tMax - tMin);

  const coords = points.map((p, i) => {
    const t = new Date(p.evaluated_at).getTime();
    const x = tMax === tMin
      ? PL + (points.length === 1 ? 0 : (i / (points.length - 1)) * plotW)
      : PL + ((t - tMin) / tSpan) * plotW;
    const y = PT + (1 - (p.credit_score - yMin) / (yMax - yMin)) * plotH;
    return { x, y, ...p };
  });

  const linePath = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L ${coords[coords.length - 1].x.toFixed(1)} ${H - PB} L ${coords[0].x.toFixed(1)} ${H - PB} Z`;

  const first = coords[0], last = coords[coords.length - 1];
  const delta = last.credit_score - first.credit_score;
  const deltaColor = delta > 0 ? '#34D399' : delta < 0 ? '#F87171' : '#6B7280';
  const VIOLET = '#7C3AED';
  const GRID   = 'rgba(255,255,255,0.07)';
  const LABEL  = 'rgba(255,255,255,0.3)';

  return (
    <div className="col-span-2 mt-3 rounded-xl p-3 md:col-span-4"
      style={{ background: 'var(--color-surface2)', border: '1px solid var(--color-border2)' }}>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text3)' }}>Score History</p>
        <span className="text-[11px] font-semibold" style={{ color: deltaColor }}>
          {delta > 0 ? '+' : ''}{delta} since {fmtShortDate(first.evaluated_at)}
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }} role="img"
        aria-label={`Credit score history from ${first.credit_score} to ${last.credit_score}`}>
        {[yMin, (yMin + yMax) / 2, yMax].map((t, i) => {
          const y = PT + (1 - (t - yMin) / (yMax - yMin)) * plotH;
          return (
            <g key={i}>
              <line x1={PL} y1={y} x2={W - PR} y2={y} stroke={GRID} strokeWidth={1} />
              <text x={PL - 6} y={y + 3} textAnchor="end" fontSize={9} fill={LABEL}>{Math.round(t)}</text>
            </g>
          );
        })}
        <path d={areaPath} fill={VIOLET} opacity={0.1} />
        <path d={linePath} fill="none" stroke={VIOLET} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        {coords.map((c, i) => (
          <circle key={i} cx={c.x} cy={c.y} r={4} fill={VIOLET} stroke="var(--color-surface)" strokeWidth={2}>
            <title>{fmtShortDate(c.evaluated_at)} — score {c.credit_score}</title>
          </circle>
        ))}
        <text x={first.x} y={H - 4} textAnchor="start" fontSize={9} fill={LABEL}>{fmtShortDate(first.evaluated_at)}</text>
        <text x={last.x}  y={H - 4} textAnchor="end"   fontSize={9} fill={LABEL}>{fmtShortDate(last.evaluated_at)}</text>
      </svg>
    </div>
  );
}

interface MintLoan {
  id: string; request_id: string; client_id: string; accepted_at: string | null;
  offered_amount: number; offered_rate_pct: number; offered_term_months: number;
  monthly_installment: number; total_repayment: number; initiation_fee: number;
  quote_requests: {
    reference: string; consumer_email: string; consumer_name: string;
    requested_amount: number; requested_term: number;
    credit_profile: Record<string, unknown> | null; created_at: string;
  } | null;
  clients: { name: string; slug: string } | null;
}

function borrowerDisplay(qr: MintLoan['quote_requests']) {
  const name = qr?.consumer_name?.trim();
  const email = qr?.consumer_email?.trim();
  const nameIsEmail = !!name && !!email && name.toLowerCase() === email.toLowerCase();
  return { name: nameIsEmail ? null : (name || null), email: email || null };
}

export default function MintLoansPage() {
  const [loans,      setLoans]      = useState<MintLoan[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [expanded,   setExpanded]   = useState<string | null>(null);
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());
  const [search,     setSearch]     = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/marketplace/loans');
      const json = await res.json();
      if (res.ok) setLoans(json.loans ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = loans.filter((l) => {
    if (!search) return true;
    const q = search.toLowerCase();
    const qr = l.quote_requests;
    return (
      (qr?.consumer_email ?? '').toLowerCase().includes(q) ||
      (qr?.consumer_name  ?? '').toLowerCase().includes(q) ||
      (l.clients?.name    ?? '').toLowerCase().includes(q) ||
      (qr?.reference      ?? '').toLowerCase().includes(q)
    );
  });

  const totalDisbursed = loans.reduce((s, l) => s + (l.offered_amount ?? 0), 0);
  const avgRate = loans.length
    ? loans.reduce((s, l) => s + (l.offered_rate_pct ?? 0), 0) / loans.length
    : 0;

  const groups = new Map<string, { name: string | null; email: string | null; loans: MintLoan[] }>();
  for (const loan of filtered) {
    const key = (loan.quote_requests?.consumer_email ?? loan.request_id).toLowerCase();
    const existing = groups.get(key);
    if (existing) existing.loans.push(loan);
    else groups.set(key, { ...borrowerDisplay(loan.quote_requests), loans: [loan] });
  }
  const groupedEntries = Array.from(groups.entries())
    .map(([key, g]) => ({ key, ...g }))
    .sort((a, b) => b.loans.length - a.loans.length);

  function toggleGroup(key: string) {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  return (
    <Shell>
      <div className="space-y-6 page-enter">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="eyebrow mb-1">Marketplace</p>
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--color-text)', letterSpacing: '-0.025em' }}>
              Unsecured Credit
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--color-text3)' }}>
              Accepted offers from the MINT consumer marketplace
            </p>
          </div>
          <button
            onClick={load}
            className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-xl transition-colors"
            style={{ border: '1px solid var(--color-border2)', color: 'var(--color-text2)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Total Accepted',   value: String(loans.length),                                 sub: 'unsecured loans',    color: '#A78BFA', icon: HandCoins  },
            { label: 'Total Disbursed',  value: loading ? '—' : fmt(totalDisbursed),                  sub: 'across all lenders', color: '#34D399', icon: TrendingUp },
            { label: 'Avg Interest Rate',value: loading ? '—' : (loans.length ? `${avgRate.toFixed(1)}%` : '—'), sub: 'p.a. weighted', color: '#FBBF24', icon: Percent    },
          ].map(({ label, value, sub, color, icon: Icon }) => (
            <div key={label} className="bento-card p-5" style={{ borderLeft: `3px solid ${color}` }}>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-3"
                style={{ background: `${color}18`, color }}>
                <Icon size={15} />
              </div>
              <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text3)' }}>{label}</p>
              <p className="text-2xl font-bold font-mono" style={{ color }}>{value}</p>
              <p className="text-[11px] mt-0.5" style={{ color: 'var(--color-text3)' }}>{sub}</p>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--color-text3)' }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by borrower name, email or lender…"
            className="field-input w-full pl-9"
          />
        </div>

        {/* Table */}
        <div className="bento-card overflow-hidden p-0">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={22} className="animate-spin" style={{ color: 'var(--color-violet)' }} />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <HandCoins size={32} style={{ color: 'var(--color-text3)', opacity: 0.3 }} />
              <p className="text-sm" style={{ color: 'var(--color-text3)' }}>
                {search ? 'No loans match your search.' : "No accepted loans yet — they'll appear here once borrowers accept offers."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Lender</th>
                    <th className="text-right">Amount</th>
                    <th className="text-right">Rate</th>
                    <th className="text-right">Monthly</th>
                    <th>Accepted</th>
                    <th />
                  </tr>
                </thead>
                {groupedEntries.map((group) => {
                  const isOpen = openGroups.has(group.key);
                  return (
                    <tbody key={group.key}>
                      {/* Borrower group header */}
                      <tr
                        className="cursor-pointer"
                        onClick={() => toggleGroup(group.key)}
                        style={{ background: 'rgba(124,58,237,0.06)' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(124,58,237,0.1)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(124,58,237,0.06)'; }}
                      >
                        <td colSpan={6} className="px-4 py-2.5" style={{ borderBottom: '1px solid var(--color-border2)' }}>
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
                              style={{ background: 'rgba(124,58,237,0.15)', color: 'var(--color-violet)' }}>
                              <User size={11} />
                            </div>
                            {group.name && (
                              <span className="text-xs font-semibold" style={{ color: 'var(--color-violet)' }}>{group.name}</span>
                            )}
                            <span className={`text-[11px] ${group.name ? '' : 'font-semibold'}`}
                              style={{ color: group.name ? 'rgba(124,58,237,0.6)' : 'var(--color-violet)' }}>
                              {group.email || '—'}
                            </span>
                            <span className="text-[11px]" style={{ color: 'var(--color-text3)' }}>
                              · {group.loans.length} {group.loans.length === 1 ? 'loan' : 'loans'}
                            </span>
                            <span className="ml-auto" style={{ color: 'var(--color-text3)' }}>
                              {isOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                            </span>
                          </div>
                        </td>
                      </tr>

                      {/* Individual loan rows */}
                      {isOpen && group.loans.map((loan) => {
                        const qr    = loan.quote_requests;
                        const score = (qr?.credit_profile as Record<string, unknown> | null)?.creditScore as number | undefined;
                        const open  = expanded === loan.id;
                        const borrower = borrowerDisplay(qr);
                        return (
                          <Fragment key={loan.id}>
                            <tr>
                              <td>
                                <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                                  {loan.clients?.name ?? loan.client_id}
                                </p>
                              </td>
                              <td className="text-right font-mono font-semibold" style={{ color: 'var(--color-text)' }}>
                                {fmt(loan.offered_amount)}
                              </td>
                              <td className="text-right font-mono" style={{ color: 'var(--color-text2)' }}>
                                {loan.offered_rate_pct?.toFixed(1)}%
                              </td>
                              <td className="text-right font-mono" style={{ color: 'var(--color-text2)' }}>
                                {fmt(loan.monthly_installment)}
                              </td>
                              <td className="text-xs" style={{ color: 'var(--color-text3)' }}>
                                {loan.accepted_at
                                  ? formatDistanceToNow(new Date(loan.accepted_at), { addSuffix: true })
                                  : '—'}
                              </td>
                              <td>
                                <button
                                  onClick={() => setExpanded(open ? null : loan.id)}
                                  className="rounded-lg p-1 transition-colors cursor-pointer"
                                  style={{ color: 'var(--color-text3)' }}
                                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--color-violet)'; }}
                                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--color-text3)'; }}
                                >
                                  {open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                                </button>
                              </td>
                            </tr>

                            {/* Expanded detail panel */}
                            {open && (
                              <tr key={`${loan.id}-detail`}>
                                <td colSpan={6} className="px-4 pb-5 pt-4"
                                  style={{ background: 'var(--color-surface2)', borderBottom: '1px solid var(--color-border2)' }}>
                                  <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                                    {[
                                      { icon: User,       label: 'Full name',       value: borrower.name || '—' },
                                      { icon: Mail,       label: 'Email',           value: borrower.email || '—' },
                                      { icon: TrendingUp, label: 'Credit score',    value: score ? String(score) : '—' },
                                      { icon: Clock,      label: 'Term',            value: `${loan.offered_term_months} months` },
                                      { icon: HandCoins,  label: 'Total repayment', value: fmt(loan.total_repayment) },
                                      { icon: HandCoins,  label: 'Initiation fee',  value: fmt(loan.initiation_fee) },
                                      { icon: Calendar,   label: 'Applied',         value: qr?.created_at ? new Date(qr.created_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }) : '—' },
                                      { icon: Building2,  label: 'Lender',          value: loan.clients?.name ?? loan.client_id },
                                    ].map(({ icon: Icon, label, value }) => (
                                      <div key={label} className="flex items-start gap-2.5">
                                        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                                          style={{ background: 'rgba(124,58,237,0.1)', color: 'var(--color-violet)' }}>
                                          <Icon size={12} />
                                        </div>
                                        <div>
                                          <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text3)' }}>{label}</p>
                                          <p className="text-sm font-medium mt-0.5" style={{ color: 'var(--color-text)' }}>{value}</p>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                  <ScoreHistoryChart requestId={loan.request_id} />
                                  {qr?.reference && (
                                    <p className="mt-3 text-[10px] font-mono" style={{ color: 'var(--color-text3)' }}>Ref: {qr.reference}</p>
                                  )}
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        );
                      })}
                    </tbody>
                  );
                })}
              </table>
            </div>
          )}
        </div>

      </div>
    </Shell>
  );
}
