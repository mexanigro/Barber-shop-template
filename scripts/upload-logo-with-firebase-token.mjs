#!/usr/bin/env node
/**
 * upload-logo-with-firebase-token.mjs — upload a file to Firebase Storage and
 * update Firestore using the locally-installed firebase-tools auth token.
 *
 * Required env: CLIENT_ID, LOGO_PATH.
 * Optional env: PROJECT_ID (default barbertemplate-madre), BUCKET (default
 *   `${PROJECT_ID}.firebasestorage.app`).
 */
import { readFileSync } from "node:fs";
import { basename } from "node:path";
import { createRequire } from "node:module";

const require = createRequire("file:///" + "C:/Users/liama/AppData/Roaming/npm/node_modules/firebase-tools/lib/index.js");
const { getAccessToken, getGlobalDefaultAccount } = require("C:/Users/liama/AppData/Roaming/npm/node_modules/firebase-tools/lib/auth.js");

const CLIENT_ID = process.env.CLIENT_ID?.trim();
const LOGO_PATH = process.env.LOGO_PATH?.trim();
const PROJECT_ID = process.env.PROJECT_ID?.trim() || "barbertemplate-madre";
const BUCKET = process.env.BUCKET?.trim() || `${PROJECT_ID}.firebasestorage.app`;

if (!CLIENT_ID) {
  console.error("CLIENT_ID env var is required.");
  process.exit(1);
}
if (!LOGO_PATH) {
  console.error("LOGO_PATH env var is required.");
  process.exit(1);
}

const account = getGlobalDefaultAccount();
if (!account) {
  console.error("No firebase-tools account. Run `firebase login`.");
  process.exit(1);
}
console.log(`[upload] account: ${account.user.email}`);

const refreshToken = account.tokens.refresh_token;
const { access_token } = await getAccessToken(refreshToken, []);
console.log(`[upload] got access token (len=${access_token.length})`);

const buf = readFileSync(LOGO_PATH);
const ext = (basename(LOGO_PATH).split(".").pop() || "png").toLowerCase();
const destPath = `clients/${CLIENT_ID}/branding/logo-${Date.now()}.${ext}`;
const contentType = `image/${ext === "jpg" ? "jpeg" : ext}`;

console.log(`[upload] bucket=${BUCKET}`);
console.log(`[upload] dest=${destPath} (${buf.length} bytes, ${contentType})`);

// Upload via JSON API
const uploadUrl = `https://storage.googleapis.com/upload/storage/v1/b/${encodeURIComponent(BUCKET)}/o?uploadType=media&name=${encodeURIComponent(destPath)}&predefinedAcl=publicRead`;

const uploadResp = await fetch(uploadUrl, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${access_token}`,
    "Content-Type": contentType,
    "Cache-Control": "public, max-age=31536000, immutable",
  },
  body: buf,
});

if (!uploadResp.ok) {
  console.error(`Upload failed: ${uploadResp.status} ${uploadResp.statusText}`);
  console.error(await uploadResp.text());
  process.exit(1);
}
const meta = await uploadResp.json();
console.log(`[upload] uploaded: ${meta.name}`);

const publicUrl = `https://storage.googleapis.com/${BUCKET}/${destPath}`;
console.log(`[upload] public URL: ${publicUrl}`);

// Update Firestore: config/{clientId}
const firestoreBase = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/default/documents`;
const patchConfigUrl = `${firestoreBase}/config/${encodeURIComponent(CLIENT_ID)}?updateMask.fieldPaths=brand.logo&updateMask.fieldPaths=brand.logoDark`;

const patchResp = await fetch(patchConfigUrl, {
  method: "PATCH",
  headers: {
    Authorization: `Bearer ${access_token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    fields: {
      brand: {
        mapValue: {
          fields: {
            logo: { stringValue: publicUrl },
            logoDark: { stringValue: publicUrl },
          },
        },
      },
    },
  }),
});

if (!patchResp.ok) {
  console.error(`Config update failed: ${patchResp.status} ${patchResp.statusText}`);
  console.error(await patchResp.text());
  process.exit(1);
}
console.log(`[upload] updated config/${CLIENT_ID}.brand.logo`);

// Try hub_clients (best-effort)
const patchHubUrl = `${firestoreBase}/hub_clients/${encodeURIComponent(CLIENT_ID)}?updateMask.fieldPaths=logoUrl`;
const hubResp = await fetch(patchHubUrl, {
  method: "PATCH",
  headers: {
    Authorization: `Bearer ${access_token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    fields: { logoUrl: { stringValue: publicUrl } },
  }),
});

if (hubResp.ok) {
  console.log(`[upload] updated hub_clients/${CLIENT_ID}.logoUrl`);
} else if (hubResp.status === 404) {
  console.log(`[upload] hub_clients/${CLIENT_ID} not found — skipped`);
} else {
  console.warn(`[upload] hub update warning: ${hubResp.status}`);
  console.warn(await hubResp.text());
}

console.log("[upload] done.");
console.log(`URL=${publicUrl}`);
