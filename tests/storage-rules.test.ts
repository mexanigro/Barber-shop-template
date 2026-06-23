import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

function readRepoFile(path: string): string {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

test("Storage tenant rules use the provisioned clientId custom claim", () => {
  const storageRules = readRepoFile("storage.rules");
  const firestoreRules = readRepoFile("firestore.rules");
  const claimFunction = readRepoFile("functions/src/index.ts");

  assert.match(
    claimFunction,
    /clientId:\s*body\.clientId/,
    "setTenantClaim must provision the clientId custom claim",
  );
  assert.match(
    firestoreRules,
    /request\.auth\.token\.clientId/,
    "Firestore rules document the established clientId claim contract",
  );
  assert.equal(
    storageRules.match(/request\.auth\.token\.clientId\s*==\s*clientId/g)?.length,
    2,
    "Storage read and write rules must both scope by request.auth.token.clientId",
  );
  assert.doesNotMatch(
    storageRules,
    /request\.auth\.token\.client_id/,
    "Storage rules must not check an unprovisioned client_id claim",
  );
});
