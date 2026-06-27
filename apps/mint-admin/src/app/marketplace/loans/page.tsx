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
              <h1 className="text-xl font-semibold text-gray-900">MINT Loans</h1>
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
            { label: 'Total accepted', value: String(loans.length), sub: 'loans from MINT' },
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
              <p className="text-sm">{search ? 'No loans match your search.' : 'No accepted loans yet — they'll appear here once MINT borrowers accept offers.'}</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100 bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-400">
                <tr>
                  <th className="px-4 py-3 text-left">Borrower</th>
                  <th className="px-4 py-3 text-left">Lender</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3 text-right">Rate</th>
                  <th className="px-4 py-3 text-right">Monthly</th>
                  <th className="px-4 py-3 text-left">Accepted</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((loan) => {
                  const qr    = loan.quote_requests;
                  const score = (qr?.credit_profile as Record<string, unknown> | null)?.creditScore as number | undefined;
                  const open  = expanded === loan.id;
                  return (
                    <>
                      <tr key={loan.id} className="hover:bg-gray-50/60">
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900">{qr?.consumer_name || '—'}</p>
                          <p className="text-xs text-gray-400">{qr?.consumer_email || '—'}</p>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-100 text-violet-600">
                              <Building2 size={13} />
                            </div>
                            <span className="font-medium text-gray-800">{loan.clients?.name ?? loan.client_id}</span>
                          </div>
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
                          <td colSpan={7} className="bg-gray-50/80 px-4 pb-5 pt-3">
                            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                              {[
                                { icon: User,      label: 'Full name',       value: qr?.consumer_name  || '—' },
                                { icon: Mail,      label: 'Email',           value: qr?.consumer_email || '—' },
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
            </table>
          )}
        </div>

      </div>
    </Shell>
  );
}
