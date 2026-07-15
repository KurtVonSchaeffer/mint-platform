'use client';

import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import Image from 'next/image';
import { CheckCircle2, Copy, CreditCard, Building2 } from 'lucide-react';

interface Props {
  invoiceId:    string;
  reference:    string;
  clientName:   string;
  amountStr:    string;   // pre-formatted e.g. "R 9 500.00"
  dueDate:      string;
  payfastUrl:   string;
  payfastFields: Record<string, string> | null;
  bankName:     string;
  bankAccount:  string;
  branchCode:   string;
  accountType:  string;
  payRef:       string;
}

function CopyBtn({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }
  return (
    <button
      onClick={copy}
      title="Copy"
      style={{
        background: 'none', border: 'none', cursor: 'pointer',
        color: copied ? '#34d399' : '#52525b',
        padding: '2px 4px', borderRadius: 4, transition: 'color 0.15s',
      }}
    >
      {copied ? <CheckCircle2 size={13} /> : <Copy size={13} />}
    </button>
  );
}

export function PayPage(props: Props) {
  const params = useSearchParams();
  const status = params.get('status');

  function submitPayFast() {
    if (!props.payfastFields) return;
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = props.payfastUrl;
    Object.entries(props.payfastFields).forEach(([k, v]) => {
      const input = document.createElement('input');
      input.type = 'hidden'; input.name = k; input.value = v;
      form.appendChild(input);
    });
    document.body.appendChild(form);
    form.submit();
  }

  const s: React.CSSProperties = {
    fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
    background: '#07070f', color: '#e4e4e7', minHeight: '100vh', margin: 0, padding: '40px 20px',
  };

  if (status === 'complete') {
    return (
      <div style={s}>
        <div style={{ maxWidth: 480, margin: '0 auto', textAlign: 'center', paddingTop: 60 }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
            <CheckCircle2 size={32} color="#34d399" />
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#fafafa', margin: '0 0 10px' }}>Payment received</h1>
          <p style={{ color: '#71717a', fontSize: 14 }}>Thank you — we'll send you a receipt shortly.</p>
        </div>
      </div>
    );
  }

  if (status === 'cancelled') {
    return (
      <div style={s}>
        <div style={{ maxWidth: 480, margin: '0 auto', textAlign: 'center', paddingTop: 60 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#fafafa', margin: '0 0 10px' }}>Payment cancelled</h1>
          <p style={{ color: '#71717a', fontSize: 14, marginBottom: 24 }}>No charge was made. You can try again or pay via EFT.</p>
          <button onClick={() => window.location.href = `/pay/${props.invoiceId}`} style={{ background: 'linear-gradient(135deg,#6D28D9,#7C3AED)', color: '#fff', border: 'none', borderRadius: 10, padding: '12px 28px', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
            Try again
          </button>
        </div>
      </div>
    );
  }

  const row = (label: string, value: string) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <span style={{ color: '#71717a', fontSize: 13 }}>{label}</span>
      <span style={{ color: '#e4e4e7', fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}>
        {value} <CopyBtn value={value} />
      </span>
    </div>
  );

  return (
    <div style={s}>
      <div style={{ maxWidth: 480, margin: '0 auto' }}>

        {/* Logo */}
        <div style={{ marginBottom: 32 }}>
          <Image src="/algolend-logo.svg" alt="AlgoLend" width={120} height={28} priority />
        </div>

        {/* Invoice summary */}
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '20px 24px', marginBottom: 24 }}>
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#7C3AED', margin: '0 0 14px' }}>Invoice</p>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div>
              <p style={{ fontSize: 13, color: '#a1a1aa', margin: '0 0 2px' }}>{props.clientName}</p>
              <p style={{ fontSize: 12, fontFamily: 'monospace', color: '#71717a', margin: 0 }}>{props.reference}</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: 26, fontWeight: 700, color: '#fafafa', margin: '0 0 2px' }}>{props.amountStr}</p>
              <p style={{ fontSize: 11, color: '#71717a', margin: 0 }}>due {props.dueDate}</p>
            </div>
          </div>
        </div>

        {/* PayFast — hidden until merchant credentials are configured */}
        {props.payfastFields && (
          <div style={{ background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.2)', borderRadius: 14, padding: '20px 24px', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <CreditCard size={16} color="#7C3AED" />
              <p style={{ fontSize: 13, fontWeight: 700, color: '#e4e4e7', margin: 0 }}>Pay online</p>
            </div>
            <p style={{ fontSize: 12, color: '#71717a', margin: '0 0 16px', lineHeight: 1.6 }}>
              Card, instant EFT, or SnapScan — secured by PayFast.
            </p>
            <button
              onClick={submitPayFast}
              style={{
                width: '100%', background: 'linear-gradient(135deg,#6D28D9,#7C3AED)',
                color: '#fff', border: 'none', borderRadius: 10, padding: '13px',
                fontWeight: 700, fontSize: 14, cursor: 'pointer',
                boxShadow: '0 6px 20px -4px rgba(124,58,237,0.45)',
              }}
            >
              Pay {props.amountStr} via PayFast →
            </button>
          </div>
        )}

        {/* EFT */}
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <Building2 size={16} color="#a1a1aa" />
            <p style={{ fontSize: 13, fontWeight: 700, color: '#e4e4e7', margin: 0 }}>Pay via EFT</p>
          </div>
          {row('Bank',        props.bankName)}
          {row('Account no.', props.bankAccount)}
          {row('Branch code', props.branchCode)}
          {row('Account type', props.accountType)}
          {row('Reference',   props.payRef)}
          <p style={{ fontSize: 11, color: '#52525b', margin: '12px 0 0', lineHeight: 1.6 }}>
            Use your invoice reference as the payment reference. Email
            {' '}<a href="mailto:accounts@algolend.co.za" style={{ color: '#7C3AED' }}>accounts@algolend.co.za</a>{' '}
            with your proof of payment.
          </p>
        </div>

      </div>
    </div>
  );
}
