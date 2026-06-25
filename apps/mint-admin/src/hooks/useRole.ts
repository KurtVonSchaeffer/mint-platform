'use client';
import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';

export function useRole() {
  const [role,  setRole]  = useState<string | null>(null);
  const [email, setEmail] = useState('');

  useEffect(() => {
    createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    ).auth.getUser().then(({ data: { user } }) => {
      setRole((user?.user_metadata?.role as string | undefined) ?? 'support');
      setEmail(user?.email ?? '');
    });
  }, []);

  return { role, email, isSuperAdmin: role === 'super_admin' };
}
