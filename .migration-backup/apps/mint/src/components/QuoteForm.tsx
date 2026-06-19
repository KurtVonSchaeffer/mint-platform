'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Loader2 } from 'lucide-react';

const PURPOSES = [
  'Working capital',
  'Equipment purchase',
  'Stock / inventory',
  'Business expansion',
  'Invoice financing',
  'Renovation',
  'Other',
];

const AMOUNTS = [
  { label: 'R 25 000',   value: 25000 },
  { label: 'R 50 000',   value: 50000 },
  { label: 'R 100 000',  value: 100000 },
  { label: 'R 250 000',  value: 250000 },
  { label: 'R 500 000',  value: 500000 },
];

const TERMS = [
  { label: '6 months',  value: 6  },
  { label: '12 months', value: 12 },
  { label: '24 months', value: 24 },
  { label: '36 months', value: 36 },
];

export function QuoteForm() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    consumerName:     '',
    consumerIdNumber: '',
    consumerEmail:    '',
    consumerMobile:   '',
    businessName:     '',
    yearsInOperation: '3',
    requestedAmount:  100000,
    requestedTerm:    24,
    purpose:          'Working capital',
  });

  function set<K extends keyof typeof form>(k: K, v: typeof form[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleSubmit() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/quote', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Something went wrong');
      router.push(`/quote/${json.requestId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error');
      setLoading(false);
    }
  }

  return (
    <div className="card p-7 space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          {([1, 2] as const).map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                transition-all duration-300
                ${s === step
                  ? 'bg-gradient-to-br from-[var(--gold-2)] to-[var(--gold)] text-[var(--ink)]'
                  : s < step
                  ? 'bg-[var(--green)] text-[var(--ink)]'
                  : 'bg-[var(--ink-3)] text-[var(--silver)]'}`}>
                {s < step ? '✓' : s}
              </div>
              {s < 2 && <div className={`w-8 h-px transition-colors duration-300
                ${step > s ? 'bg-[var(--green)]' : 'bg-[rgba(255,255,255,0.1)]'}`} />}
            </div>
          ))}
        </div>
        <p className="serif text-2xl text-[var(--white)] mt-3">
          {step === 1 ? 'Your details' : 'Loan details'}
        </p>
        <p className="text-sm text-[var(--silver)] mt-1">
          {step === 1 ? 'We use this to run your credit check.' : 'What are you looking for?'}
        </p>
      </div>

      {/* Step 1 */}
      {step === 1 && (
        <div className="space-y-4 animate-fade-up">
          <div>
            <label className="label">Full name *</label>
            <input className="field" placeholder="John Smith"
              value={form.consumerName} onChange={(e) => set('consumerName', e.target.value)} />
          </div>
          <div>
            <label className="label">SA ID number *</label>
            <input className="field mono" placeholder="8001015009087" maxLength={13}
              value={form.consumerIdNumber} onChange={(e) => set('consumerIdNumber', e.target.value.replace(/\D/g, ''))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Email *</label>
              <input className="field" type="email" placeholder="john@business.co.za"
                value={form.consumerEmail} onChange={(e) => set('consumerEmail', e.target.value)} />
            </div>
            <div>
              <label className="label">Mobile</label>
              <input className="field" placeholder="082 123 4567"
                value={form.consumerMobile} onChange={(e) => set('consumerMobile', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Business name</label>
              <input className="field" placeholder="Trading name"
                value={form.businessName} onChange={(e) => set('businessName', e.target.value)} />
            </div>
            <div>
              <label className="label">Years trading</label>
              <select className="field" value={form.yearsInOperation}
                onChange={(e) => set('yearsInOperation', e.target.value)}>
                {['1','2','3','4','5','6','7','8','9','10+'].map((y) => (
                  <option key={y} value={y}>{y} year{y !== '1' ? 's' : ''}</option>
                ))}
              </select>
            </div>
          </div>
          <button
            className="btn-gold w-full mt-2"
            onClick={() => setStep(2)}
            disabled={!form.consumerName || !form.consumerIdNumber || !form.consumerEmail}
          >
            Continue <ArrowRight size={15} />
          </button>
        </div>
      )}

      {/* Step 2 */}
      {step === 2 && (
        <div className="space-y-5 animate-fade-up">
          <div>
            <label className="label">How much do you need?</label>
            <div className="grid grid-cols-3 gap-2">
              {AMOUNTS.map(({ label, value }) => (
                <button key={value}
                  onClick={() => set('requestedAmount', value)}
                  className={`py-2.5 px-3 rounded-lg text-sm font-semibold border transition-all duration-150
                    ${form.requestedAmount === value
                      ? 'bg-[rgba(212,148,58,0.12)] border-[var(--gold)] text-[var(--gold-2)]'
                      : 'bg-[var(--ink-3)] border-transparent text-[var(--silver)] hover:border-[rgba(255,255,255,0.15)] hover:text-[var(--white)]'
                    }`}>
                  {label}
                </button>
              ))}
              {/* Custom amount */}
              <div className="relative col-span-2">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--silver)] text-sm pointer-events-none">R</span>
                <input className="field pl-7 text-sm"
                  placeholder="Custom amount"
                  type="number"
                  value={AMOUNTS.some(a => a.value === form.requestedAmount) ? '' : form.requestedAmount || ''}
                  onChange={(e) => set('requestedAmount', Number(e.target.value))} />
              </div>
            </div>
          </div>

          <div>
            <label className="label">Repayment term</label>
            <div className="grid grid-cols-4 gap-2">
              {TERMS.map(({ label, value }) => (
                <button key={value}
                  onClick={() => set('requestedTerm', value)}
                  className={`py-2.5 rounded-lg text-sm font-semibold border transition-all duration-150
                    ${form.requestedTerm === value
                      ? 'bg-[rgba(212,148,58,0.12)] border-[var(--gold)] text-[var(--gold-2)]'
                      : 'bg-[var(--ink-3)] border-transparent text-[var(--silver)] hover:border-[rgba(255,255,255,0.15)] hover:text-[var(--white)]'
                    }`}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label">Purpose</label>
            <select className="field" value={form.purpose}
              onChange={(e) => set('purpose', e.target.value)}>
              {PURPOSES.map((p) => <option key={p}>{p}</option>)}
            </select>
          </div>

          {error && (
            <p className="text-sm text-[var(--red)] bg-[rgba(224,90,90,0.08)] border border-[rgba(224,90,90,0.2)] rounded-lg px-4 py-3">
              {error}
            </p>
          )}

          <div className="flex gap-3">
            <button className="btn-ghost" onClick={() => setStep(1)} disabled={loading}>Back</button>
            <button className="btn-gold flex-1" onClick={handleSubmit}
              disabled={loading || form.requestedAmount <= 0}>
              {loading
                ? <><Loader2 size={15} className="animate-spin" /> Checking your profile…</>
                : <>Find my best deal <ArrowRight size={15} /></>}
            </button>
          </div>
        </div>
      )}

      <p className="text-xs text-[var(--silver)] text-center leading-relaxed">
        By submitting you consent to a credit bureau check under NCA regulations.
        Your data is encrypted and never sold.
      </p>
    </div>
  );
}
