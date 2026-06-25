'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import {
  Check, ArrowRight, Shield, Zap, FileText, PenLine, Calculator,
  LayoutDashboard, CreditCard, FolderOpen, MessageSquare, Bell,
  User, HelpCircle, LogOut, TrendingUp, Clock, CheckCircle,
  Users, DollarSign, Activity, Settings, BarChart3, ChevronRight,
  Building2, AlertCircle,
} from 'lucide-react';

/* ─── NCA ───────────────────────────────────────────────────── */
function calcQuote(amount: number, term: number) {
  const r = 0.27 / 12;
  const base = amount * r / (1 - Math.pow(1 + r, -term));
  const init = Math.min(1207.50, amount * 0.15 * 1.15);
  const svc = 69;
  return {
    principal:  amount,
    initFee:    Math.round(init * 100) / 100,
    instalment: Math.round((base + svc + init / term) * 100) / 100,
    total:      Math.round((base * term + init + svc * term) * 100) / 100,
    term,
  };
}
const R = (n: number) => `R ${n.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/* ─── Processing ─────────────────────────────────────────────── */
function Processing({ title, checks, onDone }: {
  title: string; checks: { label: string; delay: number }[]; onDone: () => void;
}) {
  const [done, setDone] = useState<Set<number>>(new Set());
  useEffect(() => {
    const ts: ReturnType<typeof setTimeout>[] = [];
    checks.forEach((c, i) => ts.push(setTimeout(() => setDone(p => new Set([...p, i])), c.delay)));
    ts.push(setTimeout(onDone, Math.max(...checks.map(c => c.delay)) + 800));
    return () => ts.forEach(clearTimeout);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className="space-y-3 py-2">
      <p className="text-sm font-bold text-slate-800 mb-4">{title}</p>
      {checks.map((c, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all"
          style={{ background: done.has(i) ? 'rgba(16,185,129,0.06)' : '#f8fafc', border: `1px solid ${done.has(i) ? 'rgba(16,185,129,0.3)' : '#e2e8f0'}` }}>
          <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
            style={{ background: done.has(i) ? '#10b981' : '#e2e8f0' }}>
            {done.has(i)
              ? <Check size={10} color="#fff" strokeWidth={3} />
              : <span className="w-2.5 h-2.5 rounded-full border-2 border-slate-300 border-t-slate-500 animate-spin block" />}
          </div>
          <span className="text-xs font-medium" style={{ color: done.has(i) ? '#10b981' : '#64748b' }}>{c.label}</span>
        </div>
      ))}
    </div>
  );
}

/* ─── Apply wizard ────────────────────────────────────────────── */
type BStep = 'personal' | 'employment' | 'loan' | 'kyc' | 'bureau' | 'quote' | 'sign' | 'done';
const B_ORDER: BStep[] = ['personal', 'employment', 'loan', 'kyc', 'bureau', 'quote', 'sign', 'done'];
const B_STEPS = [
  { id: 'personal', label: 'Personal' }, { id: 'employment', label: 'Employment' },
  { id: 'loan', label: 'Loan' }, { id: 'kyc', label: 'KYC' },
  { id: 'bureau', label: 'Bureau' }, { id: 'quote', label: 'Quote' }, { id: 'sign', label: 'Sign' },
];

function ApplyWizard({ onBack }: { onBack?: () => void }) {
  const [step, setStep] = useState<BStep>('personal');
  const [signed, setSigned] = useState(false);
  const [firstName, setFirstName] = useState('John');
  const [lastName,  setLastName]  = useState('Demo');
  const [income,    setIncome]    = useState(25000);
  const [expenses,  setExpenses]  = useState(9800);
  const [amount,    setAmount]    = useState(15000);
  const [term,      setTerm]      = useState(24);
  const [purpose,   setPurpose]   = useState('Home improvement');

  const q = useMemo(() => calcQuote(amount, term), [amount, term]);
  const disposable = income - expenses;
  const pass = disposable * 0.35 >= q.instalment;
  const si = B_STEPS.findIndex(s => s.id === step);

  const next = () => { const i = B_ORDER.indexOf(step); if (i < B_ORDER.length - 1) setStep(B_ORDER[i + 1]); };
  const back = () => { const i = B_ORDER.indexOf(step); if (i > 0) setStep(B_ORDER[i - 1]); else onBack?.(); };

  const inp = "w-full px-3 py-2.5 rounded-xl text-sm border text-slate-800 bg-slate-50 outline-none transition-all";
  const foc = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => { e.currentTarget.style.borderColor = '#7C3AED'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(124,58,237,0.1)'; };
  const blr = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.boxShadow = 'none'; };
  const lbl = (t: string) => <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5 text-slate-400">{t}</label>;

  if (step === 'done') return (
    <div className="flex flex-col items-center text-center py-6 gap-4">
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-emerald-50">
        <Check size={24} className="text-emerald-500" />
      </div>
      <div>
        <p className="text-lg font-bold text-slate-900 mb-1">Loan approved &amp; disbursed</p>
        <p className="text-sm text-slate-500"><strong className="text-slate-800">R15,000</strong> in {firstName}&apos;s account within 2 hours.</p>
      </div>
      <div className="w-full rounded-xl p-4 text-left space-y-2 border border-slate-200 bg-slate-50">
        {[['Reference','BC-2026-00412'],['Monthly instalment',R(q.instalment)],['First debit','1 Jul 2026'],['Account','**** 1234']].map(([k,v]) => (
          <div key={k} className="flex justify-between text-sm">
            <span className="text-slate-400">{k}</span><span className="font-semibold text-slate-800">{v}</span>
          </div>
        ))}
      </div>
      <button onClick={() => { setStep('personal'); setSigned(false); onBack?.(); }}
        className="text-sm px-4 py-2 rounded-xl border border-slate-200 text-slate-500 hover:border-slate-300 transition-colors">
        ← Back to dashboard
      </button>
    </div>
  );

  return (
    <div>
      <div className="flex items-center gap-1 mb-5 overflow-x-auto">
        {B_STEPS.map((s, i) => (
          <div key={s.id} className="flex items-center gap-1 shrink-0">
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                style={s.id === step ? { background: '#7C3AED', color: '#fff' } : i < si ? { background: '#dcfce7', color: '#16a34a' } : { background: '#f1f5f9', color: '#94a3b8' }}>
                {i < si ? '✓' : i + 1}
              </div>
              <span className="text-[11px] font-medium hidden sm:inline" style={{ color: s.id === step ? '#0f172a' : '#94a3b8' }}>{s.label}</span>
            </div>
            {i < B_STEPS.length - 1 && <div className="w-3 h-px mx-0.5 bg-slate-200" />}
          </div>
        ))}
      </div>

      <div className="space-y-4">
        {step === 'personal' && (<>
          <p className="text-sm font-bold text-slate-900">Personal details</p>
          <div className="grid grid-cols-2 gap-3">
            <div>{lbl('First name')}<input value={firstName} onChange={e=>setFirstName(e.target.value)} className={inp} style={{ borderColor: '#e2e8f0' }} onFocus={foc} onBlur={blr} /></div>
            <div>{lbl('Last name')}<input value={lastName} onChange={e=>setLastName(e.target.value)} className={inp} style={{ borderColor: '#e2e8f0' }} onFocus={foc} onBlur={blr} /></div>
          </div>
          <div>{lbl('SA ID number')}<input defaultValue="8001015009087" maxLength={13} className={inp} style={{ borderColor: '#e2e8f0' }} onFocus={foc} onBlur={blr} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div>{lbl('Phone')}<input defaultValue="+27 82 000 1234" className={inp} style={{ borderColor: '#e2e8f0' }} onFocus={foc} onBlur={blr} /></div>
            <div>{lbl('Email')}<input defaultValue="john@example.co.za" className={inp} style={{ borderColor: '#e2e8f0' }} onFocus={foc} onBlur={blr} /></div>
          </div>
          <div className="flex items-start gap-2 p-3 rounded-xl bg-violet-50 border border-violet-100">
            <Shield size={11} className="text-violet-500 mt-0.5 shrink-0" />
            <span className="text-xs text-violet-700">ID verified against Home Affairs DHA population register</span>
          </div>
        </>)}

        {step === 'employment' && (<>
          <p className="text-sm font-bold text-slate-900">Employment &amp; income</p>
          <div>{lbl('Employer')}<input defaultValue="Demo Retail (Pty) Ltd" className={inp} style={{ borderColor: '#e2e8f0' }} onFocus={foc} onBlur={blr} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div>{lbl('Gross monthly (R)')}<input type="number" value={income} onChange={e=>setIncome(+e.target.value)} className={inp} style={{ borderColor: '#e2e8f0' }} onFocus={foc} onBlur={blr} /></div>
            <div>{lbl('Monthly expenses (R)')}<input type="number" value={expenses} onChange={e=>setExpenses(+e.target.value)} className={inp} style={{ borderColor: '#e2e8f0' }} onFocus={foc} onBlur={blr} /></div>
          </div>
          <div className="rounded-xl p-4 space-y-2 bg-slate-50 border border-slate-200">
            {[['Disposable income', R(Math.max(0,disposable)) + '/mo'], ['NCA max instalment (35%)', R(Math.max(0, disposable * 0.35)) + '/mo']].map(([k,v]) => (
              <div key={k} className="flex justify-between text-sm"><span className="text-slate-400">{k}</span><span className="font-semibold text-violet-700">{v}</span></div>
            ))}
          </div>
        </>)}

        {step === 'loan' && (<>
          <p className="text-sm font-bold text-slate-900">Loan details</p>
          <div>
            {lbl(`Loan amount: ${R(amount)}`)}
            <input type="range" min={1000} max={50000} step={500} value={amount} onChange={e=>setAmount(+e.target.value)} className="w-full accent-[#7C3AED]" />
            <div className="flex justify-between text-[11px] mt-1 text-slate-400"><span>R 1,000</span><span>R 50,000</span></div>
          </div>
          <div>
            {lbl('Repayment term')}
            <div className="flex gap-2 flex-wrap">
              {[6,12,18,24,36,48].map(t => (
                <button key={t} onClick={()=>setTerm(t)} className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={t===term ? { background:'#7C3AED', color:'#fff' } : { background:'#f1f5f9', color:'#475569' }}>{t}m</button>
              ))}
            </div>
          </div>
          <div>
            {lbl('Purpose')}
            <select value={purpose} onChange={e=>setPurpose(e.target.value)} className={inp} style={{ borderColor: '#e2e8f0', fontFamily:'inherit' }} onFocus={foc} onBlur={blr}>
              {['Home improvement','Debt consolidation','Education','Medical','Business capital','Other'].map(o => <option key={o}>{o}</option>)}
            </select>
          </div>
          <div className="rounded-xl p-4 bg-violet-50 border border-violet-100">
            <div className="flex items-center gap-2 mb-2"><Zap size={11} className="text-violet-500" /><p className="text-[10px] font-bold uppercase tracking-wider text-violet-600">Live NCA estimate</p></div>
            <div className="flex justify-between items-baseline">
              <span className="text-sm text-slate-500">Monthly instalment</span>
              <span className="text-xl font-bold text-violet-700">{R(q.instalment)}</span>
            </div>
            <div className="flex justify-between text-xs mt-1 text-slate-400"><span>27% p.a.</span><span>Total: {R(q.total)}</span></div>
          </div>
        </>)}

        {step === 'kyc' && <Processing title="Identity verification" onDone={next} checks={[
          { label: 'SA ID number validated (Luhn check)', delay: 600 },
          { label: 'Liveness check — face match complete', delay: 1400 },
          { label: 'Home Affairs DHA — population register ✓', delay: 2400 },
          { label: 'Watchlist / PEPs / sanctions — clear ✓', delay: 3200 },
          { label: 'Address verification — confirmed ✓', delay: 4000 },
        ]} />}

        {step === 'bureau' && <Processing title="Credit bureau pull" onDone={next} checks={[
          { label: 'Experian enquiry submitted', delay: 500 },
          { label: 'Credit history retrieved', delay: 1200 },
          { label: 'Affordability assessment complete', delay: 2200 },
          { label: 'NCA compliance check — passed ✓', delay: 3000 },
        ]} />}

        {step === 'quote' && (<>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: pass ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)' }}>
              <span className={pass ? 'text-emerald-600' : 'text-red-500'}>{pass ? '✓' : '!'}</span>
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">{pass ? 'Pre-approved' : 'Refer for review'}</p>
              <p className="text-xs text-slate-500">{pass ? 'NCA affordability check passed.' : 'Instalment exceeds 35% of disposable income.'}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 rounded-xl p-4 bg-slate-50 border border-slate-200">
            <div className="w-12 h-12 rounded-full flex items-center justify-center font-bold shrink-0 text-violet-700 text-base"
              style={{ background: 'rgba(124,58,237,0.08)', border: '2px solid rgba(124,58,237,0.2)' }}>642</div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Credit score — Good</p>
              <p className="text-xs text-slate-400">Experian · 18 Jun 2026 · No adverse listings</p>
            </div>
          </div>
          <div className="rounded-xl overflow-hidden border border-slate-200">
            <div className="px-4 py-2 bg-slate-50 border-b border-slate-200">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">NCA Pre-Agreement Quotation — Section 92</p>
            </div>
            {[['Applicant',`${firstName} ${lastName}`],['Principal debt',R(q.principal)],['Initiation fee (incl. VAT)',R(q.initFee)],['Interest rate','27% p.a.'],['Term',`${q.term} months`],['Monthly instalment',R(q.instalment),true],['Total repayable',R(q.total),true]].map(([k,v,bold]) => (
              <div key={String(k)} className="flex justify-between px-4 py-2.5 border-b border-slate-50 last:border-0">
                <span className="text-xs text-slate-400">{k}</span>
                <span className={`text-xs ${bold ? 'font-bold text-slate-900' : 'text-slate-600'}`}>{v}</span>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {['ID verified','Liveness passed','Bureau pulled','Watchlist clear','Affordability ✓'].map(c => (
              <span key={c} className="flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                <Check size={8} /> {c}
              </span>
            ))}
          </div>
        </>)}

        {step === 'sign' && (<>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-violet-50"><PenLine size={15} className="text-violet-600" /></div>
            <div>
              <p className="text-sm font-bold text-slate-900">Sign your loan agreement</p>
              <p className="text-xs text-slate-400">Review and accept — legally binding under the ECA</p>
            </div>
          </div>
          <div className="rounded-xl p-4 space-y-2 bg-slate-50 border border-slate-200">
            <div className="flex items-center gap-2 mb-2"><FileText size={12} className="text-slate-400" /><p className="text-xs font-semibold text-slate-800">Loan Agreement BC-2026-00412</p></div>
            {[`This credit agreement is entered into between Zwane Capital (Pty) Ltd and ${firstName} ${lastName} under the National Credit Act 34 of 2005.`,
              `The Lender advances ${R(q.principal)} to the Borrower, repayable over ${q.term} months in instalments of ${R(q.instalment)}.`,
              `Interest: 27% per annum (simple). Early settlement permitted with settlement statement.`
            ].map((t, i) => <p key={i} className="text-xs leading-relaxed text-slate-500">{t}</p>)}
          </div>
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={signed} onChange={e => setSigned(e.target.checked)} className="mt-0.5 w-4 h-4 accent-[#7C3AED]" />
            <span className="text-xs text-slate-500">I have read the pre-agreement quotation and credit agreement, and accept the terms.</span>
          </label>
        </>)}
      </div>

      {step !== 'kyc' && step !== 'bureau' && (
        <div className="flex justify-between items-center mt-5 pt-5 border-t border-slate-100">
          <button onClick={back} className="px-4 py-2 rounded-xl text-xs font-medium border border-slate-200 text-slate-500 hover:border-slate-300 transition-colors">← Back</button>
          {step === 'sign'
            ? <button onClick={next} disabled={!signed} className="px-5 py-2 rounded-xl text-xs font-bold text-white disabled:opacity-40" style={{ background: 'linear-gradient(135deg,#7C3AED,#9B5CF6)', boxShadow: '0 4px 16px rgba(124,58,237,0.3)' }}>Accept &amp; submit →</button>
            : <button onClick={next} className="px-5 py-2 rounded-xl text-xs font-bold text-white" style={{ background: '#7C3AED' }}>{step === 'loan' ? 'Run checks →' : step === 'quote' ? 'Accept quote →' : 'Next →'}</button>
          }
        </div>
      )}
    </div>
  );
}

/* ─── Borrower portal sidebar ────────────────────────────────── */
const BRAND = '#7C3AED';

const clientNav = [
  { id: 'dashboard',     label: 'Dashboard',      Icon: LayoutDashboard, color: BRAND      },
  { id: 'calculator',    label: 'Loan Calculator', Icon: Calculator,      color: '#3b82f6'  },
  { id: 'apply',         label: 'Apply for Loan',  Icon: FileText,        color: '#10b981'  },
  { id: 'loans',         label: 'My Loans',        Icon: CreditCard,      color: '#f59e0b'  },
  { id: 'documents',     label: 'Documents',       Icon: FolderOpen,      color: '#8b5cf6'  },
  { id: 'messages',      label: 'Messages',        Icon: MessageSquare,   color: '#06b6d4'  },
  { id: 'notifications', label: 'Notifications',   Icon: Bell,            color: '#ec4899'  },
  { id: 'profile',       label: 'Profile',         Icon: User,            color: '#0ea5e9'  },
  { id: 'support',       label: 'Support',         Icon: HelpCircle,      color: '#64748b'  },
];

function PortalSidebar({ active, onSelect }: { active: string; onSelect: (id: string) => void }) {
  return (
    <aside className="w-56 shrink-0 flex flex-col h-full" style={{ background: '#fff', borderRight: '1px solid rgba(0,0,0,0.06)', boxShadow: '4px 0 20px rgba(0,0,0,0.03)' }}>
      <div className="flex items-center h-14 px-4 shrink-0" style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-white text-xs" style={{ background: BRAND }}>A</div>
          <span className="text-sm font-bold text-slate-900">AlgoLend</span>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
        {clientNav.map(item => {
          const isActive = active === item.id;
          return (
            <button key={item.id} onClick={() => onSelect(item.id)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left"
              style={isActive ? { background: 'rgba(124,58,237,0.08)', color: BRAND, boxShadow: 'inset 0 0 0 1px rgba(124,58,237,0.15)' } : { color: '#475569' }}>
              <span className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: isActive ? 'rgba(124,58,237,0.12)' : 'rgba(0,0,0,0.04)', color: isActive ? BRAND : item.color }}>
                <item.Icon size={14} />
              </span>
              <span style={{ color: isActive ? BRAND : '#475569', fontWeight: isActive ? 600 : 500 }}>{item.label}</span>
            </button>
          );
        })}
      </nav>
      <div className="p-3 shrink-0" style={{ borderTop: '1px solid rgba(0,0,0,0.05)' }}>
        <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl mb-1" style={{ background: 'rgba(0,0,0,0.03)' }}>
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0" style={{ background: BRAND }}>J</div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-900 truncate">John Demo</p>
            <p className="text-[10px] text-slate-400">Borrower</p>
          </div>
        </div>
        <button className="flex items-center gap-2 w-full px-3 py-1.5 rounded-xl text-xs text-slate-400 hover:text-red-400 hover:bg-red-50 transition-colors">
          <LogOut size={12} /> Sign Out
        </button>
        <p className="text-center mt-2 text-[9px] text-slate-300">Powered by <strong className="text-slate-400">Mint Platforms</strong></p>
      </div>
    </aside>
  );
}

function StatCard({ label, value, sub, Icon, accent = 'brand' }: {
  label: string; value: string; sub?: string; Icon: React.ElementType; accent?: 'brand'|'success'|'warning'|'info';
}) {
  const a = { brand: { bg: 'rgba(124,58,237,0.08)', color: BRAND }, success: { bg: 'rgba(16,185,129,0.08)', color: '#10b981' }, warning: { bg: 'rgba(245,158,11,0.08)', color: '#f59e0b' }, info: { bg: 'rgba(59,130,246,0.08)', color: '#3b82f6' } }[accent];
  return (
    <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: a.bg, color: a.color }}><Icon size={16} /></div>
      <p className="text-2xl font-bold text-slate-900 tracking-tight leading-none">{value}</p>
      <p className="text-sm text-slate-500 mt-1.5">{label}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

const CL_RATE = 9; // R9 per R1,000 of outstanding balance

function calcCreditLifeSchedule(principal: number, term: number) {
  const r = 0.27 / 12;
  const base = principal * r / (1 - Math.pow(1 + r, -term));
  const rows: { month: number; balance: number; clPremium: number }[] = [];
  let balance = principal;
  for (let m = 1; m <= term; m++) {
    const interest = balance * r;
    const principalPaid = base - interest;
    const clPremium = Math.round((balance / 1000) * CL_RATE * 100) / 100;
    rows.push({ month: m, balance: Math.round(balance * 100) / 100, clPremium });
    balance = Math.max(0, balance - principalPaid);
  }
  return rows;
}

function CalculatorPage() {
  const [amt, setAmt] = useState(20000);
  const [trm, setTrm] = useState(24);
  const [showSchedule, setShowSchedule] = useState(false);
  const q = useMemo(() => calcQuote(amt, trm), [amt, trm]);
  const clSchedule = useMemo(() => calcCreditLifeSchedule(amt, trm), [amt, trm]);
  const totalCL = useMemo(() => clSchedule.reduce((s, r) => s + r.clPremium, 0), [clSchedule]);
  const firstCL = clSchedule[0]?.clPremium ?? 0;
  const lastCL  = clSchedule[clSchedule.length - 1]?.clPremium ?? 0;

  // Show at most 6 evenly-spaced rows in the preview
  const previewRows = useMemo(() => {
    if (clSchedule.length <= 6) return clSchedule;
    const step = Math.floor(clSchedule.length / 5);
    const indices = [0, step, step*2, step*3, step*4, clSchedule.length - 1];
    return indices.map(i => clSchedule[i]);
  }, [clSchedule]);

  return (
    <div className="space-y-5 max-w-lg">
      <div><h1 className="text-xl font-bold text-slate-900">Loan Calculator</h1><p className="text-sm text-slate-500 mt-0.5">Estimate your monthly repayment under the NCA — including credit life cover.</p></div>

      <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6 space-y-5">
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Loan amount: {R(amt)}</label>
          <input type="range" min={1000} max={100000} step={500} value={amt} onChange={e=>setAmt(+e.target.value)} className="w-full accent-[#7C3AED]" />
          <div className="flex justify-between text-[11px] mt-1 text-slate-400"><span>R 1,000</span><span>R 100,000</span></div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Repayment term</label>
          <div className="flex gap-2 flex-wrap">
            {[6,12,18,24,36,48,60].map(t=>(
              <button key={t} onClick={()=>setTrm(t)} className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                style={t===trm?{background:BRAND,color:'#fff'}:{background:'#f1f5f9',color:'#475569'}}>{t}m</button>
            ))}
          </div>
        </div>
        <div className="rounded-xl p-4 bg-violet-50 border border-violet-100 space-y-2">
          {[['Monthly instalment',R(q.instalment),true],['Total repayable',R(q.total),false],['Interest rate','27% p.a. (NCA max)',false]].map(([k,v,big])=>(
            <div key={String(k)} className="flex justify-between">
              <span className="text-xs text-slate-500">{k}</span>
              <span className={big ? 'text-lg font-bold text-violet-700' : 'text-xs font-semibold text-slate-700'}>{v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Credit life section */}
      <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid #f1f5f9' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(20,184,166,0.1)' }}>
              <Shield size={13} className="text-teal-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">Credit life cover</p>
              <p className="text-[10px] text-slate-400">R{CL_RATE}/R1,000 outstanding balance · decreases monthly</p>
            </div>
          </div>
          <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-full bg-teal-50 text-teal-700 border border-teal-200">FSCA Approved</span>
        </div>

        <div className="px-5 py-4 grid grid-cols-3 gap-3">
          {[
            { label: 'Month 1 premium', value: R(firstCL) },
            { label: `Month ${trm} premium`, value: R(lastCL) },
            { label: 'Total cover cost', value: R(Math.round(totalCL * 100) / 100) },
          ].map(s => (
            <div key={s.label} className="text-center rounded-xl p-3 bg-slate-50 border border-slate-100">
              <p className="text-sm font-bold text-slate-800">{s.value}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Schedule preview */}
        <div className="px-5 pb-4">
          <button onClick={() => setShowSchedule(v => !v)} className="text-xs font-semibold text-teal-600 hover:text-teal-700 transition-colors mb-3">
            {showSchedule ? '▲ Hide schedule' : '▼ Show monthly schedule'}
          </button>
          {showSchedule && (
            <div className="rounded-xl overflow-hidden border border-slate-200">
              <div className="grid grid-cols-3 px-4 py-2 bg-slate-50 border-b border-slate-200">
                {['Month', 'Balance', 'CL Premium'].map(h => (
                  <p key={h} className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{h}</p>
                ))}
              </div>
              {(showSchedule ? clSchedule : previewRows).map(row => (
                <div key={row.month} className="grid grid-cols-3 px-4 py-2 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
                  <p className="text-xs text-slate-500">{row.month}</p>
                  <p className="text-xs text-slate-700">{R(row.balance)}</p>
                  <p className="text-xs font-semibold text-teal-700">{R(row.clPremium)}</p>
                </div>
              ))}
            </div>
          )}
          {!showSchedule && (
            <div className="rounded-xl overflow-hidden border border-slate-200">
              <div className="grid grid-cols-3 px-4 py-2 bg-slate-50 border-b border-slate-200">
                {['Month', 'Balance', 'CL Premium'].map(h => (
                  <p key={h} className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{h}</p>
                ))}
              </div>
              {previewRows.map(row => (
                <div key={row.month} className="grid grid-cols-3 px-4 py-2 border-b border-slate-50 last:border-0">
                  <p className="text-xs text-slate-500">{row.month}</p>
                  <p className="text-xs text-slate-700">{R(row.balance)}</p>
                  <p className="text-xs font-semibold text-teal-700">{R(row.clPremium)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyPage({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-slate-900">{title}</h1>
      <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-12 text-center">
        <div className="w-10 h-10 mx-auto mb-3 rounded-2xl bg-slate-100 flex items-center justify-center"><FileText size={16} className="text-slate-400"/></div>
        <p className="text-sm font-semibold text-slate-600 mb-1">{sub}</p>
        <p className="text-xs text-slate-400">This section is active in the full portal.</p>
      </div>
    </div>
  );
}

/* ─── Admin / Lender dashboard ───────────────────────────────── */
const adminNav = [
  { id: 'dashboard',    label: 'Dashboard',     Icon: LayoutDashboard },
  { id: 'applications', label: 'Applications',  Icon: FileText        },
  { id: 'clients',      label: 'Clients',       Icon: Users           },
  { id: 'portfolio',    label: 'Portfolio',     Icon: BarChart3       },
  { id: 'compliance',   label: 'Compliance',    Icon: Shield          },
  { id: 'settings',     label: 'Settings',      Icon: Settings        },
];

const APPLICATIONS = [
  { name: 'Sipho Dlamini',   amount: 'R 12,000', score: 681, status: 'Pending review',  badge: 'yellow' },
  { name: 'Amara Nkosi',     amount: 'R 25,000', score: 714, status: 'Approved',         badge: 'green'  },
  { name: 'Thabo Mokoena',   amount: 'R 8,500',  score: 592, status: 'Referred',         badge: 'orange' },
  { name: 'Lindiwe Zulu',    amount: 'R 18,000', score: 741, status: 'Approved',         badge: 'green'  },
  { name: 'Kagiso Sithole',  amount: 'R 5,000',  score: 638, status: 'Pending review',  badge: 'yellow' },
];

const BADGE: Record<string, { bg: string; color: string }> = {
  green:  { bg: 'rgba(16,185,129,0.1)',  color: '#10b981' },
  yellow: { bg: 'rgba(245,158,11,0.1)',  color: '#d97706' },
  orange: { bg: 'rgba(239,68,68,0.08)',  color: '#ef4444' },
};

function AdminDashboard({ adminPage, setAdminPage }: { adminPage: string; setAdminPage: (p: string) => void }) {
  return (
    <>
      {adminPage === 'dashboard' && (
        <div className="space-y-5">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-xl font-bold text-slate-900">Lender dashboard</h1>
              <p className="text-slate-500 mt-0.5 text-sm">Zwane Capital (Pty) Ltd — June 2026</p>
            </div>
            <button onClick={() => setAdminPage('applications')} className="px-3 py-2 rounded-xl text-xs font-bold text-white flex items-center gap-1.5" style={{ background: BRAND }}>
              Review applications <ChevronRight size={12} />
            </button>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard label="Active clients"     value="47"          sub="↑ 4 this month"       Icon={Users}       accent="brand"   />
            <StatCard label="Loan book"          value="R 1.2M"      sub="Avg. R 25,500"        Icon={DollarSign}  accent="info"    />
            <StatCard label="Pending review"     value="5"           sub="Avg. 4h to decision"  Icon={Clock}       accent="warning" />
            <StatCard label="Collection rate"    value="94.2%"       sub="↑ 1.1% vs last month" Icon={TrendingUp}  accent="success" />
          </div>
          <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-800">Recent applications</p>
              <button onClick={() => setAdminPage('applications')} className="text-xs text-violet-600 font-medium hover:underline">View all →</button>
            </div>
            <div className="divide-y divide-slate-50">
              {APPLICATIONS.slice(0, 3).map(a => (
                <div key={a.name} className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0" style={{ background: BRAND }}>{a.name[0]}</div>
                    <div>
                      <p className="text-xs font-semibold text-slate-800">{a.name}</p>
                      <p className="text-[10px] text-slate-400">{a.amount} · Score {a.score}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full" style={{ background: BADGE[a.badge].bg, color: BADGE[a.badge].color }}>{a.status}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-5">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">NCA compliance</p>
              {[['Affordability assessments','100%','green'],['Sec 92 quotations issued','100%','green'],['Overdue SACRRA reports','0','green'],['NCR registration','Active','green']].map(([k,v,c]) => (
                <div key={k} className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0">
                  <span className="text-xs text-slate-500">{k}</span>
                  <span className="text-xs font-semibold" style={{ color: BADGE[c].color }}>{v}</span>
                </div>
              ))}
            </div>
            <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-5">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">This month</p>
              {[['Applications received','18'],['Approved','12'],['Declined / referred','6'],['Total disbursed','R 286,000']].map(([k,v]) => (
                <div key={k} className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0">
                  <span className="text-xs text-slate-500">{k}</span>
                  <span className="text-xs font-bold text-slate-800">{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {adminPage === 'applications' && (
        <div className="space-y-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Applications</h1>
            <p className="text-sm text-slate-500 mt-0.5">5 pending · 2 awaiting signature</p>
          </div>
          <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
            <div className="divide-y divide-slate-100">
              {APPLICATIONS.map(a => (
                <div key={a.name} className="flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-white text-sm shrink-0" style={{ background: BRAND }}>{a.name[0]}</div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{a.name}</p>
                      <p className="text-xs text-slate-400">{a.amount} requested · Credit score {a.score}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full" style={{ background: BADGE[a.badge].bg, color: BADGE[a.badge].color }}>{a.status}</span>
                    {a.badge === 'yellow' && (
                      <div className="flex gap-1.5">
                        <button className="px-2.5 py-1 rounded-lg text-[10px] font-bold text-white" style={{ background: '#10b981' }}>Approve</button>
                        <button className="px-2.5 py-1 rounded-lg text-[10px] font-medium border border-slate-200 text-slate-500">Decline</button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {adminPage === 'clients' && (
        <div className="space-y-4">
          <h1 className="text-xl font-bold text-slate-900">Clients</h1>
          <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
            {[
              { name: 'Amara Nkosi',    loan: 'R 25,000', next: 'R 1,204.50 · 1 Jul', status: 'Current' },
              { name: 'Lindiwe Zulu',   loan: 'R 18,000', next: 'R 867.20 · 1 Jul',   status: 'Current' },
              { name: 'Bongani Cele',   loan: 'R 9,500',  next: 'R 456.80 · 1 Jul',   status: 'Current' },
              { name: 'Nomsa Khumalo',  loan: 'R 30,000', next: 'R 1,441.60 · 1 Jul', status: '3 days overdue' },
            ].map(c => (
              <div key={c.name} className="flex items-center justify-between px-5 py-4 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-sm shrink-0" style={{ background: BRAND }}>{c.name[0]}</div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{c.name}</p>
                    <p className="text-xs text-slate-400">Outstanding: {c.loan} · Next: {c.next}</p>
                  </div>
                </div>
                <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full"
                  style={c.status === 'Current' ? { background: 'rgba(16,185,129,0.1)', color: '#10b981' } : { background: 'rgba(239,68,68,0.08)', color: '#ef4444' }}>
                  {c.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {(adminPage === 'portfolio' || adminPage === 'compliance' || adminPage === 'settings') && (
        <div className="space-y-4">
          <h1 className="text-xl font-bold text-slate-900">{adminNav.find(n => n.id === adminPage)?.label}</h1>
          <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-12 text-center">
            <div className="w-10 h-10 mx-auto mb-3 rounded-2xl bg-slate-100 flex items-center justify-center">
              <Activity size={16} className="text-slate-400" />
            </div>
            <p className="text-sm font-semibold text-slate-600 mb-1">Full data in live console</p>
            <p className="text-xs text-slate-400">This section is active in your production lender portal.</p>
          </div>
        </div>
      )}
    </>
  );
}

function AdminSidebar({ active, onSelect }: { active: string; onSelect: (id: string) => void }) {
  return (
    <aside className="w-52 shrink-0 flex flex-col h-full" style={{ background: '#0f172a', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="flex items-center h-14 px-4 shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-white text-xs" style={{ background: BRAND }}>Z</div>
          <div>
            <p className="text-xs font-bold text-white">Zwane Capital</p>
            <p className="text-[9px] text-slate-500">Lender console</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
        {adminNav.map(item => {
          const isActive = active === item.id;
          return (
            <button key={item.id} onClick={() => onSelect(item.id)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left"
              style={isActive ? { background: 'rgba(124,58,237,0.2)', color: '#A78BFA' } : { color: '#94a3b8' }}>
              <item.Icon size={14} />
              <span className="text-xs">{item.label}</span>
            </button>
          );
        })}
      </nav>
      <div className="p-3 shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl mb-1" style={{ background: 'rgba(255,255,255,0.05)' }}>
          <Building2 size={14} className="text-slate-400 shrink-0" />
          <div className="min-w-0">
            <p className="text-[10px] font-semibold text-slate-300 truncate">Sarah Admin</p>
            <p className="text-[9px] text-slate-500">Super admin</p>
          </div>
        </div>
        <p className="text-center mt-2 text-[9px] text-slate-600">Powered by <strong className="text-slate-500">AlgoLend</strong></p>
      </div>
    </aside>
  );
}

/* ─── Demo Page ──────────────────────────────────────────────── */
type View = 'borrower' | 'lender';

export default function DemoPage() {
  const [view, setView] = useState<View>('borrower');
  const [page, setPage] = useState('dashboard');
  const [adminPage, setAdminPage] = useState('dashboard');

  const switchView = (v: View) => {
    setView(v);
    setPage('dashboard');
    setAdminPage('dashboard');
  };

  return (
    <main className="min-h-screen" style={{ background: '#06070D' }}>
      <header className="sticky top-0 z-10 px-5 py-3 flex items-center justify-between"
        style={{ background: 'rgba(11,13,24,0.92)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-1.5 text-[11px] font-medium px-3 py-1.5 rounded-lg hover:text-[#A78BFA] transition-colors"
            style={{ color: '#6E74A4', background: 'rgba(255,255,255,0.05)' }}>
            ← Back
          </Link>
          <Link href="/" className="flex items-center gap-2.5 group">
            <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
              <path d="M 6 30 L 6 14 C 6 8.48 10.48 4 16 4 C 21.52 4 26 8.48 26 14 L 26 30"
                stroke="#7C3AED" strokeWidth="2.6" fill="none" strokeLinecap="round" />
              <circle cx="16" cy="15" r="5.5" fill="#0F1629" />
            </svg>
            <div>
              <p className="text-xs font-bold text-white group-hover:text-[#A78BFA] transition-colors">AlgoLend</p>
              <p className="text-[9px] text-[#6E74A4]">Interactive demo</p>
            </div>
          </Link>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center p-1 rounded-xl gap-0.5" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <button onClick={() => switchView('borrower')}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={view === 'borrower' ? { background: BRAND, color: '#fff' } : { color: '#6E74A4' }}>
              Borrower view
            </button>
            <button onClick={() => switchView('lender')}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={view === 'lender' ? { background: BRAND, color: '#fff' } : { color: '#6E74A4' }}>
              Lender console
            </button>
          </div>
          <div className="flex items-center gap-2 text-[10px] px-2.5 py-1.5 rounded-full"
            style={{ background: 'rgba(124,58,237,0.1)', color: '#A78BFA', border: '1px solid rgba(124,58,237,0.2)' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-[#A78BFA] animate-pulse" />
            Live demo
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-5">
          {view === 'borrower' ? (<>
            <p className="text-base font-semibold text-white">Borrower portal experience</p>
            <p className="text-sm text-[#6E74A4]">What your clients see — branded to your lender, powered by AlgoLend</p>
          </>) : (<>
            <p className="text-base font-semibold text-white">Lender console</p>
            <p className="text-sm text-[#6E74A4]">Your admin dashboard — manage applications, clients, and compliance in one place</p>
          </>)}
        </div>

        {/* Hint */}
        <div className="mb-4 flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs"
          style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.15)', color: '#A78BFA' }}>
          <AlertCircle size={12} className="shrink-0" />
          {view === 'borrower'
            ? 'Switch to "Lender console" above to see the admin view your team uses to review and approve applications.'
            : 'Switch to "Borrower view" above to see the end-borrower experience your clients interact with.'}
        </div>

        {/* Browser chrome */}
        <div className="rounded-2xl overflow-hidden shadow-2xl" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="flex items-center gap-2 px-4 py-3" style={{ background: '#1a1a2e', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex gap-1.5">
              {['#ff5f57','#febc2e','#28c840'].map(c => <div key={c} className="w-3 h-3 rounded-full" style={{ background: c }} />)}
            </div>
            <div className="flex-1 mx-3 h-7 rounded-lg flex items-center px-3 text-[11px] text-slate-500" style={{ background: 'rgba(255,255,255,0.06)' }}>
              {view === 'borrower' ? 'portal.algolend.co.za/client/dashboard' : 'admin.algolend.co.za/dashboard'}
            </div>
          </div>

          <div className="flex" style={{ background: view === 'lender' ? '#0f172a' : '#f8fafc', height: 560 }}>
            {view === 'borrower' ? (
              <>
                <PortalSidebar active={page} onSelect={setPage} />
                <div className="flex-1 flex flex-col overflow-hidden">
                  <header className="h-14 shrink-0 flex items-center justify-between px-6"
                    style={{ background: 'rgba(248,250,252,0.9)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                    <div />
                    <div className="flex items-center gap-3">
                      <button className="relative w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:bg-black/5 transition-colors">
                        <Bell size={15} />
                        <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full" style={{ background: BRAND }} />
                      </button>
                      <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-sm font-medium" style={{ background: 'rgba(124,58,237,0.06)', color: BRAND }}>
                        <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ background: BRAND }}>J</div>
                        John
                      </div>
                    </div>
                  </header>
                  <div className="flex-1 overflow-y-auto px-6 py-6" style={{ background: '#f8fafc' }}>
                    {page === 'dashboard' && (
                      <div className="space-y-6">
                        <div className="flex items-start justify-between">
                          <div>
                            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Good morning, John 👋</h1>
                            <p className="text-slate-500 mt-0.5 text-sm">Here&apos;s an overview of your account.</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button onClick={() => setPage('calculator')} className="px-3 py-2 rounded-xl text-xs font-medium border border-slate-200 text-slate-600 hover:border-slate-300 transition-colors flex items-center gap-1.5"><Calculator size={13}/> Calculator</button>
                            <button onClick={() => setPage('apply')} className="px-3 py-2 rounded-xl text-xs font-bold text-white flex items-center gap-1.5" style={{ background: BRAND }}>Apply for Loan <ArrowRight size={12}/></button>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                          <StatCard label="Active loans" value="0" sub="No active facilities" Icon={CreditCard} />
                          <StatCard label="Outstanding balance" value="R 0,00" Icon={TrendingUp} accent="info" />
                          <StatCard label="Next payment" value="—" sub="Nothing scheduled" Icon={Clock} accent="warning" />
                          <StatCard label="In progress" value="0" sub="No pending applications" Icon={CheckCircle} accent="success" />
                        </div>
                        <div>
                          <h2 className="text-sm font-semibold text-slate-800 mb-3">Recent applications</h2>
                          <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-10 text-center">
                            <div className="w-10 h-10 mx-auto mb-3 rounded-2xl bg-slate-100 flex items-center justify-center"><CreditCard size={16} className="text-slate-400" /></div>
                            <p className="text-sm font-semibold text-slate-700 mb-1">No applications yet</p>
                            <p className="text-xs text-slate-400 mb-4">Apply for your first loan to get started.</p>
                            <button onClick={() => setPage('apply')} className="px-4 py-2 rounded-xl text-xs font-bold text-white" style={{ background: BRAND }}>Apply now →</button>
                          </div>
                        </div>
                      </div>
                    )}
                    {page === 'apply'         && <ApplyWizard onBack={() => setPage('dashboard')} />}
                    {page === 'calculator'    && <CalculatorPage />}
                    {page === 'loans'         && <EmptyPage title="My Loans" sub="No active loans yet" />}
                    {page === 'documents'     && <EmptyPage title="Documents" sub="No documents uploaded" />}
                    {page === 'messages'      && <EmptyPage title="Messages" sub="No messages" />}
                    {page === 'notifications' && <EmptyPage title="Notifications" sub="You&apos;re all caught up" />}
                    {page === 'profile'       && <EmptyPage title="Profile" sub="Manage your profile details" />}
                    {page === 'support'       && <EmptyPage title="Support" sub="Raise a ticket or chat with us" />}
                  </div>
                </div>
              </>
            ) : (
              <>
                <AdminSidebar active={adminPage} onSelect={setAdminPage} />
                <div className="flex-1 flex flex-col overflow-hidden" style={{ background: '#f8fafc' }}>
                  <header className="h-14 shrink-0 flex items-center justify-between px-6"
                    style={{ background: 'rgba(248,250,252,0.95)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                    <p className="text-xs text-slate-400">AlgoLend Admin · Zwane Capital</p>
                    <div className="flex items-center gap-3">
                      <button className="relative w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:bg-black/5 transition-colors">
                        <Bell size={15} />
                        <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-red-500" />
                      </button>
                      <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-medium" style={{ background: 'rgba(124,58,237,0.06)', color: BRAND }}>
                        <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white" style={{ background: BRAND }}>S</div>
                        Sarah
                      </div>
                    </div>
                  </header>
                  <div className="flex-1 overflow-y-auto px-6 py-6">
                    <AdminDashboard adminPage={adminPage} setAdminPage={setAdminPage} />
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="mt-8 text-center space-y-3">
          <Link href="/apply"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white"
            style={{ background: 'linear-gradient(135deg,#7C3AED,#9B5CF6)', boxShadow: '0 4px 20px rgba(124,58,237,0.4)' }}>
            Build this for your clients <ArrowRight size={14} />
          </Link>
          <p className="text-xs text-[#6E74A4]">This is a live demo. No real data or funds involved.</p>
        </div>
      </div>
    </main>
  );
}
