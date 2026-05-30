'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { CheckCircle, Clock, TrendingDown, AlertCircle, ArrowRight, ExternalLink, RefreshCw } from 'lucide-react';

/* ─── Types ──────────────────────────────────────────────────────── */

interface Offer {
  id:                 string;
  displayName:        string;
  logoUrl:            string | null;
  tagline:            string | null;
  avgTurnaroundDays:  number;
  offeredAmount:      number;
  offeredRatePct:     number;
  offeredTermMonths:  number;
  monthlyInstallment: number;
  totalRepayment:     number;
  initiationFee:      number;
}

interface Decline { displayName: string; reason: string; }

interface QuoteResult {
  status:   'pending' | 'complete' | 'error';
  message?: string;
  meta?: {
    requestedAmount: number;
    requestedTerm:   number;
    consumerName:    string;
    businessName:    string | null;
    lendersChecked:  number;
    createdAt:       string;
  };
  offers?:   Offer[];
  declines?: Decline[];
}

/* ─── Helpers ────────────────────────────────────────────────────── */

const ZAR = (n: number) =>
  new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: 0 }).format(n);

/* ─── Scanning animation ─────────────────────────────────────────── */

const SCAN_STEPS = [
  'Contacting Experian…',
  'Verifying identity…',
  'Checking SureSystems…',
  'Analysing income data…',
  'Evaluating lender policies…',
  'Ranking offers…',
];

function ScanningScreen() {
  const [stepIdx, setStepIdx] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStepIdx((i) => Math.min(i + 1, SCAN_STEPS.length - 1));
    }, 1800);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6 relative overflow-hidden">
      {/* Ambient */}
      <div className="pointer-events-none absolute inset-0
        bg-[radial-gradient(ellipse_60%_50%_at_50%_50%,rgba(212,148,58,0.07)_0%,transparent_70%)]" />

      {/* Scanning line */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-0 right-0 h-px bg-gradient-to-r
          from-transparent via-[rgba(212,148,58,0.5)] to-transparent"
          style={{ animation: 'scan 3s linear infinite', top: 0 }} />
      </div>

      <div className="relative z-10 text-center max-w-md">
        {/* Score ring */}
        <div className="relative mx-auto w-32 h-32 mb-10">
          <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="42" fill="none"
              stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
            <circle cx="50" cy="50" r="42" fill="none"
              stroke="url(#goldGrad)" strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={`${(stepIdx / (SCAN_STEPS.length - 1)) * 264} 264`}
              style={{ transition: 'stroke-dasharray 1s cubic-bezier(0.4,0,0.2,1)' }} />
            <defs>
              <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#F0B050" />
                <stop offset="100%" stopColor="#D4943A" />
              </linearGradient>
            </defs>
          </svg>
          {/* Pulse rings */}
          <div className="absolute inset-4 rounded-full border border-[rgba(212,148,58,0.2)]"
            style={{ animation: 'pulse-ring 2s ease-out infinite' }} />
          <div className="absolute inset-4 rounded-full border border-[rgba(212,148,58,0.15)]"
            style={{ animation: 'pulse-ring 2s ease-out infinite', animationDelay: '0.7s' }} />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="mono text-2xl font-bold text-[var(--gold-2)]">
              {Math.round((stepIdx / (SCAN_STEPS.length - 1)) * 100)}%
            </span>
          </div>
        </div>

        <h2 className="serif text-3xl text-[var(--white)] mb-3">
          Checking your profile
        </h2>
        <p className="text-[var(--silver)] text-sm mb-8 leading-relaxed">
          Running your credit data past every lender simultaneously.
          This takes about 15–30 seconds.
        </p>

        {/* Step list */}
        <div className="space-y-2 text-left">
          {SCAN_STEPS.map((step, i) => (
            <div key={step}
              className={`flex items-center gap-3 text-sm transition-all duration-500
                ${i < stepIdx ? 'text-[var(--green)]' : i === stepIdx ? 'text-[var(--white)]' : 'text-[rgba(255,255,255,0.2)]'}`}>
              <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 transition-all duration-500 ${
                i < stepIdx ? 'bg-[var(--green)]' :
                i === stepIdx ? 'border border-[var(--gold)] bg-[rgba(212,148,58,0.1)]' :
                'border border-[rgba(255,255,255,0.1)]'
              }`}>
                {i < stepIdx
                  ? <span className="text-[var(--ink)] text-[8px] font-black">✓</span>
                  : i === stepIdx
                  ? <span className="w-1.5 h-1.5 rounded-full bg-[var(--gold)] animate-pulse block" />
                  : null}
              </div>
              {step}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Offer card ─────────────────────────────────────────────────── */

function OfferCard({ offer, isBest, rank }: { offer: Offer; isBest: boolean; rank: number }) {
  return (
    <div className={`relative overflow-hidden rounded-2xl p-6 transition-transform hover:-translate-y-0.5
      ${isBest ? 'card-gold' : 'card'}`}
      style={{ animationDelay: `${rank * 80}ms` }}>

      {isBest && (
        <div className="absolute top-0 left-6 -translate-y-1/2">
          <span className="badge-best">★ Best deal</span>
        </div>
      )}

      <div className="flex items-start justify-between mb-5 mt-1">
        <div>
          <p className="font-bold text-[var(--white)] text-lg leading-tight">{offer.displayName}</p>
          {offer.tagline && (
            <p className="text-xs text-[var(--silver)] mt-0.5">{offer.tagline}</p>
          )}
        </div>
        <div className="flex items-center gap-1 text-xs text-[var(--silver)] shrink-0">
          <Clock size={11} />
          {offer.avgTurnaroundDays}d decision
        </div>
      </div>

      {/* Key numbers */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-[var(--silver)] mb-1">Monthly</p>
          <p className={`mono text-2xl font-bold ${isBest ? 'text-[var(--gold-2)]' : 'text-[var(--white)]'}`}>
            {ZAR(offer.monthlyInstallment)}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-widest text-[var(--silver)] mb-1">Rate p.a.</p>
          <p className="mono text-2xl font-bold text-[var(--white)]">{offer.offeredRatePct}%</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-widest text-[var(--silver)] mb-1">Amount</p>
          <p className="mono text-2xl font-bold text-[var(--white)]">{ZAR(offer.offeredAmount)}</p>
        </div>
      </div>

      <div className="divider mb-4" />

      <div className="flex items-center justify-between">
        <div className="text-xs text-[var(--silver)] space-y-0.5">
          <p>Total repayment: <span className="text-[var(--white)]">{ZAR(offer.totalRepayment)}</span></p>
          {offer.initiationFee > 0 && (
            <p>Initiation fee: <span className="text-[var(--white)]">{ZAR(offer.initiationFee)}</span></p>
          )}
          <p>{offer.offeredTermMonths} month term</p>
        </div>
        <a
          href={`/apply?offerId=${offer.id}`}
          className="btn-gold py-2.5 px-5 text-sm"
        >
          Apply <ExternalLink size={12} />
        </a>
      </div>
    </div>
  );
}

/* ─── Main client ────────────────────────────────────────────────── */

export function OffersClient({ requestId }: { requestId: string }) {
  const [result, setResult] = useState<QuoteResult | null>(null);
  const [showDeclines, setShowDeclines] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attemptsRef = useRef(0);

  const poll = useCallback(async () => {
    attemptsRef.current += 1;
    if (attemptsRef.current > 40) {
      setResult({ status: 'error', message: 'Timed out waiting for results. Please try again.' });
      return;
    }

    try {
      const res = await fetch(`/api/quote/${requestId}`, { cache: 'no-store' });
      const data: QuoteResult = await res.json();
      setResult(data);

      if (data.status === 'pending') {
        timerRef.current = setTimeout(poll, 2000);
      }
    } catch {
      timerRef.current = setTimeout(poll, 3000);
    }
  }, [requestId]);

  useEffect(() => {
    void poll();
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [poll]);

  /* ── Pending ── */
  if (!result || result.status === 'pending') return <ScanningScreen />;

  /* ── Error ── */
  if (result.status === 'error') {
    return (
      <div className="min-h-dvh flex items-center justify-center px-6">
        <div className="card p-8 max-w-md text-center space-y-4">
          <AlertCircle size={32} className="mx-auto text-[var(--red)]" />
          <p className="serif text-2xl text-[var(--white)]">Something went wrong</p>
          <p className="text-sm text-[var(--silver)]">{result.message ?? 'Credit check failed.'}</p>
          <a href="/" className="btn-ghost inline-flex"><RefreshCw size={14} /> Try again</a>
        </div>
      </div>
    );
  }

  /* ── Complete ── */
  const offers   = result.offers   ?? [];
  const declines = result.declines ?? [];
  const meta     = result.meta!;

  return (
    <div className="relative min-h-dvh grid-bg">
      <div className="pointer-events-none absolute top-0 inset-x-0 h-64
        bg-[radial-gradient(ellipse_at_50%_0%,rgba(212,148,58,0.09)_0%,transparent_70%)]" />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-8 py-6 max-w-4xl mx-auto">
        <a href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--gold-2)] to-[var(--gold)]
                          flex items-center justify-center">
            <span className="text-[var(--ink)] font-black text-sm">M</span>
          </div>
          <span className="font-semibold text-[var(--white)] text-lg">Mint</span>
        </a>
        <a href="/" className="btn-ghost text-sm">New quote</a>
      </header>

      <main className="relative z-10 max-w-4xl mx-auto px-8 pb-24">

        {/* Summary bar */}
        <div className="mb-10 animate-fade-up">
          <div className="flex items-start gap-4 mb-2">
            <CheckCircle size={20} className="text-[var(--green)] mt-1 shrink-0" />
            <div>
              <h1 className="serif text-4xl text-[var(--white)] leading-tight">
                {offers.length > 0
                  ? <>{offers.length} offer{offers.length !== 1 ? 's' : ''} found</>
                  : 'No offers at this time'}
              </h1>
              <p className="text-[var(--silver)] mt-1 text-sm">
                {meta.lendersChecked} lender{meta.lendersChecked !== 1 ? 's' : ''} checked
                {meta.businessName ? ` for ${meta.businessName}` : ''} ·{' '}
                {ZAR(meta.requestedAmount)} over {meta.requestedTerm} months
              </p>
            </div>
          </div>

          {offers.length > 0 && (
            <div className="flex items-center gap-2 mt-4 text-xs text-[var(--silver)]
                            bg-[rgba(61,191,130,0.06)] border border-[rgba(61,191,130,0.15)]
                            rounded-xl px-4 py-2.5 w-fit">
              <TrendingDown size={13} className="text-[var(--green)]" />
              Sorted by lowest monthly payment — cheapest first
            </div>
          )}
        </div>

        {/* Offers */}
        {offers.length > 0 ? (
          <div className="space-y-4">
            {offers.map((offer, i) => (
              <div key={offer.id} className="animate-fade-up" style={{ animationDelay: `${i * 80}ms` }}>
                <OfferCard offer={offer} isBest={i === 0} rank={i} />
              </div>
            ))}
          </div>
        ) : (
          <div className="card p-8 text-center">
            <p className="serif text-xl text-[var(--white)] mb-2">No qualifying offers</p>
            <p className="text-sm text-[var(--silver)] max-w-sm mx-auto leading-relaxed">
              Based on your credit profile, none of our current lenders could make an offer
              for the requested amount and term. Try a lower amount or longer term.
            </p>
            <a href="/" className="btn-ghost inline-flex mt-6"><RefreshCw size={14} /> Adjust and retry</a>
          </div>
        )}

        {/* Declines */}
        {declines.length > 0 && (
          <div className="mt-8">
            <button
              onClick={() => setShowDeclines((v) => !v)}
              className="flex items-center gap-2 text-sm text-[var(--silver)] hover:text-[var(--white)] transition-colors"
            >
              <span className={`transition-transform duration-200 ${showDeclines ? 'rotate-90' : ''}`}>▶</span>
              {declines.length} lender{declines.length !== 1 ? 's' : ''} could not offer
            </button>

            {showDeclines && (
              <div className="mt-4 space-y-2 animate-fade-up">
                {declines.map((d) => (
                  <div key={d.displayName}
                    className="flex items-center justify-between px-4 py-3 rounded-xl
                               bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)]">
                    <span className="text-sm text-[var(--silver)]">{d.displayName}</span>
                    <span className="text-xs text-[rgba(255,255,255,0.3)]">{d.reason}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* CTA */}
        {offers.length > 0 && (
          <div className="mt-12 card p-6 flex items-center justify-between">
            <div>
              <p className="font-semibold text-[var(--white)]">Not seeing what you need?</p>
              <p className="text-sm text-[var(--silver)] mt-0.5">Adjust your amount or term and run a new check.</p>
            </div>
            <a href="/" className="btn-ghost shrink-0">
              New quote <ArrowRight size={13} />
            </a>
          </div>
        )}

      </main>
    </div>
  );
}
