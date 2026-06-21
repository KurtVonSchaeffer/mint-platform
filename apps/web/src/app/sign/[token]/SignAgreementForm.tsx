'use client';

import { useState } from 'react';
import { CheckCircle2, FileText, Pen } from 'lucide-react';

const AGREEMENT_TEXT = `SERVICE AGREEMENT

This Service Agreement ("Agreement") is entered into between Mint Platforms (Pty) Ltd, Registration No. 2024/123456/07, ("Service Provider") and the Client identified in this application ("Client").

1. SERVICES
The Service Provider agrees to provide the AlgoLend lending management platform ("Platform") to the Client, including loan origination, borrower management, bureau integrations, and related services as specified in the selected service tier.

2. SUBSCRIPTION FEES
The Client agrees to pay the monthly subscription fee applicable to their selected tier. Fees are invoiced monthly in advance and due within 30 days of invoice date. Late payments attract interest at prime + 2% per annum.

3. TERM AND TERMINATION
This Agreement commences on the activation date and continues month-to-month unless either party provides 30 days written notice of termination. The Service Provider may terminate immediately for non-payment or breach of this Agreement.

4. ACCEPTABLE USE
The Client agrees to use the Platform solely for lawful lending activities and in compliance with all applicable South African laws, including the National Credit Act 34 of 2005, POPIA, FICA, and any applicable NCR regulations. The Client warrants that they hold all required licences.

5. DATA AND PRIVACY
The Service Provider will process personal data on behalf of the Client in accordance with POPIA. The Client remains the responsible party for all borrower data processed through the Platform. The Service Provider implements industry-standard security measures to protect all data.

6. INTELLECTUAL PROPERTY
The Platform and all related intellectual property remain the exclusive property of the Service Provider. This Agreement grants the Client a non-exclusive, non-transferable licence to use the Platform for the duration of the Agreement.

7. LIMITATION OF LIABILITY
The Service Provider's liability is limited to the fees paid in the 3 months preceding any claim. The Service Provider is not liable for indirect, consequential, or special damages.

8. SUPPORT
Technical support during business hours (08:00–17:00 SAST, Monday–Friday, excluding public holidays). Critical issues addressed within 4 business hours.

9. CONFIDENTIALITY
Both parties agree to keep confidential all proprietary information disclosed under this Agreement and not to disclose it to third parties without prior written consent.

10. GOVERNING LAW
This Agreement is governed by the laws of the Republic of South Africa. Disputes will be resolved in the courts of Gauteng, South Africa.

By signing below, the Client confirms they have read, understood, and agree to be bound by the terms of this Agreement.`;

interface Props {
  token:        string;
  leadId:       string;
  clientName:   string;
  contactName:  string;
  alreadySigned: boolean;
  signedBy?:    string;
  signedAt?:    string;
}

export function SignAgreementForm({ token, leadId, clientName, contactName, alreadySigned, signedBy, signedAt }: Props) {
  const [accepted,  setAccepted]  = useState(false);
  const [signature, setSignature] = useState('');
  const [saving,    setSaving]    = useState(false);
  const [done,      setDone]      = useState(alreadySigned);
  const [error,     setError]     = useState('');

  async function sign() {
    if (!accepted || !signature.trim()) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/sign/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agreement_accepted:  true,
          agreement_signature: signature.trim(),
          agreement_signed_at: new Date().toISOString(),
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed to save');
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  const fmtDate = (iso?: string) => iso
    ? new Date(iso).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '';

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif', color: '#e4e4e7' }}>
      {/* Header */}
      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg,#7C3AED,#9B5CF6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <FileText size={16} color="#fff" />
        </div>
        <div>
          <p style={{ fontWeight: 700, fontSize: 15, margin: 0 }}>AlgoLend</p>
          <p style={{ fontSize: 11, color: '#71717a', margin: 0 }}>Service Agreement</p>
        </div>
      </div>

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '32px 24px' }}>

        {/* Title */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 6px', color: '#fafafa' }}>
            Service Agreement
          </h1>
          <p style={{ fontSize: 14, color: '#71717a', margin: 0 }}>
            {clientName} · Please read carefully before signing
          </p>
        </div>

        {done ? (
          /* ── Already signed ── */
          <div style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.25)', borderRadius: 16, padding: 32, textAlign: 'center' }}>
            <CheckCircle2 size={40} color="#34d399" style={{ marginBottom: 16 }} />
            <p style={{ fontSize: 18, fontWeight: 700, color: '#34d399', margin: '0 0 8px' }}>Agreement Signed</p>
            <p style={{ fontSize: 13, color: '#71717a', margin: '0 0 4px' }}>
              Signed by <strong style={{ color: '#e4e4e7' }}>{signedBy ?? signature}</strong>
            </p>
            {(signedAt || done) && (
              <p style={{ fontSize: 12, color: '#52525b', margin: 0 }}>
                {signedAt ? fmtDate(signedAt) : fmtDate(new Date().toISOString())}
              </p>
            )}
            <p style={{ fontSize: 13, color: '#71717a', marginTop: 20 }}>
              Thank you. Your account manager will be in touch shortly to complete your onboarding.
            </p>
          </div>
        ) : (
          <>
            {/* Agreement text */}
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 20, marginBottom: 24, maxHeight: 360, overflowY: 'auto' }}>
              <pre style={{ margin: 0, fontFamily: 'inherit', fontSize: 13, lineHeight: 1.75, color: '#a1a1aa', whiteSpace: 'pre-wrap' }}>
                {AGREEMENT_TEXT}
              </pre>
            </div>

            {/* Accept checkbox */}
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer', marginBottom: 20 }}>
              <input
                type="checkbox"
                checked={accepted}
                onChange={e => setAccepted(e.target.checked)}
                style={{ marginTop: 3, accentColor: '#7C3AED', width: 16, height: 16, flexShrink: 0 }}
              />
              <span style={{ fontSize: 13, color: '#a1a1aa', lineHeight: 1.5 }}>
                I, on behalf of <strong style={{ color: '#e4e4e7' }}>{clientName}</strong>, have read, understood, and agree to be bound by the terms of this Service Agreement.
              </span>
            </label>

            {/* Signature input */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#71717a', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Digital Signature — type your full name
              </label>
              <div style={{ position: 'relative' }}>
                <Pen size={14} color="#52525b" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                <input
                  type="text"
                  value={signature}
                  onChange={e => setSignature(e.target.value)}
                  placeholder={contactName ?? 'Your full name'}
                  disabled={!accepted}
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    background: accepted ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${accepted ? 'rgba(124,58,237,0.4)' : 'rgba(255,255,255,0.08)'}`,
                    borderRadius: 10, padding: '12px 14px 12px 36px',
                    color: '#fafafa', fontSize: 15, fontStyle: 'italic',
                    opacity: accepted ? 1 : 0.4, outline: 'none',
                  }}
                />
              </div>
              <p style={{ fontSize: 11, color: '#52525b', marginTop: 6 }}>
                By typing your name above you are creating a legally binding digital signature.
              </p>
            </div>

            {error && (
              <p style={{ fontSize: 13, color: '#f87171', marginBottom: 16, padding: '10px 14px', background: 'rgba(248,113,113,0.08)', borderRadius: 8, border: '1px solid rgba(248,113,113,0.2)' }}>
                {error}
              </p>
            )}

            <button
              onClick={sign}
              disabled={!accepted || !signature.trim() || saving}
              style={{
                width: '100%', padding: '14px', borderRadius: 12, border: 'none', cursor: 'pointer',
                background: (!accepted || !signature.trim()) ? 'rgba(124,58,237,0.3)' : 'linear-gradient(135deg,#7C3AED,#9B5CF6)',
                color: '#fff', fontSize: 15, fontWeight: 700,
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? 'Saving signature…' : 'Sign Agreement'}
            </button>

            <p style={{ fontSize: 11, color: '#3f3f46', textAlign: 'center', marginTop: 16 }}>
              Your signature and timestamp will be recorded securely. A copy will be emailed to you.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
