import { createClient } from '@supabase/supabase-js';

const url        = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.warn('[mint] Missing Supabase env vars — NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY');
}

/**
 * Service-role client.
 * All Mint API routes bypass RLS (quote_requests + quote_offers have
 * no authenticated-user policies — they're written only by this server).
 * Never expose this client to the browser.
 */
export const db = createClient(
  url || 'https://placeholder.supabase.co', 
  serviceKey || 'placeholder-key', 
  { auth: { persistSession: false } }
);
