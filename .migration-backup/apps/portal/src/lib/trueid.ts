/**
 * Portal-side TruID helpers.
 *
 * The actual TruID API calls happen in the mint-admin backend
 * (POST /api/truid/connect, GET /api/truid/data/:collectionId).
 * This module provides the shared types and the `useTruID` React hook
 * that drives the consent → polling → affordability flow in the wizard.
 */

import { useState, useRef, useCallback } from 'react';
import { api } from '@/lib/api';

/* ─── Types (mirrored from mint-admin/src/lib/trueid.ts) ──────────── */

export interface TruIDAffordability {
  status:              'pending' | 'complete' | 'failed';
  collectionId:        string;
  monthlyIncome:       number | null;
  monthlyExpenses:     number | null;
  netMonthlyIncome:    number | null;
  salaryDate:          string | null;
  affordabilityScore:  number | null;   // 0–100
  maxRecommendedLoan:  number | null;   // 30% DSR × 24 months
  incomePayload:       unknown;
  transactionsPayload: unknown;
}

export type TruIDState = 'idle' | 'connecting' | 'waiting' | 'complete' | 'failed';

export interface UseTruIDResult {
  state:        TruIDState;
  collectionId: string | null;
  affordability: TruIDAffordability | null;
  error:        string | null;
  connect: (opts?: {
    name?:     string;
    idNumber?: string;
    email?:    string;
    mobile?:   string;
  }) => Promise<void>;
  reset: () => void;
}

/* ─── Hook ───────────────────────────────────────────────────────── */

const POLL_INTERVAL_MS = 3_000;
const MAX_POLL_ATTEMPTS = 60;   // 3 min timeout

export function useTruID(applicationRef?: string): UseTruIDResult {
  const [state, setState]               = useState<TruIDState>('idle');
  const [collectionId, setCollectionId] = useState<string | null>(null);
  const [affordability, setAffordability] = useState<TruIDAffordability | null>(null);
  const [error, setError]               = useState<string | null>(null);

  const timerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attemptsRef = useRef(0);

  const stopPolling = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
  }, []);

  const poll = useCallback(async (id: string) => {
    if (attemptsRef.current >= MAX_POLL_ATTEMPTS) {
      stopPolling();
      setState('failed');
      setError('Timed out waiting for bank connection. Please try again.');
      return;
    }
    attemptsRef.current += 1;

    try {
      const qs = applicationRef ? `?applicationRef=${applicationRef}` : '';
      const data = await api.get<TruIDAffordability & { complete?: boolean; status?: string }>(
        `/api/truid/data/${id}${qs}`,
      );

      if (data.complete === false) {
        // Still pending — schedule next poll
        timerRef.current = setTimeout(() => void poll(id), POLL_INTERVAL_MS);
        return;
      }

      // Complete
      stopPolling();
      setAffordability(data);
      setState('complete');
    } catch (err) {
      stopPolling();
      setState('failed');
      setError(err instanceof Error ? err.message : 'Failed to fetch bank data.');
    }
  }, [applicationRef, stopPolling]);

  const connect = useCallback(async (opts: {
    name?: string; idNumber?: string; email?: string; mobile?: string;
  } = {}) => {
    setError(null);
    setState('connecting');
    attemptsRef.current = 0;

    try {
      const { collectionId: id, consumerUrl } = await api.post<{
        collectionId: string;
        consumerUrl:  string;
      }>('/api/truid/connect', opts);

      setCollectionId(id);
      setState('waiting');

      // Open TruID consent page for the applicant
      window.open(consumerUrl, '_blank', 'noopener,noreferrer');

      // Start polling
      timerRef.current = setTimeout(() => void poll(id), POLL_INTERVAL_MS);
    } catch (err) {
      setState('failed');
      setError(err instanceof Error ? err.message : 'Failed to initiate bank connection.');
    }
  }, [poll]);

  const reset = useCallback(() => {
    stopPolling();
    setState('idle');
    setCollectionId(null);
    setAffordability(null);
    setError(null);
    attemptsRef.current = 0;
  }, [stopPolling]);

  return { state, collectionId, affordability, error, connect, reset };
}
