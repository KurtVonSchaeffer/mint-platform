import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { leadsTable, type InsertLead } from "@workspace/db";

const router: IRouter = Router();

router.post("/leads", async (req, res) => {
  const body = req.body as Record<string, unknown>;
  const name    = String(body.name    ?? '').trim();
  const email   = String(body.email   ?? '').trim();
  const company = String(body.company ?? '').trim();
  const message = typeof body.message === 'string' ? body.message.trim() : null;

  if (!name || !email || !company) {
    return res.status(400).json({ error: 'Missing required fields', fields: ['name', 'email', 'company'] });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Invalid email' });
  }

  try {
    const [lead] = await db.insert(leadsTable).values({
      name, email, company, message, source: 'marketing-site', status: 'new',
    }).returning();
    return res.status(201).json({ ok: true, id: lead.id });
  } catch (err: unknown) {
    req.log.error({ err }, '[leads] insert failed');
    return res.status(500).json({ error: 'Failed to record lead' });
  }
});

export default router;
