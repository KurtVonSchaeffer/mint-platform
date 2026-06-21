import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export interface VercelProject {
  id:        string;
  name:      string;
  alias:     string[];      // all domains attached to the project
  slug:      string | null; // extracted *.algolend.co.za subdomain, or null
  updatedAt: number;
  link?: {
    type: string;
    repo?: string;
  };
}

/**
 * GET /api/vercel/projects
 *
 * Queries the Vercel API for all projects in the configured team and returns
 * them with a `slug` field pre-extracted from any *.algolend.co.za alias.
 * Used by the "Import from Vercel" modal in the Clients page.
 *
 * Requires VERCEL_API_TOKEN and (optionally) VERCEL_TEAM_ID env vars.
 */
export async function GET() {
  const token  = process.env.VERCEL_API_TOKEN ?? process.env.VERCEL_TOKEN;
  const teamId = process.env.VERCEL_TEAM_ID;

  if (!token) {
    return NextResponse.json(
      { error: 'VERCEL_API_TOKEN is not set. Add it in Vercel project settings → Environment Variables.' },
      { status: 503 },
    );
  }

  const params = new URLSearchParams({ limit: '100' });
  if (teamId) params.set('teamId', teamId);

  const res = await fetch(`https://api.vercel.com/v9/projects?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
    // Revalidate every 60s — project list changes infrequently
    next: { revalidate: 60 },
  });

  if (!res.ok) {
    const text = await res.text();
    console.error('[vercel/projects] API error', res.status, text);
    return NextResponse.json(
      { error: `Vercel API returned ${res.status}. Check that the token is valid.` },
      { status: res.status },
    );
  }

  const data = await res.json() as {
    projects: Array<{
      id:        string;
      name:      string;
      updatedAt: number;
      alias?:    Array<{ domain: string }>;
      link?:     { type: string; repo?: string };
    }>;
  };

  const projects: VercelProject[] = data.projects.map((p) => {
    const aliases = (p.alias ?? []).map((a) => a.domain);

    // Extract slug from <slug>.algolend.co.za
    const clientAlias = aliases.find((a) => /^[a-z0-9-]+\.algolend\.co\.za$/.test(a));
    const slug = clientAlias ? clientAlias.replace('.algolend.co.za', '') : null;

    return {
      id:        p.id,
      name:      p.name,
      alias:     aliases,
      slug,
      updatedAt: p.updatedAt,
      link:      p.link,
    };
  });

  // Surface client projects (those with a *.algolend.co.za alias) first
  projects.sort((a, b) => (b.slug ? 1 : 0) - (a.slug ? 1 : 0) || b.updatedAt - a.updatedAt);

  return NextResponse.json({ projects });
}
