import { Router } from "express";
import { db, legalPagesTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { requireAdmin } from "../middlewares/requireAdmin";
import {
  ALLOWED_LEGAL_SLUGS,
  DEFAULT_LEGAL_CONTENT,
  isAllowedLegalSlug,
  type LegalSlug,
} from "../lib/defaultLegalContent";

const router = Router();

// Fallback timestamp used when a slug has no DB row yet but we want to return
// the seeded default content. Stable per process restart so the "Last updated"
// label doesn't jitter between requests.
const FALLBACK_UPDATED_AT = new Date().toISOString();

router.get("/legal", async (_req, res) => {
  const rows = await db
    .select({
      slug: legalPagesTable.slug,
      title: legalPagesTable.title,
      updatedAt: legalPagesTable.updatedAt,
    })
    .from(legalPagesTable)
    .orderBy(asc(legalPagesTable.slug));

  // Merge DB rows with built-in defaults so the admin Legal tab always shows
  // every allowed slug — even on a fresh deploy with an empty table.
  const bySlug = new Map(rows.map((r) => [r.slug, { ...r, updatedAt: r.updatedAt.toISOString() }]));
  const merged = ALLOWED_LEGAL_SLUGS.map((slug) => {
    const existing = bySlug.get(slug);
    if (existing) return existing;
    const def = DEFAULT_LEGAL_CONTENT[slug];
    return { slug: def.slug, title: def.title, updatedAt: FALLBACK_UPDATED_AT };
  });
  res.json(merged);
});

router.get("/legal/:slug", async (req, res) => {
  const slug = String(req.params.slug);
  if (!isAllowedLegalSlug(slug)) {
    res.status(404).json({ error: "Page not found" });
    return;
  }
  const [row] = await db
    .select()
    .from(legalPagesTable)
    .where(eq(legalPagesTable.slug, slug));
  if (row) {
    res.json({ ...row, updatedAt: row.updatedAt.toISOString() });
    return;
  }
  // No DB row — serve the built-in default so the page is never blank.
  const def = DEFAULT_LEGAL_CONTENT[slug];
  res.json({
    slug: def.slug,
    title: def.title,
    content: def.content,
    updatedAt: FALLBACK_UPDATED_AT,
  });
});

router.put("/admin/legal/:slug", requireAuth, requireAdmin, async (req, res) => {
  const slug = String(req.params.slug);
  if (!isAllowedLegalSlug(slug)) {
    res.status(400).json({ error: "Invalid slug" });
    return;
  }
  const title = typeof req.body?.title === "string" ? req.body.title.trim().slice(0, 200) : "";
  const content = typeof req.body?.content === "string" ? req.body.content.slice(0, 100_000) : "";
  if (!title || !content) {
    res.status(400).json({ error: "title and content are required" });
    return;
  }
  const now = new Date();
  await db
    .insert(legalPagesTable)
    .values({ slug: slug as LegalSlug, title, content, updatedAt: now })
    .onConflictDoUpdate({ target: legalPagesTable.slug, set: { title, content, updatedAt: now } });
  res.json({ ok: true });
});

export default router;
