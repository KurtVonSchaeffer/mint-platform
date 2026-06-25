'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { MobileNav } from './MobileNav';

const LINKS = [
  { label: 'Home',         href: '/'             },
  { label: 'Platform',     href: '#platform'    },
  { label: 'How it works', href: '#process'      },
  { label: 'Compliance',   href: '#compliance'   },
  { label: 'Pricing',      href: '#pricing'      },
  { label: 'Admin tour',   href: '/admin-tour'   },
];

const SECTIONS = ['platform', 'process', 'compliance', 'pricing', 'faq', 'enquire'];

function Logo({ size = 28 }: { size?: number }) {
  const circleColor = '#0F1629';
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-label="AlgoLend">
      <path d="M 6 30 L 6 14 C 6 8.48 10.48 4 16 4 C 21.52 4 26 8.48 26 14 L 26 30"
        stroke="#7C3AED" strokeWidth="2.6" fill="none" strokeLinecap="round" />
      <circle cx="16" cy="15" r="5.5" fill={circleColor} />
    </svg>
  );
}

export function NavBar() {
  const [scrolled, setScrolled]   = useState(false);
  const [active, setActive]       = useState('');

  // Frosted glass after 60px scroll
  useEffect(() => {
    function onScroll() { setScrolled(window.scrollY > 60); }
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Active section via IntersectionObserver
  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    SECTIONS.forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActive(id); },
        { rootMargin: '-20% 0px -70% 0px', threshold: 0 },
      );
      obs.observe(el);
      observers.push(obs);
    });
    return () => observers.forEach(o => o.disconnect());
  }, []);

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
      style={{
        background: scrolled
          ? 'rgba(255,255,255,0.92)'
          : 'rgba(15,22,41,0.55)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        borderBottom: scrolled ? '1px solid rgba(0,0,0,0.08)' : '1px solid rgba(255,255,255,0.08)',
        boxShadow: scrolled ? '0 2px 24px rgba(0,0,0,0.07)' : 'none',
      }}
    >
      <div className="max-w-[1200px] mx-auto px-6 h-16 flex items-center justify-between">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="transition-transform duration-200 group-hover:scale-105">
            <Logo size={28} />
          </div>
          <span
            className="font-semibold tracking-tight text-[15px] transition-colors duration-200"
            style={{ color: scrolled ? '#0F1629' : '#ffffff' }}
          >
            AlgoLend
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {LINKS.map(link => {
            const id       = link.href === '/' ? '/' : link.href.replace('#', '');
            const isActive = link.href === '/' ? false : active === id;
            return (
              <Link
                key={link.href}
                href={link.href}
                className="nav-link relative px-3 py-2 text-[13px] font-medium rounded-lg transition-colors duration-200"
                style={{
                  color: isActive
                    ? '#7C3AED'
                    : scrolled
                      ? 'rgba(15,22,41,0.65)'
                      : 'rgba(255,255,255,0.8)',
                }}
                onMouseEnter={e => {
                  if (!isActive) {
                    (e.currentTarget as HTMLElement).style.color = scrolled ? '#0F1629' : '#ffffff';
                    (e.currentTarget as HTMLElement).style.background = scrolled
                      ? 'rgba(0,0,0,0.05)'
                      : 'rgba(255,255,255,0.1)';
                  }
                }}
                onMouseLeave={e => {
                  if (!isActive) {
                    (e.currentTarget as HTMLElement).style.color = scrolled
                      ? 'rgba(15,22,41,0.65)'
                      : 'rgba(255,255,255,0.8)';
                    (e.currentTarget as HTMLElement).style.background = 'transparent';
                  }
                }}
              >
                {link.label}
                {isActive && (
                  <span
                    className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                    style={{ background: '#7C3AED' }}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* CTA + mobile */}
        <div className="flex items-center gap-2">
          <Link
            href="/demo"
            className="hidden md:inline-flex items-center gap-1.5 text-[13px] font-medium px-4 py-2 rounded-full border transition-all duration-200 hover:-translate-y-px"
            style={{
              color: scrolled ? '#7C3AED' : 'rgba(255,255,255,0.85)',
              borderColor: scrolled ? 'rgba(124,58,237,0.4)' : 'rgba(255,255,255,0.25)',
              background: scrolled ? 'rgba(124,58,237,0.06)' : 'rgba(255,255,255,0.07)',
            }}
          >
            Try demo
          </Link>
          <Link
            href="/apply"
            className="btn-shine hidden md:inline-flex items-center gap-1.5 text-white text-[13px] font-semibold px-4 py-2 rounded-full transition-all duration-200 hover:-translate-y-px"
            style={{
              background: 'linear-gradient(135deg, #7C3AED 0%, #9B5CF6 100%)',
              boxShadow: '0 4px 20px rgba(124,58,237,0.4)',
            }}
          >
            Start now
            <ArrowRight size={13} />
          </Link>
          <MobileNav scrolled={scrolled} />
        </div>
      </div>
    </header>
  );
}
