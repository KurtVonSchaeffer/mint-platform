'use client';

import { useState, useRef } from 'react';
import { CheckCircle2 } from 'lucide-react';
import Image from 'next/image';
import { SignaturePad, type SignaturePadHandle } from '@/components/SignaturePad';

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
  token:         string;
  leadId:        string;
  clientName:    string;
  contactName:   string;
  alreadySigned: boolean;
  signedBy?:     string;
  signedAt?:     string;
}

export function SignAgreementForm({ token, clientName, alreadySigned, signedBy, signedAt }: Props) {
  const [accepted, setAccepted] = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [done,     setDone]     = useState(alreadySigned);
  const [error,    setError]    = useState('');
  const sigPadRef = useRef<SignaturePadHandle>(null);

  async function sign() {
    if (!accepted) { setError('Please accept the terms first.'); return; }
    if (!sigPadRef.current || sigPadRef.current.isEmpty()) { setError('Please draw your signature above.'); return; }
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/sign/${token}`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agreement_accepted:  true,
          agreement_signature: sigPadRef.current?.toDataURL() ?? '',
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
    <div style={{ minHeight: '100vh', background: '#07070f', fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif', color: '#e4e4e7' }}>

      {/* Top nav */}
      <nav style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '0 32px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Image src="/algolend-logo.svg" alt="AlgoLend" width={120} height={28} priority />
        <span style={{ fontSize: 12, color: '#52525b', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600 }}>Service Agreement</span>
      </nav>

      {/* Content */}
      <div style={{ maxWidth: 660, margin: '0 auto', padding: '48px 24px 80px' }}>

        {done ? (
          /* ── Signed confirmation ── */
          <div style={{ textAlign: 'center', paddingTop: 40 }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
              <CheckCircle2 size={28} color="#34d399" />
            </div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: '#fafafa', margin: '0 0 8px' }}>Agreement signed</h1>
            <p style={{ fontSize: 14, color: '#71717a', margin: '0 0 32px' }}>
              Thank you — your account manager will be in touch shortly.
            </p>
            {signedBy?.startsWith('data:image') && (
              <div style={{ background: '#fff', borderRadius: 12, padding: '12px 24px', display: 'inline-block', marginBottom: 12 }}>
                <img src={signedBy} alt="Your signature" style={{ maxHeight: 64, maxWidth: 260, display: 'block' }} />
              </div>
            )}
            {signedAt && (
              <p style={{ fontSize: 12, color: '#3f3f46', marginTop: 8 }}>Signed {fmtDate(signedAt)}</p>
            )}
          </div>
        ) : (
          <>
            {/* Page header */}
            <div style={{ marginBottom: 32, paddingBottom: 24, borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#7C3AED', margin: '0 0 8px' }}>
                Service Agreement
              </p>
              <h1 style={{ fontSize: 28, fontWeight: 700, color: '#fafafa', margin: '0 0 6px', letterSpacing: '-0.3px' }}>
                {clientName}
              </h1>
              <p style={{ fontSize: 14, color: '#52525b', margin: 0 }}>
                Please read the full agreement below before signing.
              </p>
            </div>

            {/* Agreement text */}
            <div style={{
              background: 'rgba(255,255,255,0.025)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 14,
              padding: '20px 24px',
              marginBottom: 28,
              maxHeight: 340,
              overflowY: 'auto',
            }}>
              <pre style={{ margin: 0, fontFamily: 'inherit', fontSize: 13, lineHeight: 1.8, color: '#71717a', whiteSpace: 'pre-wrap' }}>
                {AGREEMENT_TEXT}
              </pre>
            </div>

            {/* Accept checkbox */}
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer', marginBottom: 28, padding: '16px', background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.15)', borderRadius: 12 }}>
              <input
                type="checkbox"
                checked={accepted}
                onChange={e => setAccepted(e.target.checked)}
                style={{ marginTop: 2, accentColor: '#7C3AED', width: 16, height: 16, flexShrink: 0, cursor: 'pointer' }}
              />
              <span style={{ fontSize: 13, color: '#a1a1aa', lineHeight: 1.6 }}>
                I, on behalf of <strong style={{ color: '#e4e4e7' }}>{clientName}</strong>, have read, understood, and agree to be bound by the terms of this Service Agreement.
              </span>
            </label>

            {/* Signature */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                  Draw your signature
                </label>
                <button
                  type="button"
                  onClick={() => sigPadRef.current?.clear()}
                  disabled={!accepted}
                  style={{
                    fontSize: 11, padding: '4px 12px', borderRadius: 6,
                    border: '1px solid rgba(255,255,255,0.1)',
                    background: 'transparent', color: '#52525b',
                    cursor: accepted ? 'pointer' : 'not-allowed',
                    opacity: accepted ? 1 : 0.35,
                  }}>
                  Clear
                </button>
              </div>
              <SignaturePad ref={sigPadRef} disabled={!accepted} />
              <p style={{ fontSize: 11, color: '#3f3f46', marginTop: 8 }}>
                By signing above you are creating a legally binding digital signature under the ECT Act.
              </p>
            </div>

            {error && (
              <div style={{ fontSize: 13, color: '#f87171', marginBottom: 20, padding: '12px 16px', background: 'rgba(248,113,113,0.07)', borderRadius: 10, border: '1px solid rgba(248,113,113,0.18)' }}>
                {error}
              </div>
            )}

            <button
              onClick={sign}
              disabled={saving}
              style={{
                width: '100%', padding: '15px', borderRadius: 12, border: 'none', cursor: saving ? 'wait' : 'pointer',
                background: 'linear-gradient(135deg, #6D28D9, #7C3AED)',
                color: '#fff', fontSize: 15, fontWeight: 700, letterSpacing: '-0.1px',
                boxShadow: '0 8px 24px -6px rgba(124,58,237,0.5)',
                opacity: saving ? 0.7 : 1,
                transition: 'opacity 0.15s, transform 0.1s',
              }}
            >
              {saving ? 'Saving…' : 'Sign Agreement →'}
            </button>

            <p style={{ fontSize: 11, color: '#3f3f46', textAlign: 'center', marginTop: 16 }}>
              Secured by Mint Platforms · accounts@algolend.co.za
            </p>
          </>
        )}
      </div>
    </div>
  );
}
