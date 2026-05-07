/**
 * One-off migration: move legacy base64 photos out of the database into
 * Replit App Storage.
 *
 * Reads every row in `accident_reports` and `lost_items` whose `photos`
 * JSONB array still contains a `data:image/...;base64,...` string (i.e. was
 * created before the App Storage upload flow shipped). For each such photo:
 *
 *   1. Decode the base64 payload.
 *   2. Sign a presigned PUT URL via the Replit object-storage sidecar.
 *   3. Upload the bytes with the right `Content-Type`.
 *   4. Replace the data URL in the row with the resulting `/objects/...`
 *      path so the existing serving code (and ACL checks) keep working.
 *
 * The script is idempotent: photos that already start with `/objects/` (or
 * any non-`data:` value) are left untouched, so it can be re-run safely.
 *
 * Usage (from the repo root):
 *   pnpm --filter @workspace/scripts run migrate-photos
 *   pnpm --filter @workspace/scripts run migrate-photos -- --dry-run
 */

import { randomUUID } from "node:crypto";
import { Storage } from "@google-cloud/storage";
import { and, eq, gt, sql } from "drizzle-orm";
import {
  db,
  pool,
  accidentReportsTable,
  lostItemsTable,
} from "@workspace/db";

const REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";

const DATA_URL_RE = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/;

const objectStorageClient = new Storage({
  credentials: {
    audience: "replit",
    subject_token_type: "access_token",
    token_url: `${REPLIT_SIDECAR_ENDPOINT}/token`,
    type: "external_account",
    credential_source: {
      url: `${REPLIT_SIDECAR_ENDPOINT}/credential`,
      format: {
        type: "json",
        subject_token_field_name: "access_token",
      },
    },
    universe_domain: "googleapis.com",
  },
  projectId: "",
});

function getPrivateObjectDir(): string {
  const dir = process.env.PRIVATE_OBJECT_DIR;
  if (!dir) {
    throw new Error(
      "PRIVATE_OBJECT_DIR is not set; cannot upload migrated photos.",
    );
  }
  return dir;
}

function parseObjectPath(path: string): {
  bucketName: string;
  objectName: string;
} {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const parts = normalized.split("/");
  if (parts.length < 3) {
    throw new Error(`Invalid object path: ${path}`);
  }
  return {
    bucketName: parts[1],
    objectName: parts.slice(2).join("/"),
  };
}

async function signObjectURL(args: {
  bucketName: string;
  objectName: string;
  method: "GET" | "PUT" | "DELETE" | "HEAD";
  ttlSec: number;
}): Promise<string> {
  const body = {
    bucket_name: args.bucketName,
    object_name: args.objectName,
    method: args.method,
    expires_at: new Date(Date.now() + args.ttlSec * 1000).toISOString(),
  };
  const res = await fetch(
    `${REPLIT_SIDECAR_ENDPOINT}/object-storage/signed-object-url`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30_000),
    },
  );
  if (!res.ok) {
    throw new Error(
      `Failed to sign object URL: ${res.status} ${await res.text()}`,
    );
  }
  const json = (await res.json()) as { signed_url: string };
  return json.signed_url;
}

/**
 * Upload one base64 data URL to App Storage and return the `/objects/...`
 * path that the rest of the app understands.
 */
async function uploadDataUrl(dataUrl: string): Promise<string> {
  const match = DATA_URL_RE.exec(dataUrl);
  if (!match) {
    throw new Error("Photo is not a data:image/...;base64,... URL");
  }
  const contentType = match[1].toLowerCase();
  const base64 = match[2];
  const bytes = Buffer.from(base64, "base64");
  if (bytes.length === 0) {
    throw new Error("Decoded photo is empty");
  }

  const privateDir = getPrivateObjectDir().replace(/\/$/, "");
  const objectId = randomUUID();
  const fullPath = `${privateDir}/uploads/${objectId}`;
  const { bucketName, objectName } = parseObjectPath(fullPath);

  const uploadURL = await signObjectURL({
    bucketName,
    objectName,
    method: "PUT",
    ttlSec: 900,
  });

  const putRes = await fetch(uploadURL, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: bytes,
  });
  if (!putRes.ok) {
    throw new Error(
      `Upload failed: ${putRes.status} ${await putRes.text().catch(() => "")}`,
    );
  }

  // Best-effort ACL marker so the file matches what the upload endpoint
  // would normally tag (matches the legacy default — no extra rules).
  try {
    await objectStorageClient
      .bucket(bucketName)
      .file(objectName)
      .setMetadata({
        metadata: {
          "custom:aclPolicy": JSON.stringify({
            owner: "system:legacy-migration",
            visibility: "private",
          }),
        },
      });
  } catch (err) {
    console.warn(
      `  (warn) could not set ACL metadata on ${objectName}:`,
      err instanceof Error ? err.message : err,
    );
  }

  return `/objects/uploads/${objectId}`;
}

interface MigrateOptions {
  dryRun: boolean;
}

type LegacyTable =
  | typeof accidentReportsTable
  | typeof lostItemsTable;

interface TableSpec {
  label: string;
  table: LegacyTable;
}

async function migrateTable(
  spec: TableSpec,
  opts: MigrateOptions,
): Promise<{ rowsScanned: number; rowsUpdated: number; photosMoved: number; failures: number }> {
  console.log(`\n=== ${spec.label} ===`);

  const idColumn = spec.table.id;
  const photosColumn = spec.table.photos;

  let rowsScanned = 0;
  let rowsUpdated = 0;
  let photosMoved = 0;
  let failures = 0;

  // Stream rows in keyset-paginated batches. We can't load every legacy row
  // at once: each one may carry several megabytes of base64. We pull a small
  // window ordered by id, process it, then advance past the highest id we
  // saw. Updated rows drop out of the filter naturally, so the next page
  // continues with whatever is still legacy.
  const BATCH_SIZE = 25;
  let lastId = 0;
  while (true) {
    const batch = (await db
      .select({ id: idColumn, photos: photosColumn })
      .from(spec.table)
      .where(
        and(
          gt(idColumn, lastId),
          sql`EXISTS (
            SELECT 1 FROM jsonb_array_elements_text(${photosColumn}) AS p
            WHERE p LIKE 'data:%'
          )`,
        ),
      )
      .orderBy(idColumn)
      .limit(BATCH_SIZE)) as Array<{ id: number; photos: unknown }>;

    if (batch.length === 0) break;
    rowsScanned += batch.length;
    lastId = batch[batch.length - 1].id;

    for (const row of batch) {
      const photos = Array.isArray(row.photos) ? (row.photos as unknown[]) : [];
      const newPhotos: string[] = [];
      let rowChanged = false;
      let rowHasFailure = false;

      for (let i = 0; i < photos.length; i++) {
        const value = photos[i];
        if (typeof value !== "string") {
          // Preserve unknown shapes verbatim — we'd rather skip than corrupt.
          newPhotos.push(value as string);
          continue;
        }
        if (!value.startsWith("data:")) {
          newPhotos.push(value);
          continue;
        }
        try {
          if (opts.dryRun) {
            console.log(
              `  [dry-run] ${spec.label} #${row.id} photo ${i + 1}: would upload ` +
                `${(value.length / 1024).toFixed(1)} KiB data URL`,
            );
            newPhotos.push(value);
          } else {
            const objectPath = await uploadDataUrl(value);
            console.log(
              `  ${spec.label} #${row.id} photo ${i + 1}: uploaded → ${objectPath}`,
            );
            newPhotos.push(objectPath);
            rowChanged = true;
            photosMoved++;
          }
        } catch (err) {
          rowHasFailure = true;
          failures++;
          console.error(
            `  (error) ${spec.label} #${row.id} photo ${i + 1}: ${
              err instanceof Error ? err.message : String(err)
            }`,
          );
          newPhotos.push(value);
        }
      }

      if (opts.dryRun || !rowChanged) {
        if (rowHasFailure) {
          console.warn(`  ${spec.label} #${row.id}: skipped DB update due to errors above.`);
        }
        continue;
      }

      await db
        .update(spec.table)
        .set({ photos: newPhotos } as never)
        .where(eq(idColumn, row.id));
      rowsUpdated++;
    }

    // If this batch came back smaller than the limit, there's nothing left
    // matching beyond the last id we saw.
    if (batch.length < BATCH_SIZE) break;
  }

  console.log(
    `Done with ${spec.label}: scanned=${rowsScanned} updated=${rowsUpdated} ` +
      `photos_moved=${photosMoved} failures=${failures}`,
  );
  return { rowsScanned, rowsUpdated, photosMoved, failures };
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  if (dryRun) {
    console.log("Running in --dry-run mode: no uploads, no DB writes.\n");
  }

  const specs: TableSpec[] = [
    { label: "accident_reports", table: accidentReportsTable },
    { label: "lost_items", table: lostItemsTable },
  ];

  let totalUpdated = 0;
  let totalMoved = 0;
  let totalFailures = 0;
  let totalScanned = 0;
  for (const spec of specs) {
    const r = await migrateTable(spec, { dryRun });
    totalScanned += r.rowsScanned;
    totalUpdated += r.rowsUpdated;
    totalMoved += r.photosMoved;
    totalFailures += r.failures;
  }

  console.log(
    `\nSummary: scanned=${totalScanned} rows_updated=${totalUpdated} ` +
      `photos_moved=${totalMoved} failures=${totalFailures}`,
  );

  if (totalFailures > 0) {
    console.error(
      "\nOne or more photos failed to migrate; their rows still contain " +
        "the original base64 strings. Re-run the script after addressing " +
        "the errors above.",
    );
    process.exitCode = 1;
  }
}

main()
  .catch((err) => {
    console.error("Migration aborted:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
