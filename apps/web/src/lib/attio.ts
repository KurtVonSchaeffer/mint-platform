/**
 * Attio CRM forwarder.
 *
 * When ATTIO_API_KEY (and optionally ATTIO_PEOPLE_OBJECT) are set, every new
 * lead is also POSTed to Attio so the sales team can run the demo flow there.
 *
 * Env vars
 * ─────────
 *   ATTIO_API_KEY        — Bearer token from https://app.attio.com/workspace/api
 *   ATTIO_PEOPLE_OBJECT  — Slug of the object to create records on (default: "people")
 *   ATTIO_NOTES_OBJECT   — Optional. If set, the lead message will be attached
 *                          as a Note to the created person record.
 *
 * Docs: https://developers.attio.com/reference/post_v2-objects-object-records
 *
 * Non-blocking: errors are logged but never thrown — a Attio outage must not
 * break the public lead form.
 */

const ATTIO_BASE = 'https://api.attio.com/v2';
const TIMEOUT_MS = 8000;

interface AttioPayload {
  name: string;
  email: string;
  company: string;
  message?: string;
}

async function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Attio timeout after ${ms}ms`)), ms);
  });
  try {
    return await Promise.race([p, timeout]);
  } finally {
    clearTimeout(timer!);
  }
}

export interface AttioResult {
  ok: boolean;
  recordId?: string;
  skipped?: boolean;
  error?: string;
}

export async function pushLeadToAttio(lead: AttioPayload): Promise<AttioResult> {
  const apiKey = process.env.ATTIO_API_KEY;
  if (!apiKey) return { ok: false, skipped: true };

  const objectSlug = process.env.ATTIO_PEOPLE_OBJECT || 'people';

  // Build a flexible name split — Attio's `name` attribute on the default
  // people object is composite (first_name + last_name).
  const trimmedName = lead.name.trim();
  const parts = trimmedName.split(/\s+/);
  const first = parts[0] ?? '';
  const last  = parts.slice(1).join(' ');

  const body = {
    data: {
      values: {
        name: [{
          first_name: first,
          last_name: last,
          full_name: trimmedName,
        }],
        email_addresses: [lead.email],
        // Company is stored as a string field unless your workspace links it
        // to a Companies object. We send a plain string for compatibility.
        company: [{ value: lead.company }],
        description: lead.message ? [{ value: lead.message }] : undefined,
      },
    },
  };

  try {
    const res = await withTimeout(
      fetch(`${ATTIO_BASE}/objects/${objectSlug}/records`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type':  'application/json',
        },
        body: JSON.stringify(body),
      }),
      TIMEOUT_MS,
    );

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error('[attio] non-2xx response', res.status, text.slice(0, 300));
      return { ok: false, error: `Attio responded ${res.status}` };
    }

    const json = await res.json().catch(() => ({}));
    const recordId = json?.data?.id?.record_id;
    console.log('[attio] lead pushed', { recordId, email: lead.email });

    // Attach the message as a Note if configured
    if (recordId && process.env.ATTIO_NOTES_OBJECT && lead.message) {
      await pushNoteToAttio(apiKey, recordId, lead.message).catch((err) => {
        console.warn('[attio] note attach failed', err);
      });
    }

    return { ok: true, recordId };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Attio request failed';
    console.error('[attio] push failed', message);
    return { ok: false, error: message };
  }
}

async function pushNoteToAttio(apiKey: string, parentRecordId: string, message: string) {
  await withTimeout(
    fetch(`${ATTIO_BASE}/notes`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        data: {
          parent_object: process.env.ATTIO_PEOPLE_OBJECT || 'people',
          parent_record_id: parentRecordId,
          title: 'Marketing-site enquiry',
          content: message,
          format: 'plaintext',
        },
      }),
    }),
    TIMEOUT_MS,
  );
}
