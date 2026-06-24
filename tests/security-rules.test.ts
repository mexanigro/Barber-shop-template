import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const functionsSrc = readFileSync(path.join(ROOT, "functions", "src", "index.ts"), "utf8");
const firestoreRules = readFileSync(path.join(ROOT, "firestore.rules"), "utf8");
const storageRules = readFileSync(path.join(ROOT, "storage.rules"), "utf8");

test("Firebase tenant isolation uses the provisioned clientId custom claim", () => {
  assert.match(
    functionsSrc,
    /clientId:\s*body\.clientId/,
    "tenant provisioning must continue issuing the clientId custom claim",
  );
  assert.match(
    firestoreRules,
    /request\.auth\.token\.clientId\s+is\s+string/,
    "Firestore rules should validate the clientId custom claim type",
  );

  const storageClientIdChecks =
    storageRules.match(/request\.auth\.token\.clientId\s*==\s*clientId/g) ?? [];

  assert.equal(
    storageClientIdChecks.length,
    2,
    "Storage read/write rules must both authorize with the clientId custom claim",
  );
  assert.doesNotMatch(
    storageRules,
    /request\.auth\.token\.client_id/,
    "Storage rules must not use snake_case client_id; Firebase custom claims are camelCase clientId",
  );
});
