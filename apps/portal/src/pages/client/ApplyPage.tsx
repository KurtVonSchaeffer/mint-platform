import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useFeature } from '@/hooks/useFeature';
import { useAuth } from '@/contexts/AuthContext';
import { applicationStore } from '@/lib/applicationStore';
import { useTruID, type TruIDAffordability, type TruIDState } from '@/lib/trueid';
import {
  CheckCircle, CreditCard, Building2, FileText, ShieldCheck, Landmark,
  ArrowRight, Loader2, AlertCircle, RefreshCw, TrendingUp, Wallet,
} from 'lucide-react';

const STEPS = ['Business Details', 'Financials', 'Documents', 'Bank Verification', 'Review & Submit'];

interface FormData {
  company:         string;
  registration:    string;
  industry:        string;
  yearsOperation:  string;
  address:         string;
  amount:          string;
  purpose:         string;
  monthlyRevenue:  string;
  monthlyExpenses: string;
  termMonths:      string;
}

const EMPTY: FormData = {
  company:         'Nkosi Holdings (Pty) Ltd',
  registration:    '2024/123456/07',
  industry:        'Retail',
  yearsOperation:  '5',
  address:         '12 Marshall St, Johannesburg',
  amount:          '50000',
  purpose:         'Working capital',
  monthlyRevenue:  '180000',
  monthlyExpenses: '120000',
  termMonths:      '12',
};

function fmt(n: number) {
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: 0 }).format(n);
}

function pmt(principal: number, annualRate: number, months: number) {
  if (principal <= 0 || months <= 0) return 0;
  const r = annualRate / 100 / 12;
  if (r === 0) return principal / months;
  return (principal * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
}

/* ─── Affordability summary widget ──────────────────────────────── */

function AffordabilityCard({ data }: { data: TruIDAffordability }) {
  const score = data.affordabilityScore ?? 0;
  const scoreColour =
    score >= 70 ? 'text-emerald-600' :
    score >= 40 ? 'text-amber-500'   :
                  'text-red-500';
  const scoreBg =
    score >= 70 ? 'bg-emerald-50 border-emerald-200' :
    score >= 40 ? 'bg-amber-50 border-amber-200'     :
                  'bg-red-50 border-red-200';

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-emerald-600">
        <CheckCircle size={18} />
        <span className="text-sm font-semibold">Bank account connected successfully</span>
      </div>

      {/* Score ring */}
      <div className={`flex items-center gap-4 p-4 rounded-xl border ${scoreBg}`}>
        <div className="shrink-0 text-center w-16">
          <p className={`text-3xl font-bold ${scoreColour}`}>{score}</p>
          <p className="text-xs text-slate-500 mt-0.5">/ 100</p>
        </div>
        <div>
          <p className="font-semibold text-slate-800 text-sm">Affordability Score</p>
          <p className="text-xs text-slate-500 mt-0.5">
            {score >= 70 ? 'Strong affordability — low repayment risk' :
             score >= 40 ? 'Moderate affordability — may require security' :
                           'Low affordability — limited lending capacity'}
          </p>
        </div>
      </div>

      {/* Key figures */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={14} className="text-slate-400" />
            <span className="text-xs text-slate-500 font-medium">Monthly Income</span>
          </div>
          <p className="text-base font-bold text-slate-900">
            {data.monthlyIncome !== null ? fmt(data.monthlyIncome) : '—'}
          </p>
        </div>
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
          <div className="flex items-center gap-2 mb-1">
            <Wallet size={14} className="text-slate-400" />
            <span className="text-xs text-slate-500 font-medium">Net Monthly</span>
          </div>
          <p className="text-base font-bold text-slate-900">
            {data.netMonthlyIncome !== null ? fmt(data.netMonthlyIncome) : '—'}
          </p>
        </div>
      </div>

      {data.maxRecommendedLoan !== null ? (
        <div className="p-3 rounded-xl bg-[var(--color-brand-muted)] border border-[var(--color-brand)]/20">
          <p className="text-xs text-slate-600 font-medium mb-0.5">Max Recommended Loan</p>
          <p className="text-xl font-bold text-[var(--color-brand)]">{fmt(data.maxRecommendedLoan)}</p>
          <p className="text-xs text-slate-500 mt-0.5">Based on 30% DSR over 24 months</p>
        </div>
      ) : null}

      {data.salaryDate !== null ? (
        <p className="text-xs text-slate-400">Next salary / pay date: {data.salaryDate}</p>
      ) : null}
    </div>
  );
}

/* ─── TruID connect panel ────────────────────────────────────────── */

function TruIDPanel({ name, email }: { name?: string; email?: string }) {
  const truid = useTruID();

  if (truid.state === 'complete' && truid.affordability !== null) {
    return <AffordabilityCard data={truid.affordability} />;
  }

  if (truid.state === 'waiting') {
    return (
      <div className="text-center py-8 space-y-4">
        <div className="w-14 h-14 mx-auto rounded-full bg-[var(--color-brand-muted)] flex items-center justify-center">
          <Loader2 size={24} className="text-[var(--color-brand)] animate-spin" />
        </div>
        <div>
          <p className="font-semibold text-slate-900">Waiting for your consent…</p>
          <p className="text-sm text-slate-500 mt-1 max-w-xs mx-auto">
            Complete the bank authorisation in the tab that just opened. This page will update automatically.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={truid.reset}>
          Cancel
        </Button>
      </div>
    );
  }

  const isConnecting = truid.state === 'connecting' as TruIDState;
  const isFailed     = truid.state === 'failed'     as TruIDState;

  return (
    <div className="text-center py-6 space-y-4">
      <div className="w-14 h-14 mx-auto rounded-full bg-[var(--color-brand-muted)] flex items-center justify-center">
        {isConnecting ? (
          <Loader2 size={24} className="text-[var(--color-brand)] animate-spin" />
        ) : (
          <Landmark size={24} className="text-[var(--color-brand)]" />
        )}
      </div>
      <div>
        <p className="font-semibold text-slate-900 mb-1">Connect via TruID Open Banking</p>
        <p className="text-sm text-slate-500 max-w-sm mx-auto">
          {isConnecting
            ? 'Initiating secure connection…'
            : 'Securely share your business bank account data for an instant affordability assessment. No credentials are stored.'}
        </p>
      </div>

      {isFailed ? (
        <div className="flex items-center gap-2 text-red-600 text-sm justify-center">
          <AlertCircle size={15} />
          <span>{truid.error ?? 'Connection failed — please try again.'}</span>
        </div>
      ) : null}

      <div className="flex items-center justify-center gap-3">
        <Button
          size="lg"
          onClick={() => void truid.connect({ name, email })}
          loading={isConnecting}
        >
          {isFailed ? (
            <>
              <RefreshCw size={15} /> Retry Connection
            </>
          ) : (
            'Connect Bank Account'
          )}
        </Button>
      </div>

      <p className="text-xs text-slate-400">
        You can skip this step — bank connection improves your approval chances.
      </p>
    </div>
  );
}

/* ─── Main page ──────────────────────────────────────────────────── */

export function ApplyPage() {
  const [step, setStep]           = useState(0);
  const [form, setForm]           = useState<FormData>(EMPTY);
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [submitting, setSubmitting]   = useState(false);
  const hasOpenBanking = useFeature('open_banking');
  const hasEContracts  = useFeature('e_contracts');
  const { profile } = useAuth();
  const navigate = useNavigate();

  const icons = [Building2, CreditCard, FileText, Landmark, ShieldCheck];
  const StepIcon = icons[step];

  function update<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleSubmit() {
    setSubmitting(true);
    window.setTimeout(() => {
      const created = applicationStore.add({
        applicantName: profile?.full_name ?? 'Demo Borrower',
        company:       form.company,
        amount:        Number(form.amount) || 0,
        termMonths:    Number(form.termMonths) || 12,
        purpose:       form.purpose,
      });
      setSubmittedId(created.id);
      setSubmitting(false);
    }, 700);
  }

  // ── Submitted success state ─────────────────────────────────────
  if (submittedId !== null) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card className="p-12 text-center" style={{ animation: 'fade-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) both' }}>
          <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-emerald-100 flex items-center justify-center">
            <CheckCircle size={28} className="text-emerald-600" />
          </div>
          <p className="eyebrow mb-3">Application submitted</p>
          <h1 className="text-3xl font-bold tracking-tight mb-3">You're in the queue.</h1>
          <p className="text-slate-500 mb-1">Your application reference</p>
          <p className="text-xl font-mono font-bold text-slate-900 mb-6">{submittedId}</p>
          <p className="text-sm text-slate-500 mb-8 max-w-md mx-auto leading-relaxed">
            Our credit team will assess your application within 48 business hours. You'll receive an email and an in-app notification with the decision. Track progress at any time under My Loans.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Button onClick={() => navigate('/client/loans')} size="md">
              View my applications <ArrowRight size={14} />
            </Button>
            <Button onClick={() => { setSubmittedId(null); setStep(0); }} variant="outline" size="md">
              Submit another
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // ── Wizard ──────────────────────────────────────────────────────
  const amountNum   = Number(form.amount)     || 0;
  const termNum     = Number(form.termMonths) || 12;
  const installment = pmt(amountNum, 20, termNum);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Apply for Financing</h1>
        <p className="text-slate-500 text-sm mt-1">Complete all steps to submit your application</p>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-2">
        {STEPS.map((_label, i) => (
          <div key={i} className="flex items-center gap-2 flex-1 last:flex-none">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold transition-all ${
              i < step   ? 'bg-emerald-500 text-white'          :
              i === step ? 'bg-[var(--color-brand)] text-white' :
                           'bg-slate-100 text-slate-400'
            }`}>
              {i < step ? <CheckCircle size={16} /> : i + 1}
            </div>
            {i < STEPS.length - 1 ? (
              <div className={`flex-1 h-0.5 ${i < step ? 'bg-emerald-400' : 'bg-slate-200'}`} />
            ) : null}
          </div>
        ))}
      </div>

      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-[var(--color-brand-muted)] flex items-center justify-center">
            <StepIcon size={20} className="text-[var(--color-brand)]" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900">{STEPS[step]}</h2>
        </div>

        {step === 0 ? (
          <div className="space-y-4">
            <Input label="Company / Trading Name"      value={form.company}        onChange={(e) => update('company',        e.target.value)} required />
            <Input label="Registration Number (CIPC)"  value={form.registration}   onChange={(e) => update('registration',   e.target.value)} required />
            <div className="grid grid-cols-2 gap-4">
              <Input label="Industry Sector"            value={form.industry}       onChange={(e) => update('industry',       e.target.value)} required />
              <Input label="Years in Operation" type="number" value={form.yearsOperation} onChange={(e) => update('yearsOperation', e.target.value)} required />
            </div>
            <Input label="Business Address"             value={form.address}        onChange={(e) => update('address',        e.target.value)} required />
          </div>
        ) : null}

        {step === 1 ? (
          <div className="space-y-4">
            <Input label="Loan Amount Required (ZAR)" type="number" value={form.amount}   onChange={(e) => update('amount',   e.target.value)} required />
            <Input label="Loan Purpose"                              value={form.purpose}  onChange={(e) => update('purpose',  e.target.value)} required />
            <div className="grid grid-cols-2 gap-4">
              <Input label="Monthly Revenue"  type="number" value={form.monthlyRevenue}  onChange={(e) => update('monthlyRevenue',  e.target.value)} required />
              <Input label="Monthly Expenses" type="number" value={form.monthlyExpenses} onChange={(e) => update('monthlyExpenses', e.target.value)} required />
            </div>
            <Input label="Preferred Repayment Term (months)" type="number" value={form.termMonths} onChange={(e) => update('termMonths', e.target.value)} required />
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-4">
            <p className="text-sm text-slate-500">Upload required documents. All files are stored securely.</p>
            {['CIPC Certificate', 'ID Documents (Directors)', '3 Months Bank Statements', 'Latest Financial Statements'].map((doc) => (
              <div key={doc} className="flex items-center justify-between p-4 border border-dashed border-slate-200 rounded-xl hover:border-[var(--color-brand)] transition-colors">
                <div className="flex items-center gap-3">
                  <FileText size={18} className="text-slate-400" />
                  <span className="text-sm font-medium text-slate-700">{doc}</span>
                </div>
                <Button variant="outline" size="sm">Upload</Button>
              </div>
            ))}
          </div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-4">
            {hasOpenBanking ? (
              <TruIDPanel
                name={profile?.full_name}
                email={profile?.email}
              />
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-slate-500">Upload 3 months of bank statements for your primary business account.</p>
                <div className="p-8 border-2 border-dashed border-slate-200 rounded-xl text-center">
                  <p className="text-sm text-slate-400">Drag &amp; drop or click to upload</p>
                </div>
              </div>
            )}
          </div>
        ) : null}

        {step === 4 ? (
          <div className="space-y-4">
            <p className="eyebrow mb-2">Review summary</p>
            <div className="bg-slate-50 rounded-xl p-4 text-sm space-y-2">
              <div className="flex justify-between"><span className="text-slate-500">Company</span>                    <span className="font-semibold">{form.company}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Loan amount</span>                <span className="font-semibold">{fmt(amountNum)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Purpose</span>                    <span className="font-semibold">{form.purpose}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Term</span>                       <span className="font-semibold">{termNum} months</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Indicative rate</span>            <span className="font-semibold">20% p.a.</span></div>
              <div className="flex justify-between border-t border-slate-200 pt-2 mt-2">
                <span className="text-slate-500">Estimated monthly instalment</span>
                <span className="font-bold text-[var(--color-brand)]">{fmt(installment)}</span>
              </div>
            </div>
            {hasEContracts ? (
              <p className="text-xs text-slate-400">Upon approval, you'll receive a digital agreement to review and sign electronically via DocuSeal.</p>
            ) : null}
          </div>
        ) : null}
      </Card>

      <div className="flex justify-between">
        <Button variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0 || submitting}>
          Back
        </Button>
        {step < STEPS.length - 1 ? (
          <Button onClick={() => setStep((s) => s + 1)}>Continue</Button>
        ) : (
          <Button onClick={handleSubmit} loading={submitting}>Submit Application</Button>
        )}
      </div>
    </div>
  );
}
