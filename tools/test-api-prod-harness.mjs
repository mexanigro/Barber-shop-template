// Boots the prod handler from api/index.ts inside a real Node http server
// on port 3001 so we can curl it identically to the dev /api/* routes on 3000.
// Used by the Bloque B audit to compare server.ts vs api/index.ts at runtime.
//
// Run: CLIENT_ID=test-tenant node --import tsx tools/test-api-prod-harness.mjs
import http from "node:http";
import handler from "../api/index.ts";

const PORT = 3001;
http.createServer((req, res) => handler(req, res)).listen(PORT, "127.0.0.1", () => {
  console.log(`[prod-harness] api/index.ts handler listening on http://127.0.0.1:${PORT}`);
});
