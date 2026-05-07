import { Router } from "express";
import { db, testimonialsTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { requireAdmin } from "../middlewares/requireAdmin";

const router = Router();

router.get("/testimonials", async (_req, res) => {
  const rows = await db
    .select()
    .from(testimonialsTable)
    .where(eq(testimonialsTable.isPublished, true))
    .orderBy(asc(testimonialsTable.sortOrder), asc(testimonialsTable.id));
  res.json(rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString() })));
});

router.get("/admin/testimonials", requireAuth, requireAdmin, async (_req, res) => {
  const rows = await db.select().from(testimonialsTable).orderBy(asc(testimonialsTable.sortOrder), asc(testimonialsTable.id));
  res.json(rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString() })));
});

function parse(body: any) {
  const name = typeof body?.name === "string" ? body.name.trim().slice(0, 100) : "";
  const role = typeof body?.role === "string" ? body.role.trim().slice(0, 100) : "";
  const text = typeof body?.text === "string" ? body.text.trim().slice(0, 2000) : "";
  const rating = Number.isFinite(Number(body?.rating)) ? Math.max(1, Math.min(5, Number(body.rating))) : 5;
  const avatarUrl = typeof body?.avatarUrl === "string" ? body.avatarUrl.trim().slice(0, 1000) : "";
  const sortOrder = Number.isFinite(Number(body?.sortOrder)) ? Number(body.sortOrder) : 0;
  const isPublished = body?.isPublished === undefined ? true : Boolean(body.isPublished);
  return { name, role, text, rating, avatarUrl, sortOrder, isPublished };
}

router.post("/admin/testimonials", requireAuth, requireAdmin, async (req, res) => {
  const data = parse(req.body);
  if (!data.name || !data.text) {
    res.status(400).json({ error: "name and text are required" });
    return;
  }
  const [row] = await db.insert(testimonialsTable).values(data).returning();
  res.status(201).json(row);
});

router.patch("/admin/testimonials/:id", requireAuth, requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (typeof req.body?.name === "string") updates.name = req.body.name.trim().slice(0, 100);
  if (typeof req.body?.role === "string") updates.role = req.body.role.trim().slice(0, 100);
  if (typeof req.body?.text === "string") updates.text = req.body.text.trim().slice(0, 2000);
  if (Number.isFinite(Number(req.body?.rating))) updates.rating = Math.max(1, Math.min(5, Number(req.body.rating)));
  if (typeof req.body?.avatarUrl === "string") updates.avatarUrl = req.body.avatarUrl.trim().slice(0, 1000);
  if (Number.isFinite(Number(req.body?.sortOrder))) updates.sortOrder = Number(req.body.sortOrder);
  if (req.body?.isPublished !== undefined) updates.isPublished = Boolean(req.body.isPublished);
  await db.update(testimonialsTable).set(updates).where(eq(testimonialsTable.id, id));
  res.json({ ok: true });
});

router.delete("/admin/testimonials/:id", requireAuth, requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(testimonialsTable).where(eq(testimonialsTable.id, id));
  res.json({ ok: true });
});

export default router;
