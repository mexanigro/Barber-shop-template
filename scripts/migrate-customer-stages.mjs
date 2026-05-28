#!/usr/bin/env node
/**
 * migrate-customer-stages.mjs — backfill `stage` on customer documents.
 *
 * The pipeline kanban (Bloque F) derives `stage` at read time for legacy docs,
 * so this migration is *optional*. Run it once per tenant when you want the
 * stage column materialised in Firestore (analytics, hub dashboards, etc.).
 *
 * Derivation rules (mirror src/lib/customer-pipeline.ts#deriveStage):
 *   • explicit `stage`                 → keep as-is
 *   • visitCount >= 1                  → "converted"
 *   • has active future appointment    → "scheduled"
 *   • otherwise                        → "lead"
 *
 * Usage:
 *   CLIENT_ID=mi-cliente \
 *   GOOGLE_APPLICATION_CREDENTIALS=./service-account.json \
 *   node scripts/migrate-customer-stages.mjs [--dry-run] [--limit 5000]
 *
 * Dry-run prints the planned writes without persisting anything.
 */

import { initializeApp, applicationDefault, cert } from "firebase-admin/app";
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

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function isValidStage(value) {
  return value === "lead" || value === "contacted" || value === "scheduled" || value === "converted" || value === "lost";
}

function deriveStage(customer, appointments) {
  if (customer.stage && isValidStage(customer.stage)) return customer.stage;
  if ((customer.visitCount ?? 0) >= 1) return "converted";
  const today = todayIso();
  const hasActiveFuture = appointments.some(
    (a) =>
      (a.status === "confirmed" || a.status === "pending") &&
      typeof a.date === "string" &&
      a.date >= today,
  );
  if (hasActiveFuture) return "scheduled";
  return "lead";
}

function appointmentBelongsToCustomer(appt, customer) {
  const apptEmail = (appt.customerEmail ?? "").toLowerCase();
  const custEmail = (customer.email ?? "").toLowerCase();
  if (apptEmail && custEmail && apptEmail === custEmail) return true;
  const apptPhone = String(appt.customerPhone ?? "").replace(/\D/g, "");
  const custPhone = String(customer.phone ?? "").replace(/\D/g, "");
  if (apptPhone && custPhone && apptPhone === custPhone) return true;
  return false;
}

function initAdmin() {
  const projectId =
    process.env.FIREBASE_PROJECT_ID?.trim() ||
    process.env.FIREBASE_ADMIN_PROJECT_ID?.trim();
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL?.trim();
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (projectId && clientEmail && privateKey) {
    return initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
  }
  return initializeApp({ credential: applicationDefault() });
}

async function main() {
  initAdmin();
  const db = getFirestore();

  console.log(`[migrate-customer-stages] clientId=${CLIENT_ID} dryRun=${dryRun} limit=${limit}`);

  const custSnap = await db
    .collection("customers")
    .where("clientId", "==", CLIENT_ID)
    .limit(limit)
    .get();

  const apptSnap = await db
    .collection("appointments")
    .where("clientId", "==", CLIENT_ID)
    .limit(20_000)
    .get();
  const allAppts = apptSnap.docs.map((d) => d.data());

  let updated = 0;
  let unchanged = 0;
  let alreadyStaged = 0;

  for (const doc of custSnap.docs) {
    const data = doc.data();
    if (data.stage && isValidStage(data.stage)) {
      alreadyStaged += 1;
      continue;
    }
    const customerAppts = allAppts.filter((a) => appointmentBelongsToCustomer(a, data));
    const stage = deriveStage(data, customerAppts);
    console.log(`  ${doc.id}: ${data.fullName ?? "(no name)"} → ${stage}`);
    if (!dryRun) {
      await doc.ref.update({ stage, updatedAt: new Date() });
    }
    updated += 1;
  }
  unchanged = custSnap.size - updated - alreadyStaged;

  console.log(
    `[migrate-customer-stages] scanned=${custSnap.size} updated=${updated} alreadyStaged=${alreadyStaged} unchanged=${unchanged}${dryRun ? " (dry-run)" : ""}`,
  );
}

main().catch((err) => {
  console.error("[migrate-customer-stages] failed:", err);
  process.exit(1);
});
