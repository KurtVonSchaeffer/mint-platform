import { createServerClient } from '@supabase/ssr';
import { cookies, headers } from 'next/headers';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST() {
  console.log('[auth/signout] signing out user');

  const cookieStore = await cookies();
  const headerStore = await headers();
  const origin      = headerStore.get('origin') ?? 'http://localhost:3001';

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll:  () => cookieStore.getAll(),
        setAll: (toSet) => {
          toSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        },
      },
    },
  );

  const { error } = await supabase.auth.signOut();
  if (error) console.error('[auth/signout] error:', error.message);

  return NextResponse.redirect(`${origin}/login`, { status: 302 });
}
