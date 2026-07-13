'use client';

import { useState, useEffect, useCallback } from 'react';
import { Shell } from '@/components/Shell';
import {
  HandCoins, RefreshCw, Loader2, ChevronDown, ChevronUp,
  User, Mail, Calendar, TrendingUp, Building2, Clock,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

function fmt(n: number) {
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: 0 }).format(n);
}

function fmtShortDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' });
}

interface ScoreHistoryPoint {
  credit_score: number;
  evaluated_at: string;
}

/**
 * Score History — a compact single-series line chart of a borrower's score
 * across every evaluate() call for them, not just the one that became this
 * accepted loan. Fetched lazily when the row expands, since most rows will
 * never be opened. Mirrors the same chart built for Zwane's borrower page
 * (2px line, ~10% area wash, end markers, hairline gridlines, no legend for
 * a single series, native <title> hover tooltips) for a consistent pattern
 * across both admin apps, even though this one has no chart library either.
 */
function ScoreHistoryChart({ requestId }: { requestId: string }) {
  const [points, setPoints] = useState<ScoreHistoryPoint[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/marketplace/borrower-score-history?requestId=${requestId}`)
      .then((res) => res.json())
      .then((json) => { if (!cancelled) setPoints(json.history ?? []); })
      .catch((err) => { if (!cancelled) setLoadError(err.message); });
    return () => { cancelled = true; };
  }, [requestId]);

  if (loadError) return null; // non-critical enhancement — fail silently rather than clutter the row
  if (!points || points.length < 2) return null; // nothing to trend yet

  const W = 480, H = 110, PAD_L = 32, PAD_R = 12, PAD_T = 12, PAD_B = 20;
  const plotW = W - PAD_L - PAD_R;
  const plotH = H - PAD_T - PAD_B;

  const scores  = points.map((p) => p.credit_score);
  const dataMin = Math.min(...scores);
  const dataMax = Math.max(...scores);
  const yMin = Math.max(300, dataMin - 20);
  const yMax = Math.min(999, Math.max(dataMax + 20, yMin + 40));

  const tMin = new Date(points[0].evaluated_at).getTime();
  const tMax = new Date(points[points.length - 1].evaluated_at).getTime();
  const tSpan = Math.max(1, tMax - tMin);

  const coords = points.map((p, i) => {
    const t = new Date(p.evaluated_at).getTime();
    const x = tMax === tMin
      ? PAD_L + (points.length === 1 ? 0 : (i / (points.length - 1)) * plotW)
      : PAD_L + ((t - tMin) / tSpan) * plotW;
    const y = PAD_T + (1 - (p.credit_score - yMin) / (yMax - yMin)) * plotH;
    return { x, y, ...p };
  });

  const linePath = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L ${coords[coords.length - 1].x.toFixed(1)} ${H - PAD_B} L ${coords[0].x.toFixed(1)} ${H - PAD_B} Z`;

  const first = coords[0];
  const last  = coords[coords.length - 1];
  const delta = last.credit_score - first.credit_score;
  const deltaColor = delta > 0 ? '#16a34a' : delta < 0 ? '#dc2626' : '#6b7280';

  const VIOLET = '#7c3aed';

  return (
    <div className="col-span-2 mt-1 rounded-lg border border-gray-100 bg-white p-3 md:col-span-4">
      <div className="mb-1.5 flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Score History</p>
        <span className="text-[11px] font-semibold" style={{ color: deltaColor }}>
          {delta > 0 ? '+' : ''}{delta} since {fmtShortDate(first.evaluated_at)}
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }} role="img" aria-label={`Credit score history from ${first.credit_score} to ${last.credit_score}`}>
        {[yMin, (yMin + yMax) / 2, yMax].map((t, i) => {
          const y = PAD_T + (1 - (t - yMin) / (yMax - yMin)) * plotH;
          return (
            <g key={i}>
              <line x1={PAD_L} y1={y} x2={W - PAD_R} y2={y} stroke="#e5e7eb" strokeWidth={1} opacity={0.5} />
              <text x={PAD_L - 6} y={y + 3} textAnchor="end" fontSize={9} fill="#9ca3af">{Math.round(t)}</text>
            </g>
          );
        })}
        <path d={areaPath} fill={VIOLET} opacity={0.08} />
        <path d={linePath} fill="none" stroke={VIOLET} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        {coords.map((c, i) => (
          <circle key={i} cx={c.x} cy={c.y} r={4} fill={VIOLET} stroke="#fff" strokeWidth={2}>
            <title>{fmtShortDate(c.evaluated_at)} — score {c.credit_score}</title>
          </circle>
        ))}
        <text x={first.x} y={H - 4} textAnchor="start" fontSize={9} fill="#9ca3af">{fmtShortDate(first.evaluated_at)}</text>
        <text x={last.x} y={H - 4} textAnchor="end" fontSize={9} fill="#9ca3af">{fmtShortDate(last.evaluated_at)}</text>
      </svg>
    </div>
  );
}

interface MintLoan {
  id:                  string;
  request_id:          string;
  client_id:           string;
  accepted_at:         string | null;
  offered_amount:      number;
  offered_rate_pct:    number;
  offered_term_months: number;
  monthly_installment: number;
  total_repayment:     number;
  initiation_fee:      number;
  quote_requests: {
    reference:        string;
    consumer_email:   string;
    consumer_name:    string;
    requested_amount: number;
    requested_term:   number;
    credit_profile:   Record<string, unknown> | null;
    created_at:       string;
  } | null;
  clients: {
    name: string;
    slug: string;
  } | null;
}

export default function MintLoansPage() {
  const [loans, setLoans]         = useState<MintLoan[]>([]);
  const [loading, setLoading]     = useState(true);
  const [expanded, setExpanded]   = useState<string | null>(null);
  const [search, setSearch]       = useState('');

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
  const avgRate        = loans.length
    ? loans.reduce((s, l) => s + (l.offered_rate_pct ?? 0), 0) / loans.length
    : 0;

  // Group rows by lender (client_id) so multiple loans from the same lender
  // sit under one heading instead of repeating the lender cell on every row.
  const groups = new Map<string, { name: string; loans: MintLoan[] }>();
  for (const loan of filtered) {
    const key = loan.client_id;
    const existing = groups.get(key);
    if (existing) existing.loans.push(loan);
    else groups.set(key, { name: loan.clients?.name ?? loan.client_id, loans: [loan] });
  }
  const groupedEntries = Array.from(groups.values()).sort((a, b) => b.loans.length - a.loans.length);

  /** consumer_name is sometimes populated with the email itself upstream —
   * in that case showing it twice (bold name + email sub-line) is just
   * noise, so fall back to a plain single line. */
  function borrowerDisplay(qr: MintLoan['quote_requests']) {
    const name = qr?.consumer_name?.trim();
    const email = qr?.consumer_email?.trim();
    const nameIsEmail = !!name && !!email && name.toLowerCase() === email.toLowerCase();
    return { name: nameIsEmail ? null : (name || null), email: email || null };
  }

  return (
    <Shell>
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">

        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
              <HandCoins size={20} />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Unsecured Credit</h1>
              <p className="text-sm text-gray-500">Accepted offers from the MINT consumer marketplace</p>
            </div>
          </div>
          <button
            onClick={load}
            className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            <RefreshCw size={14} />Refresh
          </button>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total accepted', value: String(loans.length), sub: 'unsecured loans' },
            { label: 'Total disbursed', value: fmt(totalDisbursed), sub: 'across all lenders' },
            { label: 'Avg interest rate', value: loans.length ? `${avgRate.toFixed(1)}%` : '—', sub: 'p.a. weighted' },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">{s.label}</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{s.value}</p>
              <p className="text-xs text-gray-400">{s.sub}</p>
            </div>
          ))}
        </div>

        {/* Search */}
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by borrower name, email or lender…"
          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-800 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
        />

        {/* Table */}
        <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
          {loading ? (
            <div className="flex items-center justify-center py-20 text-gray-400">
              <Loader2 size={22} className="animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <HandCoins size={32} className="mb-3 opacity-30" />
              <p className="text-sm">{search ? 'No loans match your search.' : "No accepted loans yet — they'll appear here once borrowers accept offers."}</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100 bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-400">
                <tr>
                  <th className="px-4 py-3 text-left">Borrower</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3 text-right">Rate</th>
                  <th className="px-4 py-3 text-right">Monthly</th>
                  <th className="px-4 py-3 text-left">Accepted</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              {groupedEntries.map((group) => (
                <tbody key={group.name} className="divide-y divide-gray-50">
                  <tr>
                    <td colSpan={6} className="bg-violet-50/60 px-4 py-2">
                      <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-violet-100 text-violet-600">
                          <Building2 size={12} />
                        </div>
                        <span className="text-xs font-semibold text-violet-700">{group.name}</span>
                        <span className="text-[11px] text-violet-400">· {group.loans.length} {group.loans.length === 1 ? 'loan' : 'loans'}</span>
                      </div>
                    </td>
                  </tr>
                  {group.loans.map((loan) => {
                    const qr    = loan.quote_requests;
                    const score = (qr?.credit_profile as Record<string, unknown> | null)?.creditScore as number | undefined;
                    const open  = expanded === loan.id;
                    const borrower = borrowerDisplay(qr);
                    return (
                      <>
                        <tr key={loan.id} className="hover:bg-gray-50/60">
                          <td className="px-4 py-3">
                            {borrower.name && <p className="font-medium text-gray-900">{borrower.name}</p>}
                            <p className={borrower.name ? 'text-xs text-gray-400' : 'font-medium text-gray-900'}>{borrower.email || '—'}</p>
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-gray-900">{fmt(loan.offered_amount)}</td>
                          <td className="px-4 py-3 text-right text-gray-700">{loan.offered_rate_pct?.toFixed(1)}%</td>
                          <td className="px-4 py-3 text-right text-gray-700">{fmt(loan.monthly_installment)}</td>
                          <td className="px-4 py-3 text-gray-500">
                            {loan.accepted_at
                              ? formatDistanceToNow(new Date(loan.accepted_at), { addSuffix: true })
                              : '—'}
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => setExpanded(open ? null : loan.id)}
                              className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                            >
                              {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </button>
                          </td>
                        </tr>

                        {open && (
                          <tr key={`${loan.id}-detail`}>
                            <td colSpan={6} className="bg-gray-50/80 px-4 pb-5 pt-3">
                              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                                {[
                                  { icon: User,      label: 'Full name',       value: borrower.name  || '—' },
                                  { icon: Mail,      label: 'Email',           value: borrower.email || '—' },
                                  { icon: TrendingUp,label: 'Credit score',    value: score ? String(score) : '—' },
                                  { icon: Clock,     label: 'Term',            value: `${loan.offered_term_months} months` },
                                  { icon: HandCoins, label: 'Total repayment', value: fmt(loan.total_repayment) },
                                  { icon: HandCoins, label: 'Initiation fee',  value: fmt(loan.initiation_fee) },
                                  { icon: Calendar,  label: 'Applied',         value: qr?.created_at ? new Date(qr.created_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }) : '—' },
                                  { icon: Building2, label: 'Lender',          value: loan.clients?.name ?? loan.client_id },
                                ].map(({ icon: Icon, label, value }) => (
                                  <div key={label} className="flex items-start gap-2">
                                    <div className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md bg-white text-gray-400 shadow-sm">
                                      <Icon size={12} />
                                    </div>
                                    <div>
                                      <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400">{label}</p>
                                      <p className="text-sm font-medium text-gray-800">{value}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                              <ScoreHistoryChart requestId={loan.request_id} />
                              {qr?.reference && (
                                <p className="mt-3 text-[10px] font-mono text-gray-400">Ref: {qr.reference}</p>
                              )}
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              ))}
            </table>
          )}
        </div>

      </div>
    </Shell>
  );
}
