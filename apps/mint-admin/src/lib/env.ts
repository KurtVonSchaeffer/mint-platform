const REQUIRED = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
] as const;

const missing = REQUIRED.filter((k) => !process.env[k]);

if (missing.length > 0 && process.env.NODE_ENV === 'production') {
  throw new Error(
    `[env] Missing required environment variables: ${missing.join(', ')}\n` +
    'Set these in your Vercel project settings or .env.local.',
  );
}

if (missing.length > 0) {
  console.warn(`[env] Missing env vars (will use fallbacks in dev): ${missing.join(', ')}`);
}

export const env = {
  supabaseUrl:        process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
  supabaseAnonKey:    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  resendApiKey:       process.env.RESEND_API_KEY ?? '',
  cronSecret:         process.env.CRON_SECRET ?? '',
  isProduction:       process.env.NODE_ENV === 'production',
} as const;
