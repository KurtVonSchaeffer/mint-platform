'use client';

import { useState } from 'react';
import Image from 'next/image';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';

interface Item { description: string; quantity: number; unit_price_cents: number; total_cents: number; }

interface Props {
  quoteId:        string;
  reference:      string;
  clientName:     string;
  status:         'draft' | 'sent' | 'accepted' | 'declined' | 'expired';
  subtotalCents:  number;
  vatCents:       number;
  totalCents:     number;
  validUntil:     string | null;
  notes:          string | null;
  items:          Item[];
}

const fmt = (cents: number) =>
  new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', minimumFractionDigits: 2 }).format(cents / 100);

export function BiztechQuotePage(props: Props) {
  const [status, setStatus] = useState(props.status);
  const [loading, setLoading] = useState<'accept' | 'decline' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const s: React.CSSProperties = {
    fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
    background: '#07070f', color: '#e4e4e7', minHeight: '100vh', margin: 0, padding: '40px 20px',
  };

  async function respond(action: 'accept' | 'decline') {
    setLoading(action);
    setError(null);
    try {
      const res = await fetch(`/api/biztech-quote/${props.quoteId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Something went wrong');
      setStatus(action === 'accept' ? 'accepted' : 'declined');
    } catch (err) {
      setError(String(err instanceof Error ? err.message : err));
    } finally {
      setLoading(null);
    }
  }

  if (status === 'accepted' || status === 'declined') {
    const accepted = status === 'accepted';
    return (
      <div style={s}>
        <div style={{ maxWidth: 480, margin: '0 auto', textAlign: 'center', paddingTop: 60 }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: accepted ? 'rgba(52,211,153,0.12)' : 'rgba(148,163,184,0.12)', border: `1px solid ${accepted ? 'rgba(52,211,153,0.3)' : 'rgba(148,163,184,0.3)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
            {accepted ? <CheckCircle2 size={32} color="#34d399" /> : <XCircle size={32} color="#94a3b8" />}
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#fafafa', margin: '0 0 10px' }}>
            {accepted ? 'Quote accepted' : 'Quote declined'}
          </h1>
          <p style={{ color: '#71717a', fontSize: 14 }}>
            {accepted ? "Thanks — we'll follow up shortly to get started." : 'Thanks for letting us know.'}
          </p>
          <p style={{ color: '#52525b', fontSize: 12, marginTop: 16, fontFamily: 'monospace' }}>{props.reference}</p>
        </div>
      </div>
    );
  }

  const expired = status === 'expired';

  return (
    <div style={s}>
      <div style={{ maxWidth: 480, margin: '0 auto' }}>

        <div style={{ marginBottom: 32 }}>
          <Image src="/mint-logo-white.png" alt="MINT Platforms" width={130} height={34} priority />
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#8b6ce8', margin: '8px 0 0' }}>BizTech</p>
        </div>

        <div style={{ background: 'linear-gradient(135deg, rgba(49,0,94,0.5), rgba(92,59,207,0.25))', border: '1px solid rgba(92,59,207,0.3)', borderRadius: 14, padding: '20px 24px', marginBottom: 24 }}>
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#DDC357', margin: '0 0 14px' }}>Quote</p>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div>
              <p style={{ fontSize: 13, color: '#a1a1aa', margin: '0 0 2px' }}>{props.clientName}</p>
              <p style={{ fontSize: 12, fontFamily: 'monospace', color: '#71717a', margin: 0 }}>{props.reference}</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: 26, fontWeight: 700, color: '#fafafa', margin: '0 0 2px' }}>{fmt(props.totalCents)}</p>
              {props.validUntil && <p style={{ fontSize: 11, color: '#71717a', margin: 0 }}>valid until {props.validUntil}</p>}
            </div>
          </div>
        </div>

        {props.items.length > 0 && (
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '16px 20px', marginBottom: 16 }}>
            {props.items.map((it, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < props.items.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none', fontSize: 13 }}>
                <span style={{ color: '#a1a1aa' }}>{it.description} {it.quantity > 1 ? `× ${it.quantity}` : ''}</span>
                <span style={{ color: '#e4e4e7', fontWeight: 600 }}>{fmt(it.total_cents)}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0 0', fontSize: 12, color: '#71717a' }}>
              <span>Subtotal</span><span>{fmt(props.subtotalCents)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 12, color: '#71717a' }}>
              <span>VAT (15%)</span><span>{fmt(props.vatCents)}</span>
            </div>
          </div>
        )}

        {props.notes && (
          <p style={{ fontSize: 12, color: '#71717a', fontStyle: 'italic', marginBottom: 16 }}>{props.notes}</p>
        )}

        {expired ? (
          <div style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.25)', borderRadius: 14, padding: '20px 24px', textAlign: 'center' }}>
            <p style={{ color: '#fbbf24', fontWeight: 700, fontSize: 14, margin: 0 }}>This quote has expired</p>
            <p style={{ color: '#71717a', fontSize: 12, marginTop: 6 }}>Contact us for an updated quote.</p>
          </div>
        ) : (
          <>
            {error && <p style={{ color: '#f87171', fontSize: 12, marginBottom: 12, textAlign: 'center' }}>{error}</p>}
            <button
              onClick={() => respond('accept')}
              disabled={loading !== null}
              style={{ width: '100%', background: 'linear-gradient(135deg,#059669,#34d399)', color: '#fff', border: 'none', borderRadius: 10, padding: '13px', fontWeight: 700, fontSize: 14, cursor: 'pointer', marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: loading ? 0.7 : 1 }}
            >
              {loading === 'accept' ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
              Accept quote
            </button>
            <button
              onClick={() => respond('decline')}
              disabled={loading !== null}
              style={{ width: '100%', background: 'transparent', color: '#a1a1aa', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '13px', fontWeight: 600, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: loading ? 0.7 : 1 }}
            >
              {loading === 'decline' ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
              Decline
            </button>
          </>
        )}

      </div>
    </div>
  );
}
