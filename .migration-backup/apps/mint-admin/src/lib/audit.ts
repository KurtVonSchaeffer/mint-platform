import { supabaseAdmin } from '@/lib/supabase';

export type AuditAction =
  | 'client.create'
  | 'client.update'
  | 'client.suspend'
  | 'client.activate'
  | 'client.delete'
  | 'invoice.create'
  | 'invoice.send'
  | 'invoice.mark_paid'
  | 'invoice.void'
  | 'lead.create'
  | 'lead.update'
  | 'feature.toggle'
  | 'quota.update';

// Maps our semantic actions to the audit_action enum values in the DB
const ACTION_MAP: Record<AuditAction, string> = {
  'client.create':     'create',
  'client.update':     'update',
  'client.suspend':    'status_change',
  'client.activate':   'status_change',
  'client.delete':     'delete',
  'invoice.create':    'create',
  'invoice.send':      'update',
  'invoice.mark_paid': 'status_change',
  'invoice.void':      'status_change',
  'lead.create':       'create',
  'lead.update':       'update',
  'feature.toggle':    'config_change',
  'quota.update':      'config_change',
};

export interface AuditPayload {
  action: AuditAction;
  resourceType: string;
  resourceId?: string;
  actorEmail?: string;
  meta?: Record<string, unknown>;
}

/**
 * Fire-and-forget audit log. Never throws — a logging failure must not
 * block the actual request. Writes to the existing audit_log table.
 */
export function logAudit(payload: AuditPayload): void {
  const dbAction = ACTION_MAP[payload.action];

  supabaseAdmin
    .from('audit_log')
    .insert({
      action:      dbAction,
      entity_type: payload.resourceType,
      entity_id:   payload.resourceId ?? null,
      description: `${payload.action}${payload.actorEmail ? ` by ${payload.actorEmail}` : ''}`,
      after_data:  payload.meta ?? null,
      occurred_at: new Date().toISOString(),
    })
    .then(({ error }) => {
      if (error) console.warn('[audit] insert failed:', error.message);
    });
}
