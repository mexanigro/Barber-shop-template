import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

test("Storage rules use the provisioned camelCase clientId claim", () => {
  const rules = readFileSync(path.join(ROOT, "storage.rules"), "utf8");

  assert.match(rules, /request\.auth\.token\.clientId == clientId/);
  assert.doesNotMatch(rules, /request\.auth\.token\.client_id/);
});
