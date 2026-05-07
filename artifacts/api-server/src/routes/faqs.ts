import { Router } from "express";
import { db, faqsTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { requireAdmin } from "../middlewares/requireAdmin";

const router = Router();

router.get("/faqs", async (_req, res) => {
  const rows = await db
    .select()
    .from(faqsTable)
    .where(eq(faqsTable.isPublished, true))
    .orderBy(asc(faqsTable.sortOrder), asc(faqsTable.id));
  res.json(rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString() })));
});

router.get("/admin/faqs", requireAuth, requireAdmin, async (_req, res) => {
  const rows = await db.select().from(faqsTable).orderBy(asc(faqsTable.sortOrder), asc(faqsTable.id));
  res.json(rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString() })));
});

function parseFaqBody(body: any) {
  const question = typeof body?.question === "string" ? body.question.trim().slice(0, 500) : "";
  const answer = typeof body?.answer === "string" ? body.answer.trim().slice(0, 5000) : "";
  const category = typeof body?.category === "string" ? body.category.trim().slice(0, 50) || "general" : "general";
  const sortOrder = Number.isFinite(Number(body?.sortOrder)) ? Number(body.sortOrder) : 0;
  const isPublished = body?.isPublished === undefined ? true : Boolean(body.isPublished);
  return { question, answer, category, sortOrder, isPublished };
}

router.post("/admin/faqs", requireAuth, requireAdmin, async (req, res) => {
  const data = parseFaqBody(req.body);
  if (!data.question || !data.answer) {
    res.status(400).json({ error: "question and answer are required" });
    return;
  }
  const [row] = await db.insert(faqsTable).values(data).returning();
  res.status(201).json(row);
});

router.patch("/admin/faqs/:id", requireAuth, requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (typeof req.body?.question === "string") updates.question = req.body.question.trim().slice(0, 500);
  if (typeof req.body?.answer === "string") updates.answer = req.body.answer.trim().slice(0, 5000);
  if (typeof req.body?.category === "string") updates.category = req.body.category.trim().slice(0, 50);
  if (Number.isFinite(Number(req.body?.sortOrder))) updates.sortOrder = Number(req.body.sortOrder);
  if (req.body?.isPublished !== undefined) updates.isPublished = Boolean(req.body.isPublished);
  await db.update(faqsTable).set(updates).where(eq(faqsTable.id, id));
  res.json({ ok: true });
});

router.delete("/admin/faqs/:id", requireAuth, requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(faqsTable).where(eq(faqsTable.id, id));
  res.json({ ok: true });
});

export default router;
