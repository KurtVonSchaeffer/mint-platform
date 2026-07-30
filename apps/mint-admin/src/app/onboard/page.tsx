'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import {
  Building2, User, Phone, Mail, Globe2, FileText,
  CheckCircle2, Loader2, Upload, X, ArrowRight, ArrowLeft,
  ChevronRight, Sparkles,
} from 'lucide-react';

type Step = 'company' | 'contact' | 'ncr' | 'done';

const INDUSTRIES = [
  'Credit Provider', 'Debt Counselling', 'Microfinance', 'Personal Loans',
  'Vehicle Finance', 'Home Loans', 'Business Loans', 'Fintech', 'Other',
];

export default function OnboardPage() {
  const [step, setStep]           = useState<Step>('company');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]         = useState<string | null>(null);

  // Company
  const [company, setCompany]   = useState('');
  const [industry, setIndustry] = useState('');
  const [website, setWebsite]   = useState('');

  // Contact
  const [name, setName]   = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  // NCR
  const [ncrNumber, setNcrNumber]   = useState('');
  const [ncrFile, setNcrFile]       = useState<File | null>(null);
  const [ocrState, setOcrState]     = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [ocrExtracted, setOcrExtracted] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function runOcr(file: File) {
    setOcrState('loading');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/public/ncr-ocr', { method: 'POST', body: fd });
      const data = await res.json();
      if (res.ok && data.ncr_number) {
        setOcrExtracted(data.ncr_number);
        if (!ncrNumber.trim()) setNcrNumber(data.ncr_number);
        setOcrState('done');
      } else {
        setOcrState('error');
      }
    } catch {
      setOcrState('error');
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setNcrFile(file);
    setOcrState('idle');
    setOcrExtracted(null);
    if (file) runOcr(file);
  }

  function removeFile() {
    setNcrFile(null);
    setOcrState('idle');
    setOcrExtracted(null);
    if (fileRef.current) fileRef.current.value = '';
  }

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/public/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company, industry, website, name, email, phone, ncr_number: ncrNumber }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Submission failed');
      setStep('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  const steps: Step[] = ['company', 'contact', 'ncr'];
  const stepIdx = steps.indexOf(step);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--color-bg)' }}>
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
        <div className="flex items-center gap-3">
          <Image src="/algolend-logo-dark.png" alt="AlgoLend" width={120} height={32} className="dark:block hidden" />
          <Image src="/algolend-logo.png" alt="AlgoLend" width={120} height={32} className="dark:hidden block" />
        </div>
        <span className="text-xs font-medium px-2.5 py-1 rounded-full" style={{ background: 'rgba(167,139,250,0.12)', color: 'var(--color-violet)' }}>
          Partner Application
        </span>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-10">
        {step === 'done' ? (
          /* ── Success state ── */
          <div className="w-full max-w-md text-center space-y-5">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto" style={{ background: 'rgba(52,211,153,0.12)' }}>
              <CheckCircle2 size={32} style={{ color: '#34D399' }} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--color-text)', letterSpacing: '-0.025em' }}>
                Application received!
              </h1>
              <p className="mt-2 text-sm" style={{ color: 'var(--color-text3)' }}>
                Thanks, <strong style={{ color: 'var(--color-text2)' }}>{name}</strong>. One of our team members will be in touch with <strong style={{ color: 'var(--color-text2)' }}>{email}</strong> shortly to complete your onboarding.
              </p>
            </div>
            <div className="rounded-2xl p-4 text-left space-y-2" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border2)' }}>
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text3)' }}>What happens next</p>
              {['Our team reviews your application (1-2 business days)', 'We verify your NCR registration', 'You receive login credentials for the AlgoLend portal'].map((item, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-[9px] font-black text-white" style={{ background: 'var(--color-violet)' }}>{i + 1}</div>
                  <p className="text-xs" style={{ color: 'var(--color-text2)' }}>{item}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="w-full max-w-lg space-y-6">
            {/* Title */}
            <div className="text-center">
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full mb-3" style={{ background: 'rgba(167,139,250,0.1)', color: 'var(--color-violet)' }}>
                <Sparkles size={11} /> Step {stepIdx + 1} of 3
              </div>
              <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--color-text)', letterSpacing: '-0.025em' }}>
                {step === 'company' && 'Your Company'}
                {step === 'contact' && 'Your Details'}
                {step === 'ncr' && 'NCR Registration'}
              </h1>
              <p className="text-sm mt-1" style={{ color: 'var(--color-text3)' }}>
                {step === 'company' && 'Tell us about your business'}
                {step === 'contact' && 'Who should we contact?'}
                {step === 'ncr' && 'Your NCR number confirms you\'re a registered credit provider'}
              </p>
            </div>

            {/* Progress bar */}
            <div className="flex gap-1.5">
              {steps.map((s, i) => (
                <div key={s} className="flex-1 h-1 rounded-full transition-all" style={{ background: i <= stepIdx ? 'var(--color-violet)' : 'var(--color-border2)' }} />
              ))}
            </div>

            {/* Card */}
            <div className="rounded-2xl p-6 space-y-4" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border2)' }}>

              {/* ── Step 1: Company ── */}
              {step === 'company' && (
                <>
                  <Field icon={Building2} label="Company name" required>
                    <input
                      type="text" value={company} onChange={e => setCompany(e.target.value)}
                      placeholder="e.g. Acme Credit (Pty) Ltd"
                      className="w-full bg-transparent text-sm outline-none"
                      style={{ color: 'var(--color-text)' }}
                      autoFocus
                    />
                  </Field>
                  <Field icon={FileText} label="Industry">
                    <select value={industry} onChange={e => setIndustry(e.target.value)}
                      className="w-full bg-transparent text-sm outline-none" style={{ color: industry ? 'var(--color-text)' : 'var(--color-text3)' }}>
                      <option value="">Select industry…</option>
                      {INDUSTRIES.map(ind => <option key={ind} value={ind}>{ind}</option>)}
                    </select>
                  </Field>
                  <Field icon={Globe2} label="Website">
                    <input
                      type="url" value={website} onChange={e => setWebsite(e.target.value)}
                      placeholder="https://yourcompany.co.za"
                      className="w-full bg-transparent text-sm outline-none"
                      style={{ color: 'var(--color-text)' }}
                    />
                  </Field>
                </>
              )}

              {/* ── Step 2: Contact ── */}
              {step === 'contact' && (
                <>
                  <Field icon={User} label="Full name" required>
                    <input
                      type="text" value={name} onChange={e => setName(e.target.value)}
                      placeholder="e.g. Jane Smith"
                      className="w-full bg-transparent text-sm outline-none"
                      style={{ color: 'var(--color-text)' }}
                      autoFocus
                    />
                  </Field>
                  <Field icon={Mail} label="Email address" required>
                    <input
                      type="email" value={email} onChange={e => setEmail(e.target.value)}
                      placeholder="you@company.co.za"
                      className="w-full bg-transparent text-sm outline-none"
                      style={{ color: 'var(--color-text)' }}
                    />
                  </Field>
                  <Field icon={Phone} label="Phone number">
                    <input
                      type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                      placeholder="+27 82 000 0000"
                      className="w-full bg-transparent text-sm outline-none"
                      style={{ color: 'var(--color-text)' }}
                    />
                  </Field>
                </>
              )}

              {/* ── Step 3: NCR ── */}
              {step === 'ncr' && (
                <>
                  {/* File upload */}
                  <div>
                    <p className="text-xs font-semibold mb-2" style={{ color: 'var(--color-text3)' }}>Upload NCR certificate <span className="font-normal">(optional — we&apos;ll auto-extract your number)</span></p>
                    {!ncrFile ? (
                      <label
                        className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed cursor-pointer transition-colors hover:border-violet-400 p-6"
                        style={{ borderColor: 'var(--color-border2)' }}
                      >
                        <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleFileChange} className="hidden" />
                        <Upload size={20} style={{ color: 'var(--color-text3)' }} />
                        <p className="text-xs text-center" style={{ color: 'var(--color-text3)' }}>
                          Click to upload your NCR certificate<br />
                          <span style={{ color: 'var(--color-text3)' }}>PDF, JPG or PNG</span>
                        </p>
                      </label>
                    ) : (
                      <div className="flex items-center gap-3 rounded-xl p-3" style={{ background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.2)' }}>
                        <FileText size={16} style={{ color: 'var(--color-violet)' }} className="shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate" style={{ color: 'var(--color-text)' }}>{ncrFile.name}</p>
                          {ocrState === 'loading' && (
                            <div className="flex items-center gap-1 mt-0.5">
                              <Loader2 size={10} className="animate-spin" style={{ color: 'var(--color-violet)' }} />
                              <span className="text-[11px]" style={{ color: 'var(--color-violet)' }}>Extracting NCR number…</span>
                            </div>
                          )}
                          {ocrState === 'done' && (
                            <p className="text-[11px] mt-0.5" style={{ color: '#34D399' }}>Extracted: <strong>{ocrExtracted}</strong></p>
                          )}
                          {ocrState === 'error' && (
                            <p className="text-[11px] mt-0.5" style={{ color: '#F87171' }}>Could not extract — enter manually below</p>
                          )}
                        </div>
                        <button onClick={removeFile} className="shrink-0 opacity-60 hover:opacity-100 transition-opacity">
                          <X size={14} style={{ color: 'var(--color-text3)' }} />
                        </button>
                      </div>
                    )}
                  </div>

                  <Field icon={FileText} label="NCR registration number">
                    <input
                      type="text" value={ncrNumber} onChange={e => setNcrNumber(e.target.value)}
                      placeholder="e.g. NCRCP12345"
                      className="w-full bg-transparent text-sm outline-none font-mono"
                      style={{ color: 'var(--color-text)' }}
                    />
                  </Field>
                </>
              )}
            </div>

            {/* Error */}
            {error && (
              <p className="text-sm text-center px-3 py-2 rounded-xl" style={{ background: 'rgba(248,113,113,0.1)', color: '#F87171' }}>
                {error}
              </p>
            )}

            {/* Nav buttons */}
            <div className="flex items-center gap-3">
              {stepIdx > 0 && (
                <button
                  onClick={() => setStep(steps[stepIdx - 1])}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-colors"
                  style={{ border: '1px solid var(--color-border2)', color: 'var(--color-text2)' }}
                >
                  <ArrowLeft size={15} /> Back
                </button>
              )}
              {step !== 'ncr' ? (
                <button
                  onClick={() => {
                    if (step === 'company' && !company.trim()) return;
                    if (step === 'contact' && (!name.trim() || !email.trim())) return;
                    setStep(steps[stepIdx + 1]);
                  }}
                  disabled={(step === 'company' && !company.trim()) || (step === 'contact' && (!name.trim() || !email.trim()))}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm text-white transition-opacity disabled:opacity-40"
                  style={{ background: 'var(--color-violet)' }}
                >
                  Continue <ArrowRight size={15} />
                </button>
              ) : (
                <button
                  onClick={submit}
                  disabled={submitting || ocrState === 'loading'}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm text-white transition-opacity disabled:opacity-50"
                  style={{ background: 'var(--color-violet)' }}
                >
                  {submitting ? <Loader2 size={15} className="animate-spin" /> : <ChevronRight size={15} />}
                  {submitting ? 'Submitting…' : 'Submit Application'}
                </button>
              )}
            </div>

            <p className="text-center text-xs" style={{ color: 'var(--color-text3)' }}>
              Already have an account?{' '}
              <a href="/login" className="underline" style={{ color: 'var(--color-violet)' }}>Sign in</a>
            </p>
          </div>
        )}
      </main>

      <footer className="text-center py-4 text-xs" style={{ color: 'var(--color-text3)' }}>
        &copy; {new Date().getFullYear()} AlgoLend. All rights reserved.
      </footer>
    </div>
  );
}

function Field({
  icon: Icon, label, required, children,
}: {
  icon: React.ComponentType<{ size?: number }>;
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl p-3" style={{ border: '1px solid var(--color-border2)' }}>
      <div className="flex items-center gap-1.5 mb-1.5">
        <Icon size={11} />
        <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text3)' }}>
          {label}{required && <span className="text-red-400 ml-0.5">*</span>}
        </label>
      </div>
      {children}
    </div>
  );
}
