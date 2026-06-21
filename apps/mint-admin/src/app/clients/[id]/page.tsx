'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Shell } from '@/components/Shell';
import { Toast, type ToastKind } from '@/components/Toast';
import { FEATURE_LABELS } from '@/lib/features';
import { MarketplaceApplications } from '@/components/MarketplaceApplications';
import {
  ArrowLeft, ExternalLink, Mail, Receipt, CheckCircle, AlertCircle,
  Clock, Send, Loader2, Activity, BarChart3, Building2, Calendar,
  PlusCircle, X, Zap, Store, CheckCircle2, XCircle, FileText, Upload, CreditCard, Save, ScrollText, Copy, Link2,
} from 'lucide-react';

// ─── Types ─────────────────────────────────────────────────────────────
interface ClientFeature { flag: string; enabled: boolean; }

interface Client {
  id: string; name: string; slug: string; subdomain: string;
  domain: string | null; tier: 'core' | 'growth' | 'enterprise';
  status: 'trial' | 'active' | 'suspended' | 'churned';
  monthly_fee_cents: number; contact_email: string;
  contact_name: string | null; ncr_number: string | null;
  created_at: string; activated_at: string | null;
  api_quota: number | null; primary_color: string;
  client_features: ClientFeature[];
}

interface LineItem {
  id: string; description: string; quantity: number;
  unit_price_cents: number; total_cents: number; service: string | null;
}

interface Invoice {
  id: string; reference: string;
  type: 'monthly_licence' | 'setup' | 'usage' | 'add_on';
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'void';
  subtotal_cents: number; vat_cents: number; total_cents: number;
  period_start: string | null; period_end: string | null;
  issued_at: string | null; due_at: string | null; paid_at: string | null;
  notes: string | null;
  invoice_line_items: LineItem[];
}

interface UsageRow {
  month: string; service: string;
  total_quantity: number; total_cost_cents: number;
}

interface AgreementDoc {
  id: string; type: string; file_name: string;
  storage_path: string; status: string; created_at: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────
function fmt(cents: number) {
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: 0 }).format(cents / 100);
}
function fmtDate(iso: string | null | undefined) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
}

const statusStyle = {
  draft:   { label: 'Draft',   color: 'var(--color-text3)',  icon: Receipt       },
  sent:    { label: 'Sent',    color: 'var(--color-sky)',    icon: Send          },
  paid:    { label: 'Paid',    color: 'var(--color-green)',  icon: CheckCircle   },
  overdue: { label: 'Overdue', color: 'var(--color-red)',    icon: AlertCircle   },
  void:    { label: 'Void',    color: 'var(--color-text3)',  icon: Receipt       },
} as const;

const SERVICE_LABELS: Record<string, string> = {
  trueid_lookup: 'TruID lookups', experian_score: 'Experian scores',
  docuseal_envelope: 'E-contracts signed', sacrra_submission: 'SACRRA submissions',
  sure_systems_pull: 'Sure Systems pulls', sms_outbound: 'SMS sent',
  email_outbound: 'Emails sent', api_call: 'API calls',
};

// ─── Page ────────────────────────────────────────────────────────────────
export default function ClientDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [client,     setClient]     = useState<Client | null>(null);
  const [invoices,   setInvoices]   = useState<Invoice[]>([]);
  const [usage,      setUsage]      = useState<UsageRow[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [toast,      setToast]      = useState<{ kind: ToastKind; message: string } | null>(null);
  const [activeTab,  setActiveTab]  = useState<'details' | 'invoices' | 'usage' | 'billing' | 'features' | 'marketplace' | 'agreement' | 'documents'>('invoices');
  const [agreements, setAgreements] = useState<AgreementDoc[]>([]);
  const [documents,  setDocuments]  = useState<AgreementDoc[]>([]);
  const [lead, setLead] = useState<{ id: string; onboarding_token: string; onboarding_status: string; onboarding_data: Record<string, unknown>; created_at: string } | null>(null);
  const [agrUploading, setAgrUploading] = useState(false);
  const [topupOpen,  setTopupOpen]  = useState(false);
  const [topupUnits, setTopupUnits] = useState(5000);
  const [topupPrice, setTopupPrice] = useState(50000); // R500 per 1k calls in cents
  const [topupSaving, setTopupSaving] = useState(false);
  const [detailName,   setDetailName]   = useState('');
  const [detailContact, setDetailContact] = useState('');
  const [detailEmail,  setDetailEmail]  = useState('');
  const [detailDomain, setDetailDomain] = useState('');
  const [detailNcr,    setDetailNcr]    = useState('');
  const [detailSaving, setDetailSaving] = useState(false);
  const [billingFee,  setBillingFee]  = useState('');
  const [billingTier, setBillingTier] = useState<'core' | 'growth' | 'enterprise' | ''>('');
  const [billingQuota, setBillingQuota] = useState('');
  const [billingSaving,  setBillingSaving]  = useState(false);
  const [agrSending,    setAgrSending]    = useState(false);

  type MpPolicy = { id: string; active: boolean; display_name: string; base_rate_pct: number; min_credit_score: number; min_amount: number; max_amount: number; tagline: string | null };
  const [mpPolicy,  setMpPolicy]  = useState<MpPolicy | null | undefined>(undefined); // undefined=unloaded
  const [mpLoading, setMpLoading] = useState(false);
  const [mpSaving,  setMpSaving]  = useState(false);

  async function loadMp(clientId: string) {
    setMpLoading(true);
    try {
      const res  = await fetch('/api/lender-policies');
      const json = await res.json();
      const found = (json.policies ?? []).find((p: { client_id: string }) => p.client_id === clientId) ?? null;
      setMpPolicy(found);
    } finally {
      setMpLoading(false);
    }
  }

  async function toggleMpActive() {
    if (!mpPolicy) return;
    setMpSaving(true);
    const next = !mpPolicy.active;
    setMpPolicy(p => p ? { ...p, active: next } : p);
    await fetch(`/api/lender-policies/${mpPolicy.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: next }),
    });
    setMpSaving(false);
    setToast({ kind: next ? 'success' : 'info', message: `${mpPolicy.display_name} is now ${next ? 'live in' : 'paused from'} the Mint marketplace.` });
  }

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/clients/${params.id}`);
      if (!res.ok) { router.push('/clients'); return; }
      const data = await res.json();
      setClient(data.client);
      setInvoices(data.invoices);
      setUsage(data.usage);
      setAgreements(data.agreements ?? []);
      setDocuments(data.documents ?? []);
      setLead(data.lead ?? null);
      setBillingFee(String(Math.round(data.client.monthly_fee_cents / 100)));
      setBillingTier(data.client.tier);
      setBillingQuota(String(data.client.api_quota ?? 10000));
      setDetailName(data.client.name);
      setDetailContact(data.client.contact_name ?? '');
      setDetailEmail(data.client.contact_email);
      setDetailDomain(data.client.domain ?? '');
      setDetailNcr(data.client.ncr_number ?? '');
    } catch {
      setToast({ kind: 'error', message: 'Could not load client data.' });
    } finally {
      setLoading(false);
    }
  }, [params.id, router]);

  useEffect(() => { load(); }, [load]);

  async function doTopup() {
    if (!client) return;
    setTopupSaving(true);
    try {
      const res = await fetch(`/api/clients/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topup: { units: topupUnits, price_per_1k_cents: topupPrice } }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setClient(prev => prev ? { ...prev, api_quota: data.newQuota } : prev);
      setTopupOpen(false);
      setToast({ kind: 'success', message: `Quota topped up by ${topupUnits.toLocaleString()} calls. New limit: ${data.newQuota.toLocaleString()}. Invoice ${data.invoiceReference ?? 'drafted'}.` });
      load(); // refresh invoices
    } catch (err) {
      setToast({ kind: 'error', message: `Top-up failed: ${err instanceof Error ? err.message : err}` });
    } finally {
      setTopupSaving(false);
    }
  }

  async function saveBilling() {
    if (!client) return;
    setBillingSaving(true);
    try {
      const fee = Math.round(parseFloat(billingFee) * 100);
      const quota = parseInt(billingQuota, 10);
      const res = await fetch(`/api/clients/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          monthly_fee_cents: isNaN(fee) ? undefined : fee,
          tier: billingTier || undefined,
          api_quota: isNaN(quota) ? undefined : quota,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setClient(prev => prev ? {
        ...prev,
        monthly_fee_cents: isNaN(fee) ? prev.monthly_fee_cents : fee,
        tier: (billingTier || prev.tier) as typeof prev.tier,
        api_quota: isNaN(quota) ? prev.api_quota : quota,
      } : prev);
      setToast({ kind: 'success', message: 'Billing settings saved.' });
    } catch (err) {
      setToast({ kind: 'error', message: `Failed to save: ${err instanceof Error ? err.message : err}` });
    } finally {
      setBillingSaving(false);
    }
  }

  if (loading) return (
    <Shell>
      <div className="flex items-center justify-center h-64">
        <Loader2 size={22} className="animate-spin" style={{ color: 'var(--color-purple2)' }} />
      </div>
    </Shell>
  );

  if (!client) return null;

  const portalUrl = `https://${client.domain ?? `${client.subdomain}.algolend.co.za`}`;
  const vercelUrl = `https://vercel.com/mint-platforms/${client.slug}`;
  const totalRevenue = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.total_cents, 0);
  const outstanding  = invoices.filter(i => i.status === 'sent' || i.status === 'overdue').reduce((s, i) => s + i.total_cents, 0);

  const enabledFeatures = (client.client_features ?? []).filter(f => f.enabled).map(f => f.flag);

  // Aggregate usage by service for the most recent month
  const latestMonth = usage[0]?.month ?? null;
  const latestUsage = latestMonth ? usage.filter(u => u.month === latestMonth) : [];

  // Current month API call count (excludes loan_registered / loan_disbursed — those are free)
  const currentMonthCalls = latestUsage.reduce((s, u) => s + u.total_quantity, 0);
  const quota = client.api_quota ?? 10000;
  const quotaPct = quota > 0 ? Math.min(100, Math.round((currentMonthCalls / quota) * 100)) : 0;
  const quotaColor = quotaPct >= 80 ? 'var(--color-red)' : quotaPct >= 60 ? 'var(--color-amber)' : 'var(--color-green)';

  const TIER_QUOTA_DEFAULTS: Record<string, number> = { core: 2000, growth: 10000, enterprise: 20000 };

  const tierBadge = { core: 'badge badge-core', growth: 'badge badge-growth', enterprise: 'badge badge-enterprise' } as const;
  const statusBadge = { active: 'badge badge-active', trial: 'badge badge-trial', suspended: 'badge badge-suspended', churned: 'badge badge-churned' } as const;

  return (
    <Shell>
      {toast && <Toast kind={toast.kind} message={toast.message} onClose={() => setToast(null)} />}

      <div className="space-y-6 page-enter">

        {/* Back + header */}
        <div>
          <Link
            href="/clients"
            className="inline-flex items-center gap-1.5 text-xs font-medium mb-4 transition-colors"
            style={{ color: 'var(--color-text3)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--color-violet)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--color-text3)'; }}
          >
            <ArrowLeft size={13} /> Back to clients
          </Link>

          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1 flex-wrap">
                <h1 className="headline text-3xl font-bold tracking-tight" style={{ color: 'var(--color-text)' }}>
                  {client.name}
                </h1>
                <span className={statusBadge[client.status]}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: client.status === 'active' ? 'var(--color-green)' : client.status === 'trial' ? 'var(--color-sky)' : 'var(--color-red)' }} />
                  {client.status}
                </span>
                <span className={tierBadge[client.tier]}>{client.tier}</span>
              </div>
              <div className="flex items-center gap-4 text-xs flex-wrap" style={{ color: 'var(--color-text3)' }}>
                <span className="flex items-center gap-1.5"><Mail size={11} /> {client.contact_email}</span>
                {client.ncr_number && <span className="font-mono">NCR: {client.ncr_number}</span>}
                <span className="flex items-center gap-1.5"><Calendar size={11} /> Since {fmtDate(client.created_at)}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={async () => {
                  setAgrSending(true);
                  try {
                    const res = await fetch(`/api/clients/${params.id}/send-agreement`, { method: 'POST' });
                    if (!res.ok) throw new Error((await res.json()).error);
                    setToast({ kind: 'success', message: `Agreement link sent to ${client.contact_email}` });
                  } catch (err) {
                    setToast({ kind: 'error', message: `Failed to send: ${err instanceof Error ? err.message : err}` });
                  } finally { setAgrSending(false); }
                }}
                disabled={agrSending}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors disabled:opacity-60"
                style={{ background: 'rgba(124,58,237,0.1)', color: 'var(--color-violet)', border: '1px solid rgba(124,58,237,0.25)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(124,58,237,0.18)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(124,58,237,0.1)'; }}
              >
                {agrSending ? <Loader2 size={13} className="animate-spin" /> : <ScrollText size={13} />}
                {agrSending ? 'Sending…' : 'Send agreement'}
              </button>
              <button
                onClick={() => setTopupOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors"
                style={{ background: 'rgba(52,211,153,0.1)', color: 'var(--color-green)', border: '1px solid rgba(52,211,153,0.25)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(52,211,153,0.18)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(52,211,153,0.1)'; }}
              >
                <PlusCircle size={13} /> Top up quota
              </button>
              <a
                href={vercelUrl}
                target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors"
                style={{ border: '1px solid var(--color-border2)', color: 'var(--color-text2)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(124,58,237,0.3)'; (e.currentTarget as HTMLElement).style.color = 'var(--color-violet)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border2)'; (e.currentTarget as HTMLElement).style.color = 'var(--color-text2)'; }}
              >
                <svg width="12" height="12" viewBox="0 0 76 65" fill="currentColor"><path d="M37.5274 0L75.0548 65H0L37.5274 0Z" /></svg>
                Vercel project
              </a>
              <a
                href={portalUrl}
                target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors"
                style={{ border: '1px solid var(--color-border2)', color: 'var(--color-text2)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(124,58,237,0.3)'; (e.currentTarget as HTMLElement).style.color = 'var(--color-violet)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border2)'; (e.currentTarget as HTMLElement).style.color = 'var(--color-text2)'; }}
              >
                <ExternalLink size={12} /> Live portal
              </a>
            </div>
          </div>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            { label: 'Monthly fee',      value: fmt(client.monthly_fee_cents),       sub: `${client.tier} tier`,         color: 'var(--color-violet)' },
            { label: 'Total invoiced',   value: fmt(totalRevenue),                   sub: 'Paid invoices',               color: 'var(--color-green)'  },
            { label: 'Outstanding',      value: fmt(outstanding),                    sub: 'Sent + overdue',              color: outstanding > 0 ? 'var(--color-red)' : 'var(--color-text3)' },
            { label: 'Features enabled', value: enabledFeatures.length,              sub: `of 12 available`,             color: 'var(--color-sky)'    },
          ].map(k => (
            <div key={k.label} className="bento-card p-5">
              <p className="eyebrow mb-1">{k.label}</p>
              <p className="text-2xl font-bold tracking-tight stat-value" style={{ color: 'var(--color-text)' }}>{k.value}</p>
              <p className="text-xs mt-1 font-semibold" style={{ color: k.color }}>{k.sub}</p>
            </div>
          ))}

          {/* API quota usage — current month */}
          <div className="bento-card p-5">
            <div className="flex items-center justify-between mb-1">
              <p className="eyebrow">API quota</p>
              <span className="text-[10px] font-bold" style={{ color: quotaColor }}>{quotaPct}%</span>
            </div>
            <p className="text-2xl font-bold tracking-tight stat-value" style={{ color: 'var(--color-text)' }}>
              {currentMonthCalls.toLocaleString()}
            </p>
            <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${quotaPct}%`, background: quotaColor, boxShadow: `0 0 6px ${quotaColor}` }} />
            </div>
            <p className="text-[10px] mt-1.5 font-mono" style={{ color: 'var(--color-text3)' }}>
              of {quota.toLocaleString()} · {TIER_QUOTA_DEFAULTS[client.tier] ?? quota} default
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1" style={{ borderBottom: '1px solid var(--color-border2)', paddingBottom: '0' }}>
          {([
            { id: 'details',     label: 'Details',     icon: Building2,   count: null },
            { id: 'invoices',    label: 'Invoices',    icon: Receipt,     count: invoices.length },
            { id: 'usage',       label: 'Usage',       icon: BarChart3,   count: null },
            { id: 'billing',     label: 'Billing',     icon: CreditCard,  count: null },
            { id: 'features',    label: 'Features',    icon: Activity,    count: enabledFeatures.length },
            { id: 'marketplace', label: 'Marketplace', icon: Store,       count: null },
            { id: 'documents',   label: 'Documents',   icon: Upload,      count: documents.length > 0 ? documents.length : null },
            { id: 'agreement',   label: 'Agreement',   icon: FileText,    count: agreements.length > 0 ? agreements.length : null },
          ] as const).map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                if (tab.id === 'marketplace' && mpPolicy === undefined) loadMp(client.id);
              }}
              className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors relative"
              style={{
                color: activeTab === tab.id ? 'var(--color-violet)' : 'var(--color-text3)',
                borderBottom: activeTab === tab.id ? '2px solid var(--color-violet)' : '2px solid transparent',
                marginBottom: '-1px',
              }}
            >
              <tab.icon size={13} />
              {tab.label}
              {tab.count !== null && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-mono" style={{ background: activeTab === tab.id ? 'rgba(124,58,237,0.12)' : 'rgba(255,255,255,0.06)', color: activeTab === tab.id ? 'var(--color-violet)' : 'var(--color-text3)' }}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Details tab ──────────────────────────────────────────────── */}
        {activeTab === 'details' && (
          <div className="bento-card p-6 max-w-xl space-y-4">
            <p className="eyebrow mb-2">Client Details</p>
            {[
              { label: 'Company name',    val: detailName,    set: setDetailName,    placeholder: 'Zwane Official' },
              { label: 'Contact person',  val: detailContact, set: setDetailContact, placeholder: 'Sipho Zwane' },
              { label: 'Contact email',   val: detailEmail,   set: setDetailEmail,   placeholder: 'admin@zwaneofficial.co.za', type: 'email' },
              { label: 'Custom domain',   val: detailDomain,  set: setDetailDomain,  placeholder: 'zwane-official.algolend.co.za' },
              { label: 'NCR number',      val: detailNcr,     set: setDetailNcr,     placeholder: 'NCR123456', type: 'text' },
            ].map(({ label, val, set, placeholder, type }) => (
              <div key={label}>
                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-text2)' }}>{label}</label>
                <input
                  type={type ?? 'text'}
                  value={val}
                  onChange={e => set(e.target.value)}
                  placeholder={placeholder}
                  className="field-input"
                />
              </div>
            ))}
            <button
              onClick={async () => {
                setDetailSaving(true);
                try {
                  const res = await fetch(`/api/clients/${params.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      name:          detailName,
                      contact_name:  detailContact,
                      contact_email: detailEmail,
                      domain:        detailDomain,
                      ncr_number:    detailNcr,
                    }),
                  });
                  if (!res.ok) throw new Error((await res.json()).error);
                  setClient(prev => prev ? { ...prev, name: detailName, contact_name: detailContact, contact_email: detailEmail, domain: detailDomain || null, ncr_number: detailNcr || null } : prev);
                  setToast({ kind: 'success', message: 'Client details updated.' });
                } catch (err) {
                  setToast({ kind: 'error', message: `Failed to save: ${err instanceof Error ? err.message : err}` });
                } finally { setDetailSaving(false); }
              }}
              disabled={detailSaving}
              className="btn-purple btn-shine w-full inline-flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {detailSaving ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : <><Save size={14} /> Save details</>}
            </button>
          </div>
        )}

        {/* ── Invoices tab ─────────────────────────────────────────────── */}
        {activeTab === 'invoices' && (
          <div className="space-y-3">
            {invoices.length === 0 ? (
              <div className="bento-card p-12 text-center">
                <Receipt size={20} className="mx-auto mb-3" style={{ color: 'var(--color-text3)' }} />
                <p className="text-sm" style={{ color: 'var(--color-text3)' }}>No invoices yet — generate them from the Invoices page.</p>
              </div>
            ) : invoices.map(inv => {
              const s = statusStyle[inv.status];
              const StatusIcon = s.icon;
              return (
                <div key={inv.id} className="bento-card p-5">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-mono text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{inv.reference}</span>
                        <span className="flex items-center gap-1 text-[11px] font-semibold" style={{ color: s.color }}>
                          <StatusIcon size={11} /> {s.label}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded capitalize" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--color-text3)' }}>
                          {inv.type.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs flex-wrap" style={{ color: 'var(--color-text3)' }}>
                        {inv.period_start && <span>{fmtDate(inv.period_start)} → {fmtDate(inv.period_end)}</span>}
                        {inv.issued_at && <span>Issued {fmtDate(inv.issued_at)}</span>}
                        {inv.due_at && inv.status !== 'paid' && <span>Due {fmtDate(inv.due_at)}</span>}
                        {inv.paid_at && <span style={{ color: 'var(--color-green)' }}>Paid {fmtDate(inv.paid_at)}</span>}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xl font-bold font-mono" style={{ color: 'var(--color-text)' }}>{fmt(inv.total_cents)}</p>
                      <p className="text-[11px]" style={{ color: 'var(--color-text3)' }}>incl. VAT ({fmt(inv.vat_cents)})</p>
                    </div>
                  </div>
                  {inv.invoice_line_items.length > 0 && (
                    <div className="mt-4 pt-4 space-y-1" style={{ borderTop: '1px solid var(--color-border2)' }}>
                      {inv.invoice_line_items.map(li => (
                        <div key={li.id} className="flex items-center justify-between text-xs">
                          <span style={{ color: 'var(--color-text2)' }}>{li.description}</span>
                          <span className="font-mono" style={{ color: 'var(--color-text3)' }}>{fmt(li.total_cents)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {inv.notes && (
                    <p className="mt-3 text-xs italic" style={{ color: 'var(--color-text3)' }}>{inv.notes}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── Billing tab ──────────────────────────────────────────────── */}
        {activeTab === 'billing' && (
          <div className="max-w-lg space-y-5">
            <div className="bento-card p-6 space-y-5">
              <p className="eyebrow">Custom Pricing</p>

              {/* Monthly fee */}
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--color-text2)' }}>
                  Monthly Fee
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold pointer-events-none" style={{ color: 'var(--color-text3)' }}>R</span>
                  <input
                    type="number" min={0} step={100}
                    value={billingFee}
                    onChange={e => setBillingFee(e.target.value)}
                    onFocus={e => e.target.select()}
                    className="field-input pl-8 font-mono"
                    placeholder="22000"
                  />
                </div>
                <p className="text-[10px] mt-1" style={{ color: 'var(--color-text3)' }}>
                  Currently {fmt(client.monthly_fee_cents)} / month
                </p>
              </div>

              {/* Tier */}
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--color-text2)' }}>
                  Tier
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['core', 'growth', 'enterprise'] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => setBillingTier(t)}
                      className="py-2 rounded-xl text-xs font-semibold capitalize transition-all"
                      style={billingTier === t ? {
                        background: 'linear-gradient(135deg, var(--color-purple), var(--color-purple2))',
                        color: '#fff',
                        boxShadow: '0 2px 12px rgba(124,58,237,0.35)',
                      } : {
                        background: 'rgba(255,255,255,0.04)',
                        color: 'var(--color-text3)',
                        border: '1px solid var(--color-border2)',
                      }}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--color-text2)' }}>
                  Account Status
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(['trial', 'active', 'suspended', 'churned'] as const).map(s => {
                    const colors: Record<string, { bg: string; color: string; activeBg: string }> = {
                      trial:     { bg: 'rgba(14,165,233,0.08)',   color: 'var(--color-sky)',   activeBg: 'rgba(14,165,233,0.2)'   },
                      active:    { bg: 'rgba(52,211,153,0.08)',   color: 'var(--color-green)', activeBg: 'rgba(52,211,153,0.2)'   },
                      suspended: { bg: 'rgba(248,113,113,0.08)',  color: 'var(--color-red)',   activeBg: 'rgba(248,113,113,0.2)'  },
                      churned:   { bg: 'rgba(156,163,175,0.08)',  color: 'var(--color-text3)', activeBg: 'rgba(156,163,175,0.2)'  },
                    };
                    const c = colors[s];
                    const isActive = (billingTier ? client.status : client.status) === s;
                    return (
                      <button
                        key={s}
                        onClick={async () => {
                          const res = await fetch(`/api/clients/${params.id}`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ status: s }),
                          });
                          if (!res.ok) { setToast({ kind: 'error', message: 'Failed to update status' }); return; }
                          setClient(prev => prev ? { ...prev, status: s } : prev);
                          setToast({ kind: 'success', message: `Status changed to ${s}.` });
                        }}
                        className="py-2 rounded-xl text-xs font-semibold capitalize transition-all"
                        style={client.status === s ? {
                          background: c.activeBg, color: c.color, border: `1px solid ${c.color}`,
                        } : {
                          background: c.bg, color: c.color, border: '1px solid transparent',
                          opacity: 0.6,
                        }}
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[10px] mt-1" style={{ color: 'var(--color-text3)' }}>
                  Currently <strong>{client.status}</strong> — click any status to change immediately
                </p>
              </div>

              {/* API Quota */}
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--color-text2)' }}>
                  API Call Quota (per month)
                </label>
                <select
                  value={billingQuota}
                  onChange={e => setBillingQuota(e.target.value)}
                  className="field-input font-mono cursor-pointer"
                >
                  {[1000, 2000, 5000, 10000, 25000, 50000, 100000, 250000, 500000].map(q => (
                    <option key={q} value={q}>{q.toLocaleString()} calls / mo</option>
                  ))}
                </select>
                <p className="text-[10px] mt-1" style={{ color: 'var(--color-text3)' }}>
                  Currently {(client.api_quota ?? 10000).toLocaleString()} calls / month
                </p>
              </div>

              <button
                onClick={saveBilling}
                disabled={billingSaving}
                className="btn-purple btn-shine w-full inline-flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {billingSaving
                  ? <><Loader2 size={14} className="animate-spin" /> Saving…</>
                  : <><Save size={14} /> Save billing settings</>}
              </button>
            </div>

            {/* Summary */}
            <div className="bento-card p-5">
              <p className="eyebrow mb-3">Current Billing Summary</p>
              <div className="space-y-2">
                {[
                  { l: 'Monthly fee',   v: fmt(client.monthly_fee_cents) },
                  { l: 'Tier',          v: client.tier.charAt(0).toUpperCase() + client.tier.slice(1) },
                  { l: 'API quota',     v: `${(client.api_quota ?? 10000).toLocaleString()} calls / mo` },
                  { l: 'Total invoiced', v: fmt(invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.total_cents, 0)) },
                ].map(row => (
                  <div key={row.l} className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid var(--color-border2)' }}>
                    <span className="text-xs" style={{ color: 'var(--color-text3)' }}>{row.l}</span>
                    <span className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{row.v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Usage tab ────────────────────────────────────────────────── */}
        {activeTab === 'usage' && (
          <div className="space-y-4">
            {usage.length === 0 ? (
              <div className="bento-card p-12 text-center">
                <BarChart3 size={20} className="mx-auto mb-3" style={{ color: 'var(--color-text3)' }} />
                <p className="text-sm" style={{ color: 'var(--color-text3)' }}>No usage data recorded yet.</p>
              </div>
            ) : (
              <>
                {latestUsage.length > 0 && (
                  <div className="bento-card p-5">
                    <p className="eyebrow mb-4">
                      {new Date(latestMonth + '-01').toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' })} — API usage
                    </p>
                    <div className="space-y-3">
                      {latestUsage.map(u => (
                        <div key={u.service} className="flex items-center gap-3">
                          <span className="text-sm w-48 shrink-0" style={{ color: 'var(--color-text2)' }}>
                            {SERVICE_LABELS[u.service] ?? u.service}
                          </span>
                          <span className="font-mono text-sm font-semibold flex-1 text-right" style={{ color: 'var(--color-text)' }}>
                            {u.total_quantity.toLocaleString()}
                          </span>
                          <span className="font-mono text-xs w-24 text-right shrink-0" style={{ color: 'var(--color-text3)' }}>
                            {fmt(u.total_cost_cents)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="bento-card p-5">
                  <p className="eyebrow mb-4">Usage history</p>
                  <div className="space-y-2">
                    {[...new Set(usage.map(u => u.month))].map(month => {
                      const rows = usage.filter(u => u.month === month);
                      const totalCost = rows.reduce((s, u) => s + u.total_cost_cents, 0);
                      const totalQty  = rows.reduce((s, u) => s + u.total_quantity, 0);
                      return (
                        <div key={month} className="flex items-center justify-between py-2 px-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)' }}>
                          <span className="text-sm font-medium" style={{ color: 'var(--color-text2)' }}>
                            {new Date(month + '-01').toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' })}
                          </span>
                          <div className="flex items-center gap-6 text-xs">
                            <span style={{ color: 'var(--color-text3)' }}>{totalQty.toLocaleString()} events</span>
                            <span className="font-mono font-semibold" style={{ color: 'var(--color-text)' }}>{fmt(totalCost)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Features tab ─────────────────────────────────────────────── */}
        {activeTab === 'features' && (
          <div className="bento-card p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {(client.client_features ?? []).map(f => (
                <div
                  key={f.flag}
                  className="flex items-center justify-between px-3 py-2.5 rounded-xl"
                  style={{
                    background: f.enabled ? 'rgba(52,211,153,0.05)' : 'rgba(255,255,255,0.02)',
                    border: f.enabled ? '1px solid rgba(52,211,153,0.15)' : '1px solid var(--color-border2)',
                  }}
                >
                  <span className="text-sm" style={{ color: f.enabled ? 'var(--color-text)' : 'var(--color-text3)', textDecoration: f.enabled ? 'none' : 'line-through' }}>
                    {FEATURE_LABELS[f.flag as keyof typeof FEATURE_LABELS] ?? f.flag}
                  </span>
                  <span className="text-[10px] font-bold" style={{ color: f.enabled ? 'var(--color-green)' : 'var(--color-text3)' }}>
                    {f.enabled ? 'ON' : 'OFF'}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-xs mt-4" style={{ color: 'var(--color-text3)' }}>
              <Link href="/clients" className="underline" style={{ color: 'var(--color-violet)' }}>Go to the clients list</Link> to toggle feature flags for this client.
            </p>
          </div>
        )}

        {/* ── Marketplace tab ──────────────────────────────────────────── */}
        {activeTab === 'marketplace' && (
          <div className="space-y-4">
            {(mpLoading || mpPolicy === undefined) ? (
              <div className="bento-card p-12 flex items-center justify-center gap-3">
                <Loader2 size={18} className="animate-spin" style={{ color: 'var(--color-violet)' }} />
                <span className="text-sm" style={{ color: 'var(--color-text3)' }}>Loading…</span>
              </div>
            ) : mpPolicy === null ? (
              <div className="bento-card p-10 text-center">
                <Store size={20} className="mx-auto mb-3" style={{ color: 'var(--color-text3)' }} />
                <p className="font-semibold mb-1" style={{ color: 'var(--color-text)' }}>Not in the Mint marketplace</p>
                <p className="text-sm mb-4" style={{ color: 'var(--color-text3)' }}>No lender policy configured. Add one to include this client in MINT consumer quote results.</p>
                <Link href="/marketplace" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold"
                  style={{ background: 'rgba(124,58,237,0.1)', color: 'var(--color-violet)', border: '1px solid rgba(124,58,237,0.2)' }}>
                  <Store size={13} /> Configure lender policy
                </Link>
              </div>
            ) : (
              <div className="bento-card p-5"
                style={{ borderColor: mpPolicy.active ? 'rgba(52,211,153,0.25)' : 'var(--color-border2)', background: mpPolicy.active ? 'rgba(52,211,153,0.03)' : undefined }}>
                <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      {mpPolicy.active ? <CheckCircle2 size={15} style={{ color: 'var(--color-green)' }} /> : <XCircle size={15} style={{ color: 'var(--color-text3)' }} />}
                      <p className="font-semibold text-sm" style={{ color: mpPolicy.active ? 'var(--color-green)' : 'var(--color-text)' }}>
                        {mpPolicy.active ? 'Live in Mint marketplace' : 'Policy inactive'}
                      </p>
                    </div>
                    <p className="text-xs ml-5" style={{ color: 'var(--color-text3)' }}>{mpPolicy.display_name}{mpPolicy.tagline ? ` · ${mpPolicy.tagline}` : ''}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Link href="/marketplace" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                      style={{ background: 'rgba(124,58,237,0.08)', color: 'var(--color-violet)', border: '1px solid rgba(124,58,237,0.15)' }}>
                      <Zap size={11} /> Edit policy
                    </Link>
                    <button onClick={toggleMpActive} disabled={mpSaving} role="switch" aria-checked={mpPolicy.active}
                      className="relative w-10 h-5 rounded-full transition-colors cursor-pointer shrink-0 disabled:opacity-50"
                      style={{ background: mpPolicy.active ? 'var(--color-green)' : 'rgba(255,255,255,0.1)' }}>
                      {mpSaving
                        ? <Loader2 size={11} className="absolute inset-0 m-auto animate-spin text-white" />
                        : <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${mpPolicy.active ? 'translate-x-5' : 'translate-x-0.5'}`} />}
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 pt-4" style={{ borderTop: '1px solid var(--color-border2)' }}>
                  {[
                    { label: 'Base rate',    value: `${mpPolicy.base_rate_pct}% p.a.` },
                    { label: 'Min score',    value: String(mpPolicy.min_credit_score) },
                    { label: 'Loan range',   value: `${fmt(mpPolicy.min_amount * 100)} – ${fmt(mpPolicy.max_amount * 100)}` },
                  ].map(s => (
                    <div key={s.label}>
                      <p className="text-[10px] font-bold uppercase tracking-wider mb-0.5" style={{ color: 'var(--color-text3)' }}>{s.label}</p>
                      <p className="text-sm font-semibold font-mono" style={{ color: 'var(--color-text)' }}>{s.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* Applications inbox — always shown when marketplace tab is open */}
            {activeTab === 'marketplace' && client && (
              <MarketplaceApplications
                clientId={client.id}
                onToast={(kind, message) => setToast({ kind, message })}
              />
            )}
          </div>
        )}

        {/* ── Documents tab ────────────────────────────────────────── */}
        {activeTab === 'documents' && (
          <div className="space-y-3">
            {documents.length === 0 ? (
              <div className="bento-card p-12 text-center">
                <Upload size={20} className="mx-auto mb-3" style={{ color: 'var(--color-text3)' }} />
                <p className="text-sm" style={{ color: 'var(--color-text3)' }}>No documents uploaded yet. Documents appear here once the client completes their onboarding form.</p>
              </div>
            ) : (
              <div className="bento-card overflow-hidden">
                <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--color-border2)' }}>
                  <p className="text-xs font-semibold" style={{ color: 'var(--color-text2)' }}>{documents.length} document{documents.length !== 1 ? 's' : ''} on file</p>
                </div>
                {documents.map((doc) => {
                  const TYPE_LABELS: Record<string, string> = {
                    cipc_cert:          'CIPC Registration Certificate',
                    director_id:        'Director ID Copy',
                    ncr_cert:           'NCR Lending Licence',
                    bank_statement:     '3-Month Bank Statements',
                    signed_sla:         'Signed Service Agreement',
                    onboarding_agreement: 'Service Agreement (Admin Upload)',
                  };
                  const label = TYPE_LABELS[doc.type] ?? doc.type.replace(/_/g, ' ');
                  return (
                    <div key={doc.id} className="flex items-center gap-4 px-5 py-4 border-b last:border-0" style={{ borderColor: 'var(--color-border2)' }}>
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(124,58,237,0.1)' }}>
                        <FileText size={15} style={{ color: 'var(--color-violet)' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text)' }}>{label}</p>
                        <p className="text-[11px] mt-0.5 truncate" style={{ color: 'var(--color-text3)' }}>{doc.file_name} · {fmtDate(doc.created_at)}</p>
                      </div>
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full shrink-0"
                        style={doc.status === 'approved'
                          ? { background: 'rgba(52,211,153,0.1)', color: 'var(--color-green)' }
                          : { background: 'rgba(251,191,36,0.1)', color: 'var(--color-amber)' }}>
                        {doc.status}
                      </span>
                      <button
                        onClick={async () => {
                          const res = await fetch(`/api/documents/url?path=${encodeURIComponent(doc.storage_path)}`);
                          if (!res.ok) { setToast({ kind: 'error', message: 'Could not generate download link' }); return; }
                          const { url } = await res.json();
                          window.open(url, '_blank');
                        }}
                        className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                        style={{ background: 'rgba(124,58,237,0.08)', color: 'var(--color-violet)', border: '1px solid rgba(124,58,237,0.2)' }}
                      >
                        View
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Agreement tab ────────────────────────────────────────── */}
        {activeTab === 'agreement' && (
          <div className="space-y-4">

            {/* ── 1. Digital signature status ── */}
            {(() => {
              const sig = lead?.onboarding_data?.agreement_signature as string | undefined;
              const signedAt = lead?.onboarding_data?.agreement_signed_at as string | undefined;
              const onboardingLink = lead ? `https://algolend.co.za/sign/${lead.onboarding_token}` : null;

              return (
                <div className="bento-card p-5 space-y-4">
                  <p className="eyebrow">Digital Signature</p>

                  {sig ? (
                    <div className="flex items-start gap-3 p-4 rounded-xl" style={{ background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.2)' }}>
                      <CheckCircle2 size={18} style={{ color: 'var(--color-green)', flexShrink: 0, marginTop: 1 }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold mb-2" style={{ color: 'var(--color-green)' }}>Signed digitally</p>
                        {sig.startsWith('data:image') ? (
                          <div className="rounded-lg px-4 py-2 inline-block mb-2" style={{ background: '#fff', border: '1px solid var(--color-border)' }}>
                            <img src={sig} alt="Signature" style={{ maxHeight: 56, maxWidth: 220, display: 'block' }} />
                          </div>
                        ) : (
                          <p className="text-sm italic mb-2" style={{ color: 'var(--color-text)' }}>{sig}</p>
                        )}
                        <p className="text-xs" style={{ color: 'var(--color-text3)' }}>{fmtDate(signedAt)}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3 p-4 rounded-xl" style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.2)' }}>
                      <AlertCircle size={18} style={{ color: 'var(--color-amber)', flexShrink: 0, marginTop: 1 }} />
                      <div>
                        <p className="text-sm font-semibold" style={{ color: 'var(--color-amber)' }}>Not yet signed digitally</p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--color-text3)' }}>
                          {lead ? 'Onboarding link has been sent — waiting for client to sign.' : 'No onboarding link created yet. Click "Send agreement" to generate one.'}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Onboarding link — always show so admin can copy it */}
                  {onboardingLink && (
                    <div>
                      <p className="text-[11px] font-semibold mb-1.5" style={{ color: 'var(--color-text3)' }}>ONBOARDING LINK</p>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 text-xs px-3 py-2 rounded-lg truncate font-mono" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--color-border2)', color: 'var(--color-text2)' }}>
                          {onboardingLink}
                        </code>
                        <button
                          onClick={() => { navigator.clipboard.writeText(onboardingLink); setToast({ kind: 'success', message: 'Link copied!' }); }}
                          className="p-2 rounded-lg transition-colors shrink-0"
                          style={{ border: '1px solid var(--color-border2)', color: 'var(--color-text3)' }}
                          title="Copy link"
                        >
                          <Copy size={13} />
                        </button>
                        <a href={onboardingLink} target="_blank" rel="noreferrer"
                          className="p-2 rounded-lg transition-colors shrink-0"
                          style={{ border: '1px solid var(--color-border2)', color: 'var(--color-text3)' }}
                          title="Open link"
                        >
                          <ExternalLink size={13} />
                        </a>
                      </div>
                      <p className="text-[10px] mt-1" style={{ color: 'var(--color-text3)' }}>
                        Share this link with the client if the email didn't arrive. It opens the agreement + onboarding form.
                      </p>
                    </div>
                  )}

                  {/* Send / resend button */}
                  <button
                    onClick={async () => {
                      setAgrSending(true);
                      try {
                        const res = await fetch(`/api/clients/${params.id}/send-agreement`, { method: 'POST' });
                        if (!res.ok) throw new Error((await res.json()).error);
                        const d = await res.json();
                        setToast({ kind: 'success', message: `Agreement link sent to ${client.contact_email}` });
                        load();
                      } catch (err) {
                        setToast({ kind: 'error', message: `Failed to send: ${err instanceof Error ? err.message : err}` });
                      } finally { setAgrSending(false); }
                    }}
                    disabled={agrSending}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors disabled:opacity-60"
                    style={{ background: 'rgba(124,58,237,0.1)', color: 'var(--color-violet)', border: '1px solid rgba(124,58,237,0.25)' }}
                  >
                    {agrSending ? <Loader2 size={13} className="animate-spin" /> : <ScrollText size={13} />}
                    {agrSending ? 'Sending…' : lead ? 'Resend agreement email' : 'Send agreement email'}
                  </button>
                </div>
              );
            })()}

            {/* ── 2. Agreement preview ── */}
            <div className="bento-card p-5 space-y-3">
              <p className="eyebrow">Agreement Text (what the client will see)</p>
              <pre className="text-xs leading-relaxed whitespace-pre-wrap overflow-y-auto max-h-72 p-4 rounded-xl font-mono" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--color-border2)', color: 'var(--color-text3)' }}>
{`SERVICE AGREEMENT

This Service Agreement ("Agreement") is entered into between Mint Platforms (Pty) Ltd, Registration No. 2024/123456/07, ("Service Provider") and the Client identified in this application ("Client").

1. SERVICES
The Service Provider agrees to provide the AlgoLend lending management platform ("Platform") to the Client, including loan origination, borrower management, bureau integrations, and related services as specified in the selected service tier.

2. SUBSCRIPTION FEES
The Client agrees to pay the monthly subscription fee applicable to their selected tier. Fees are invoiced monthly in advance and due within 30 days of invoice date. Late payments attract interest at prime + 2% per annum.

3. TERM AND TERMINATION
This Agreement commences on the activation date and continues month-to-month unless either party provides 30 days written notice of termination. The Service Provider may terminate immediately for non-payment or breach of this Agreement.

4. ACCEPTABLE USE
The Client agrees to use the Platform solely for lawful lending activities and in compliance with all applicable South African laws, including the National Credit Act 34 of 2005, POPIA, FICA, and any applicable NCR regulations. The Client warrants that they hold all required licences.

5. DATA AND PRIVACY
The Service Provider will process personal data on behalf of the Client in accordance with POPIA. The Client remains the responsible party for all borrower data processed through the Platform.

6. INTELLECTUAL PROPERTY
The Platform and all related intellectual property remain the exclusive property of the Service Provider. This Agreement grants the Client a non-exclusive, non-transferable licence to use the Platform for the duration of the Agreement.

7. LIMITATION OF LIABILITY
The Service Provider's liability is limited to the fees paid in the 3 months preceding any claim.

8. SUPPORT
Technical support during business hours (08:00–17:00 SAST, Monday–Friday). Critical issues addressed within 4 business hours.

9. CONFIDENTIALITY
Both parties agree to keep confidential all proprietary information disclosed under this Agreement.

10. GOVERNING LAW
Governed by the laws of the Republic of South Africa. Disputes resolved in Gauteng courts.`}
              </pre>
            </div>

            {/* ── 3. Manual upload (already signed paper) ── */}
            <div className="bento-card p-5 space-y-3">
              <p className="eyebrow">Upload Signed PDF</p>
              <p className="text-xs" style={{ color: 'var(--color-text3)' }}>
                If the client signed a paper copy or sent you a signed PDF, upload it here to keep it on record.
              </p>
              <label
                className="flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-colors"
                style={{ border: '1px dashed var(--color-border2)', color: 'var(--color-text3)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(124,58,237,0.4)'; (e.currentTarget as HTMLElement).style.color = 'var(--color-violet)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border2)'; (e.currentTarget as HTMLElement).style.color = 'var(--color-text3)'; }}
              >
                {agrUploading ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
                <span className="text-sm">{agrUploading ? 'Uploading…' : 'Choose PDF to upload'}</span>
                <input type="file" accept=".pdf" className="sr-only" disabled={agrUploading}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file || !client) return;
                    setAgrUploading(true);
                    try {
                      const form = new FormData();
                      form.append('client_id', client.id);
                      form.append('doc_type', 'onboarding_agreement');
                      form.append('file', file);
                      const res = await fetch('/api/documents/upload', { method: 'POST', body: form });
                      if (!res.ok) throw new Error(await res.text());
                      setToast({ kind: 'success', message: 'Agreement uploaded.' });
                      load();
                    } catch (err) {
                      setToast({ kind: 'error', message: `Upload failed: ${err instanceof Error ? err.message : String(err)}` });
                    } finally { setAgrUploading(false); e.target.value = ''; }
                  }}
                />
              </label>
              {agreements.length > 0 && (
                <div className="divide-y rounded-xl overflow-hidden" style={{ border: '1px solid var(--color-border2)' }}>
                  {agreements.map(doc => (
                    <div key={doc.id} className="flex items-center gap-3 px-4 py-3">
                      <FileText size={13} style={{ color: 'var(--color-violet)', flexShrink: 0 }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate" style={{ color: 'var(--color-text)' }}>{doc.file_name}</p>
                        <p className="text-[10px]" style={{ color: 'var(--color-text3)' }}>Uploaded {fmtDate(doc.created_at)}</p>
                      </div>
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full" style={{ background: 'rgba(52,211,153,0.1)', color: 'var(--color-green)' }}>
                        {doc.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

        {/* Client info footer */}
        <div className="bento-card p-5">
          <p className="eyebrow mb-4">Client details</p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            {[
              { label: 'Portal URL',    value: client.domain ?? `${client.subdomain}.algolend.co.za`, href: portalUrl },
              { label: 'Vercel project', value: client.slug,       href: vercelUrl },
              { label: 'Contact',       value: client.contact_email },
              { label: 'Activated',     value: fmtDate(client.activated_at) },
            ].map(d => (
              <div key={d.label}>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text3)' }}>{d.label}</p>
                {d.href ? (
                  <a href={d.href} target="_blank" rel="noreferrer" className="flex items-center gap-1 font-mono text-xs truncate" style={{ color: 'var(--color-violet)' }}>
                    {d.value} <ExternalLink size={10} />
                  </a>
                ) : (
                  <p className="text-xs truncate" style={{ color: 'var(--color-text2)' }}>{d.value}</p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Building2 icon placeholder for empty states */}
        <div style={{ display: 'none' }}><Building2 /></div>
      </div>
    </Shell>
  );
}
