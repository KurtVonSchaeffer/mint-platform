'use client';

import { useState } from 'react';
import { Shell } from '@/components/Shell';
import { Toast, type ToastKind } from '@/components/Toast';
import { SlidersHorizontal, Play, Loader2, CheckCircle2, XCircle, ArrowLeft, TrendingDown } from 'lucide-react';
import Link from 'next/link';

interface SimForm {
  creditScore:                number;
  monthlyIncome:              number;
  existingMonthlyObligations: number;
  openDefaults:               number;
  idVerified:                 boolean;
  requestedAmount:            number;
  termMonths:                 number;
  yearsInOperation:           number;
}

interface Offer {
  lenderName:         string;
  tagline:            string | null;
  avgTurnaroundDays:  number;
  offeredAmount:      number;
  offeredRatePct:     number;
  termMonths:         number;
  monthlyInstallment: number;
  totalRepayment:     number;
  initiationFee:      number;
  effectiveCost:      number;
}

interface SimResult {
  requestId:    string;
  offers:       Offer[];
  declines:     { lender: string; reason: string }[];
  totalLenders: number;
  evaluatedAt:  string;
}

function fmtR(n: number) {
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: 0 }).format(n);
}

const DEFAULTS: SimForm = {
  creditScore: 680, monthlyIncome: 35000, existingMonthlyObligations: 5000,
  openDefaults: 0, idVerified: true, requestedAmount: 150000,
  termMonths: 60, yearsInOperation: 3,
};

const SCORE_BAND = (s: number) =>
  s >= 767 ? { label: 'Excellent', color: 'var(--color-green)'  } :
  s >= 681 ? { label: 'Good',      color: 'var(--color-sky)'    } :
  s >= 614 ? { label: 'Fair',      color: 'var(--color-amber)'  } :
             { label: 'Poor',      color: 'var(--color-red)'    };

export default function SimulatePage() {
  const [form,    setForm]    = useState<SimForm>(DEFAULTS);
  const [result,  setResult]  = useState<SimResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [toast,   setToast]   = useState<{ kind: ToastKind; message: string } | null>(null);

  function set<K extends keyof SimForm>(key: K, val: SimForm[K]) {
    setForm(f => ({ ...f, [key]: val }));
  }

  async function run() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/marketplace/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Evaluation failed');
      setResult(json);
    } catch (err) {
      setToast({ kind: 'error', message: err instanceof Error ? err.message : 'Evaluation failed' });
    } finally {
      setLoading(false);
    }
  }

  const band = SCORE_BAND(form.creditScore);
  const dsr  = form.monthlyIncome > 0
    ? Math.round(((form.existingMonthlyObligations) / form.monthlyIncome) * 100)
    : 0;

  return (
    <Shell>
      {toast && <Toast kind={toast.kind} message={toast.message} onClose={() => setToast(null)} />}

      <div className="space-y-6 page-enter">

        {/* Header */}
        <div>
          <Link href="/marketplace" className="inline-flex items-center gap-1.5 text-xs font-medium mb-4 transition-colors"
            style={{ color: 'var(--color-text3)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--color-violet)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--color-text3)'; }}>
            <ArrowLeft size={13} /> Lender Policies
          </Link>
          <p className="eyebrow mb-2">Mint Marketplace</p>
          <h1 className="headline text-3xl font-bold tracking-tight" style={{ color: 'var(--color-text)' }}>Loan Simulator</h1>
          <p className="text-sm mt-1.5" style={{ color: 'var(--color-text3)' }}>
            Enter a borrower's credit profile to see which lenders would offer and at what rate — exactly as MINT evaluates it.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* ── Left: Form ───────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-4">

            {/* Credit profile */}
            <div className="bento-card p-5 space-y-4">
              <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-text3)' }}>Credit profile</p>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium" style={{ color: 'var(--color-text3)' }}>Credit score</label>
                  <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ background: `${band.color}20`, color: band.color }}>
                    {form.creditScore} · {band.label}
                  </span>
                </div>
                <input type="range" min={300} max={999} step={1} value={form.creditScore}
                  onChange={e => set('creditScore', +e.target.value)}
                  className="w-full cursor-pointer" style={{ accentColor: band.color }} />
                <div className="flex justify-between text-[10px] mt-0.5" style={{ color: 'var(--color-text3)' }}>
                  <span>300</span><span>999</span>
                </div>
              </div>

              {[
                { key: 'monthlyIncome'              as const, label: 'Monthly income (R)',             step: 500  },
                { key: 'existingMonthlyObligations' as const, label: 'Existing monthly obligations (R)', step: 500  },
              ].map(({ key, label, step }) => (
                <div key={key}>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium" style={{ color: 'var(--color-text3)' }}>{label}</label>
                    {key === 'existingMonthlyObligations' && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: dsr > 45 ? 'rgba(248,113,113,0.12)' : 'rgba(255,255,255,0.06)', color: dsr > 45 ? 'var(--color-red)' : 'var(--color-text3)' }}>
                        DSR {dsr}%
                      </span>
                    )}
                  </div>
                  <input type="number" className="field-input font-mono" value={form[key]} min={0} step={step}
                    onChange={e => set(key, +e.target.value)} />
                </div>
              ))}

              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text3)' }}>Open defaults</label>
                <input type="number" className="field-input font-mono" value={form.openDefaults} min={0} max={20} step={1}
                  onChange={e => set('openDefaults', +e.target.value)} />
              </div>

              <div className="flex items-center justify-between py-2.5 px-3 rounded-xl"
                style={{ background: 'var(--color-surface2)', border: '1px solid var(--color-border2)' }}>
                <span className="text-sm" style={{ color: 'var(--color-text2)' }}>ID verified</span>
                <button role="switch" aria-checked={form.idVerified}
                  onClick={() => set('idVerified', !form.idVerified)}
                  className="relative w-10 h-5 rounded-full transition-colors cursor-pointer"
                  style={{ background: form.idVerified ? 'var(--color-purple)' : 'rgba(255,255,255,0.1)' }}>
                  <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.idVerified ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text3)' }}>Years in operation</label>
                <input type="number" className="field-input font-mono" value={form.yearsInOperation} min={0} max={50} step={1}
                  onChange={e => set('yearsInOperation', +e.target.value)} />
              </div>
            </div>

            {/* Loan request */}
            <div className="bento-card p-5 space-y-4">
              <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-text3)' }}>Loan request</p>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text3)' }}>Amount (R)</label>
                <input type="number" className="field-input font-mono" value={form.requestedAmount} min={1000} step={5000}
                  onChange={e => set('requestedAmount', +e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text3)' }}>Term (months)</label>
                <select className="field-input cursor-pointer" value={form.termMonths}
                  onChange={e => set('termMonths', +e.target.value)}>
                  {[6,12,18,24,36,48,60,72,84].map(m => <option key={m} value={m}>{m} months</option>)}
                </select>
              </div>
            </div>

            <button onClick={run} disabled={loading}
              className="btn-purple btn-shine w-full inline-flex items-center justify-center gap-2 disabled:opacity-50">
              {loading ? <Loader2 size={15} className="animate-spin" /> : <Play size={14} />}
              {loading ? 'Evaluating…' : 'Run simulation'}
            </button>
          </div>

          {/* ── Right: Results ───────────────────────────────────── */}
          <div className="lg:col-span-3 space-y-4">
            {!result && !loading && (
              <div className="bento-card p-16 text-center">
                <div className="w-14 h-14 mx-auto mb-4 rounded-2xl flex items-center justify-center"
                  style={{ background: 'rgba(124,58,237,0.08)' }}>
                  <SlidersHorizontal size={22} style={{ color: 'var(--color-violet)' }} />
                </div>
                <p className="font-semibold mb-1" style={{ color: 'var(--color-text)' }}>Configure and run</p>
                <p className="text-sm" style={{ color: 'var(--color-text3)' }}>Set the borrower's credit profile on the left, then hit Run simulation.</p>
              </div>
            )}

            {loading && (
              <div className="bento-card p-16 flex flex-col items-center gap-3">
                <Loader2 size={24} className="animate-spin" style={{ color: 'var(--color-violet)' }} />
                <p className="text-sm" style={{ color: 'var(--color-text3)' }}>Evaluating {form.creditScore}-score profile against all active lenders…</p>
              </div>
            )}

            {result && (
              <>
                {/* Summary */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Lenders evaluated', value: result.totalLenders, color: 'var(--color-text)' },
                    { label: 'Offers',             value: result.offers.length,  color: 'var(--color-green)' },
                    { label: 'Declines',           value: result.declines.length, color: result.declines.length > 0 ? 'var(--color-red)' : 'var(--color-text3)' },
                  ].map(s => (
                    <div key={s.label} className="bento-card p-4 text-center">
                      <p className="text-2xl font-bold font-mono" style={{ color: s.color }}>{s.value}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--color-text3)' }}>{s.label}</p>
                    </div>
                  ))}
                </div>

                {/* Offers */}
                {result.offers.length > 0 && (
                  <div className="bento-card overflow-hidden p-0">
                    <div className="px-5 py-4 flex items-center gap-2" style={{ borderBottom: '1px solid var(--color-border2)' }}>
                      <TrendingDown size={14} style={{ color: 'var(--color-green)' }} />
                      <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Offers — ranked cheapest first</p>
                    </div>
                    <div className="divide-y" style={{ borderColor: 'var(--color-border2)' }}>
                      {result.offers.map((o, i) => (
                        <div key={i} className="px-5 py-4 transition-colors"
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--color-card-hover)'; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0"
                                  style={{ background: i === 0 ? 'rgba(52,211,153,0.15)' : 'rgba(255,255,255,0.06)', color: i === 0 ? 'var(--color-green)' : 'var(--color-text3)' }}>
                                  {i + 1}
                                </span>
                                <p className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>{o.lenderName}</p>
                              </div>
                              {o.tagline && <p className="text-xs mt-0.5 ml-7" style={{ color: 'var(--color-text3)' }}>{o.tagline}</p>}
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-xl font-bold font-mono" style={{ color: 'var(--color-text)' }}>{fmtR(o.monthlyInstallment)}<span className="text-xs font-normal">/mo</span></p>
                              <p className="text-[10px]" style={{ color: 'var(--color-text3)' }}>Total {fmtR(o.totalRepayment)}</p>
                            </div>
                          </div>
                          <div className="grid grid-cols-4 gap-2">
                            {[
                              { label: 'Rate',        value: `${o.offeredRatePct}% p.a.` },
                              { label: 'Amount',      value: fmtR(o.offeredAmount) },
                              { label: 'Term',        value: `${o.termMonths} mo` },
                              { label: 'Init. fee',   value: fmtR(o.initiationFee) },
                            ].map(d => (
                              <div key={d.label} className="px-2 py-1.5 rounded-lg text-center"
                                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--color-border2)' }}>
                                <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-text3)' }}>{d.label}</p>
                                <p className="text-xs font-semibold font-mono mt-0.5" style={{ color: 'var(--color-text)' }}>{d.value}</p>
                              </div>
                            ))}
                          </div>
                          <p className="text-[10px] mt-2 font-mono" style={{ color: 'var(--color-text3)' }}>
                            Effective cost: {o.effectiveCost?.toFixed(2)}% · Turnaround ~{o.avgTurnaroundDays}d
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Declines */}
                {result.declines.length > 0 && (
                  <div className="bento-card overflow-hidden p-0">
                    <div className="px-5 py-4 flex items-center gap-2" style={{ borderBottom: '1px solid var(--color-border2)' }}>
                      <XCircle size={14} style={{ color: 'var(--color-text3)' }} />
                      <p className="text-sm font-semibold" style={{ color: 'var(--color-text3)' }}>Declines</p>
                    </div>
                    <div className="divide-y" style={{ borderColor: 'var(--color-border2)' }}>
                      {result.declines.map((d, i) => (
                        <div key={i} className="px-5 py-3 flex items-center justify-between gap-3">
                          <p className="text-sm font-medium" style={{ color: 'var(--color-text2)' }}>{d.lender}</p>
                          <span className="text-xs px-2 py-0.5 rounded" style={{ background: 'rgba(248,113,113,0.08)', color: 'var(--color-red)', border: '1px solid rgba(248,113,113,0.15)' }}>
                            {d.reason}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {result.offers.length === 0 && result.declines.length === 0 && (
                  <div className="bento-card p-10 text-center">
                    <CheckCircle2 size={20} className="mx-auto mb-3" style={{ color: 'var(--color-text3)' }} />
                    <p className="text-sm" style={{ color: 'var(--color-text3)' }}>No active lender policies configured yet. Add policies on the Lender Policies page.</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </Shell>
  );
}
