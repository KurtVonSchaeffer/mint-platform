'use client';

import { useState, useRef, useCallback } from 'react';

import { normalizePhoneSA, isValidE164 } from '@/lib/phone';

type CallState = 'idle' | 'connecting' | 'ringing' | 'active' | 'ended';

export interface TwilioCallControls {
  callState:  CallState;
  elapsed:    number;
  isMuted:    boolean;
  makeCall:   (to: string, leadId: string, agentId: string, identity: string) => Promise<void>;
  hangUp:     () => void;
  toggleMute: () => void;
  error:      string | null;
}

export function useTwilioDevice(): TwilioCallControls {
  const [callState,  setCallState]  = useState<CallState>('idle');
  const [elapsed,    setElapsed]    = useState(0);
  const [isMuted,    setIsMuted]    = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  const deviceRef   = useRef<InstanceType<typeof import('@twilio/voice-sdk').Device> | null>(null);
  const callRef     = useRef<{ mute: (m: boolean) => void; disconnect: () => void } | null>(null);
  const timerRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef    = useRef(0);

  const startTimer = () => {
    startRef.current = Date.now();
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
    }, 500);
  };

  const stopTimer = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    setElapsed(0);
  };

  const makeCall = useCallback(async (to: string, leadId: string, agentId: string, identity: string) => {
    setError(null);

    const normalized = normalizePhoneSA(to);
    if (!isValidE164(normalized)) {
      setError(`Invalid phone number: "${to}"`);
      return;
    }

    setCallState('connecting');

    try {
      // Dynamically import to avoid SSR issues
      const { Device } = await import('@twilio/voice-sdk');

      // Fetch access token
      const res = await fetch('/api/telemarketer/twilio/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent_id: agentId, identity }),
      });
      if (!res.ok) throw new Error('Failed to get call token');
      const { token } = await res.json();

      // Set up Device
      const device = new Device(token, { logLevel: 1 });
      deviceRef.current = device;

      await device.register();

      // Place the call — custom params forwarded to TwiML webhook
      const call = await device.connect({
        params: {
          To:       normalized,
          agent_id: agentId,
          lead_id:  leadId,
        },
      });
      callRef.current = call as unknown as { mute: (m: boolean) => void; disconnect: () => void };

      setCallState('ringing');

      call.on('accept', () => { setCallState('active'); startTimer(); });
      call.on('disconnect', () => {
        stopTimer();
        setCallState('ended');
        setIsMuted(false);
        deviceRef.current?.destroy();
        deviceRef.current = null;
        callRef.current   = null;
      });
      call.on('error', (err: Error) => {
        stopTimer();
        setError(err.message);
        setCallState('idle');
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Call failed');
      setCallState('idle');
    }
  }, []);

  const hangUp = useCallback(() => {
    callRef.current?.disconnect();
    deviceRef.current?.destroy();
    deviceRef.current = null;
    callRef.current   = null;
    stopTimer();
    setCallState('idle');
    setIsMuted(false);
  }, []);

  const toggleMute = useCallback(() => {
    if (!callRef.current) return;
    const next = !isMuted;
    callRef.current.mute(next);
    setIsMuted(next);
  }, [isMuted]);

  return { callState, elapsed, isMuted, makeCall, hangUp, toggleMute, error };
}
