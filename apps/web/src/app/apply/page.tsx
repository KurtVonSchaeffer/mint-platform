'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2, Users, FileText, CheckCircle2,
  Check, ArrowRight, Upload, X, Shield, Zap, Award, Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlgoLendLogo } from '@/components/AlgoLendLogo';

/* ── Types ──────────────────────────────────────────────────────────── */
type Step = 'details' | 'directors' | 'documents' | 'review' | 'done';
const STEPS: { id: Step; label: string; desc: string; icon: React.ElementType }[] = [
  { id: 'details',   label: 'Company',   desc: 'Business details',   icon: Building2    },
  { id: 'directors', label: 'Directors', desc: 'FICA compliance',    icon: Users        },
  { id: 'documents', label: 'Documents', desc: 'Verification docs',  icon: FileText     },
  { id: 'review',    label: 'Review',    desc: 'Confirm & submit',   icon: CheckCircle2 },
];

const REQUIRED_DOCS = [
  { id: 'cipc_cert',      label: 'CIPC registration certificate', hint: 'Company registration from CIPC',       required: true  },
  { id: 'director_id',    label: 'Director ID copy',              hint: 'Clear copy of SA ID document',         required: true  },
  { id: 'ncr_cert',       label: 'NCR lending licence',           hint: 'NCR certificate for credit providers', required: true  },
  { id: 'bank_statement', label: '3 months bank statements',      hint: 'Business account — last 3 months',     required: true  },
  { id: 'signed_sla',     label: 'Signed service agreement',      hint: 'Upload if signed — we can email it',   required: false },
];

const INDUSTRIES = [
  'Microfinance', 'Retail credit', 'Property finance', 'Vehicle finance',
  'Business lending', 'SMME lending', 'Fintech', 'Other',
];

const VALUE_PROPS = [
  { icon: Clock,  text: 'Go live in 2–3 days from onboarding' },
  { icon: Shield, text: 'NCR & NCA compliant from day one'    },
  { icon: Award,  text: 'Sanlam credit life on every loan'     },
  { icon: Zap,    text: 'Your brand, portal, and domain'      },
];

const TRUST_BADGES = ['256-bit encrypted', 'POPIA compliant', 'SOC 2 ready'];

/* ── Slide variants ─────────────────────────────────────────────────── */
const slide = {
  hidden:  { opacity: 0, x: 24 },
  visible: { opacity: 1, x: 0,   transition: { duration: 0.28, ease: [0.16, 1, 0.3, 1] as const } },
  exit:    { opacity: 0, x: -24, transition: { duration: 0.18 } },
};

/* ── Main component ─────────────────────────────────────────────────── */
export default function ApplyPage() {
  const [step, setStep]     = useState<Step>('details');
  const [error, setError]   = useState('');
  const [saving, setSaving] = useState(false);

  const [token,  setToken]  = useState('');
  const [leadId, setLeadId] = useState('');

  const [name,      setName]      = useState('');
  const [email,     setEmail]     = useState('');
  const [company,   setCompany]   = useState('');
  const [legalName, setLegalName] = useState('');
  const [phone,     setPhone]     = useState('');
  const [ncr,       setNcr]       = useState('');
  const [industry,  setIndustry]  = useState('');

  const [directors, setDirectors] = useState([{ name: '', id_number: '', email: '' }]);
  const [docFiles,  setDocFiles]  = useState<Record<string, File | null>>({});

  const stepIndex = STEPS.findIndex(s => s.id === step);
  const ORDER: Step[] = ['details', 'directors', 'documents', 'review'];
  const navBack = () => { const i = ORDER.indexOf(step); if (i > 0) setStep(ORDER[i - 1]); };
  const navNext = () => { const i = ORDER.indexOf(step); if (i < ORDER.length - 1) setStep(ORDER[i + 1]); };

  function addDirector() { setDirectors(p => [...p, { name: '', id_number: '', email: '' }]); }
  function updateDirector(i: number, k: keyof typeof directors[0], v: string) {
    setDirectors(p => p.map((d, idx) => idx === i ? { ...d, [k]: v } : d));
  }
  function removeDirector(i: number) { setDirectors(p => p.filter((_, idx) => idx !== i)); }
  function setDoc(id: string, file: File | null) { setDocFiles(p => ({ ...p, [id]: file })); }

  async function submitDetails() {
    setError(''); setSaving(true);
    try {
      const res = await fetch('/api/onboard/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, company, phone, ncr, direct: true }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) { setError(json.error ?? 'Something went wrong.'); return; }
      setToken(json.token); setLeadId(json.leadId);
      setStep('directors');
    } catch { setError('Network error. Please try again.'); }
    finally { setSaving(false); }
  }

  async function submitApplication() {
    setError(''); setSaving(true);
    try {
      const res = await fetch(`/api/onboard/${token}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead_id: leadId, name, company, legal_name: legalName, phone, ncr_number: ncr, directors }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error ?? 'Submission failed.'); return; }
      await Promise.allSettled(
        Object.entries(docFiles).filter(([, f]) => f != null).map(([docType, file]) => {
          const fd = new FormData();
          fd.append('token', token); fd.append('doc_type', docType); fd.append('file', file!);
          if (leadId) fd.append('client_id', leadId);
          return fetch(`/api/onboard/${token}/upload`, { method: 'POST', body: fd });
        }),
      );
      setStep('done');
    } catch { setError('Network error. Please try again.'); }
    finally { setSaving(false); }
  }

  /* ── Done screen ──────────────────────────────────────────────────── */
  if (step === 'done') {
    return (
      <main className="min-h-screen flex items-center justify-center px-4" style={{ background: '#F8F9FB' }}>
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-md w-full text-center">
          <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-8"
            style={{ background: 'linear-gradient(135deg,#7C3AED,#9B5CF6)', boxShadow: '0 12px 40px rgba(124,58,237,0.35)' }}>
            <Check size={36} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-3" style={{ color: '#09090B' }}>Application submitted</h1>
          <p className="text-base mb-2" style={{ color: '#52525B' }}>
            Thanks <strong style={{ color: '#09090B' }}>{name}</strong>. We&apos;ll be in touch at
          </p>
          <p className="font-semibold mb-8" style={{ color: '#7C3AED' }}>{email}</p>
          <div className="rounded-2xl p-5 mb-8 text-left" style={{ background: '#fff', border: '1px solid #E4E4E7' }}>
            <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: '#A1A1AA' }}>What happens next</p>
            {['Our team reviews your documents (1 business day)', 'We schedule a 30-min onboarding call', 'Your platform is configured and launched'].map((s, i) => (
              <div key={i} className="flex items-start gap-3 mb-3 last:mb-0">
                <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold"
                  style={{ background: '#F5F3FF', color: '#7C3AED' }}>{i + 1}</div>
                <p className="text-sm" style={{ color: '#27272A' }}>{s}</p>
              </div>
            ))}
          </div>
          <p className="text-sm mb-6" style={{ color: '#71717A' }}>
            Questions? Email{' '}
            <a href="mailto:accounts@algolend.co.za" style={{ color: '#7C3AED', fontWeight: 600 }}>accounts@algolend.co.za</a>
          </p>
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold px-6 py-3 rounded-full text-white"
            style={{ background: 'linear-gradient(135deg,#7C3AED,#9B5CF6)', boxShadow: '0 4px 20px rgba(124,58,237,0.35)' }}>
            Back to AlgoLend <ArrowRight size={14} />
          </Link>
        </motion.div>
      </main>
    );
  }

  /* ── Main layout ──────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen flex">

      {/* ── Left panel ────────────────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[420px] xl:w-[460px] shrink-0 flex-col justify-between p-10 relative overflow-hidden"
        style={{ background: '#0F0A1F' }}>
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 20% 20%, rgba(124,58,237,0.18) 0%, transparent 60%)' }} />

        <div className="relative z-10">
          <Link href="/" className="inline-flex items-center gap-1.5 text-xs font-medium mb-8 transition-colors"
            style={{ color: 'rgba(255,255,255,0.4)' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.8)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.4)')}>
            ← Back to AlgoLend
          </Link>
          <Link href="/" className="flex items-center gap-2.5 mb-14">
            <AlgoLendLogo className="h-8 w-8" white />
            <span className="text-lg font-bold text-white">AlgoLend</span>
          </Link>

          <p className="text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: '#A78BFA' }}>
            Lender onboarding
          </p>
          <h2 className="text-2xl font-bold text-white mb-2 leading-snug">
            Set up your lending operation in days.
          </h2>
          <p className="text-sm mb-10" style={{ color: 'rgba(255,255,255,0.45)' }}>
            Tell us about your business and we&apos;ll configure a fully branded credit platform.
          </p>

          {/* Vertical step tracker */}
          <div className="space-y-0 mb-12">
            {STEPS.map((s, i) => {
              const done   = i < stepIndex;
              const active = s.id === step;
              const Icon   = s.icon;
              return (
                <div key={s.id} className="flex items-start gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all duration-300"
                      style={done
                        ? { background: '#7C3AED', color: '#fff' }
                        : active
                        ? { background: '#7C3AED', boxShadow: '0 0 0 4px rgba(124,58,237,0.25)', color: '#fff' }
                        : { background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.3)' }
                      }>
                      {done ? <Check size={16} /> : <Icon size={16} />}
                    </div>
                    {i < STEPS.length - 1 && (
                      <div className="relative w-px my-1" style={{ height: 40, background: 'rgba(255,255,255,0.08)' }}>
                        {done && (
                          <motion.div
                            initial={{ height: 0 }} animate={{ height: '100%' }}
                            transition={{ duration: 0.3 }}
                            className="absolute top-0 left-0 w-full"
                            style={{ background: '#7C3AED' }}
                          />
                        )}
                      </div>
                    )}
                  </div>
                  <div className="pb-8 last:pb-0 pt-2.5">
                    <p className="text-sm font-semibold leading-none mb-0.5"
                      style={{ color: active ? '#fff' : done ? 'rgba(255,255,255,0.65)' : 'rgba(255,255,255,0.22)' }}>
                      {s.label}
                    </p>
                    <p className="text-xs" style={{ color: active ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.18)' }}>
                      {s.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Value props */}
          <div className="space-y-3">
            {VALUE_PROPS.map(({ icon: Icon, text }, i) => (
              <motion.div key={text} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(124,58,237,0.15)' }}>
                  <Icon size={13} style={{ color: '#A78BFA' }} />
                </div>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.52)' }}>{text}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Trust badges */}
        <div className="relative z-10 pt-8" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <p className="text-[11px] mb-3" style={{ color: 'rgba(255,255,255,0.28)' }}>Trusted &amp; certified</p>
          <div className="flex flex-wrap gap-2">
            {TRUST_BADGES.map(b => (
              <span key={b} className="px-2.5 py-1 rounded-full text-[10px]"
                style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.45)', border: '1px solid rgba(255,255,255,0.09)' }}>
                {b}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right panel (form) ─────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-h-screen overflow-y-auto" style={{ background: '#F8F9FB' }}>

        {/* Mobile header */}
        <div className="lg:hidden flex items-center justify-between px-6 py-4 bg-white border-b border-[#E4E4E7]">
          <Link href="/" className="flex items-center gap-2">
            ← <AlgoLendLogo className="h-7 w-7" />
            <span className="font-bold text-sm" style={{ color: '#09090B' }}>AlgoLend</span>
          </Link>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: '#F5F3FF', color: '#7C3AED' }}>
            Step {stepIndex + 1} / {STEPS.length}
          </span>
        </div>

        {/* Mobile progress */}
        <div className="lg:hidden px-6 pt-5 pb-1">
          <div className="flex gap-1.5">
            {STEPS.map((s, i) => (
              <div key={s.id} className="flex-1 h-1 rounded-full transition-all duration-300"
                style={{ background: i <= stepIndex ? '#7C3AED' : '#E4E4E7' }} />
            ))}
          </div>
        </div>

        <div className="flex-1 flex flex-col justify-center px-6 py-10 lg:px-16 xl:px-24 max-w-2xl w-full mx-auto">

          {/* Step heading */}
          <div className="mb-8">
            <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#A78BFA' }}>
              Step {stepIndex + 1} — {STEPS[stepIndex]?.label}
            </p>
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: '#09090B' }}>
              {step === 'details'   && 'Tell us about your company'}
              {step === 'directors' && 'Add your directors'}
              {step === 'documents' && 'Upload required documents'}
              {step === 'review'    && 'Review your application'}
            </h1>
            <p className="mt-1.5 text-sm" style={{ color: '#71717A' }}>
              {step === 'details'   && 'We need these details to set up your platform and verify your credit business.'}
              {step === 'directors' && 'Required for FICA compliance. Add all registered directors of your company.'}
              {step === 'documents' && 'Files are encrypted and only accessible to Mint Platforms staff for verification.'}
              {step === 'review'    && 'Check everything looks correct before you submit.'}
            </p>
          </div>

          {/* Animated step content */}
          <AnimatePresence mode="wait">
            <motion.div key={step} initial="hidden" animate="visible" exit="exit" variants={slide}>

              {/* ── Step 1: Details ── */}
              {step === 'details' && (
                <div className="space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Contact name" required>
                      <FInput value={name} onChange={setName} placeholder="Jane Smith" />
                    </Field>
                    <Field label="Work email" required>
                      <FInput type="email" value={email} onChange={setEmail} placeholder="jane@company.co.za" />
                    </Field>
                  </div>
                  <Field label="Company trading name" required>
                    <FInput value={company} onChange={setCompany} placeholder="BridgeCapital Finance (Pty) Ltd" />
                  </Field>
                  <Field label="Legal / registered name" hint="Leave blank if same as trading name">
                    <FInput value={legalName} onChange={setLegalName} placeholder="Same as above" />
                  </Field>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Phone number">
                      <FInput type="tel" value={phone} onChange={setPhone} placeholder="+27 82 000 0000" />
                    </Field>
                    <Field label="NCR registration number">
                      <FInput value={ncr} onChange={setNcr} placeholder="NCRCP12345" mono />
                    </Field>
                  </div>
                  <Field label="Industry">
                    <Select value={industry} onValueChange={setIndustry}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select your industry" />
                      </SelectTrigger>
                      <SelectContent>
                        {INDUSTRIES.map(ind => (
                          <SelectItem key={ind} value={ind.toLowerCase().replace(/ /g, '-')}>{ind}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
              )}

              {/* ── Step 2: Directors ── */}
              {step === 'directors' && (
                <div className="space-y-4">
                  {directors.map((d, i) => (
                    <div key={i} className="rounded-2xl p-5"
                      style={{ background: '#fff', border: '1px solid #E4E4E7', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                            style={{ background: '#F5F3FF', color: '#7C3AED' }}>{i + 1}</div>
                          <span className="text-sm font-semibold" style={{ color: '#09090B' }}>Director {i + 1}</span>
                        </div>
                        {directors.length > 1 && (
                          <button onClick={() => removeDirector(i)}
                            className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg"
                            style={{ color: '#71717A', background: '#F4F4F5' }}>
                            <X size={11} /> Remove
                          </button>
                        )}
                      </div>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <Field label="Full name" required>
                            <FInput value={d.name} onChange={v => updateDirector(i, 'name', v)} placeholder="Jane Smith" />
                          </Field>
                          <Field label="SA ID number" hint="13-digit RSA ID" required>
                            <FInput value={d.id_number} onChange={v => updateDirector(i, 'id_number', v)} placeholder="8001015009087" mono maxLength={13} />
                          </Field>
                        </div>
                        <Field label="Email address">
                          <FInput type="email" value={d.email} onChange={v => updateDirector(i, 'email', v)} placeholder="jane@company.co.za" />
                        </Field>
                      </div>
                    </div>
                  ))}
                  <button onClick={addDirector}
                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-semibold"
                    style={{ border: '2px dashed #DDD6FE', color: '#7C3AED', background: 'rgba(124,58,237,0.03)' }}>
                    + Add another director
                  </button>
                </div>
              )}

              {/* ── Step 3: Documents ── */}
              {step === 'documents' && (
                <div className="space-y-3">
                  {REQUIRED_DOCS.map(doc => {
                    const file = docFiles[doc.id] ?? null;
                    return (
                      <label key={doc.id} className="block cursor-pointer">
                        <div className="flex items-center gap-4 px-5 py-4 rounded-2xl border-2 transition-all duration-200"
                          style={file
                            ? { borderColor: '#86EFAC', background: '#F0FDF4' }
                            : { borderColor: '#E4E4E7', background: '#fff' }}>
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                            style={{ background: file ? '#DCFCE7' : '#F5F3FF' }}>
                            {file
                              ? <Check size={18} style={{ color: '#16A34A' }} />
                              : <Upload size={18} style={{ color: '#7C3AED' }} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <p className="text-sm font-semibold" style={{ color: '#09090B' }}>{doc.label}</p>
                              {doc.required && !file && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                                  style={{ background: '#FEF2F2', color: '#DC2626' }}>Required</span>
                              )}
                              {file && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                                  style={{ background: '#DCFCE7', color: '#16A34A' }}>✓ Uploaded</span>
                              )}
                            </div>
                            <p className="text-xs truncate" style={{ color: file ? '#16A34A' : '#A1A1AA' }}>
                              {file ? file.name : doc.hint}
                            </p>
                          </div>
                          {file && (
                            <button type="button" onClick={e => { e.preventDefault(); setDoc(doc.id, null); }}
                              className="text-xs px-2.5 py-1.5 rounded-lg shrink-0"
                              style={{ color: '#71717A', background: '#F4F4F5' }}>
                              Remove
                            </button>
                          )}
                        </div>
                        <input type="file" className="sr-only" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                          onChange={e => { setDoc(doc.id, e.target.files?.[0] ?? null); e.target.value = ''; }} />
                      </label>
                    );
                  })}
                  <p className="text-xs pt-1 px-1" style={{ color: '#A1A1AA' }}>
                    Accepted: PDF, JPG, PNG, Word. Questions? Email <strong>accounts@algolend.co.za</strong>
                  </p>
                </div>
              )}

              {/* ── Step 4: Review ── */}
              {step === 'review' && (
                <div className="space-y-4">
                  <ReviewSection title="Company" onEdit={() => setStep('details')}>
                    <ReviewRow label="Trading name" value={company} />
                    {legalName && <ReviewRow label="Legal name"  value={legalName} />}
                    {industry  && <ReviewRow label="Industry"    value={industry}  />}
                    <ReviewRow label="Contact"     value={`${name} · ${email}`} />
                    {phone && <ReviewRow label="Phone"       value={phone} />}
                    {ncr   && <ReviewRow label="NCR number"  value={ncr} mono />}
                  </ReviewSection>
                  <ReviewSection title="Directors" onEdit={() => setStep('directors')}>
                    {directors.map((d, i) => (
                      <ReviewRow key={i} label={`Director ${i + 1}`}
                        value={`${d.name}${d.id_number ? ` · ${d.id_number}` : ''}`} />
                    ))}
                  </ReviewSection>
                  <ReviewSection title="Documents" onEdit={() => setStep('documents')}>
                    {REQUIRED_DOCS.map(doc => (
                      <ReviewRow key={doc.id} label={doc.label}
                        value={docFiles[doc.id] ? docFiles[doc.id]!.name : doc.required ? '⚠ Missing' : 'Not uploaded'}
                        warn={!docFiles[doc.id] && doc.required} />
                    ))}
                  </ReviewSection>
                </div>
              )}

            </motion.div>
          </AnimatePresence>

          {/* Error */}
          {error && (
            <div className="mt-5 flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm"
              style={{ background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' }}>
              <span className="font-bold">!</span> {error}
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8 pt-6" style={{ borderTop: '1px solid #E4E4E7' }}>
            <Button variant="outline" onClick={navBack} disabled={step === 'details'}
              className="gap-2 rounded-xl border-[#E4E4E7] text-[#52525B] hover:bg-[#F4F4F5] disabled:opacity-0">
              ← Back
            </Button>

            {step === 'details' && (
              <Button onClick={submitDetails} disabled={saving || !name.trim() || !email.trim() || !company.trim()}
                className="gap-2 px-6 rounded-xl text-white font-semibold group"
                style={{ background: 'linear-gradient(135deg,#7C3AED,#9B5CF6)', boxShadow: '0 4px 20px rgba(124,58,237,0.3)', border: 'none' }}>
                {saving ? 'Saving…' : <>Continue <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" /></>}
              </Button>
            )}

            {(step === 'directors' || step === 'documents') && (
              <Button onClick={navNext} className="gap-2 px-6 rounded-xl text-white font-semibold group"
                style={{ background: 'linear-gradient(135deg,#7C3AED,#9B5CF6)', boxShadow: '0 4px 20px rgba(124,58,237,0.3)', border: 'none' }}>
                Continue <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
              </Button>
            )}

            {step === 'review' && (
              <Button onClick={submitApplication} disabled={saving} className="gap-2 px-6 rounded-xl text-white font-semibold"
                style={{ background: 'linear-gradient(135deg,#7C3AED,#9B5CF6)', boxShadow: '0 4px 20px rgba(124,58,237,0.3)', border: 'none' }}>
                {saving ? 'Submitting…' : 'Submit application'}
              </Button>
            )}
          </div>

          <p className="text-center text-xs mt-6" style={{ color: '#A1A1AA' }}>
            By applying you agree to our{' '}
            <Link href="/terms" style={{ color: '#7C3AED' }}>Terms</Link> and{' '}
            <Link href="/privacy" style={{ color: '#7C3AED' }}>Privacy Policy</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ── Input ──────────────────────────────────────────────────────────── */
function FInput({ value, onChange, placeholder, type = 'text', mono, maxLength }:
  { value: string; onChange: (v: string) => void; placeholder?: string; type?: string; mono?: boolean; maxLength?: number }) {
  return (
    <input type={type} value={value} onChange={e => onChange(e.target.value)}
      placeholder={placeholder} maxLength={maxLength}
      className="w-full px-3.5 py-2.5 rounded-xl border-[1.5px] border-[#E4E4E7] bg-white text-sm text-[#09090B] outline-none transition-all placeholder:text-[#A1A1AA]"
      style={{ fontFamily: mono ? 'monospace' : 'inherit' }}
      onFocus={e => { e.target.style.borderColor = '#7C3AED'; e.target.style.boxShadow = '0 0 0 3px rgba(124,58,237,0.12)'; }}
      onBlur={e => { e.target.style.borderColor = '#E4E4E7'; e.target.style.boxShadow = 'none'; }}
    />
  );
}

/* ── Field ──────────────────────────────────────────────────────────── */
function Field({ label, hint, required, children }: { label: string; hint?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <Label className="block text-xs font-semibold mb-1.5 text-[#52525B]">
        {label}{required && <span style={{ color: '#7C3AED', marginLeft: 3 }}>*</span>}
      </Label>
      {children}
      {hint && <p className="text-xs mt-1" style={{ color: '#A1A1AA' }}>{hint}</p>}
    </div>
  );
}

/* ── Review helpers ─────────────────────────────────────────────────── */
function ReviewSection({ title, onEdit, children }: { title: string; onEdit: () => void; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: '#fff', border: '1px solid #E4E4E7' }}>
      <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: '1px solid #F4F4F5' }}>
        <p className="text-xs font-bold uppercase tracking-wider" style={{ color: '#A1A1AA' }}>{title}</p>
        <button onClick={onEdit} className="text-xs font-semibold" style={{ color: '#7C3AED' }}>Edit</button>
      </div>
      {children}
    </div>
  );
}

function ReviewRow({ label, value, mono, warn }: { label: string; value: string; mono?: boolean; warn?: boolean }) {
  return (
    <div className="flex items-start gap-4 px-5 py-3" style={{ borderBottom: '1px solid #F4F4F5' }}>
      <span className="text-xs w-40 shrink-0 pt-0.5" style={{ color: '#A1A1AA' }}>{label}</span>
      <span className="text-sm flex-1"
        style={{ color: warn ? '#DC2626' : '#09090B', fontFamily: mono ? 'monospace' : 'inherit' }}>
        {value}
      </span>
    </div>
  );
}
