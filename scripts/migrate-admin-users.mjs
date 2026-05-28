#!/usr/bin/env node
/**
 * migrate-admin-users.mjs — bootstrap the admin_users collection (Bloque E).
 *
 * Reads the legacy `config/{clientId}.adminEmail` (or the ADMIN_BOOTSTRAP_EMAIL
 * env var) and, if no admin_users doc exists yet for that email, creates one
 * with role "owner" and status "active". Idempotent — safe to re-run.
 *
 * Usage:
 *   CLIENT_ID=mi-cliente \
 *   GOOGLE_APPLICATION_CREDENTIALS=./service-account.json \
 *   node scripts/migrate-admin-users.mjs [--dry-run]
 *
 *   # Override the source email (skips the config doc lookup):
 *   ADMIN_BOOTSTRAP_EMAIL=owner@example.com \
 *   node scripts/migrate-admin-users.mjs
 *
 * Dry-run prints the planned writes without persisting anything.
 */

import { initializeApp, applicationDefault, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");

const CLIENT_ID = process.env.CLIENT_ID?.trim();
if (!CLIENT_ID) {
  console.error("CLIENT_ID env var is required.");
  process.exit(1);
}

function normalizeEmail(value) {
  return String(value ?? "").trim().toLowerCase();
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(value);
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

async function resolveOwnerEmail(db) {
  const override = normalizeEmail(process.env.ADMIN_BOOTSTRAP_EMAIL ?? "");
  if (override) return override;
  const snap = await db.collection("config").doc(CLIENT_ID).get();
  if (!snap.exists) return "";
  const data = snap.data() ?? {};
  return normalizeEmail(data.adminEmail);
}

async function main() {
  initAdmin();
  const db = getFirestore();

  const ownerEmail = await resolveOwnerEmail(db);
  if (!ownerEmail) {
    console.error(
      `[migrate-admin-users] No bootstrap email found for clientId=${CLIENT_ID}. ` +
        `Set ADMIN_BOOTSTRAP_EMAIL or seed config/${CLIENT_ID}.adminEmail.`,
    );
    process.exit(1);
  }
  if (!isValidEmail(ownerEmail)) {
    console.error(`[migrate-admin-users] Resolved email is invalid: ${ownerEmail}`);
    process.exit(1);
  }

  console.log(`[migrate-admin-users] clientId=${CLIENT_ID} email=${ownerEmail} dryRun=${dryRun}`);

  const ref = db.collection("admin_users").doc(ownerEmail);
  const existing = await ref.get();
  if (existing.exists) {
    const data = existing.data() ?? {};
    if (data.clientId === CLIENT_ID) {
      console.log(
        `[migrate-admin-users] doc already exists — role=${data.role ?? "?"} status=${data.status ?? "?"}. Nothing to do.`,
      );
      return;
    }
    console.warn(
      `[migrate-admin-users] doc exists but clientId mismatch (${data.clientId}). Refusing to overwrite — investigate.`,
    );
    process.exit(2);
  }

  const payload = {
    clientId: CLIENT_ID,
    email: ownerEmail,
    role: "owner",
    invitedBy: "system",
    invitedAt: FieldValue.serverTimestamp(),
    acceptedAt: FieldValue.serverTimestamp(),
    status: "active",
  };

  if (dryRun) {
    console.log(`  [DRY] would create admin_users/${ownerEmail}:`, payload);
    return;
  }

  await ref.set(payload);
  console.log(`  ✓ created admin_users/${ownerEmail} as owner`);
}

main().catch((err) => {
  console.error("[migrate-admin-users] failed:", err);
  process.exit(1);
});
