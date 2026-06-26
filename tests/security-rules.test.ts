import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("storage tenant isolation uses the provisioned camelCase clientId claim", () => {
  const storageRules = readFileSync(path.join(ROOT, "storage.rules"), "utf8");

  assert.match(storageRules, /request\.auth\.token\.clientId == clientId/);
  assert.ok(!storageRules.includes("client_id"), "Storage rules must match functions/src/index.ts custom claim name");
});
