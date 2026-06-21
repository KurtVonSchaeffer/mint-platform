

import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { Menu, X, ArrowRight } from 'lucide-react';

const links = [
  { label: 'Platform',     href: '#platform'   },
  { label: 'How it works', href: '#process'     },
  { label: 'Compliance',   href: '#compliance'  },
  { label: 'Pricing',      href: '#pricing'     },
  { label: 'FAQ',          href: '#faq'         },
];

export function MobileNav({ scrolled = true }: { scrolled?: boolean }) {
  const [open, setOpen] = useState(false);

  // Close on route change / hash click
  function close() { setOpen(false); }

  // Lock body scroll when open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return (
    <div className="md:hidden">
      <button
        onClick={() => setOpen(o => !o)}
        aria-label={open ? 'Close menu' : 'Open menu'}
        className="p-2 rounded-xl transition-colors"
        style={{ color: scrolled ? 'var(--color-ink)' : '#ffffff' }}
      >
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)' }}
            onClick={close}
          />

          {/* Drawer */}
          <div
            className="fixed top-16 left-0 right-0 z-50 border-b"
            style={{
              background: 'var(--color-bg)',
              borderColor: 'var(--color-border-soft)',
              animation: 'slideDown 0.25s cubic-bezier(0.16,1,0.3,1) both',
            }}
          >
            <nav className="max-w-[1200px] mx-auto px-6 py-4 space-y-1">
              {links.map(l => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={close}
                  className="flex items-center justify-between py-3 px-4 rounded-xl text-[15px] font-medium transition-colors"
                  style={{ color: 'var(--color-ink-soft)' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--color-surface-2)'; (e.currentTarget as HTMLElement).style.color = 'var(--color-ink)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--color-ink-soft)'; }}
                >
                  {l.label}
                </Link>
              ))}
              <div className="pt-3 pb-2">
                <Link
                  href="#enquire"
                  onClick={close}
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-full font-semibold text-[14px] transition-transform hover:-translate-y-px"
                  style={{ background: 'var(--color-ink)', color: 'var(--color-bg)' }}
                >
                  Book a demo <ArrowRight size={14} />
                </Link>
              </div>
            </nav>
          </div>

          <style>{`
            @keyframes slideDown {
              from { opacity: 0; transform: translateY(-8px); }
              to   { opacity: 1; transform: translateY(0); }
            }
          `}</style>
        </>
      )}
    </div>
  );
}
