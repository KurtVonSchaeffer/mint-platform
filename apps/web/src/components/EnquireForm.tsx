'use client';

import { useState } from 'react';
import { ArrowUpRight, Check, AlertCircle } from 'lucide-react';

type Status = 'idle' | 'submitting' | 'success' | 'error';

export function EnquireForm() {
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setStatus('submitting');

    const fd = new FormData(e.currentTarget);
    const first = String(fd.get('first') ?? '').trim();
    const last  = String(fd.get('last') ?? '').trim();
    const payload = {
      name:    `${first} ${last}`.trim() || first || last,
      email:   String(fd.get('email')   ?? '').trim(),
      company: String(fd.get('company') ?? '').trim(),
      message: String(fd.get('message') ?? '').trim(),
    };

    if (!payload.name || !payload.email || !payload.company) {
      setStatus('error');
      setError('Please fill in your name, email, and company.');
      return;
    }

    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus('error');
        setError(typeof json?.error === 'string' ? json.error : 'Something went wrong. Please try again.');
        return;
      }
      setStatus('success');
      (e.currentTarget as HTMLFormElement).reset();
    } catch {
      setStatus('error');
      setError('Network error. Please try again.');
    }
  }

  if (status === 'success') {
    return (
      <div className="rounded-3xl p-10 text-center bg-white/5 border border-white/10" style={{ animation: 'fade-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) both' }}>
        <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center">
          <Check size={24} className="text-emerald-400" />
        </div>
        <h3 className="text-2xl font-semibold text-white mb-2">Enquiry received.</h3>
        <p className="text-sm text-white/55 mb-6 max-w-sm mx-auto">
          We'll be in touch within one business day — or skip the wait and book a time directly.
        </p>
        <a
          href="https://calendly.com/mintplatforms"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 w-full bg-white text-[#09090B] font-semibold text-[14px] px-5 py-3.5 rounded-2xl transition-all hover:-translate-y-0.5 mb-4"
          style={{ boxShadow: '0 8px 24px -6px rgba(255,255,255,0.2)' }}
        >
          Book a time now
          <ArrowUpRight size={15} />
        </a>
        <button
          type="button"
          onClick={() => setStatus('idle')}
          className="text-xs font-mono uppercase tracking-[0.18em] text-white/40 hover:text-white transition-colors"
        >
          ← Send another enquiry
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="rounded-3xl p-8 bg-white/5 border border-white/10 space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {[
          { id: 'first', label: 'First name', placeholder: 'Sipho' },
          { id: 'last',  label: 'Last name',  placeholder: 'Nkosi' },
        ].map((f) => (
          <div key={f.id}>
            <label htmlFor={f.id} className="block text-[11px] font-medium mb-1.5 text-white/45 uppercase tracking-wider">
              {f.label}
            </label>
            <input
              id={f.id}
              name={f.id}
              required
              autoComplete={f.id === 'first' ? 'given-name' : 'family-name'}
              placeholder={f.placeholder}
              className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-[15px] text-white placeholder:text-white/25 outline-none transition-all focus:border-white/40 focus:ring-4 focus:ring-white/8"
            />
          </div>
        ))}
      </div>

      <div>
        <label htmlFor="email" className="block text-[11px] font-medium mb-1.5 text-white/45 uppercase tracking-wider">
          Work email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="sipho@bridgecapital.co.za"
          className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-[15px] text-white placeholder:text-white/25 outline-none transition-all focus:border-white/40 focus:ring-4 focus:ring-white/8"
        />
      </div>

      <div>
        <label htmlFor="company" className="block text-[11px] font-medium mb-1.5 text-white/45 uppercase tracking-wider">
          Company / institution
        </label>
        <input
          id="company"
          name="company"
          required
          autoComplete="organization"
          placeholder="BridgeCapital Finance (Pty) Ltd"
          className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-[15px] text-white placeholder:text-white/25 outline-none transition-all focus:border-white/40 focus:ring-4 focus:ring-white/8"
        />
      </div>

      <div>
        <label htmlFor="message" className="block text-[11px] font-medium mb-1.5 text-white/45 uppercase tracking-wider">
          What are you looking to build?
        </label>
        <textarea
          id="message"
          name="message"
          rows={4}
          placeholder="Tell us about your lending model, current systems, and what you'd like to achieve..."
          className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-[15px] text-white placeholder:text-white/25 outline-none transition-all focus:border-white/40 focus:ring-4 focus:ring-white/8 resize-none"
        />
      </div>

      {status === 'error' && error ? (
        <div className="flex items-start gap-2 px-4 py-3 rounded-2xl bg-red-500/10 border border-red-500/30 text-sm text-red-300">
          <AlertCircle size={15} className="mt-0.5 shrink-0" />
          {error}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={status === 'submitting'}
        className="btn-shine w-full mt-2 inline-flex items-center justify-center gap-2 bg-white text-[#09090B] font-semibold text-[15px] px-5 py-3.5 rounded-2xl transition-all hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed"
        style={{ boxShadow: '0 12px 32px -8px rgba(255, 255, 255, 0.18)' }}
      >
        {status === 'submitting' ? (
          <>
            <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
            Sending…
          </>
        ) : (
          <>
            Book a demo
            <ArrowUpRight size={16} />
          </>
        )}
      </button>

      <p className="text-center text-[11px] mono uppercase tracking-[0.16em] text-white/30 pt-2">
        We respond within 1 business day · info@algolend.co.za
      </p>
    </form>
  );
}
