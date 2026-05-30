import { QuoteForm } from '@/components/QuoteForm';
import { Shield, Zap, Building2 } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="relative min-h-dvh grid-bg overflow-hidden">

      {/* Ambient glow */}
      <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px]
                      bg-[radial-gradient(ellipse_at_50%_0%,rgba(212,148,58,0.12)_0%,transparent_70%)]" />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-8 py-6 max-w-6xl mx-auto">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--gold-2)] to-[var(--gold)]
                          flex items-center justify-center">
            <span className="text-[var(--ink)] font-black text-sm">M</span>
          </div>
          <span className="font-semibold text-[var(--white)] tracking-tight text-lg">Mint</span>
        </div>
        <nav className="hidden md:flex items-center gap-6 text-sm text-[var(--silver)]">
          <a href="#how" className="hover:text-[var(--white)] transition-colors">How it works</a>
          <a href="#lenders" className="hover:text-[var(--white)] transition-colors">Lenders</a>
        </nav>
      </header>

      {/* Hero */}
      <main className="relative z-10 max-w-6xl mx-auto px-8 pt-10 pb-24 grid lg:grid-cols-[1fr_480px] gap-16 items-start">

        {/* Left — copy */}
        <div className="pt-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full
                          bg-[rgba(212,148,58,0.08)] border border-[rgba(212,148,58,0.2)]
                          text-[var(--gold)] text-xs font-semibold tracking-wide mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--gold-2)] animate-pulse" />
            Live lender comparison
          </div>

          <h1 className="serif text-6xl lg:text-7xl leading-[1.02] mb-6">
            One check.<br />
            <span className="gold-text italic">Every deal.</span>
          </h1>

          <p className="text-[var(--silver)] text-xl leading-relaxed max-w-md mb-12">
            Submit once. We run your credit profile past every participating lender
            simultaneously and rank the best offers — no multiple inquiries, no
            paperwork per bank.
          </p>

          {/* Trust signals */}
          <div className="flex flex-col gap-4">
            {[
              { Icon: Zap,       text: 'Results in under 30 seconds' },
              { Icon: Shield,    text: 'Single soft pull — no score impact' },
              { Icon: Building2, text: 'Multiple regulated SA lenders' },
            ].map(({ Icon, text }) => (
              <div key={text} className="flex items-center gap-3 text-sm text-[var(--silver)]">
                <div className="w-7 h-7 rounded-lg bg-[rgba(212,148,58,0.08)] border border-[rgba(212,148,58,0.12)]
                                flex items-center justify-center shrink-0">
                  <Icon size={13} className="text-[var(--gold)]" />
                </div>
                {text}
              </div>
            ))}
          </div>

          {/* Lender dots */}
          <div className="mt-16 flex items-center gap-3">
            <div className="flex -space-x-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i}
                  className="w-8 h-8 rounded-full border-2 border-[var(--ink)] bg-[var(--ink-3)]
                             flex items-center justify-center text-[10px] font-bold text-[var(--silver)]"
                  style={{ zIndex: 5 - i }}
                >
                  {String.fromCharCode(65 + i)}
                </div>
              ))}
            </div>
            <p className="text-sm text-[var(--silver)]">
              <span className="text-[var(--white)] font-semibold">5 lenders</span> checking your profile
            </p>
          </div>
        </div>

        {/* Right — form */}
        <div className="animate-fade-up">
          <QuoteForm />
        </div>

      </main>

      {/* How it works */}
      <section id="how" className="relative z-10 max-w-6xl mx-auto px-8 py-20">
        <div className="divider mb-20" />
        <p className="text-xs font-bold uppercase tracking-widest text-[var(--silver)] mb-4">How it works</p>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { n: '01', title: 'Tell us what you need', body: 'Name, ID number, loan amount and term. Takes 60 seconds.' },
            { n: '02', title: 'We check your credit once', body: 'One pull against Experian and SureSystems. Your score is unaffected.' },
            { n: '03', title: 'Compare and choose', body: 'Ranked offers from every qualifying lender, sorted by monthly payment.' },
          ].map(({ n, title, body }) => (
            <div key={n} className="card p-6">
              <p className="mono text-4xl text-[rgba(212,148,58,0.3)] font-bold mb-4">{n}</p>
              <p className="font-semibold text-[var(--white)] mb-2">{title}</p>
              <p className="text-sm text-[var(--silver)] leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}
