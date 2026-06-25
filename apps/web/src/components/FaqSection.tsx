'use client';

import { useState } from 'react';
import { Plus, Minus } from 'lucide-react';

const FAQS = [
  {
    q: 'How long does implementation take?',
    a: 'Typically 2 business days from signed agreement to go-live for a standard deployment. Complex custom scorecards and multi-integration setups may take longer — we will scope that with you upfront.',
  },
  {
    q: 'Do I own my data?',
    a: "Absolutely. Your data lives in a private, fully isolated environment — entirely separate from other AlgoLend clients. Mint Platforms has no access to your borrower data unless you explicitly grant it for support purposes.",
  },
  {
    q: 'What happens if Experian or SureSystems goes down?',
    a: "The platform is built to degrade gracefully. If a bureau is unavailable, the credit engine continues with the data it has, flagging the missing component for manual review. You never lose an application.",
  },
  {
    q: 'Can I configure my own credit scorecard?',
    a: "Yes — this is the core of what we do. Your scorecard, rate bands, product rules, and affordability parameters are all configured per your credit policy. Nothing is shared with other lenders on the platform.",
  },
  {
    q: 'Is the platform NCA compliant?',
    a: "Yes. Affordability calculations, pre-agreement quotations, fee disclosure, and cooling-off rules are all architected into the credit engine. SACRRA bureau reporting runs automatically on the 28th of each month.",
  },
  {
    q: 'What does the monthly fee cover?',
    a: "Hosting and infrastructure, all security patches, regulatory updates (including SACRRA layout changes), new platform features, and priority support. Pass-through API costs (Experian, TruID, e-contracts) are billed at cost with no markup.",
  },
  {
    q: 'Can we white-label it completely?',
    a: "Yes — your logo, your colours, your domain. Borrowers never see any AlgoLend or Mint Platforms branding. Even transactional emails come from your domain.",
  },
  {
    q: 'Do you support multi-branch lending?',
    a: "Yes. Branch management, consultant assignment, and branch-scoped portfolio views are available as an add-on. Each branch can have its own manager and team with appropriate access controls.",
  },
];

function FaqItem({
  q, a, index, open, onToggle,
}: {
  q: string; a: string; index: number; open: boolean; onToggle: () => void;
}) {
  return (
    <div
      className="group border-b last:border-b-0 transition-colors duration-200"
      style={{ borderColor: 'var(--color-border-soft)' }}
    >
      <button
        onClick={onToggle}
        className="w-full flex items-start gap-5 py-6 text-left cursor-pointer"
        aria-expanded={open}
      >
        {/* Number */}
        <span
          className="shrink-0 text-[11px] font-bold font-mono mt-0.5 transition-colors duration-200"
          style={{ color: open ? '#7C3AED' : 'var(--color-ink-muted)', letterSpacing: '0.05em' }}
        >
          {String(index + 1).padStart(2, '0')}
        </span>

        {/* Question */}
        <span
          className="flex-1 text-[17px] font-semibold leading-snug transition-colors duration-200"
          style={{ color: open ? '#7C3AED' : 'var(--color-ink)' }}
        >
          {q}
        </span>

        {/* Toggle icon */}
        <span
          className="shrink-0 w-7 h-7 rounded-full border flex items-center justify-center transition-all duration-300 mt-0.5"
          style={{
            background:   open ? '#7C3AED' : 'transparent',
            borderColor:  open ? '#7C3AED' : 'var(--color-border)',
            color:        open ? '#fff'    : 'var(--color-ink-soft)',
            transform:    open ? 'rotate(0deg)' : 'rotate(0deg)',
          }}
        >
          {open
            ? <Minus size={13} strokeWidth={2.5} />
            : <Plus  size={13} strokeWidth={2.5} />}
        </span>
      </button>

      {/* Answer — CSS grid trick for smooth height animation */}
      <div
        className="overflow-hidden transition-all duration-300 ease-in-out"
        style={{
          display:           'grid',
          gridTemplateRows:  open ? '1fr' : '0fr',
          transition:        'grid-template-rows 0.32s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <div className="overflow-hidden">
          <p
            className="text-[15px] leading-relaxed pb-6 pl-10"
            style={{ color: 'var(--color-ink-soft)' }}
          >
            {a}
          </p>
        </div>
      </div>
    </div>
  );
}

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  function toggle(i: number) {
    setOpenIndex(prev => (prev === i ? null : i));
  }

  return (
    <section id="faq" className="py-24" style={{ background: 'var(--color-bg)' }}>
      <div className="max-w-[860px] mx-auto px-6">

        {/* Header */}
        <div className="text-center mb-16">
          <p
            className="text-[11px] font-bold uppercase tracking-[0.18em] mb-4"
            style={{ color: '#7C3AED', fontFamily: 'var(--font-geist-mono, monospace)' }}
          >
            Common questions
          </p>
          <h2
            className="text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tight leading-[1.05]"
            style={{ color: 'var(--color-ink)' }}
          >
            Everything you need<br />to know.
          </h2>
        </div>

        {/* Accordion */}
        <div
          className="rounded-3xl overflow-hidden"
          style={{
            border:     '1px solid var(--color-border-soft)',
            background: 'var(--color-surface)',
            boxShadow:  '0 4px 40px rgba(0,0,0,0.05)',
          }}
        >
          <div className="px-8">
            {FAQS.map((item, i) => (
              <FaqItem
                key={i}
                q={item.q}
                a={item.a}
                index={i}
                open={openIndex === i}
                onToggle={() => toggle(i)}
              />
            ))}
          </div>
        </div>

        {/* CTA nudge */}
        <p className="text-center mt-8 text-sm" style={{ color: 'var(--color-ink-soft)' }}>
          Still have questions?{' '}
          <a
            href="#enquire"
            className="font-semibold underline underline-offset-2 transition-colors hover:text-[#7C3AED]"
            style={{ color: 'var(--color-ink)' }}
          >
            Book a 30-minute walk-through →
          </a>
        </p>
      </div>
    </section>
  );
}
