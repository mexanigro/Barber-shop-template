/**
 * Parity tests for the two Express runtimes (server.ts ↔ api/index.ts).
 *
 * Born from the 2026-06-10 audit: security fixes were landing in one runtime
 * but not the other (e.g. the Cardcom webhook was verified in server.ts only).
 * The shared logic now lives in src/lib/api/* — these tests guard:
 *
 *   1. Route parity: both entrypoints register the same method+path set,
 *      modulo a documented allowlist of intentional differences. Adding a
 *      route to only one runtime fails the test.
 *   2. Import-surface parity: both entrypoints consume the shared modules
 *      (no re-inlining of auth / payments / booking / chat dispatch).
 *   3. Behavior of the shared modules themselves (webhook verification,
 *      booking manifest math, admin auth gate edge cases).
 *
 * Run with: npm run test:parity   (tsx --test, no test framework needed)
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

import {
  buildCardcomGateway,
  buildPaymentGateway,
  createCredentialCache,
} from "../src/lib/api/payment-gateways";
import {
  BookingConflictError,
  computeManifestWindow,
  hasManifestConflict,
  isValidBookingDate,
  isValidBookingDuration,
  isValidBookingTime,
  resolveTrustedBookingMetadata,
} from "../src/lib/api/booking-validation";
import { base64UrlDecode, requireAdminAuth } from "../src/lib/api/admin-auth";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const serverSrc = readFileSync(path.join(ROOT, "server.ts"), "utf8");
const apiSrc = readFileSync(path.join(ROOT, "api", "index.ts"), "utf8");

// ─── 1. Route parity ─────────────────────────────────────────────────────────

function extractRoutes(src: string): Set<string> {
  const routes = new Set<string>();
  const re = /app\.(get|post|put|delete|patch)\(\s*"(\/[^"]*)"/g;
  for (const m of src.matchAll(re)) {
    routes.add(`${m[1].toUpperCase()} ${m[2]}`);
  }
  return routes;
}

// Intentional differences. Anything NOT listed here must exist in BOTH
// runtimes — extend these lists consciously, with a reason.
const ONLY_IN_SERVER = new Set([
  "POST /api/support/message",
  // Stock admin endpoints not yet ported to the serverless runtime.
  "POST /api/stock/add",
  "GET /api/stock/items",
  // SPA fallback for self-hosted production mode.
  "GET *",
]);
const ONLY_IN_API = new Set([
  // Vercel cron (vercel.json crons) — meaningless under tsx dev server.
  "GET /api/daily-digest",
  // Lightweight public helpers for monitor probes / client booking flow.
  "GET /api/services",
  "POST /api/availability",
  "POST /api/bookings/validate",
]);

test("route parity between server.ts and api/index.ts", () => {
  const serverRoutes = extractRoutes(serverSrc);
  const apiRoutes = extractRoutes(apiSrc);

  const missingInApi = [...serverRoutes].filter(
    (r) => !apiRoutes.has(r) && !ONLY_IN_SERVER.has(r),
  );
  const missingInServer = [...apiRoutes].filter(
    (r) => !serverRoutes.has(r) && !ONLY_IN_API.has(r),
  );

  assert.deepEqual(
    missingInApi,
    [],
    `Routes registered in server.ts but missing in api/index.ts (add them or allowlist consciously): ${missingInApi.join(", ")}`,
  );
  assert.deepEqual(
    missingInServer,
    [],
    `Routes registered in api/index.ts but missing in server.ts (add them or allowlist consciously): ${missingInServer.join(", ")}`,
  );
});

// ─── 2. Import-surface parity (no re-inlining) ───────────────────────────────

test("both runtimes consume the shared src/lib/api modules", () => {
  // api/index.ts ships to Vercel as ESM — its relative imports carry an
  // explicit .js extension (extensionless specifiers crash the function with
  // ERR_MODULE_NOT_FOUND at runtime). server.ts runs under tsx, which accepts
  // both forms; the regex tolerates the optional extension in either file.
  for (const mod of ["api/payment-gateways", "api/admin-auth", "api/booking-validation"]) {
    assert.match(serverSrc, new RegExp(`from "\\./src/lib/${mod}(\\.js)?"`), `server.ts must import src/lib/${mod}`);
    assert.match(apiSrc, new RegExp(`from "\\.\\./src/lib/${mod}(\\.js)?"`), `api/index.ts must import src/lib/${mod}`);
  }
  // Admin chat dispatch: api/index.ts must use the shared router + tools.
  for (const mod of ["intent-router", "ai/admin-tools", "ai/stock-tools", "ai/tasks-tools"]) {
    assert.match(apiSrc, new RegExp(`from "\\.\\./src/lib/${mod}(\\.js)?"`), `api/index.ts must import src/lib/${mod}`);
  }
});

test("the inline duplicates stay deleted", () => {
  for (const banned of [
    "routeAdminIntentInline",
    "ALL_ADMIN_TOOLS_INLINE",
    "GET_CRM_SNAPSHOT_DECLARATION_INLINE",
    "function dispatchAdminAction(",
    "function buildCardcomGateway(",
    "function verifyFirebaseIdToken(",
    "async function requireAdminAuth(\n  req: Request,\n  res: Response,\n): Promise<{ email: string; uid: string; role: AdminRole } | null> {\n  const authHeader",
  ]) {
    assert.ok(!apiSrc.includes(banned), `api/index.ts re-inlined: ${banned}`);
    assert.ok(!serverSrc.includes(banned), `server.ts re-inlined: ${banned}`);
  }
});

test("Vercel appointment notify route stays admin-only", () => {
  const marker = 'app.post("/api/appointment/notify", async (req, res) => {';
  const idx = apiSrc.indexOf(marker);
  assert.notEqual(idx, -1, "api/index.ts must register /api/appointment/notify");
  const routeStart = apiSrc.slice(idx, idx + 180);
  assert.match(routeStart, /requireAdminAuth\(req, res\)/, "/api/appointment/notify must require admin auth in api/index.ts");
});

// ─── 3. Payment gateway behavior (Cardcom webhook verification) ──────────────

const cardcomHeaders = (token?: string): Record<string, string> =>
  token ? { "x-cardcom-notification-token": token } : {};

const cardcomBody = (over: Record<string, unknown> = {}): Buffer =>
  Buffer.from(
    JSON.stringify({
      ResponseCode: 0,
      Amount: 150.5,
      LowProfileId: "lp_123",
      CustomFields: { Field1: "appt_1", Field2: "client-a", Field3: "full" },
      ...over,
    }),
  );

test("cardcom webhook: rejected when notificationToken is not configured", () => {
  const gw = buildCardcomGateway({}, "client-a");
  assert.equal(gw.verifyWebhookEvent(cardcomBody(), cardcomHeaders("anything")), null);
});

test("cardcom webhook: rejected on token mismatch", () => {
  const gw = buildCardcomGateway({ notificationToken: "secret" }, "client-a");
  assert.equal(gw.verifyWebhookEvent(cardcomBody(), cardcomHeaders("wrong")), null);
  assert.equal(gw.verifyWebhookEvent(cardcomBody(), {}), null);
});

test("cardcom webhook: rejected on clientId mismatch (cross-tenant)", () => {
  const gw = buildCardcomGateway({ notificationToken: "secret" }, "client-a");
  const body = cardcomBody({ CustomFields: { Field1: "appt_1", Field2: "client-B", Field3: "full" } });
  assert.equal(gw.verifyWebhookEvent(body, cardcomHeaders("secret")), null);
});

test("cardcom webhook: accepted with valid token + matching tenant", () => {
  const gw = buildCardcomGateway({ notificationToken: "secret" }, "client-a");
  const event = gw.verifyWebhookEvent(cardcomBody(), cardcomHeaders("secret"));
  assert.ok(event);
  assert.equal(event.type, "checkout.session.completed");
  assert.equal(event.appointmentId, "appt_1");
  assert.equal(event.amountTotalCents, 15050);
  assert.equal(event.sessionId, "lp_123");
  assert.equal(event.paymentMode, "full");
});

test("cardcom webhook: failed payment is not an event", () => {
  const gw = buildCardcomGateway({ notificationToken: "secret" }, "client-a");
  assert.equal(gw.verifyWebhookEvent(cardcomBody({ ResponseCode: 7 }), cardcomHeaders("secret")), null);
});

test("manual + stub gateways never verify webhooks and refuse checkout", async () => {
  const manual = buildPaymentGateway("none", {}, "client-a");
  assert.equal(manual.verifyWebhookEvent(Buffer.from("{}"), {}), null);
  await assert.rejects(() =>
    manual.createCheckoutSession({
      appointmentId: "a", customerEmail: "e@x.com", serviceName: "s",
      amountCents: 100, mode: "full", successUrl: "https://x", cancelUrl: "https://x", clientId: "c",
    }),
  );
  const stub = buildPaymentGateway("paypal", {}, "client-a");
  assert.equal(stub.provider, "paypal");
  assert.equal(stub.verifyWebhookEvent(Buffer.from("{}"), {}), null);
});

test("createCredentialCache caches within TTL", async () => {
  let calls = 0;
  const load = createCredentialCache(async () => {
    calls += 1;
    return { secretKey: `k${calls}` };
  }, 60_000);
  assert.equal((await load()).secretKey, "k1");
  assert.equal((await load()).secretKey, "k1");
  assert.equal(calls, 1);
});

// ─── 4. Booking validation behavior ──────────────────────────────────────────

test("manifest window math includes the 10-minute buffer", () => {
  const w = computeManifestWindow("09:30", 60);
  assert.equal(w.startMinutes, 570);
  assert.equal(w.endMinutes, 640);
  assert.equal(w.endTime, "10:40");
});

test("manifest conflict detection (overlap and boundary cases)", () => {
  const intervals = [{ start: "10:00", end: "11:10" }];
  // Overlapping start
  assert.equal(hasManifestConflict(intervals, 10 * 60 + 30, 12 * 60), true);
  // Fully inside
  assert.equal(hasManifestConflict(intervals, 10 * 60 + 15, 10 * 60 + 45), true);
  // Touching boundary (ends exactly when the other starts) — NOT a conflict
  assert.equal(hasManifestConflict(intervals, 9 * 60, 10 * 60), false);
  assert.equal(hasManifestConflict(intervals, 11 * 60 + 10, 12 * 60), false);
});

test("booking field validators (duration cap 5–480, formats)", () => {
  assert.equal(isValidBookingDuration(5), true);
  assert.equal(isValidBookingDuration(480), true);
  assert.equal(isValidBookingDuration(4), false);
  assert.equal(isValidBookingDuration(481), false);
  assert.equal(isValidBookingDuration(30.5), false);
  assert.equal(isValidBookingDuration("30"), false);
  assert.equal(isValidBookingDate("2026-06-10"), true);
  assert.equal(isValidBookingDate("10/06/2026"), false);
  assert.equal(isValidBookingTime("09:30"), true);
  assert.equal(isValidBookingTime("9:30"), false);
});

test("BookingConflictError carries the 409 semantics message", () => {
  const err = new BookingConflictError();
  assert.equal(err.name, "BookingConflictError");
  assert.match(err.message, /no longer available/);
});

test("trusted booking metadata resolves server-owned duration and full checkout amount", () => {
  const meta = resolveTrustedBookingMetadata({
    services: [{ id: "cut", name: "Haircut", duration: 45, price: 120 }],
    staff: [{ id: "liam", name: "Liam" }],
    payment: { mode: "full" },
  }, "cut", "liam");

  assert.deepEqual(meta, {
    serviceName: "Haircut",
    duration: 45,
    staffName: "Liam",
    priceCents: 12000,
    checkoutAmountCents: 12000,
    checkoutMode: "full",
  });
});

test("trusted booking metadata uses deposit amount and rejects unknown services", () => {
  const meta = resolveTrustedBookingMetadata({
    services: [{ id: "tattoo", name: "Flash", duration: 90, price: 300 }],
    payment: { mode: "deposit", depositAmount: 5000 },
  }, "tattoo", "anyone");

  assert.equal(meta?.duration, 90);
  assert.equal(meta?.priceCents, 30000);
  assert.equal(meta?.checkoutAmountCents, 5000);
  assert.equal(meta?.checkoutMode, "deposit");
  assert.equal(resolveTrustedBookingMetadata({ services: [] }, "missing", "anyone"), null);
});

// ─── 5. Admin auth gate edge cases (shared by both runtimes) ─────────────────

type MockRes = {
  statusCode: number | null;
  body: unknown;
  status(code: number): MockRes;
  json(payload: unknown): MockRes;
};
const mockRes = (): MockRes => ({
  statusCode: null,
  body: null,
  status(code: number) { this.statusCode = code; return this; },
  json(payload: unknown) { this.body = payload; return this; },
});

test("requireAdminAuth: 401 without Authorization header, lookup never called", async () => {
  let lookupCalled = false;
  const res = mockRes();
  const result = await requireAdminAuth(
    { headers: {} } as never,
    res as never,
    async () => { lookupCalled = true; return null; },
  );
  assert.equal(result, null);
  assert.equal(res.statusCode, 401);
  assert.equal(lookupCalled, false);
});

test("requireAdminAuth: 401 on non-Bearer header", async () => {
  const res = mockRes();
  const result = await requireAdminAuth(
    { headers: { authorization: "Basic abc" } } as never,
    res as never,
    async () => null,
  );
  assert.equal(result, null);
  assert.equal(res.statusCode, 401);
});

test("requireAdminAuth: 401 on malformed token (no network, no lookup)", async () => {
  let lookupCalled = false;
  const res = mockRes();
  const result = await requireAdminAuth(
    { headers: { authorization: "Bearer not-a-jwt" } } as never,
    res as never,
    async () => { lookupCalled = true; return null; },
  );
  assert.equal(result, null);
  assert.equal(res.statusCode, 401);
  assert.equal(lookupCalled, false);
});

test("base64UrlDecode roundtrip", () => {
  const buf = base64UrlDecode(Buffer.from("hola señor").toString("base64url"));
  assert.equal(buf.toString("utf8"), "hola señor");
});

// A-6/M-2 policy guard: the legacy env-allowlist fallback must NOT exist in
// the shared gate, and unverified emails must be rejected. We assert on the
// module source so a reintroduction fails loudly.
test("admin-auth module enforces M-2 and has no env-allowlist fallback", () => {
  const authSrc = readFileSync(path.join(ROOT, "src", "lib", "api", "admin-auth.ts"), "utf8");
  assert.match(authSrc, /email_verified/, "M-2 email_verified check missing");
  assert.ok(!authSrc.includes("process.env.ADMIN_EMAILS"), "A-6 regression: env allowlist read in shared admin-auth");
  assert.ok(!authSrc.includes("process.env.VITE_ADMIN_EMAIL"), "A-6 regression: env allowlist read in shared admin-auth");
});
