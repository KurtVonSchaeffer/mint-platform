import { createClient } from '@supabase/supabase-js';

const url        = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey    = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function warnMissing(name: string) {
  if (!process.env[name]) {
    console.warn(`[supabase] Missing env var: ${name}`);
  }
}

// Service-role client — only import this in server-side code (API routes, Server Actions).
// Never send serviceKey to the browser.
// Guard: createClient throws on empty URL, so skip instantiation at build time.
export const supabaseAdmin =
  url && serviceKey
    ? createClient(url, serviceKey, { auth: { persistSession: false } })
    : (warnMissing('NEXT_PUBLIC_SUPABASE_URL'),
       warnMissing('SUPABASE_SERVICE_ROLE_KEY'),
       null as unknown as ReturnType<typeof createClient>);

// Anon client — safe to use in Server Components that need row-level security.
export const supabaseAnon =
  url && anonKey
    ? createClient(url, anonKey)
    : (warnMissing('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
       null as unknown as ReturnType<typeof createClient>);
