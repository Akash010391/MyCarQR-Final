import { Router } from "express";
import { db, contactMessagesTable } from "@workspace/db";
import { desc, eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { requireAdmin } from "../middlewares/requireAdmin";

const router = Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function trim(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

// Simple per-IP token-bucket rate limit. Keeps memory bounded by evicting old
// entries lazily. Limit: 5 contact submissions per 10 minutes per IP.
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX = 5;
const rateBuckets = new Map<string, number[]>();
function rateLimited(ip: string): boolean {
  const now = Date.now();
  const cutoff = now - RATE_WINDOW_MS;
  const recent = (rateBuckets.get(ip) ?? []).filter((t) => t > cutoff);
  if (recent.length >= RATE_MAX) {
    rateBuckets.set(ip, recent);
    return true;
  }
  recent.push(now);
  rateBuckets.set(ip, recent);
  // Evict cold buckets occasionally so the map can't grow unbounded.
  if (rateBuckets.size > 5000) {
    for (const [k, v] of rateBuckets) {
      if (v.length === 0 || v[v.length - 1] < cutoff) rateBuckets.delete(k);
    }
  }
  return false;
}

router.post("/contact", async (req, res) => {
  // Honeypot: bots tend to fill every field. A hidden `website` field that real
  // users never see must stay empty.
  const honey = trim(req.body?.website, 200);
  if (honey) {
    // Pretend success so bots don't retry.
    res.status(201).json({ ok: true });
    return;
  }

  const ip = (req.ip || req.socket.remoteAddress || "unknown").toString();
  if (rateLimited(ip)) {
    res.status(429).json({ error: "Too many submissions. Please try again later." });
    return;
  }

  const name = trim(req.body?.name, 200);
  const email = trim(req.body?.email, 200).toLowerCase();
  const phone = trim(req.body?.phone, 40);
  const message = trim(req.body?.message, 4000);

  if (!name || !email || !message) {
    res.status(400).json({ error: "Name, email and message are required" });
    return;
  }
  if (!EMAIL_RE.test(email)) {
    res.status(400).json({ error: "Please enter a valid email address" });
    return;
  }
  if (message.length < 10) {
    res.status(400).json({ error: "Message must be at least 10 characters" });
    return;
  }

  try {
    const [row] = await db
      .insert(contactMessagesTable)
      .values({ name, email, phone, message, status: "new" })
      .returning({ id: contactMessagesTable.id });
    res.status(201).json({ id: row.id, ok: true });
  } catch (err) {
    req.log.error(err, "Failed to save contact message");
    res.status(500).json({ error: "Could not submit your message. Please try again." });
  }
});

router.get("/admin/contact-messages", requireAuth, requireAdmin, async (_req, res) => {
  const rows = await db
    .select()
    .from(contactMessagesTable)
    .orderBy(desc(contactMessagesTable.createdAt));
  res.json(rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString() })));
});

router.patch("/admin/contact-messages/:id", requireAuth, requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const status = trim(req.body?.status, 20) || undefined;
  const adminNote = typeof req.body?.adminNote === "string" ? req.body.adminNote.slice(0, 2000) : undefined;
  if (!status && adminNote === undefined) {
    res.status(400).json({ error: "Nothing to update" });
    return;
  }
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (status) updates.status = status;
  if (adminNote !== undefined) updates.adminNote = adminNote;
  await db.update(contactMessagesTable).set(updates).where(eq(contactMessagesTable.id, id));
  res.json({ ok: true });
});

router.delete("/admin/contact-messages/:id", requireAuth, requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  await db.delete(contactMessagesTable).where(eq(contactMessagesTable.id, id));
  res.json({ ok: true });
});

export default router;
