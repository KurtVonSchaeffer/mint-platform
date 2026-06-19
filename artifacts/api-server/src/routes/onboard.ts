import { Router, type IRouter } from "express";
import { db, leadsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

const router: IRouter = Router();

// GET /api/onboard/:token — fetch lead for onboarding page
router.get("/onboard/:token", async (req, res) => {
  const { token } = req.params;
  const [lead] = await db.select({
    id: leadsTable.id,
    name: leadsTable.name,
    email: leadsTable.email,
    company: leadsTable.company,
    onboarding_status: leadsTable.onboarding_status,
    onboarding_data: leadsTable.onboarding_data,
  }).from(leadsTable).where(eq(leadsTable.onboarding_token, token)).limit(1);

  if (!lead) return res.status(404).json({ error: 'Invalid or expired link' });
  return res.json(lead);
});

// POST /api/onboard/start — create application and return token
router.post("/onboard/start", async (req, res) => {
  const body = req.body as Record<string, unknown>;
  const name    = String(body.name    ?? '').trim();
  const email   = String(body.email   ?? '').trim();
  const company = String(body.company ?? '').trim();
  const phone   = String(body.phone   ?? '').trim() || null;
  const ncr     = String(body.ncr     ?? '').trim() || null;

  if (!name || !email || !company) {
    return res.status(400).json({ error: 'name, email, and company are required' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Invalid email address' });
  }

  try {
    const [lead] = await db.insert(leadsTable).values({
      name, email, company,
      source: 'apply-form',
      status: 'new',
      onboarding_status: 'started',
      onboarding_token: randomUUID(),
      onboarding_data: { phone, ncr_number: ncr } as Record<string, string | null>,
    }).returning({ id: leadsTable.id, onboarding_token: leadsTable.onboarding_token });

    const direct = body.direct === true;
    return res.json({
      ok: true,
      ...(direct ? { token: lead.onboarding_token, leadId: lead.id } : {}),
    });
  } catch (err: unknown) {
    req.log.error({ err }, '[onboard/start]');
    return res.status(500).json({ error: 'Failed to create application' });
  }
});

// POST /api/onboard/:token/submit
router.post("/onboard/:token/submit", async (req, res) => {
  const { token } = req.params;
  const body = req.body as Record<string, unknown>;

  const [lead] = await db.select({ id: leadsTable.id, onboarding_status: leadsTable.onboarding_status })
    .from(leadsTable).where(eq(leadsTable.onboarding_token, token)).limit(1);

  if (!lead) return res.status(404).json({ error: 'Invalid or expired link' });
  if (lead.onboarding_status === 'complete') {
    return res.status(409).json({ error: 'Application already submitted' });
  }

  try {
    await db.update(leadsTable).set({
      name: String(body.name ?? '').trim() || undefined,
      company: String(body.company ?? '').trim() || undefined,
      onboarding_status: 'complete',
      onboarding_data: {
        legal_name: body.legal_name,
        phone: body.phone,
        ncr_number: body.ncr_number,
        directors: body.directors,
      } as Record<string, unknown>,
    }).where(eq(leadsTable.id, lead.id));
    return res.json({ ok: true });
  } catch (err: unknown) {
    req.log.error({ err }, '[onboard/submit]');
    return res.status(500).json({ error: 'Failed to save application' });
  }
});

export default router;
