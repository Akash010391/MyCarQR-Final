import { Router } from "express";
import { db, supportTicketsTable } from "@workspace/db";
import { desc, eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { requireAdmin } from "../middlewares/requireAdmin";
import { getRequestEmail } from "../lib/adminEmails";

const router = Router();

function trim(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

router.get("/me/support-tickets", requireAuth, async (req, res) => {
  const userId = req.userId as string;
  const rows = await db
    .select()
    .from(supportTicketsTable)
    .where(eq(supportTicketsTable.userId, userId))
    .orderBy(desc(supportTicketsTable.createdAt));
  res.json(rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString() })));
});

router.post("/support-tickets", requireAuth, async (req, res) => {
  const userId = req.userId as string;
  const subject = trim(req.body?.subject, 200);
  const message = trim(req.body?.message, 4000);
  if (!subject || !message) {
    res.status(400).json({ error: "subject and message are required" });
    return;
  }
  if (message.length < 10) {
    res.status(400).json({ error: "Message must be at least 10 characters" });
    return;
  }
  const email = (await getRequestEmail(req)) ?? "";
  const [row] = await db
    .insert(supportTicketsTable)
    .values({ userId, email, subject, message, status: "open" })
    .returning();
  res.status(201).json({ id: row.id, ok: true });
});

router.get("/admin/support-tickets", requireAuth, requireAdmin, async (_req, res) => {
  const rows = await db.select().from(supportTicketsTable).orderBy(desc(supportTicketsTable.createdAt));
  res.json(rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString() })));
});

router.patch("/admin/support-tickets/:id", requireAuth, requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  const status = trim(req.body?.status, 20);
  if (status) updates.status = status;
  if (typeof req.body?.adminNote === "string") updates.adminNote = req.body.adminNote.slice(0, 2000);
  await db.update(supportTicketsTable).set(updates).where(eq(supportTicketsTable.id, id));
  res.json({ ok: true });
});

router.delete("/admin/support-tickets/:id", requireAuth, requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(supportTicketsTable).where(eq(supportTicketsTable.id, id));
  res.json({ ok: true });
});

export default router;
