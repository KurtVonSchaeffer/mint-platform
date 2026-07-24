'use client';

import { createBrowserClient } from '@supabase/ssr';

export const SESSION_KEY_AGENT = 'tm_viewing_as';

function supabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

/** Returns the agent ID to use for API calls.
 *  - Real telemarketers: their own Supabase user ID
 *  - Super admin / manager "View As": the agent selected in the topbar (sessionStorage)
 */
export async function getAgentId(): Promise<string> {
  const { data: { user } } = await supabase().auth.getUser();
  if (user?.user_metadata?.role === 'telemarketer') {
    return user.id;
  }
  return (typeof window !== 'undefined' ? sessionStorage.getItem(SESSION_KEY_AGENT) : null) ?? '';
}

/** Returns the display name for the current agent. */
export async function getAgentName(): Promise<string> {
  const { data: { user } } = await supabase().auth.getUser();
  if (user?.user_metadata?.role === 'telemarketer') {
    return (user.user_metadata?.full_name as string | undefined) ?? user.email?.split('@')[0] ?? 'there';
  }
  // Admin "View As": look up the selected agent's name from the users API
  const agentId = typeof window !== 'undefined' ? sessionStorage.getItem(SESSION_KEY_AGENT) : null;
  if (agentId) {
    try {
      const { users } = await fetch('/api/users?role=telemarketer').then(r => r.json());
      const agent = (users ?? []).find((u: { id: string; name: string }) => u.id === agentId);
      if (agent?.name) return agent.name;
    } catch { /* ignore */ }
  }
  return 'there';
}
