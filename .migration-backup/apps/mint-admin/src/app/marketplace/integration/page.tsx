'use client';

import { useState, useEffect, useCallback } from 'react';
import { Shell } from '@/components/Shell';
import { Toast, type ToastKind } from '@/components/Toast';
import {
  ArrowLeft, Plug, Copy, Check, RefreshCw, Loader2,
  CheckCircle2, XCircle, Clock, TrendingDown, ExternalLink,
} from 'lucide-react';
import Link from 'next/link';

interface QuoteRequest {
  id: string; reference: string; status: string;
  requested_amount: number; requested_term: number;
  offers_count: number; lenders_evaluated: number;
  consumer_email: string; created_at: string;
}

function fmtR(n: number) {
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: 0 }).format(n);
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

const BASE_URL = typeof window !== 'undefined' ? window.location.origin : 'https://app.algolend.co.za';

const ENDPOINTS = [
  {
    method: 'GET', path: '/api/marketplace/lenders', auth: false,
    desc: 'List all active lenders — call on portal load to show partner logos.',
    response: '{ lenders: [{ name, logoUrl, tagline, minAmount, maxAmount, minCreditScore }], count }',
  },
  {
    method: 'POST', path: '/api/marketplace/evaluate', auth: true,
    desc: 'Run a single credit profile against all active lender policies. Returns ranked offers.',
    response: '{ requestId, offers: [...], declines: [...], totalLenders, offersCount }',
  },
  {
    method: 'POST', path: '/api/marketplace/offers', auth: true,
    desc: 'Record a borrower\'s offer selection. Marks the chosen offer accepted and declines the rest.',
    response: '{ ok, message, offer: { offeredAmount, offeredRatePct, monthlyInstallment } }',
  },
];

const EVAL_SNIPPET = `// 1. Run credit evaluation (server-side — never expose MINT_API_KEY to browser)
const res = await fetch('${BASE_URL}/api/marketplace/evaluate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': \`Bearer \${process.env.MINT_API_KEY}\`,
  },
  body: JSON.stringify({
    // Credit profile — from your Experian + TruID run
    creditScore:                680,
    monthlyIncome:              35000,
    existingMonthlyObligations: 5000,
    openDefaults:               0,
    idVerified:                 true,
    employmentStatus:           'employed',

    // Loan request
    requestedAmount:  150000,
    termMonths:       60,

    // Audit linkage (optional)
    mintUserId:      'user_abc123',
    mintRequestRef:  'MINT-20240601-001',
  }),
});
const { requestId, offers } = await res.json();
// offers are sorted cheapest monthly installment first`;

const ACCEPT_SNIPPET = `// 2. When borrower selects an offer
await fetch('${BASE_URL}/api/marketplace/offers', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': \`Bearer \${process.env.MINT_API_KEY}\`,
  },
  body: JSON.stringify({
    requestId,            // from evaluate response
    lenderId: offers[0].lenderId,
    mintUserId: 'user_abc123',
  }),
});`;

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button onClick={copy} className="p-1.5 rounded-lg transition-colors"
      style={{ color: copied ? 'var(--color-green)' : 'var(--color-text3)', background: 'rgba(255,255,255,0.06)' }}
      title="Copy to clipboard">
      {copied ? <Check size={13} /> : <Copy size={13} />}
    </button>
  );
}

export default function IntegrationPage() {
  const [requests, setRequests]   = useState<QuoteRequest[]>([]);
  const [loading,  setLoading]    = useState(true);
  const [toast,    setToast]      = useState<{ kind: ToastKind; message: string } | null>(null);
  const [liveCount, setLiveCount] = useState<number | null>(null);

  const loadActivity = useCallback(async () => {
    setLoading(true);
    try {
      const [actRes, lendersRes] = await Promise.all([
        fetch('/api/quotes?limit=20&source=portal'),
        fetch('/api/marketplace/lenders'),
      ]);
      if (actRes.ok) {
        const json = await actRes.json();
        setRequests((json.requests ?? json.quotes ?? []).slice(0, 20));
      }
      if (lendersRes.ok) {
        const json = await lendersRes.json();
        setLiveCount(json.count ?? 0);
      }
    } catch {
      // activity is non-critical
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadActivity(); }, [loadActivity]);

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
          <h1 className="headline text-3xl font-bold tracking-tight" style={{ color: 'var(--color-text)' }}>Portal Integration</h1>
          <p className="text-sm mt-1.5" style={{ color: 'var(--color-text3)' }}>
            API reference and live activity for the external borrower portal connecting to AlgoLend.
          </p>
        </div>

        {/* Status strip */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Active lenders',  value: liveCount ?? '—', color: 'var(--color-green)' },
            { label: 'API endpoint',    value: BASE_URL,          color: 'var(--color-text3)', mono: true },
            { label: 'Auth method',     value: 'Bearer token',    color: 'var(--color-sky)' },
          ].map(s => (
            <div key={s.label} className="bento-card p-4">
              <p className="eyebrow mb-1">{s.label}</p>
              <p className={`text-sm font-semibold truncate ${s.mono ? 'font-mono' : ''}`} style={{ color: s.color }}>{s.value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* ── Left: API reference ───────────────────────────── */}
          <div className="lg:col-span-3 space-y-4">

            {/* Endpoint table */}
            <div className="bento-card overflow-hidden p-0">
              <div className="px-5 py-4 flex items-center gap-2" style={{ borderBottom: '1px solid var(--color-border2)' }}>
                <Plug size={14} style={{ color: 'var(--color-violet)' }} />
                <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Endpoints</p>
              </div>
              {ENDPOINTS.map((ep, i) => (
                <div key={ep.path} className="px-5 py-4"
                  style={{ borderBottom: i < ENDPOINTS.length - 1 ? '1px solid var(--color-border2)' : 'none' }}>
                  <div className="flex items-start gap-3 mb-2">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 mt-0.5 font-mono`}
                      style={{ background: ep.method === 'GET' ? 'rgba(56,189,248,0.12)' : 'rgba(124,58,237,0.12)', color: ep.method === 'GET' ? 'var(--color-sky)' : 'var(--color-violet)' }}>
                      {ep.method}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <code className="text-xs font-mono" style={{ color: 'var(--color-text)' }}>{ep.path}</code>
                        {!ep.auth && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'rgba(52,211,153,0.1)', color: 'var(--color-green)' }}>PUBLIC</span>}
                      </div>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--color-text3)' }}>{ep.desc}</p>
                    </div>
                  </div>
                  <div className="ml-10 mt-2 px-3 py-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--color-border2)' }}>
                    <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text3)' }}>Response shape</p>
                    <code className="text-[11px] font-mono" style={{ color: 'var(--color-text3)' }}>{ep.response}</code>
                  </div>
                </div>
              ))}
            </div>

            {/* Evaluate snippet */}
            <div className="bento-card overflow-hidden p-0">
              <div className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--color-border2)' }}>
                <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Evaluate — code sample</p>
                <CopyButton text={EVAL_SNIPPET} />
              </div>
              <pre className="px-5 py-4 text-xs font-mono overflow-x-auto leading-relaxed"
                style={{ color: 'var(--color-text3)', background: 'rgba(0,0,0,0.2)' }}>
                {EVAL_SNIPPET}
              </pre>
            </div>

            {/* Accept snippet */}
            <div className="bento-card overflow-hidden p-0">
              <div className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--color-border2)' }}>
                <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Offer acceptance — code sample</p>
                <CopyButton text={ACCEPT_SNIPPET} />
              </div>
              <pre className="px-5 py-4 text-xs font-mono overflow-x-auto leading-relaxed"
                style={{ color: 'var(--color-text3)', background: 'rgba(0,0,0,0.2)' }}>
                {ACCEPT_SNIPPET}
              </pre>
            </div>

            {/* Auth note */}
            <div className="rounded-2xl px-5 py-4" style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.18)' }}>
              <p className="text-sm font-semibold mb-1" style={{ color: 'var(--color-amber)' }}>Keep MINT_API_KEY server-side only</p>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--color-amber)' }}>
                Set <code className="font-mono px-1 rounded" style={{ background: 'rgba(251,191,36,0.12)' }}>MINT_API_KEY</code> as an environment variable in the portal's Vercel project.
                Never expose it in client-side code or browser network requests. The evaluate and offers endpoints must be called from the portal's own server-side API routes.
              </p>
            </div>

            <Link href="/marketplace/simulate"
              className="inline-flex items-center gap-1.5 text-xs font-semibold transition-colors"
              style={{ color: 'var(--color-violet)' }}>
              <ExternalLink size={12} /> Test the evaluate API in the Loan Simulator
            </Link>
          </div>

          {/* ── Right: Live activity ──────────────────────────── */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bento-card overflow-hidden p-0">
              <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--color-border2)' }}>
                <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Recent portal requests</p>
                <button onClick={loadActivity} disabled={loading}
                  className="p-1.5 rounded-lg transition-colors disabled:opacity-50"
                  style={{ color: 'var(--color-text3)', background: 'rgba(255,255,255,0.05)' }}>
                  {loading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                </button>
              </div>

              {loading ? (
                <div className="p-10 flex items-center justify-center gap-2">
                  <Loader2 size={16} className="animate-spin" style={{ color: 'var(--color-violet)' }} />
                  <span className="text-sm" style={{ color: 'var(--color-text3)' }}>Loading…</span>
                </div>
              ) : requests.length === 0 ? (
                <div className="p-10 text-center">
                  <Clock size={18} className="mx-auto mb-2" style={{ color: 'var(--color-text3)' }} />
                  <p className="text-sm" style={{ color: 'var(--color-text3)' }}>No portal requests yet.</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--color-text3)' }}>Activity will appear here once the portal calls the evaluate API.</p>
                </div>
              ) : (
                <div className="divide-y" style={{ borderColor: 'var(--color-border2)' }}>
                  {requests.map(r => (
                    <div key={r.id} className="px-5 py-3">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <span className="text-xs font-mono font-semibold" style={{ color: 'var(--color-text)' }}>{r.reference}</span>
                        <span className="flex items-center gap-1 text-[10px] font-bold shrink-0"
                          style={{ color: r.offers_count > 0 ? 'var(--color-green)' : 'var(--color-red)' }}>
                          {r.offers_count > 0
                            ? <><TrendingDown size={10} /> {r.offers_count} offer{r.offers_count !== 1 ? 's' : ''}</>
                            : <><XCircle size={10} /> No offers</>
                          }
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px]" style={{ color: 'var(--color-text3)' }}>
                        <span>{fmtR(r.requested_amount)} · {r.requested_term}mo</span>
                        <span>{r.lenders_evaluated} lenders</span>
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[10px]" style={{ color: 'var(--color-text3)' }}>{fmtDate(r.created_at)}</span>
                        {r.status === 'accepted' && (
                          <span className="flex items-center gap-1 text-[9px] font-bold" style={{ color: 'var(--color-green)' }}>
                            <CheckCircle2 size={9} /> accepted
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}
