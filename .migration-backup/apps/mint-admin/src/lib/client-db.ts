/**
 * Returns a Supabase service-role client connected to a specific client's
 * own Supabase instance, using credentials fetched from their Vercel project.
 *
 * Returns null if the client has no vercel_project_id or the credentials
 * can't be retrieved — callers should fall back gracefully.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { supabaseAdmin } from './supabase';

export async function getClientSupabase(clientId: string): Promise<SupabaseClient | null> {
  const { data: client } = await supabaseAdmin
    .from('clients')
    .select('supabase_url, supabase_service_key, vercel_project_id')
    .eq('id', clientId)
    .single();

  // Fast path: credentials stored directly on the client record (set during onboarding)
  const storedUrl = client?.supabase_url as string | null;
  const storedKey = client?.supabase_service_key as string | null;
  if (storedUrl && storedKey) {
    return createClient(storedUrl, storedKey, { auth: { persistSession: false } });
  }

  // Fallback: fetch from the client's Vercel project env vars
  const projectId = client?.vercel_project_id as string | null;
  if (!projectId) return null;

  const token  = process.env.VERCEL_API_TOKEN ?? process.env.VERCEL_TOKEN;
  const teamId = process.env.VERCEL_TEAM_ID;
  if (!token) return null;

  const qs = new URLSearchParams({ decrypt: 'true' });
  if (teamId) qs.set('teamId', teamId);

  const res = await fetch(
    `https://api.vercel.com/v9/projects/${projectId}/env?${qs}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) return null;

  const { envs } = await res.json() as { envs: Array<{ key: string; value: string }> };
  const find = (key: string) => envs.find((e) => e.key === key)?.value ?? null;

  const url        = find('NEXT_PUBLIC_SUPABASE_URL') ?? find('SUPABASE_URL');
  const serviceKey = find('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceKey) return null;

  return createClient(url, serviceKey, { auth: { persistSession: false } });
}
