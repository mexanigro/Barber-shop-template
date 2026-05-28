#!/usr/bin/env node
/**
 * migrate-stock-flat.mjs — copy stock from the legacy nested layout
 * (`stock/{clientId}/items` + `stock/{clientId}/movements`) into the flat
 * collections (`stock_items/{id}` + `stock_movements/{id}` with a
 * `clientId` field), matching the CLAUDE.md rule for tenant-scoped data.
 *
 * The frontend reader (src/services/stock.ts) already falls back to the
 * legacy layout when the flat collection is empty, so this migration is
 * idempotent and safe to re-run: existing flat docs are skipped by id.
 *
 * Usage:
 *   CLIENT_ID=mi-cliente \
 *   GOOGLE_APPLICATION_CREDENTIALS=./service-account.json \
 *   node scripts/migrate-stock-flat.mjs [--dry-run] [--limit 5000]
 *
 * `--dry-run` prints the planned writes without persisting anything.
 */

import { initializeApp, applicationDefault, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const limitIdx = args.indexOf("--limit");
const limit = limitIdx >= 0 ? Number(args[limitIdx + 1]) : 5000;

const CLIENT_ID = process.env.CLIENT_ID?.trim();
if (!CLIENT_ID) {
  console.error("CLIENT_ID env var is required.");
  process.exit(1);
}

function initAdmin() {
  if (getApps().length > 0) return;
  const projectId =
    process.env.FIREBASE_PROJECT_ID?.trim() ||
    process.env.FIREBASE_ADMIN_PROJECT_ID?.trim();
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL?.trim();
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (projectId && clientEmail && privateKey) {
    initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
    return;
  }
  initializeApp({ credential: applicationDefault() });
}

async function migrateCollection(db, sourcePath, targetCol, label) {
  const sourceSnap = await db
    .collection("stock").doc(CLIENT_ID).collection(sourcePath)
    .limit(limit)
    .get();

  if (sourceSnap.empty) {
    console.log(`[${label}] source empty — nothing to migrate.`);
    return { copied: 0, skipped: 0 };
  }

  let copied = 0;
  let skipped = 0;
  for (const doc of sourceSnap.docs) {
    const targetRef = db.collection(targetCol).doc(doc.id);
    const existing = await targetRef.get();
    if (existing.exists) {
      skipped += 1;
      continue;
    }
    const payload = { ...doc.data(), clientId: CLIENT_ID };
    console.log(`  [${label}] ${doc.id} → ${targetCol}/${doc.id}`);
    if (!dryRun) {
      await targetRef.set(payload);
    }
    copied += 1;
  }
  return { copied, skipped };
}

async function main() {
  initAdmin();
  const db = getFirestore();

  console.log(`[migrate-stock-flat] clientId=${CLIENT_ID} dryRun=${dryRun} limit=${limit}`);

  const items = await migrateCollection(db, "items", "stock_items", "items");
  const movements = await migrateCollection(db, "movements", "stock_movements", "movements");

  console.log(
    `[migrate-stock-flat] items: copied=${items.copied} skipped=${items.skipped} | ` +
    `movements: copied=${movements.copied} skipped=${movements.skipped}` +
    (dryRun ? " (dry-run)" : ""),
  );
}

main().catch((err) => {
  console.error("[migrate-stock-flat] failed:", err);
  process.exit(1);
});
