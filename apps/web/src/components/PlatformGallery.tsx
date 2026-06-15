'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ArrowRight, Monitor, Smartphone, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';

/* ─── View data ─────────────────────────────────────────────────────── */

const VIEWS = [
  {
    id: 'lender',
    tab: 'Lender view',
    icon: Monitor,
    label: 'Underwriter console',
    description: 'Bloomberg-grade admin portal. Full credit pipeline, live portfolio health, SACRRA compliance, and integrated bureau checks — in one screen.',
    bullets: [
      'Credit applications pipeline with scoring',
      'Live portfolio health & NPA tracking',
      'SACRRA bureau reporting (auto-28th)',
      'TruID, Experian & DocuSeal integrations',
    ],
    src: '/screenshots/lender-dashboard.jpg',
    alt: 'AlgoLend lender admin dashboard',
    device: 'desktop',
  },
  {
    id: 'borrower',
    tab: 'Borrower view',
    icon: Smartphone,
    label: 'Client self-service portal',
    description: 'Fully branded, mobile-first portal for your borrowers. Apply, track repayments, sign contracts, and manage documents — all without calling your office.',
    bullets: [
      'One-click loan application flow',
      'Live repayment schedule & balance',
      'NCA quotation & DocuSeal e-signing',
      'WhatsApp payment notifications',
    ],
    src: '/screenshots/borrower-portal.jpg',
    alt: 'AlgoLend borrower self-service portal',
    device: 'desktop',
  },
] as const;

type ViewId = typeof VIEWS[number]['id'];

/* ─── Component ─────────────────────────────────────────────────────── */

export function PlatformGallery() {
  const [active, setActive] = useState<ViewId>('lender');
  const idx   = VIEWS.findIndex((v) => v.id === active);
  const view  = VIEWS[idx];

  function prev() { setActive(VIEWS[(idx - 1 + VIEWS.length) % VIEWS.length].id); }
  function next() { setActive(VIEWS[(idx + 1) % VIEWS.length].id); }

  return (
    <section className="bg-[var(--color-bg)] py-24 border-t border-[var(--color-border-soft)]">
      <div className="max-w-[1200px] mx-auto px-6">

        {/* Header */}
        <div className="text-center mb-12">
          <p className="eyebrow mb-4">Platform preview</p>
          <h2 className="headline text-4xl md:text-5xl lg:text-6xl font-semibold mb-5">
            See it for real.
          </h2>
          <p className="text-lg text-[var(--color-ink-soft)] max-w-xl mx-auto">
            One platform, two purpose-built surfaces. Switch between the lender
            console and the borrower portal below.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center justify-center gap-2 mb-10">
          {VIEWS.map((v) => {
            const Icon = v.icon;
            const isActive = v.id === active;
            return (
              <button
                key={v.id}
                onClick={() => setActive(v.id)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all"
                style={isActive
                  ? { background: 'var(--color-ink)', color: 'var(--color-bg)', boxShadow: '0 4px 16px -4px rgba(9,9,11,0.35)' }
                  : { background: 'var(--color-surface)', color: 'var(--color-ink-soft)', border: '1px solid var(--color-border)' }
                }
              >
                <Icon size={14} />
                {v.tab}
              </button>
            );
          })}
        </div>

        {/* Main view */}
        <div className="grid lg:grid-cols-[1fr_2fr] gap-10 items-center">

          {/* Left — description */}
          <div>
            <div
              className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full mb-5"
              style={{ background: 'rgba(124,58,237,0.08)', color: '#7C3AED', border: '1px solid rgba(124,58,237,0.15)' }}
            >
              <view.icon size={12} />
              {view.label}
            </div>
            <h3 className="text-3xl font-semibold tracking-tight mb-4">
              {view.id === 'lender' ? (
                <>Your underwriters<br />get full control.</>
              ) : (
                <>Your borrowers<br />help themselves.</>
              )}
            </h3>
            <p className="text-[var(--color-ink-soft)] leading-relaxed mb-6">
              {view.description}
            </p>
            <ul className="space-y-2.5 mb-8">
              {view.bullets.map((b) => (
                <li key={b} className="flex items-start gap-2.5 text-sm text-[var(--color-ink-soft)]">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-brand)" strokeWidth="2.5" strokeLinecap="round" className="mt-0.5 shrink-0">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  {b}
                </li>
              ))}
            </ul>
            <Link
              href="#enquire"
              className="inline-flex items-center gap-2 text-sm font-semibold px-5 py-3 rounded-full transition-all hover:-translate-y-0.5"
              style={{ background: 'var(--color-ink)', color: 'var(--color-bg)', boxShadow: '0 8px 24px -6px rgba(9,9,11,0.35)' }}
            >
              Book a live walk-through
              <ArrowRight size={14} />
            </Link>
          </div>

          {/* Right — screenshot */}
          <div className="relative">
            {/* Browser chrome */}
            <div
              className="rounded-2xl overflow-hidden"
              style={{ boxShadow: '0 24px 64px -16px rgba(0,0,0,0.28), 0 0 0 1px rgba(0,0,0,0.06)' }}
            >
              {/* Browser chrome top bar */}
              <div
                className="flex items-center gap-2 px-4 py-3"
                style={{ background: '#1e1e1e' }}
              >
                <span className="w-3 h-3 rounded-full bg-red-500/70" />
                <span className="w-3 h-3 rounded-full bg-yellow-500/70" />
                <span className="w-3 h-3 rounded-full bg-green-500/70" />
                <div
                  className="flex-1 mx-4 px-3 py-1 rounded-md text-xs text-center"
                  style={{ background: '#2d2d2d', color: '#888', fontFamily: 'monospace' }}
                >
                  {view.id === 'lender' ? 'admin.algolend.co.za/dashboard' : 'portal.algolend.co.za/dashboard'}
                </div>
              </div>
              <Image
                key={view.id}
                src={view.src}
                alt={view.alt}
                width={1400}
                height={860}
                className="w-full block"
                style={{ animation: 'fade-up 0.4s cubic-bezier(0.16,1,0.3,1) both' }}
                unoptimized
              />
            </div>

            {/* Prev / Next arrows */}
            <button
              onClick={prev}
              className="absolute -left-5 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center transition-all hover:-translate-y-1/2 hover:scale-110"
              style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }}
              aria-label="Previous"
            >
              <ChevronLeft size={16} style={{ color: 'var(--color-ink-soft)' }} />
            </button>
            <button
              onClick={next}
              className="absolute -right-5 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center transition-all hover:-translate-y-1/2 hover:scale-110"
              style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }}
              aria-label="Next"
            >
              <ChevronRight size={16} style={{ color: 'var(--color-ink-soft)' }} />
            </button>
          </div>
        </div>

        {/* Dot indicators */}
        <div className="flex items-center justify-center gap-2 mt-10">
          {VIEWS.map((v, i) => (
            <button
              key={v.id}
              onClick={() => setActive(v.id)}
              className="rounded-full transition-all"
              style={{
                width: v.id === active ? '24px' : '8px',
                height: '8px',
                background: v.id === active ? 'var(--color-ink)' : 'var(--color-border)',
              }}
              aria-label={v.tab}
            />
          ))}
        </div>

      </div>
    </section>
  );
}
