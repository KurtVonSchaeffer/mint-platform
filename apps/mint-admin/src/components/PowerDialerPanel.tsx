'use client';

import { useState, useEffect } from 'react';
import {
  X, Phone, Mic, MicOff, PhoneOff, Timer, SkipForward,
  Loader2, PhoneCall, CheckCircle2,
} from 'lucide-react';
import { useTwilioDevice } from '@/hooks/useTwilioDevice';
import { getAgentId } from '@/lib/telemarketer-agent';

export interface DialerLead {
  id: string;
  clientName: string;
  company: string;
  phone: string;
}

const CALL_OUTCOMES = [
  { label: 'Spoke',           value: 'Spoke',              color: '#34D399', bg: 'rgba(52,211,153,0.12)',  border: 'rgba(52,211,153,0.3)'  },
  { label: 'No Answer',       value: 'No Answer',          color: '#FB923C', bg: 'rgba(251,146,60,0.12)', border: 'rgba(251,146,60,0.3)'  },
  { label: 'Call Back Later', value: 'Called Back Later',  color: '#06B6D4', bg: 'rgba(6,182,212,0.12)',  border: 'rgba(6,182,212,0.3)'   },
  { label: 'Not Interested',  value: 'Not Interested',     color: '#FB7185', bg: 'rgba(251,113,133,0.12)', border: 'rgba(251,113,133,0.3)' },
] as const;

function fmtElapsed(secs: number) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function PowerDialerPanel({ leads, onClose, onFinished }: {
  leads:      DialerLead[];
  onClose:    () => void;
  onFinished: () => void; // session ended (exhausted or stopped) — parent should refetch lead statuses
}) {
  const twilio = useTwilioDevice();
  const [index,        setIndex]        = useState(0);
  const [agentId,      setAgentId]      = useState('');
  const [logging,      setLogging]      = useState(false);
  const [showOutcomes, setShowOutcomes] = useState(false);
  const [results,      setResults]      = useState<{ leadId: string; outcome: string | 'Skipped' }[]>([]);

  useEffect(() => { getAgentId().then(id => setAgentId(id ?? '')); }, []);

  // Hang up if the panel is closed mid-call.
  useEffect(() => () => { twilio.hangUp(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (twilio.callState === 'ended') setShowOutcomes(true);
  }, [twilio.callState]);

  const current    = leads[index];
  const done       = index >= leads.length;
  const callActive = twilio.callState === 'active' || twilio.callState === 'ringing' || twilio.callState === 'connecting';

  async function call() {
    if (!current?.phone || !agentId) return;
    setShowOutcomes(false);
    await twilio.makeCall(current.phone, current.id, agentId, agentId.slice(0, 8));
  }

  async function logOutcome(outcome: string) {
    if (!current || !agentId) return;
    setLogging(true);
    await fetch('/api/telemarketer/call-logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lead_id: current.id, agent_id: agentId, outcome, twilio_call_sid: twilio.callSid }),
    });
    setResults(r => [...r, { leadId: current.id, outcome }]);
    setLogging(false);
    setShowOutcomes(false);
    setIndex(i => i + 1);
  }

  function skip() {
    if (current) setResults(r => [...r, { leadId: current.id, outcome: 'Skipped' }]);
    setShowOutcomes(false);
    setIndex(i => i + 1);
  }

  function endSession() {
    twilio.hangUp();
    onFinished();
    onClose();
  }

  const spoke = results.filter(r => r.outcome === 'Spoke').length;

  return (
    <div className="fixed inset-0 confirm-backdrop z-50 flex items-center justify-center p-4"
      style={{ animation: 'fade-in 0.2s ease-out both' }}>
      <div className="bento-card w-full max-w-lg overflow-hidden flex flex-col"
        style={{ animation: 'scale-in 0.3s cubic-bezier(0.16,1,0.3,1) both', maxHeight: '85vh' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--color-border2)' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(124,58,237,0.12)', color: 'var(--color-violet)' }}>
              <PhoneCall size={14} />
            </div>
            <div>
              <h2 className="font-bold text-sm" style={{ color: 'var(--color-text)' }}>Power Dialer</h2>
              <p className="text-xs" style={{ color: 'var(--color-text3)' }}>
                {done ? 'Session complete' : `Lead ${Math.min(index + 1, leads.length)} of ${leads.length}`}
              </p>
            </div>
          </div>
          <button onClick={endSession} disabled={logging}
            className="p-1.5 rounded-lg transition-colors disabled:opacity-40" style={{ color: 'var(--color-text3)' }}>
            <X size={16} />
          </button>
        </div>

        {/* Progress bar */}
        {!done && (
          <div className="h-1" style={{ background: 'var(--color-surface2)' }}>
            <div className="h-1 transition-all duration-300"
              style={{ width: `${(index / leads.length) * 100}%`, background: 'var(--color-violet)' }} />
          </div>
        )}

        {/* Body */}
        <div className="px-6 py-5 flex-1 overflow-y-auto">
          {done ? (
            <div className="text-center py-6">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ background: 'rgba(52,211,153,0.12)', color: '#34D399' }}>
                <CheckCircle2 size={22} />
              </div>
              <p className="text-lg font-bold mb-1" style={{ color: 'var(--color-text)' }}>Session complete</p>
              <p className="text-sm mb-5" style={{ color: 'var(--color-text3)' }}>
                {results.length} lead{results.length === 1 ? '' : 's'} worked · {spoke} spoke to
              </p>
              <div className="space-y-1.5 text-left mb-5">
                {results.map((r, i) => {
                  const lead = leads.find(l => l.id === r.leadId);
                  const cfg  = CALL_OUTCOMES.find(o => o.value === r.outcome);
                  return (
                    <div key={i} className="flex items-center justify-between px-3 py-2 rounded-lg" style={{ background: 'var(--color-surface2)' }}>
                      <span className="text-xs font-medium" style={{ color: 'var(--color-text2)' }}>{lead?.clientName ?? 'Unknown'}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{ background: cfg?.bg ?? 'var(--color-surface3)', color: cfg?.color ?? 'var(--color-text3)' }}>
                        {r.outcome}
                      </span>
                    </div>
                  );
                })}
              </div>
              <button onClick={() => { onFinished(); onClose(); }}
                className="btn-purple btn-shine w-full !py-2.5 !text-sm">
                Done
              </button>
            </div>
          ) : (
            <>
              {/* Current lead card */}
              <div className="rounded-xl p-4 mb-4" style={{ background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.15)' }}>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--color-violet)' }}>
                  {current.company || 'No company'}
                </p>
                <p className="text-xl font-bold mb-1" style={{ color: 'var(--color-text)' }}>{current.clientName}</p>
                {current.phone
                  ? <p className="text-sm font-mono" style={{ color: 'var(--color-text2)' }}>{current.phone}</p>
                  : <p className="text-sm italic" style={{ color: 'var(--color-text3)' }}>No phone on file</p>}
              </div>

              {twilio.error && (
                <p className="text-xs px-3 py-2 rounded-lg mb-3" style={{ background: 'rgba(248,113,113,0.1)', color: '#F87171' }}>
                  {twilio.error}
                </p>
              )}

              {/* Outcome picker — shown once a call ends */}
              {showOutcomes ? (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider mb-2.5" style={{ color: 'var(--color-text3)' }}>
                    How did it go?
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {CALL_OUTCOMES.map(o => (
                      <button key={o.value} disabled={logging} onClick={() => logOutcome(o.value)}
                        className="py-3 px-2 rounded-xl text-xs font-bold text-center transition-all disabled:opacity-50"
                        style={{ background: o.bg, color: o.color, border: `1px solid ${o.border}` }}>
                        {logging ? <Loader2 size={12} className="animate-spin mx-auto" /> : o.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : !callActive ? (
                <div className="flex items-center gap-2">
                  <button onClick={call} disabled={!current.phone || !agentId || twilio.callState === 'connecting'}
                    className="btn-purple btn-shine flex-1 inline-flex items-center justify-center gap-1.5 !py-2.5 !text-sm disabled:opacity-50">
                    <Phone size={14} />
                    {twilio.callState === 'connecting' ? 'Connecting…' : 'Call Now'}
                  </button>
                  <button onClick={skip}
                    className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all"
                    style={{ background: 'var(--color-surface2)', color: 'var(--color-text3)', border: '1px solid var(--color-border2)' }}>
                    <SkipForward size={13} /> Skip
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold font-mono tabular-nums"
                    style={{ background: 'rgba(248,113,113,0.08)', color: '#F87171', border: '1px solid rgba(248,113,113,0.2)' }}>
                    <Timer size={14} className={twilio.callState === 'active' ? 'animate-pulse' : ''} />
                    {twilio.callState === 'ringing' ? 'Ringing…' : fmtElapsed(twilio.elapsed)}
                  </span>
                  <button onClick={twilio.toggleMute}
                    className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all"
                    style={{ background: twilio.isMuted ? 'rgba(251,191,36,0.1)' : 'rgba(107,114,128,0.08)', color: twilio.isMuted ? '#FBBF24' : 'var(--color-text3)' }}>
                    {twilio.isMuted ? <MicOff size={13} /> : <Mic size={13} />}
                  </button>
                  <button onClick={twilio.hangUp}
                    className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all"
                    style={{ background: 'rgba(248,113,113,0.1)', color: '#F87171', border: '1px solid rgba(248,113,113,0.2)' }}>
                    <PhoneOff size={13} /> End
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer — up next */}
        {!done && index + 1 < leads.length && (
          <div className="px-6 py-3" style={{ borderTop: '1px solid var(--color-border2)' }}>
            <p className="text-[10px] uppercase tracking-wider font-semibold mb-1" style={{ color: 'var(--color-text3)' }}>Up next</p>
            <p className="text-xs truncate" style={{ color: 'var(--color-text2)' }}>
              {leads[index + 1].clientName}{leads[index + 1].company ? ` · ${leads[index + 1].company}` : ''}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
