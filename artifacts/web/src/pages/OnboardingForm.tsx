

import { useState } from 'react';

const STEPS = ['Details', 'Directors', 'Documents', 'Review'] as const;
type Step = (typeof STEPS)[number];

const REQUIRED_DOCS = [
  { id: 'cipc_cert',      label: 'CIPC registration certificate', hint: 'Company registration document from CIPC', required: true  },
  { id: 'director_id',    label: 'Director ID copy',              hint: 'Clear copy of director\'s SA ID document', required: true  },
  { id: 'ncr_cert',       label: 'NCR lending licence',           hint: 'NCR certificate for credit providers',    required: true  },
  { id: 'bank_statement', label: '3 months bank statements',      hint: 'Business account — last 3 months',        required: true  },
  { id: 'signed_sla',     label: 'Signed service agreement',      hint: 'Upload if already signed — we can email it to you', required: false },
];

interface Props {
  token:   string;
  leadId:  string;
  prefill: { name: string; email: string; company: string; phone: string; ncr: string };
}

export function OnboardingForm({ token, leadId, prefill }: Props) {
  const [step, setStep]     = useState<Step>('Details');
  const [error, setError]   = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone]     = useState(false);

  // Step 1 — Details
  const [name, setName]         = useState(prefill.name);
  const [email]                 = useState(prefill.email);
  const [company, setCompany]   = useState(prefill.company);
  const [legalName, setLegal]   = useState('');
  const [phone, setPhone]       = useState(prefill.phone);
  const [ncr, setNcr]           = useState(prefill.ncr);

  // Step 2 — Directors
  const [directors, setDirectors] = useState([{ name: '', id_number: '', email: '' }]);

  // Step 3 — Documents
  const [docFiles, setDocFiles] = useState<Record<string, File | null>>({});

  const stepIndex = STEPS.indexOf(step);

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

  async function uploadDocs(clientId?: string) {
    const entries = Object.entries(docFiles).filter(([, f]) => f != null);
    await Promise.allSettled(entries.map(([docType, file]) => {
      const fd = new FormData();
      fd.append('token',    token);
      fd.append('doc_type', docType);
      fd.append('file',     file!);
      if (clientId) fd.append('client_id', clientId);
      return fetch(`/api/onboard/${token}/upload`, { method: 'POST', body: fd });
    }));
  }

  async function submitApplication() {
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/onboard/${token}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_id:    leadId,
          name, company, legal_name: legalName, phone, ncr_number: ncr,
          directors,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? 'Something went wrong. Please try again.');
        setSaving(false);
        return;
      }
      await uploadDocs();
      setDone(true);
    } catch {
      setError('Network error — please try again.');
      setSaving(false);
    }
  }

  if (done) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--color-bg)' }}>
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6"
            style={{ background: '#ECFDF5', fontSize: 28 }}>✓</div>
          <h1 className="text-2xl font-bold tracking-tight mb-2" style={{ color: 'var(--color-ink)' }}>
            Application submitted
          </h1>
          <p style={{ color: 'var(--color-ink-soft)' }}>
            Thanks {name}. We'll review your application and contact you at <strong>{email}</strong> within 1 business day.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen py-16 px-4" style={{ background: 'var(--color-bg)' }}>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <p className="text-sm font-semibold mb-1" style={{ color: 'var(--color-brand)' }}>AlgoLend Application</p>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--color-ink)' }}>{company || 'Your application'}</h1>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors"
                  style={s === step ? { background: 'var(--color-brand)', color: '#fff' }
                    : i < stepIndex ? { background: '#ECFDF5', color: '#059669' }
                    : { background: 'var(--color-surface-3)', color: 'var(--color-ink-muted)' }}>
                  {i < stepIndex ? '✓' : i + 1}
                </div>
                <span className="text-sm font-medium hidden sm:inline"
                  style={{ color: s === step ? 'var(--color-ink)' : 'var(--color-ink-muted)' }}>{s}</span>
              </div>
              {i < STEPS.length - 1 && <div className="w-8 h-px" style={{ background: 'var(--color-border)' }} />}
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="rounded-2xl p-8" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>

          {/* Step 1 — Details */}
          {step === 'Details' && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--color-ink)' }}>Company details</h2>
              <div className="grid grid-cols-2 gap-4">
                <OField label="Contact name *">
                  <input required value={name} onChange={e => setName(e.target.value)} placeholder="Jane Smith" className="o-input" />
                </OField>
                <OField label="Email">
                  <input value={email} disabled className="o-input opacity-50 cursor-not-allowed" />
                </OField>
              </div>
              <OField label="Company name *">
                <input required value={company} onChange={e => setCompany(e.target.value)} placeholder="BridgeCapital Finance (Pty) Ltd" className="o-input" />
              </OField>
              <OField label="Legal / registered name" hint="If different from company name">
                <input value={legalName} onChange={e => setLegal(e.target.value)} placeholder="BridgeCapital Finance (Pty) Ltd" className="o-input" />
              </OField>
              <div className="grid grid-cols-2 gap-4">
                <OField label="Phone number">
                  <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+27 82 000 0000" className="o-input" />
                </OField>
                <OField label="NCR registration number">
                  <input value={ncr} onChange={e => setNcr(e.target.value)} placeholder="NCRCP12345" className="o-input font-mono" />
                </OField>
              </div>
            </div>
          )}

          {/* Step 2 — Directors */}
          {step === 'Directors' && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--color-ink)' }}>Director information</h2>
              <p className="text-sm mb-4" style={{ color: 'var(--color-ink-soft)' }}>
                Add all directors of the company. This is required for FICA compliance.
              </p>
              {directors.map((d, i) => (
                <div key={i} className="rounded-xl p-4 space-y-3" style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-ink-muted)' }}>Director {i + 1}</p>
                    {directors.length > 1 && (
                      <button onClick={() => removeDirector(i)} className="text-xs" style={{ color: 'var(--color-ink-muted)' }}>Remove</button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <OField label="Full name *">
                      <input value={d.name} onChange={e => updateDirector(i, 'name', e.target.value)} placeholder="Jane Smith" className="o-input" />
                    </OField>
                    <OField label="ID number *">
                      <input value={d.id_number} onChange={e => updateDirector(i, 'id_number', e.target.value)} placeholder="8001015009087" className="o-input font-mono" />
                    </OField>
                  </div>
                  <OField label="Email address">
                    <input type="email" value={d.email} onChange={e => updateDirector(i, 'email', e.target.value)} placeholder="jane@company.co.za" className="o-input" />
                  </OField>
                </div>
              ))}
              <button onClick={addDirector}
                className="text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
                style={{ border: '1px dashed var(--color-border)', color: 'var(--color-brand)', background: 'transparent' }}>
                + Add another director
              </button>
            </div>
          )}

          {/* Step 3 — Documents */}
          {step === 'Documents' && (
            <div className="space-y-3">
              <h2 className="text-lg font-bold mb-2" style={{ color: 'var(--color-ink)' }}>Upload documents</h2>
              <p className="text-sm mb-4" style={{ color: 'var(--color-ink-soft)' }}>
                Required for compliance verification. All files are encrypted and only accessible to Mint Platforms staff.
              </p>
              {REQUIRED_DOCS.map((doc) => {
                const file = docFiles[doc.id] ?? null;
                return (
                  <label key={doc.id} className="block cursor-pointer">
                    <div className="flex items-center gap-3 px-4 py-3 rounded-xl border transition-all"
                      style={file ? { borderColor: '#6EE7B7', background: '#F0FDF4' }
                        : { borderColor: 'var(--color-border)', background: 'var(--color-surface-2)' }}>
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-base"
                        style={{ background: file ? '#D1FAE5' : 'var(--color-surface-3)' }}>
                        {file ? '✓' : '↑'}
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

          {/* Step 4 — Review */}
          {step === 'Review' && (
            <div className="space-y-5">
              <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--color-ink)' }}>Review & submit</h2>
              <Section title="Company">
                <Row label="Name"          value={company} />
                {legalName && <Row label="Legal name"    value={legalName} />}
                <Row label="Contact"       value={`${name} · ${email}`} />
                {phone && <Row label="Phone"  value={phone} />}
                {ncr   && <Row label="NCR"    value={ncr} mono />}
              </Section>
              <Section title="Directors">
                {directors.map((d, i) => (
                  <Row key={i} label={`Director ${i + 1}`} value={`${d.name}${d.id_number ? ` · ${d.id_number}` : ''}`} />
                ))}
              </Section>
              <Section title="Documents">
                {REQUIRED_DOCS.map(doc => (
                  <Row key={doc.id} label={doc.label}
                    value={docFiles[doc.id] ? docFiles[doc.id]!.name : doc.required ? '⚠ Missing — required' : 'Not uploaded'}
                    warn={!docFiles[doc.id] && doc.required} />
                ))}
              </Section>
              {error && (
                <p className="text-sm px-4 py-3 rounded-xl" style={{ background: '#FEF2F2', color: '#B91C1C' }}>{error}</p>
              )}
            </div>
          )}
        </div>

        {/* Footer nav */}
        <div className="flex justify-between items-center mt-6">
          <button
            onClick={() => setStep(STEPS[stepIndex - 1] ?? step)}
            disabled={stepIndex === 0}
            className="px-5 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-30"
            style={{ border: '1px solid var(--color-border)', color: 'var(--color-ink-soft)' }}>
            Back
          </button>
          {step !== 'Review' ? (
            <button
              onClick={() => setStep(STEPS[stepIndex + 1] ?? step)}
              disabled={step === 'Details' && (!name.trim() || !company.trim())}
              className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity disabled:opacity-40"
              style={{ background: 'var(--color-brand)' }}>
              Next →
            </button>
          ) : (
            <button
              onClick={submitApplication}
              disabled={saving}
              className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity disabled:opacity-60"
              style={{ background: 'var(--color-brand)' }}>
              {saving ? 'Submitting…' : 'Submit application'}
            </button>
          )}
        </div>
      </div>

      <style>{`
        .o-input {
          width: 100%;
          padding: 10px 14px;
          border-radius: 10px;
          border: 1px solid var(--color-border);
          background: var(--color-surface);
          color: var(--color-ink);
          font-size: 14px;
          outline: none;
          transition: border-color 0.15s;
        }
        .o-input:focus { border-color: var(--color-brand); box-shadow: 0 0 0 3px rgba(124,58,237,0.1); }
        .o-input::placeholder { color: var(--color-ink-muted); }
      `}</style>
    </main>
  );
}

function OField({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--color-ink-soft)' }}>{label}</label>
      {children}
      {hint && <p className="text-xs mt-1" style={{ color: 'var(--color-ink-muted)' }}>{hint}</p>}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--color-ink-muted)' }}>{title}</p>
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>{children}</div>
    </div>
  );
}

function Row({ label, value, mono, warn }: { label: string; value: string; mono?: boolean; warn?: boolean }) {
  return (
    <div className="flex items-start gap-3 px-4 py-2.5" style={{ borderBottom: '1px solid var(--color-border-soft)' }}>
      <span className="text-xs w-32 shrink-0 pt-0.5" style={{ color: 'var(--color-ink-muted)' }}>{label}</span>
      <span className={`text-sm ${mono ? 'font-mono' : ''}`} style={{ color: warn ? '#B91C1C' : 'var(--color-ink)' }}>{value}</span>
    </div>
  );
}
