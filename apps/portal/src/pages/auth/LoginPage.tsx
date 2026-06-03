import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { useTenant } from '@/contexts/TenantContext';
import { CountUp } from '@/components/animated/CountUp';
import { ActivityTicker } from '@/components/animated/ActivityTicker';
import { Logo } from '@/components/Logo';
import { ArrowRight, Check, TrendingUp, ShieldCheck, Eye, EyeOff } from 'lucide-react';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});
type FormData = z.infer<typeof schema>;

export function LoginPage() {
  const { signIn, profile } = useAuth();
  const { name, logo } = useTenant();
  const navigate = useNavigate();
  const [authError, setAuthError] = useState('');
  const [showPw, setShowPw] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(data: FormData) {
    setAuthError('');
    try {
      await signIn(data.email, data.password);
      const role = profile?.role ?? 'borrower';
      navigate(role === 'borrower' ? '/client/dashboard' : '/admin/dashboard', { replace: true });
    } catch {
      setAuthError('Invalid email or password. Please try again.');
    }
  }

  return (
    <div className="min-h-screen flex bg-[var(--color-bg)]">

      {/* ── LEFT: Live platform panel ─────────────────────────────────── */}
      <aside className="hidden lg:flex relative w-[52%] flex-col justify-between p-12 overflow-hidden bg-[var(--color-ink)] text-white">
        {/* Ambient glow — drift continuously */}
        <div
          className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(124,58,237,0.4) 0%, transparent 70%)',
            filter: 'blur(40px)',
            animation: 'var(--animate-drift-1)',
          }}
          aria-hidden
        />
        <div
          className="absolute -bottom-40 -right-32 w-[400px] h-[400px] rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(167,139,250,0.28) 0%, transparent 70%)',
            filter: 'blur(40px)',
            animation: 'var(--animate-drift-2)',
          }}
          aria-hidden
        />
        <div
          className="absolute top-1/2 right-10 w-[260px] h-[260px] rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 70%)',
            filter: 'blur(40px)',
            animation: 'drift-1 30s ease-in-out infinite',
            animationDelay: '-10s',
          }}
          aria-hidden
        />

        {/* Subtle grid backdrop */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.04]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.9) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.9) 1px, transparent 1px)',
            backgroundSize: '64px 64px',
            maskImage: 'radial-gradient(ellipse at top, black 30%, transparent 80%)',
          }}
          aria-hidden
        />

        {/* Brand */}
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

        {/* Live mini-dashboard */}
        <div className="relative z-10 space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <span className="relative w-1.5 h-1.5 rounded-full bg-emerald-400 pulse-dot" />
            <span className="text-[11px] text-white/50 mono uppercase tracking-[0.18em]">Live platform</span>
          </div>

          <h2 className="headline text-4xl font-semibold leading-[1.05] max-w-md mb-8">
            Built for the lenders<br />
            building South Africa.
          </h2>

          {/* Live stat cards */}
          <div className="grid grid-cols-2 gap-3 max-w-md" style={{ animation: 'var(--animate-fade-up)', animationDelay: '200ms' }}>
            <div className="rounded-2xl border border-white/10 bg-[var(--color-surface)]/5 backdrop-blur p-4 transition-all hover:bg-[var(--color-surface)]/10 hover:border-white/20">
              <div className="flex items-center gap-1.5 mb-2 text-emerald-300">
                <TrendingUp size={12} />
                <span className="text-[10px] mono uppercase tracking-wider">Today</span>
              </div>
              <p className="text-2xl font-bold tracking-tight tabular-nums">
                R <CountUp to={4.2} duration={1800} delay={300} decimals={1} />M
              </p>
              <p className="text-[11px] text-white/40 mt-0.5">disbursed across platform</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-[var(--color-surface)]/5 backdrop-blur p-4 transition-all hover:bg-[var(--color-surface)]/10 hover:border-white/20">
              <div className="flex items-center gap-1.5 mb-2 text-[#A78BFA]">
                <Check size={12} />
                <span className="text-[10px] mono uppercase tracking-wider">Live</span>
              </div>
              <p className="text-2xl font-bold tracking-tight tabular-nums">
                <CountUp to={47} duration={1400} delay={400} />
              </p>
              <p className="text-[11px] text-white/40 mt-0.5">applications in review</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[var(--color-surface)]/5 backdrop-blur p-4 col-span-2 transition-all hover:bg-[var(--color-surface)]/10 hover:border-white/20">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] mono uppercase tracking-wider text-white/40">Avg decision time</span>
                <span className="text-[10px] mono text-emerald-300 inline-flex items-center gap-1">
                  <span className="inline-block">↓</span>
                  <CountUp to={31} duration={1400} delay={700} />%
                </span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <p className="text-3xl font-bold tracking-tight tabular-nums">
                  <CountUp to={31} duration={1500} delay={500} /><span className="text-lg text-white/40">hr</span>
                </p>
                <p className="text-[11px] text-white/40 ml-2">— well under the 48hr target</p>
              </div>
              {/* Animated sparkline: line draws + area fills in sequence */}
              <svg viewBox="0 0 200 32" className="w-full h-8 mt-3" preserveAspectRatio="none" aria-hidden>
                <defs>
                  <linearGradient id="lg-spark" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#A78BFA" stopOpacity="0.4" />
                    <stop offset="1" stopColor="#A78BFA" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  className="spark-area"
                  d="M0 24 L20 22 L40 18 L60 20 L80 12 L100 14 L120 10 L140 6 L160 8 L180 4 L200 2 L200 32 L0 32 Z"
                  fill="url(#lg-spark)"
                />
                <path
                  className="spark-line"
                  d="M0 24 L20 22 L40 18 L60 20 L80 12 L100 14 L120 10 L140 6 L160 8 L180 4 L200 2"
                  stroke="#A78BFA"
                  strokeWidth="1.5"
                  fill="none"
                  strokeLinecap="round"
                />
                {/* End-of-line dot — pulses after draw completes */}
                <circle cx="200" cy="2" r="3" fill="#A78BFA" style={{ animation: 'fade-in 0.4s ease-out 2.6s both' }} />
                <circle cx="200" cy="2" r="3" fill="#A78BFA" opacity="0.4" style={{ animation: 'pulse-dot 1.8s ease-in-out 2.6s infinite' }} />
              </svg>
            </div>

            {/* Live activity ticker */}
            <div className="col-span-2" style={{ animation: 'var(--animate-fade-up)', animationDelay: '600ms' }}>
              <ActivityTicker />
            </div>
          </div>
        </div>

        {/* Bottom credit */}
        <div className="relative z-10 flex items-center justify-between text-[11px] mono text-white/30 uppercase tracking-[0.18em]">
          <span>Powered by Mint Platforms</span>
          <span>v1.0</span>
        </div>
      </aside>

      {/* ── RIGHT: Form ───────────────────────────────────────────────── */}
      <main className="flex-1 flex items-center justify-center p-6 lg:p-10 relative">
        {/* Background grid (light side) */}
        <div className="absolute inset-0 grid-bg pointer-events-none" aria-hidden />

<div className="relative z-10 w-full max-w-md">
          {/* Mobile brand */}
          <div className="lg:hidden mb-10 flex items-center gap-3">
            {logo
              ? <img src={logo} alt={name} className="h-9" />
              : (
                <>
                  <div className="w-9 h-9 rounded-xl bg-[var(--color-brand)] flex items-center justify-center text-white font-bold">
                    {name?.charAt(0) ?? 'A'}
                  </div>
                  <span className="text-xl font-semibold tracking-tight">{name}</span>
                </>
              )
            }
          </div>

          {/* Eyebrow */}
          <p className="eyebrow mb-3" style={{ animation: 'var(--animate-fade-up)', animationDelay: '0ms' }}>
            Welcome back
          </p>

          {/* Headline */}
          <h1
            className="headline text-4xl font-semibold mb-3 text-[var(--color-ink)]"
            style={{ animation: 'var(--animate-fade-up)', animationDelay: '60ms' }}
          >
            Sign in to <span className="italic" style={{ fontFamily: 'Geist' }}>{name}</span>.
          </h1>
          <p
            className="text-[var(--color-ink-soft)] mb-8"
            style={{ animation: 'var(--animate-fade-up)', animationDelay: '120ms' }}
          >
            Enter your details below to continue to your portal.
          </p>

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-4"
            style={{ animation: 'var(--animate-fade-up)', animationDelay: '180ms' }}
          >
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-[var(--color-ink)] mb-1.5 uppercase tracking-wider">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="sipho@bridgecapital.co.za"
                className="w-full px-4 py-3 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[15px] outline-none transition-all focus:border-[var(--color-ink)] focus:ring-4 focus:ring-[var(--color-ink)]/8 placeholder:text-[var(--color-ink-muted)]"
                {...register('email')}
              />
              {errors.email ? (
                <p className="text-xs text-red-600 mt-1.5">{errors.email.message}</p>
              ) : null}
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="block text-xs font-semibold text-[var(--color-ink)] uppercase tracking-wider">
                  Password
                </label>
                <Link to="/auth/forgot" className="text-[11px] text-[var(--color-ink-soft)] hover:text-[var(--color-brand)] transition-colors">
                  Forgot?
                </Link>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPw ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="w-full px-4 py-3 pr-12 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[15px] outline-none transition-all focus:border-[var(--color-ink)] focus:ring-4 focus:ring-[var(--color-ink)]/8 placeholder:text-[var(--color-ink-muted)]"
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-surface-2)] transition-colors"
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                >
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {errors.password ? (
                <p className="text-xs text-red-600 mt-1.5">{errors.password.message}</p>
              ) : null}
            </div>

            {authError ? (
              <div className="flex items-start gap-2 px-4 py-3 rounded-2xl bg-red-50 border border-red-100 text-sm text-red-700">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-2 shrink-0" />
                {authError}
              </div>
            ) : null}

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-shine w-full mt-2 inline-flex items-center justify-center gap-2 bg-[var(--color-ink)] text-white font-semibold text-[15px] px-5 py-3.5 rounded-2xl transition-all hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ boxShadow: '0 12px 32px -8px rgba(9, 9, 11, 0.35)' }}
            >
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in…
                </>
              ) : (
                <>
                  Continue
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Footer link */}
          <p
            className="text-sm text-[var(--color-ink-soft)] mt-8"
            style={{ animation: 'var(--animate-fade-up)', animationDelay: '300ms' }}
          >
            Don't have an account?{' '}
            <Link to="/auth/register" className="font-semibold text-[var(--color-ink)] underline underline-offset-4 decoration-2 decoration-[var(--color-brand)] hover:decoration-[var(--color-ink)] transition-colors">
              Register
            </Link>
          </p>

          {/* Trust indicators */}
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
