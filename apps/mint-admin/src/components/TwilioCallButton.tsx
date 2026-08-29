'use client';

import { Phone, PhoneOff, Loader2 } from 'lucide-react';
import { useTwilioDevice } from '@/hooks/useTwilioDevice';
import { getAgentId } from '@/lib/telemarketer-agent';

function fmtElapsed(secs: number) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// Drop-in replacement for a plain `tel:` link — routes the call through
// Twilio (webhook, recording, call_logs) instead of handing off to the
// device's own phone app. Each instance owns its own call state, same
// self-contained pattern as the lead detail page and Power Dialer use.
export function TwilioCallButton({ leadId, phone, className, style, compact, iconSize = 12, children }: {
  leadId:    string;
  phone:     string;
  className?: string;
  style?:    React.CSSProperties;
  compact?:  boolean;
  iconSize?: number;
  children?: React.ReactNode;
}) {
  const twilio = useTwilioDevice();
  const callActive = twilio.callState === 'active' || twilio.callState === 'ringing' || twilio.callState === 'connecting';

  async function start(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!phone || callActive) return;
    const agentId = await getAgentId();
    if (!agentId) return;
    await twilio.makeCall(phone, leadId, agentId, agentId.slice(0, 8));
  }

  function end(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    twilio.hangUp();
  }

  if (!phone) return null;

  if (callActive) {
    return (
      <span
        onClick={e => e.stopPropagation()}
        className={className}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#F87171', ...style }}
        title={twilio.error ?? undefined}
      >
        {twilio.callState === 'connecting'
          ? <Loader2 size={11} className="animate-spin" />
          : <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 11 }}>
              {twilio.callState === 'ringing' ? 'Ringing…' : fmtElapsed(twilio.elapsed)}
            </span>}
        <button onClick={end} title="End call" style={{ display: 'inline-flex', color: '#F87171' }}>
          <PhoneOff size={12} />
        </button>
      </span>
    );
  }

  return (
    <button onClick={start} className={className} style={style} title={`Call ${phone} via Twilio`}>
      {children ?? (
        <>
          <Phone size={iconSize} />
          {!compact && ' Call'}
        </>
      )}
    </button>
  );
}
