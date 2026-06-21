import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

/**
 * Dev-only leads store. Writes to `<monorepo>/.shared/leads.jsonl` so that the
 * `web` (marketing) and `mint-admin` apps can share state on a developer's
 * machine. In production, replace this with Supabase or Vercel Marketplace
 * storage.
 *
 * Format: one JSON object per line (jsonl).
 */

export interface Lead {
  id: string;
  name: string;
  email: string;
  company: string;
  message: string;
  source: 'marketing-site' | 'referral' | 'manual';
  status: 'new' | 'contacted' | 'qualified' | 'won' | 'lost';
  createdAt: string; // ISO timestamp
}

// Resolve to <monorepo>/.shared/leads.jsonl regardless of which app is running.
// `process.cwd()` in dev = the app dir (apps/web or apps/mint-admin).
// Walk up to find the monorepo root (the dir that contains .shared/).
function storePath() {
  let dir = process.cwd();
  // Walk up at most 4 levels.
  for (let i = 0; i < 4; i++) {
    const candidate = path.join(dir, '.shared', 'leads.jsonl');
    if (i > 0 || dir.endsWith('apps/web') || dir.endsWith('apps/mint-admin')) {
      // Skip the cwd-direct check unless we've gone up.
    }
    // Always return the path; readers handle ENOENT gracefully.
    const sharedDir = path.join(dir, '.shared');
    try {
      // Check synchronously via the dirname existing as a heuristic
      // (cheap — we just want the right path).
      // Using lazy require for sync access
      const fsSync = require('node:fs');
      if (fsSync.existsSync(sharedDir)) {
        return candidate;
      }
    } catch {
      // ignore
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  // Fallback — use /tmp so we still work even if directory walk fails.
  return '/tmp/algolend-leads.jsonl';
}

const PATH = storePath();

async function ensureFile() {
  try {
    await fs.mkdir(path.dirname(PATH), { recursive: true });
    await fs.access(PATH);
  } catch {
    await fs.writeFile(PATH, '', { flag: 'a' });
  }
}

export async function appendLead(input: Omit<Lead, 'id' | 'createdAt' | 'status'> & { status?: Lead['status'] }): Promise<Lead> {
  await ensureFile();
  const lead: Lead = {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    status: input.status ?? 'new',
    ...input,
  };
  await fs.appendFile(PATH, JSON.stringify(lead) + '\n');
  return lead;
}

export async function listLeads(): Promise<Lead[]> {
  try {
    await ensureFile();
    const raw = await fs.readFile(PATH, 'utf8');
    const lines = raw.split('\n').filter(Boolean);
    const leads: Lead[] = [];
    for (const line of lines) {
      try {
        leads.push(JSON.parse(line));
      } catch {
        // skip malformed lines
      }
    }
    // Newest first
    return leads.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } catch {
    return [];
  }
}

export const STORE_PATH = PATH;
