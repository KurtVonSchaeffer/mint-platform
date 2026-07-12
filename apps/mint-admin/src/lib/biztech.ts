import { supabaseAdmin } from '@/lib/supabase';

/** Best-effort contact for a BizTech client: primary contact first, else any contact with an email. */
export async function findClientContact(clientId: string): Promise<{ name: string; email: string } | null> {
  const { data: contacts } = await supabaseAdmin
    .from('biztech_contacts')
    .select('name, email, is_primary')
    .eq('client_id', clientId)
    .not('email', 'is', null);

  if (!contacts?.length) return null;
  const primary = contacts.find(c => c.is_primary) ?? contacts[0];
  return primary.email ? { name: primary.name, email: primary.email } : null;
}
