import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTenant } from '@/contexts/TenantContext';
import { useAuth } from '@/contexts/AuthContext';
import { Logo } from '@/components/Logo';
import {
  ArrowRight, ShieldCheck, Clock, Cpu, ArrowLeft, Check,
  AlertCircle, Eye, EyeOff,
} from 'lucide-react';

interface FormState {
  first:   string;
  last:    string;
  email:   string;
  mobile:  string;
  idNum:   string;
  pw:      string;
  pw2:     string;
}

const EMPTY: FormState = { first: '', last: '', email: '', mobile: '', idNum: '', pw: '', pw2: '' };

type ErrorMap = Partial<Record<keyof FormState | 'form', string>>;

function validate(f: FormState): ErrorMap {
  const errors: ErrorMap = {};
  if (!f.first.trim())            errors.first  = 'First name is required';
  if (!f.last.trim())             errors.last   = 'Last name is required';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email))
                                  errors.email  = 'Enter a valid email';
  if (f.mobile && !/^[+\d\s-]{7,15}$/.test(f.mobile))
                                  errors.mobile = 'Enter a valid mobile number';
  if (f.idNum && !/^\d{13}$/.test(f.idNum))
                                  errors.idNum  = 'SA ID number must be 13 digits';
  if (f.pw.length < 8)            errors.pw     = 'Password must be at least 8 characters';
  if (f.pw !== f.pw2)             errors.pw2    = 'Passwords do not match';
  return errors;
}

export function RegisterPage() {
  const { name, logo } = useTenant();
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const [form, setForm]         = useState<FormState>(EMPTY);
  const [errors, setErrors]     = useState<ErrorMap>({});
  const [submitting, setSubmitting] = useState(false);
  const [showPw, setShowPw]     = useState(false);
  const [success, setSuccess]   = useState<null | { needsConfirmation: boolean; email: string }>(null);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    // Clear that field's error on change
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const found = validate(form);
    if (Object.keys(found).length > 0) {
      setErrors(found);
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      const result = await signUp({
        email:    form.email.trim(),
        password: form.pw,
        fullName: `${form.first.trim()} ${form.last.trim()}`.trim(),
        mobile:   form.mobile.trim() || undefined,
        idNumber: form.idNum.trim() || undefined,
      });

      if (result.hasSession) {
        // Auto-signed in — go straight to dashboard
        navigate('/client/dashboard', { replace: true });
        return;
      }

      // Confirmation email sent
      setSuccess({ needsConfirmation: result.needsConfirmation, email: form.email.trim() });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sign-up failed. Please try again.';
      setErrors({ form: message });
    } finally {
      setSubmitting(false);
    }
  }

  // ── Success state ───────────────────────────────────────────────
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-[var(--color-bg)]">
        <div className="relative max-w-md w-full bg-white border border-[var(--color-border)] rounded-3xl p-10 text-center shadow-sm" style={{ animation: 'scale-in 0.5s cubic-bezier(0.16, 1, 0.3, 1) both' }}>
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-emerald-100 flex items-center justify-center">
            <Check size={26} className="text-emerald-600" />
          </div>
          <p className="eyebrow mb-3">Account created</p>
          <h1 className="headline text-3xl font-semibold mb-3">You're in.</h1>
          {success.needsConfirmation ? (
            <p className="text-sm text-[var(--color-ink-soft)] leading-relaxed mb-6">
              We sent a confirmation link to{' '}
              <span className="font-semibold text-[var(--color-ink)]">{success.email}</span>. Click it to verify your account, then come back here to sign in.
            </p>
          ) : (
            <p className="text-sm text-[var(--color-ink-soft)] leading-relaxed mb-6">
              Your account is ready. Sign in to start your application.
            </p>
          )}
          <Link
            to="/auth/login"
            className="btn-shine inline-flex items-center justify-center gap-2 w-full bg-[var(--color-ink)] text-white font-semibold text-[15px] px-5 py-3.5 rounded-2xl transition-transform hover:-translate-y-0.5"
            style={{ boxShadow: '0 12px 32px -8px rgba(9, 9, 11, 0.35)' }}
          >
            Continue to sign in
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    );
  }

  // ── Form state ──────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex bg-[var(--color-bg)]">

      {/* ── LEFT: Value-prop panel ────────────────────────────────── */}
      <aside className="hidden lg:flex relative w-[48%] flex-col justify-between p-12 overflow-hidden bg-[var(--color-ink)] text-white">
        <div
          className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.35) 0%, transparent 70%)', filter: 'blur(40px)' }}
          aria-hidden
        />
        <div
          className="absolute -bottom-40 -left-32 w-[400px] h-[400px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(167,139,250,0.22) 0%, transparent 70%)', filter: 'blur(40px)' }}
          aria-hidden
        />
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.04]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.9) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.9) 1px, transparent 1px)',
            backgroundSize: '64px 64px',
          }}
          aria-hidden
        />

        <div className="relative z-10 flex items-center gap-3">
          {logo
            ? <img src={logo} alt={name} className="h-9 brightness-0 invert" />
            : (
              <>
                <Logo size={36} variant="dark" />
                <span className="text-xl font-semibold tracking-tight">{name}</span>
              </>
            )
          }
        </div>

        <div className="relative z-10 max-w-md">
          <p className="eyebrow mb-4" style={{ color: 'rgba(255,255,255,0.5)' }}>For business borrowers</p>
          <h2 className="headline text-4xl font-semibold leading-[1.05] mb-6">
            Apply for credit<br />
            in minutes.
          </h2>
          <p className="text-white/55 mb-10 max-w-md">
            Submit your application digitally. Connect your bank account for instant affordability assessment. Get a decision in under 48 hours.
          </p>
          <div className="space-y-3" style={{ animation: 'var(--animate-fade-up)', animationDelay: '200ms' }}>
            {[
              { icon: Clock,       title: 'Decision in 48 hours', desc: 'Submit once, track in real time.' },
              { icon: ShieldCheck, title: 'Secure & compliant',   desc: 'NCA & POPIA aligned, bank-grade encryption.' },
              { icon: Cpu,         title: 'No paperwork',          desc: 'Open banking pulls statements automatically.' },
            ].map((f) => (
              <div key={f.title} className="flex items-start gap-3 p-3 rounded-2xl border border-white/10 bg-white/5 backdrop-blur">
                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                  <f.icon size={15} className="text-[#A78BFA]" />
                </div>
                <div>
                  <p className="text-sm font-semibold mb-0.5">{f.title}</p>
                  <p className="text-xs text-white/45 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-between text-[11px] mono text-white/30 uppercase tracking-[0.18em]">
          <span>Powered by Mint Platforms</span>
          <span>v1.0</span>
        </div>
      </aside>

      {/* ── RIGHT: Form ───────────────────────────────────────────── */}
      <main className="flex-1 flex items-center justify-center p-6 lg:p-10 relative">
        <div className="absolute inset-0 grid-bg pointer-events-none" aria-hidden />

        {/* Back to LOGIN — icon-only circular pill */}
        <Link
          to="/auth/login"
          aria-label="Back to sign in"
          title="Back to sign in"
          className="absolute top-6 left-6 lg:top-8 lg:left-8 z-20 inline-flex items-center justify-center w-10 h-10 rounded-full bg-white border border-[var(--color-border)] text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] hover:border-[var(--color-ink)] hover:-translate-x-0.5 transition-all shadow-sm group"
        >
          <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-0.5" />
        </Link>

        <div className="relative z-10 w-full max-w-md">
          {/* Mobile brand */}
          <div className="lg:hidden mb-10 flex items-center gap-3">
            {logo
              ? <img src={logo} alt={name} className="h-9" />
              : (
                <>
                  <Logo size={36} />
                  <span className="text-xl font-semibold tracking-tight">{name}</span>
                </>
              )
            }
          </div>

          <p className="eyebrow mb-3" style={{ animation: 'var(--animate-fade-up)', animationDelay: '0ms' }}>
            Create your account
          </p>
          <h1
            className="headline text-4xl font-semibold mb-3 text-[var(--color-ink)]"
            style={{ animation: 'var(--animate-fade-up)', animationDelay: '60ms' }}
          >
            Let's get you started.
          </h1>
          <p
            className="text-[var(--color-ink-soft)] mb-8"
            style={{ animation: 'var(--animate-fade-up)', animationDelay: '120ms' }}
          >
            Fill out the details below — takes about two minutes.
          </p>

          <form
            onSubmit={handleSubmit}
            noValidate
            className="space-y-4"
            style={{ animation: 'var(--animate-fade-up)', animationDelay: '180ms' }}
          >
            {/* Name row */}
            <div className="grid grid-cols-2 gap-3">
              {([
                { key: 'first' as const, label: 'First name', placeholder: 'Sipho',  ac: 'given-name'  },
                { key: 'last'  as const, label: 'Last name',  placeholder: 'Nkosi',  ac: 'family-name' },
              ]).map((f) => (
                <div key={f.key}>
                  <label htmlFor={f.key} className="block text-xs font-semibold mb-1.5 uppercase tracking-wider">{f.label}</label>
                  <input
                    id={f.key}
                    type="text"
                    autoComplete={f.ac}
                    placeholder={f.placeholder}
                    value={form[f.key]}
                    onChange={(e) => update(f.key, e.target.value)}
                    className={`w-full px-4 py-3 rounded-2xl bg-white border text-[15px] outline-none transition-all focus:ring-4 focus:ring-[var(--color-ink)]/8 placeholder:text-[var(--color-ink-muted)] ${
                      errors[f.key] ? 'border-red-400 focus:border-red-500' : 'border-[var(--color-border)] focus:border-[var(--color-ink)]'
                    }`}
                  />
                  {errors[f.key] ? <p className="text-xs text-red-600 mt-1">{errors[f.key]}</p> : null}
                </div>
              ))}
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-xs font-semibold mb-1.5 uppercase tracking-wider">Email</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="sipho@bridgecapital.co.za"
                value={form.email}
                onChange={(e) => update('email', e.target.value)}
                className={`w-full px-4 py-3 rounded-2xl bg-white border text-[15px] outline-none transition-all focus:ring-4 focus:ring-[var(--color-ink)]/8 placeholder:text-[var(--color-ink-muted)] ${
                  errors.email ? 'border-red-400 focus:border-red-500' : 'border-[var(--color-border)] focus:border-[var(--color-ink)]'
                }`}
              />
              {errors.email ? <p className="text-xs text-red-600 mt-1">{errors.email}</p> : null}
            </div>

            {/* Mobile + ID */}
            {([
              { key: 'mobile' as const, label: 'Mobile number', type: 'tel',  placeholder: '+27 ...',   ac: 'tel' },
              { key: 'idNum'  as const, label: 'ID number',     type: 'text', placeholder: '13 digits', ac: 'off' },
            ]).map((f) => (
              <div key={f.key}>
                <label htmlFor={f.key} className="block text-xs font-semibold mb-1.5 uppercase tracking-wider">{f.label}</label>
                <input
                  id={f.key}
                  type={f.type}
                  autoComplete={f.ac}
                  placeholder={f.placeholder}
                  value={form[f.key]}
                  onChange={(e) => update(f.key, e.target.value)}
                  className={`w-full px-4 py-3 rounded-2xl bg-white border text-[15px] outline-none transition-all focus:ring-4 focus:ring-[var(--color-ink)]/8 placeholder:text-[var(--color-ink-muted)] ${
                    errors[f.key] ? 'border-red-400 focus:border-red-500' : 'border-[var(--color-border)] focus:border-[var(--color-ink)]'
                  }`}
                />
                {errors[f.key] ? <p className="text-xs text-red-600 mt-1">{errors[f.key]}</p> : null}
              </div>
            ))}

            {/* Passwords */}
            <div className="grid grid-cols-2 gap-3">
              {([
                { key: 'pw'  as const, label: 'Password' },
                { key: 'pw2' as const, label: 'Confirm password' },
              ]).map((f) => (
                <div key={f.key}>
                  <label htmlFor={f.key} className="block text-xs font-semibold mb-1.5 uppercase tracking-wider">{f.label}</label>
                  <div className="relative">
                    <input
                      id={f.key}
                      type={showPw ? 'text' : 'password'}
                      autoComplete="new-password"
                      placeholder="••••••••"
                      value={form[f.key]}
                      onChange={(e) => update(f.key, e.target.value)}
                      className={`w-full px-4 py-3 pr-10 rounded-2xl bg-white border text-[15px] outline-none transition-all focus:ring-4 focus:ring-[var(--color-ink)]/8 placeholder:text-[var(--color-ink-muted)] ${
                        errors[f.key] ? 'border-red-400 focus:border-red-500' : 'border-[var(--color-border)] focus:border-[var(--color-ink)]'
                      }`}
                    />
                    {f.key === 'pw' ? (
                      <button
                        type="button"
                        onClick={() => setShowPw((v) => !v)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-surface-2)] transition-colors"
                        aria-label={showPw ? 'Hide password' : 'Show password'}
                      >
                        {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    ) : null}
                  </div>
                  {errors[f.key] ? <p className="text-xs text-red-600 mt-1">{errors[f.key]}</p> : null}
                </div>
              ))}
            </div>

            {/* Form-level error */}
            {errors.form ? (
              <div className="flex items-start gap-2 px-4 py-3 rounded-2xl bg-red-50 border border-red-200 text-sm text-red-700">
                <AlertCircle size={15} className="mt-0.5 shrink-0" />
                {errors.form}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={submitting}
              className="btn-shine w-full mt-2 inline-flex items-center justify-center gap-2 bg-[var(--color-ink)] text-white font-semibold text-[15px] px-5 py-3.5 rounded-2xl transition-all hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ boxShadow: '0 12px 32px -8px rgba(9, 9, 11, 0.35)' }}
            >
              {submitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating account…
                </>
              ) : (
                <>
                  Create account
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <p
            className="text-sm text-[var(--color-ink-soft)] mt-8"
            style={{ animation: 'var(--animate-fade-up)', animationDelay: '300ms' }}
          >
            Already have an account?{' '}
            <Link
              to="/auth/login"
              className="font-semibold text-[var(--color-ink)] underline underline-offset-4 decoration-2 decoration-[var(--color-brand)] hover:decoration-[var(--color-ink)] transition-colors"
            >
              Sign in
            </Link>
          </p>

          <div
            className="mt-12 pt-6 border-t border-[var(--color-border-soft)] flex items-center gap-5 text-[11px] mono uppercase tracking-[0.16em] text-[var(--color-ink-muted)]"
            style={{ animation: 'var(--animate-fade-up)', animationDelay: '380ms' }}
          >
            <span className="flex items-center gap-1.5">
              <ShieldCheck size={13} className="text-emerald-600" />
              NCA Compliant
            </span>
            <span>·</span>
            <span>POPIA Secure</span>
            <span>·</span>
            <span>256-bit TLS</span>
          </div>
        </div>
      </main>
    </div>
  );
}
