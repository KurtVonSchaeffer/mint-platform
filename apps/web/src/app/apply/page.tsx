'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check, ArrowRight, Upload, X } from 'lucide-react';

/* ── Types ──────────────────────────────────────────────────────────── */
type Step = 'details' | 'directors' | 'documents' | 'review' | 'done';
const STEPS: { id: Step; label: string }[] = [
  { id: 'details',   label: 'Company' },
  { id: 'directors', label: 'Directors' },
  { id: 'documents', label: 'Documents' },
  { id: 'review',    label: 'Review' },
];

const REQUIRED_DOCS = [
  { id: 'cipc_cert',      label: 'CIPC registration certificate', hint: 'Company registration from CIPC',        required: true  },
  { id: 'director_id',    label: 'Director ID copy',              hint: 'Clear copy of SA ID document',          required: true  },
  { id: 'ncr_cert',       label: 'NCR lending licence',           hint: 'NCR certificate for credit providers',  required: true  },
  { id: 'bank_statement', label: '3 months bank statements',      hint: 'Business account — last 3 months',      required: true  },
  { id: 'signed_sla',     label: 'Signed service agreement',      hint: 'Upload if signed — we can email it',    required: false },
];

/* ── Component ──────────────────────────────────────────────────────── */
export default function ApplyPage() {
  const [step, setStep]   = useState<Step>('details');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // API session state (obtained after step 1)
  const [token,  setToken]  = useState('');
  const [leadId, setLeadId] = useState('');

  // Step 1 — details
  const [name,      setName]      = useState('');
  const [email,     setEmail]     = useState('');
  const [company,   setCompany]   = useState('');
  const [legalName, setLegalName] = useState('');
  const [phone,     setPhone]     = useState('');
  const [ncr,       setNcr]       = useState('');

  // Step 2 — directors
  const [directors, setDirectors] = useState([{ name: '', id_number: '', email: '' }]);

  // Step 3 — documents
  const [docFiles, setDocFiles] = useState<Record<string, File | null>>({});

  const stepIndex = STEPS.findIndex(s => s.id === step);

  /* ── Helpers ─────────────────────────────────────────────────── */
  function addDirector() {
    setDirectors(p => [...p, { name: '', id_number: '', email: '' }]);
  }
  function updateDirector(i: number, k: keyof typeof directors[0], v: string) {
    setDirectors(p => p.map((d, idx) => idx === i ? { ...d, [k]: v } : d));
  }
  function removeDirector(i: number) {
    setDirectors(p => p.filter((_, idx) => idx !== i));
  }
  function setDoc(id: string, file: File | null) {
    setDocFiles(p => ({ ...p, [id]: file }));
  }

  /* ── Step 1 submit → get token ───────────────────────────────── */
  async function submitDetails() {
    setError('');
    setSaving(true);
    try {
      const res = await fetch('/api/onboard/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, company, phone, ncr, direct: true }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) { setError(json.error ?? 'Something went wrong.'); return; }
      setToken(json.token);
      setLeadId(json.leadId);
      setStep('directors');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  /* ── Final submit ────────────────────────────────────────────── */
  async function submitApplication() {
    setError('');
    setSaving(true);
    try {
      // Submit main data
      const res = await fetch(`/api/onboard/${token}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_id: leadId,
          name, company, legal_name: legalName, phone, ncr_number: ncr, directors,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? 'Submission failed. Please try again.');
        return;
      }

      // Upload documents
      const entries = Object.entries(docFiles).filter(([, f]) => f != null);
      await Promise.allSettled(entries.map(([docType, file]) => {
        const fd = new FormData();
        fd.append('token', token);
        fd.append('doc_type', docType);
        fd.append('file', file!);
        if (leadId) fd.append('client_id', leadId);
        return fetch(`/api/onboard/${token}/upload`, { method: 'POST', body: fd });
      }));

      setStep('done');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  /* ── Done screen ─────────────────────────────────────────────── */
  if (step === 'done') {
    return (
      <main className="min-h-screen flex items-center justify-center px-4 py-16"
        style={{ background: 'var(--color-bg)' }}>
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6"
            style={{ background: '#ECFDF5', fontSize: 28 }}>✓</div>
          <h1 className="text-2xl font-bold tracking-tight mb-2" style={{ color: 'var(--color-ink)' }}>
            Application submitted
          </h1>
          <p className="mb-6" style={{ color: 'var(--color-ink-soft)' }}>
            Thanks <strong>{name}</strong>. We'll review your application and reach out to <strong>{email}</strong> within 1 business day.
          </p>
          <p className="text-sm mb-8" style={{ color: 'var(--color-ink-muted)' }}>
            Questions? Email us at <a href="mailto:accounts@algolend.co.za" className="underline" style={{ color: 'var(--color-brand)' }}>accounts@algolend.co.za</a>
          </p>
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-full text-white" style={{ background: 'var(--color-brand)' }}>
            Back to AlgoLend <ArrowRight size={13} />
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen py-16 px-4" style={{ background: 'var(--color-bg)' }}>
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <Link href="/" className="text-sm font-medium mb-5 inline-flex items-center gap-1.5"
            style={{ color: 'var(--color-brand)' }}>
            ← AlgoLend
          </Link>
          <div className="flex items-start gap-3 mt-4">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'var(--color-brand)', marginTop: 2 }}>
              <svg width="18" height="18" viewBox="0 0 32 32" fill="none">
                <path d="M6 30L6 14C6 8.48 10.48 4 16 4C21.52 4 26 8.48 26 14L26 30"
                  stroke="#fff" strokeWidth="2.6" fill="none" strokeLinecap="round"/>
                <circle cx="16" cy="15" r="5.5" fill="#fff"/>
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--color-ink)' }}>
                Start your AlgoLend application
              </h1>
              <p className="text-sm mt-1" style={{ color: 'var(--color-ink-soft)' }}>
                Takes about 5 minutes. We'll review your application and be in touch within 1 business day.
              </p>
            </div>
          </div>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors"
                  style={s.id === step
                    ? { background: 'var(--color-brand)', color: '#fff' }
                    : i < stepIndex
                    ? { background: '#ECFDF5', color: '#059669' }
                    : { background: 'var(--color-surface-3)', color: 'var(--color-ink-muted)' }}>
                  {i < stepIndex ? <Check size={11} /> : i + 1}
                </div>
                <span className="text-sm font-medium hidden sm:inline"
                  style={{ color: s.id === step ? 'var(--color-ink)' : 'var(--color-ink-muted)' }}>
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && <div className="w-8 h-px" style={{ background: 'var(--color-border)' }} />}
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="rounded-2xl p-8" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>

          {/* ── Step 1: Details ── */}
          {step === 'details' && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--color-ink)' }}>Company details</h2>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Contact name *">
                  <input required value={name} onChange={e => setName(e.target.value)} placeholder="Jane Smith" className="a-input" />
                </Field>
                <Field label="Work email *">
                  <input required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="jane@company.co.za" className="a-input" />
                </Field>
              </div>
              <Field label="Company name *">
                <input required value={company} onChange={e => setCompany(e.target.value)} placeholder="BridgeCapital Finance (Pty) Ltd" className="a-input" />
              </Field>
              <Field label="Legal / registered name" hint="If different from trading name">
                <input value={legalName} onChange={e => setLegalName(e.target.value)} placeholder="BridgeCapital Finance (Pty) Ltd" className="a-input" />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Phone number">
                  <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+27 82 000 0000" className="a-input" />
                </Field>
                <Field label="NCR registration number">
                  <input value={ncr} onChange={e => setNcr(e.target.value)} placeholder="NCRCP12345" className="a-input font-mono" />
                </Field>
              </div>
            </div>
          )}

          {/* ── Step 2: Directors ── */}
          {step === 'directors' && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold mb-2" style={{ color: 'var(--color-ink)' }}>Director information</h2>
              <p className="text-sm mb-4" style={{ color: 'var(--color-ink-soft)' }}>
                Add all directors of the company. Required for FICA compliance.
              </p>
              {directors.map((d, i) => (
                <div key={i} className="rounded-xl p-4 space-y-3" style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-ink-muted)' }}>Director {i + 1}</p>
                    {directors.length > 1 && (
                      <button onClick={() => removeDirector(i)} className="inline-flex items-center gap-1 text-xs" style={{ color: 'var(--color-ink-muted)' }}>
                        <X size={11} /> Remove
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Full name *">
                      <input value={d.name} onChange={e => updateDirector(i, 'name', e.target.value)} placeholder="Jane Smith" className="a-input" />
                    </Field>
                    <Field label="SA ID number *">
                      <input value={d.id_number} onChange={e => updateDirector(i, 'id_number', e.target.value)} placeholder="8001015009087" className="a-input font-mono" maxLength={13} />
                    </Field>
                  </div>
                  <Field label="Email address">
                    <input type="email" value={d.email} onChange={e => updateDirector(i, 'email', e.target.value)} placeholder="jane@company.co.za" className="a-input" />
                  </Field>
                </div>
              ))}
              <button onClick={addDirector}
                className="text-sm font-semibold px-4 py-2.5 rounded-xl w-full transition-colors"
                style={{ border: '1px dashed var(--color-border)', color: 'var(--color-brand)', background: 'transparent' }}>
                + Add another director
              </button>
            </div>
          )}

          {/* ── Step 3: Documents ── */}
          {step === 'documents' && (
            <div className="space-y-3">
              <h2 className="text-lg font-bold mb-2" style={{ color: 'var(--color-ink)' }}>Upload documents</h2>
              <p className="text-sm mb-4" style={{ color: 'var(--color-ink-soft)' }}>
                Required for FICA and NCR compliance verification. Files are encrypted and only accessible to Mint Platforms staff.
              </p>
              {REQUIRED_DOCS.map(doc => {
                const file = docFiles[doc.id] ?? null;
                return (
                  <label key={doc.id} className="block cursor-pointer">
                    <div className="flex items-center gap-3 px-4 py-3 rounded-xl border transition-all"
                      style={file
                        ? { borderColor: '#6EE7B7', background: '#F0FDF4' }
                        : { borderColor: 'var(--color-border)', background: 'var(--color-surface-2)' }}>
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 text-base"
                        style={{ background: file ? '#D1FAE5' : 'var(--color-surface-3)' }}>
                        {file ? <Check size={16} className="text-emerald-600" /> : <Upload size={16} style={{ color: 'var(--color-ink-muted)' }} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium" style={{ color: 'var(--color-ink)' }}>
                          {doc.label}
                          {doc.required && <span className="ml-1.5 text-[10px] font-bold uppercase px-1.5 py-0.5 rounded" style={{ background: '#FEF2F2', color: '#B91C1C' }}>Required</span>}
                        </p>
                        <p className="text-xs truncate" style={{ color: file ? '#059669' : 'var(--color-ink-muted)' }}>
                          {file ? file.name : doc.hint}
                        </p>
                      </div>
                      {file && (
                        <button type="button" onClick={e => { e.preventDefault(); setDoc(doc.id, null); }}
                          className="text-xs px-2 py-1 rounded" style={{ color: 'var(--color-ink-muted)', background: 'var(--color-surface-3)' }}>
                          Remove
                        </button>
                      )}
                    </div>
                    <input type="file" className="sr-only" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                      onChange={e => { setDoc(doc.id, e.target.files?.[0] ?? null); e.target.value = ''; }} />
                  </label>
                );
              })}
              <p className="text-xs pt-1" style={{ color: 'var(--color-ink-muted)' }}>
                Accepted: PDF, JPG, PNG, Word. Missing documents can be sent to <strong>accounts@algolend.co.za</strong>.
              </p>
            </div>
          )}

          {/* ── Step 4: Review ── */}
          {step === 'review' && (
            <div className="space-y-5">
              <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--color-ink)' }}>Review & submit</h2>
              <ReviewSection title="Company">
                <ReviewRow label="Trading name" value={company} />
                {legalName && <ReviewRow label="Legal name" value={legalName} />}
                <ReviewRow label="Contact" value={`${name} · ${email}`} />
                {phone && <ReviewRow label="Phone" value={phone} />}
                {ncr && <ReviewRow label="NCR number" value={ncr} mono />}
              </ReviewSection>
              <ReviewSection title="Directors">
                {directors.map((d, i) => (
                  <ReviewRow key={i} label={`Director ${i + 1}`} value={`${d.name}${d.id_number ? ` · ${d.id_number}` : ''}`} />
                ))}
              </ReviewSection>
              <ReviewSection title="Documents">
                {REQUIRED_DOCS.map(doc => (
                  <ReviewRow key={doc.id} label={doc.label}
                    value={docFiles[doc.id] ? docFiles[doc.id]!.name : doc.required ? '⚠ Missing' : 'Not uploaded'}
                    warn={!docFiles[doc.id] && doc.required} />
                ))}
              </ReviewSection>
              {error && (
                <p className="text-sm px-4 py-3 rounded-xl" style={{ background: '#FEF2F2', color: '#B91C1C' }}>{error}</p>
              )}
            </div>
          )}

          {/* Error */}
          {step !== 'review' && error && (
            <p className="text-sm mt-4 px-4 py-3 rounded-xl" style={{ background: '#FEF2F2', color: '#B91C1C' }}>{error}</p>
          )}
        </div>

        {/* Footer nav */}
        <div className="flex justify-between items-center mt-6">
          <button
            onClick={() => {
              const order: Step[] = ['details', 'directors', 'documents', 'review'];
              const i = order.indexOf(step);
              if (i > 0) setStep(order[i - 1]);
            }}
            disabled={step === 'details'}
            className="px-5 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-30"
            style={{ border: '1px solid var(--color-border)', color: 'var(--color-ink-soft)' }}>
            Back
          </button>

          {step === 'details' && (
            <button
              onClick={submitDetails}
              disabled={saving || !name.trim() || !email.trim() || !company.trim()}
              className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity disabled:opacity-40"
              style={{ background: 'var(--color-brand)' }}>
              {saving ? 'Saving…' : 'Continue →'}
            </button>
          )}

          {(step === 'directors' || step === 'documents') && (
            <button
              onClick={() => {
                const order: Step[] = ['details', 'directors', 'documents', 'review'];
                const i = order.indexOf(step);
                setStep(order[i + 1]);
              }}
              className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white"
              style={{ background: 'var(--color-brand)' }}>
              Next →
            </button>
          )}

          {step === 'review' && (
            <button
              onClick={submitApplication}
              disabled={saving}
              className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity disabled:opacity-60"
              style={{ background: 'var(--color-brand)' }}>
              {saving ? 'Submitting…' : 'Submit application →'}
            </button>
          )}
        </div>

        <p className="text-center text-xs mt-6" style={{ color: 'var(--color-ink-muted)' }}>
          By applying you agree to our{' '}
          <Link href="/terms" className="underline">Terms</Link> and{' '}
          <Link href="/privacy" className="underline">Privacy Policy</Link>.
        </p>
      </div>

      <style>{`
        .a-input {
          width: 100%;
          padding: 10px 14px;
          border-radius: 10px;
          border: 1px solid var(--color-border);
          background: var(--color-surface);
          color: var(--color-ink);
          font-size: 14px;
          outline: none;
          transition: border-color 0.15s;
          font-family: inherit;
        }
        .a-input:focus { border-color: var(--color-brand); box-shadow: 0 0 0 3px rgba(124,58,237,0.1); }
        .a-input::placeholder { color: var(--color-ink-muted); }
      `}</style>
    </main>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--color-ink-soft)' }}>{label}</label>
      {children}
      {hint && <p className="text-xs mt-1" style={{ color: 'var(--color-ink-muted)' }}>{hint}</p>}
    </div>
  );
}

function ReviewSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--color-ink-muted)' }}>{title}</p>
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>{children}</div>
    </div>
  );
}

function ReviewRow({ label, value, mono, warn }: { label: string; value: string; mono?: boolean; warn?: boolean }) {
  return (
    <div className="flex items-start gap-3 px-4 py-2.5" style={{ borderBottom: '1px solid var(--color-border-soft)' }}>
      <span className="text-xs w-36 shrink-0 pt-0.5" style={{ color: 'var(--color-ink-muted)' }}>{label}</span>
      <span className={`text-sm ${mono ? 'font-mono' : ''}`} style={{ color: warn ? '#B91C1C' : 'var(--color-ink)' }}>{value}</span>
    </div>
  );
}
