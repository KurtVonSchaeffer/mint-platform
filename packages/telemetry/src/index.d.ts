import type { RequestHandler } from 'express';

export interface TelemetryOptions {
  /** RegExps for paths to skip (e.g. health checks, favicons). */
  ignorePaths?: RegExp[];
}

export interface ExternalCallLog {
  provider:        'experian' | 'truid' | 'docuseal' | 'suresystems' | string;
  endpoint:        string;
  cost_zar_cents?: number;
  reference?:      string | null;
  status?:         'success' | 'error' | 'timeout';
}

// ── Express/ZwaneOfficial middleware ──────────────────────────────
export function telemetry(options?: TelemetryOptions): RequestHandler;

// ── Next.js App Router wrapper ────────────────────────────────────
type NextHandler = (req: Request, ctx?: unknown) => Promise<Response> | Response;
type NextHandlerMap = Record<string, NextHandler>;

/** Wrap a single Route Handler or a { GET, POST, … } map. */
export function withTelemetry(handler: NextHandler): NextHandler;
export function withTelemetry<T extends NextHandlerMap>(handlers: T): T;

// ── Shared helpers ────────────────────────────────────────────────
export function logExternal(call: ExternalCallLog): Promise<void>;
export function flush(): Promise<void>;
