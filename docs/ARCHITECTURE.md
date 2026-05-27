# Architecture — backend (server.ts vs api/index.ts)

This template ships **two** Express-based backends. They serve the same HTTP
contract, but the runtime differs:

| File | Used by | Runtime |
|---|---|---|
| `server.ts` | `npm run dev` (local) | Long-lived Node + Vite middleware |
| `api/index.ts` | Vercel production | Serverless function, single export `default handler(req, res)` |

`vercel.json` rewrites `/sitemap.xml` and `/api/:path*` to `/api`, which
resolves to `api/index.ts`. **Nothing in `server.ts` runs in production.**

## Source of truth

`api/index.ts` is the only backend that runs in production. If you add a
route or change server-side logic, **you must replicate the change in
`api/index.ts`** or the change will work in `npm run dev` and silently
break in prod.

`server.ts` is iteration speed — it boots faster, mounts Vite middleware
for HMR, and has full access to Node ecosystem (firebase-admin SDK,
filesystem, etc.). It is fine to prototype in `server.ts` first, but
every commit that ships must update both.

## Why two files

`api/index.ts` is self-contained — it imports no source from the repo,
so the Vercel `@vercel/node` bundler can compile a single file with no
TypeScript module-resolution issues. `server.ts` shares no code with it.
A previous attempt to share logic via `registerExpressRoutes()` (still
visible in `server.ts`) created bundling failures in Vercel and was
abandoned for `api/index.ts`.

The cost is exactly this: drift. Every helper, validator, prompt builder,
and route handler exists in two copies.

## Patterns that MUST be used in api/index.ts

Vercel serverless functions cold-start fast only if expensive packages
load lazily. The `firebase-admin` SDK ships gRPC and hangs the cold start
if loaded at module init. Use these patterns:

### 1. firebase-admin via dynamic import inside the handler

```ts
app.post("/api/ai/action", async (req, res) => {
  const auth = await requireAdminAuth(req, res);
  if (!auth) return;

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID?.trim();
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL?.trim();
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!projectId || !clientEmail || !privateKey) {
    return res.status(503).json({ error: "Database not available" });
  }

  const { initializeApp, getApps, cert } = await import("firebase-admin/app");
  const { getFirestore, FieldValue } = await import("firebase-admin/firestore");
  const app = getApps().length > 0
    ? getApps()[0]!
    : initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
  const db = getFirestore(app, process.env.FIREBASE_DATABASE_ID?.trim() || "default");

  // … use db …
});
```

For read paths that don't need transactions or `FieldValue` server timestamps,
prefer the existing **Firestore REST** helpers (`firestoreRestGetDocument`,
`firestoreRestPatchDocument`, `firestoreRestCreate`). REST keeps the cold
start small and the surface area auditable.

### 2. requireAdminAuth for any handler that touches owner data

Every handler that mutates Firestore on behalf of the business owner — or
exposes PII to a "CRM mode" caller — must start with:

```ts
const auth = await requireAdminAuth(req, res);
if (!auth) return;
```

The helper verifies a Firebase ID token (RS256 against Google's public
certs), checks the email against `ADMIN_EMAILS` / `VITE_ADMIN_EMAIL`, and
writes 401/403 directly. It is duplicated verbatim in both files. **Do
not skip this on a "trusted caller" handler — the frontend lives on the
public internet.**

### 3. Fail-closed, not fail-open

If env vars or services are missing, return 503/500 with a generic error.
Do NOT return a default response that the caller can misinterpret as
success. The only exception is the kill-switch (`getClientRuntimeState`),
which fails *open* — Firestore being unreachable should not block all
traffic for every tenant.

## How to add a new route — checklist

1. Draft the handler in `server.ts`. Run `npm run dev` and curl-test it.
2. Copy the handler into `api/index.ts` with the patterns above.
3. If it uses `firebase-admin`, ensure it uses dynamic import inside the
   handler — never at module top.
4. If it mutates owner data, gate with `requireAdminAuth`.
5. Run `npx tsc --noEmit` from the repo root.
6. Smoke-test the prod handler with the harness in
   `tools/test-api-prod-harness.mjs` (boots `api/index.ts` on :3001).
7. Commit with the route name in the message so future audits can grep.

## Routes currently served

Inventory at time of writing (2026-05-26, Bloque B audit):

| Route | Method | Where | Notes |
|---|---|---|---|
| `/api/webhook` | POST | both | Stripe webhook reconcile |
| `/api/health` | GET | both | Cheap liveness check |
| `/api/tenant/status` | GET | both | Returns kill-switch state |
| `/api/ai/analyze` | POST | both | Gemini: strategic / style / crm |
| `/api/ai/chat` | POST | both | Public + admin (gated) |
| `/api/ai/action` | POST | both | Admin walk-in / book / update (gated) |
| `/api/contact` | POST | both | Contact form |
| `/api/notify-booking` | POST | both | Unpaid booking notification |
| `/api/create-checkout-session` | POST | both | Stripe checkout |
| `/sitemap.xml` | GET | both | Prod includes dynamic staff slugs |
| `/api/daily-digest` | GET | prod only | Vercel cron (`vercel.json`) |
| `/api/services` | GET | prod only | Monitor probe (returns config services) |
| `/api/availability` | POST | prod only | Monitor probe (echo stub) |
| `/api/bookings/validate` | POST | prod only | Monitor probe (validation only) |

## Known drift — pending blocks

Audited 2026-05-26 (Bloque B). See git log for `fix(api): B*` commits.

**Resolved (this block):**
- 🔴 `/api/ai/chat` public branch missing `bookingGuidance` (CLAUDE.md violation) → `fix(api): B1`
- 🔴 `/api/create-checkout-session` missing `idempotencyKey` → `fix(api): B2`

**Pending — medium priority:**
- 🟡 `/api/ai/chat` admin branch prompt is a subset of server.ts (missing top services, busiest days, last-30 history, freeConsultations, meetings KPIs, APPOINTMENT TYPES detail, scheduling section). Effort: small. Block: AI admin quality only.
- 🟡 `/api/ai/chat` public branch in `api/index.ts` does NOT fetch live availability via Firestore REST. `server.ts` fetches upcoming appointments via Admin SDK. Effort: medium (needs REST `runQuery`). Block: chatbot can't reference real-time bookings, but always directs to Book button regardless.
- 🟡 `/api/ai/analyze` lacks `maxOutputTokens` in `server.ts` (only prod has cost cap). Effort: trivial. Block: dev cost only.
- 🟡 `buildCrmInsightPrompt` / `buildStrategicAnalysisPrompt` differ in richness between the two files. Effort: small. Block: AI analyze quality only.

**Pending — low priority:**
- ~~🟢 `getAdminDb()` stub at `api/index.ts:88-90` returns `null` unconditionally.~~ **Removed (H7).** Any new handler that needs firebase-admin must use the dynamic-import pattern documented in section 1 above.
- 🟢 `/sitemap.xml` in `server.ts` lists 3 hardcoded URLs; `api/index.ts` lists 5 + dynamic staff slugs. Dev sitemap is short but dev is never indexed. Effort: small. Block: none.
- 🟢 Monitor-friendly stubs `/api/services`, `/api/availability`, `/api/bookings/validate` only exist in `api/index.ts`. Frontend does not call them; they're for `monitor-agent` against prod. Effort: small if we ever want dev parity. Block: none.
- 🟢 `/api/webhook`, `/api/tenant/status`, `/api/contact` use Admin SDK in `server.ts` and Firestore REST in `api/index.ts`. Functionally equivalent. Could unify on REST for clarity, but no bug today.

### H9 — siteConfig.adminEmail is info-only (2026-05-27)

`siteConfig.adminEmail` comes from `import.meta.env.VITE_ADMIN_EMAIL` and
is hard-coded into the public JS bundle at build time (this is Vite's
contract for any `VITE_*` env var). It is **not** a secret.

It is used **only** for client-side UI hints — never as an auth gate:

| Call site | Purpose |
|---|---|
| `src/components/admin/ProtectedRoute.tsx:63` (`isAdminUser`) | Client-side render switch: show admin UI vs `<UnauthorizedAdmin />`. A tampered bundle could flip this — that does not matter because the next layer is real auth. |
| `src/components/admin/AdminLoginPanel.tsx:45` | UX feedback: if no `adminEmail` is configured, render a "config error" panel instead of the login button. |
| `src/lib/admin-auth.ts` (`isAdminUser`) | Same role as ProtectedRoute — client render gate only. |
| `src/services/stock.ts:80`, `src/components/admin/StockTab.tsx:340` | Audit-log `performedBy` string. Pure metadata. |
| `src/services/tenant.ts:45` | Listed in `SAFE_FIRESTORE_TOP_LEVEL` so an override write from the hub can change it. Still UI-only data. |

The **actual** auth boundary lives in three places, none of which read
`siteConfig.adminEmail`:

1. **Firestore rules** (`firestore.rules`): every privileged write/read
   checks `request.auth.token.clientId` custom claim. The claim is set
   server-side after a Cloud Function verifies the Google identity. A
   bundle that lies about `adminEmail` cannot mint this claim.
2. **server.ts / api/index.ts `requireAdminAuth`**: verifies a Firebase
   ID token (RS256 against Google's public certs) and checks the email
   against the **server-side** `process.env.ADMIN_EMAILS` /
   `process.env.VITE_ADMIN_EMAIL`. The server reads these from
   `process.env`, not from the client bundle.
3. **Cloud Functions** (`functions/src/index.ts`): same pattern —
   compares caller's verified email to `parseAdminEmails()` from
   server-side env.

**Verdict:** `siteConfig.adminEmail` is safe to remain in the bundle.
Treat it as a public string. Do not use it for any new auth decision —
gate on `requireAdminAuth` (server) or a Firestore custom claim
instead. A future block may still want to delete it for hygiene, but
that is **not** a security fix.

### H8 — firebase-admin audit (2026-05-27)

Bloque A.5 fixed `/api/ai/action`. This audit verified the other prod
handlers in `api/index.ts` to confirm nothing else relies on the now-
removed `getAdminDb()` stub or hits firebase-admin without the dynamic-
import pattern.

Routes that touch Firestore in `api/index.ts`, and how they reach it:

| Route | Method to reach Firestore | Status |
|---|---|---|
| `/api/ai/chat` (admin branch) | dynamic `await import("firebase-admin/...")` inside handler | ✅ correct |
| `/api/ai/action` | dynamic `await import("firebase-admin/...")` inside handler | ✅ correct (Bloque A.5) |
| `/api/contact` | `firestoreRestCreate("contact_inbox", …)` | ✅ REST, no SDK |
| `/api/notify-booking` | `writeNotificationLog` → `firestoreRestCreate` | ✅ REST, no SDK |
| `/api/daily-digest` | `firestoreRestCreate` + `runQuery` over REST | ✅ REST, no SDK |
| `/api/webhook` (Stripe) | `firestoreRestPatchDocument` (REST) | ✅ REST, no SDK |
| `/api/tenant/status`, `/sitemap.xml`, `/api/services` | `firestoreRestGetDocument` (REST) | ✅ REST, no SDK |
| `/api/ai/analyze`, `/api/ai/chat` (public), `/api/availability`, `/api/bookings/validate`, `/api/health`, `/api/create-checkout-session` | no Firestore access | ✅ N/A |

**Verdict: no additional handlers are broken in prod.** The only callers
of firebase-admin in `api/index.ts` are the two admin-only chat/action
routes, and both already use the dynamic-import pattern documented above.
All other Firestore traffic goes through the REST helpers
(`firestoreRestCreate` / `firestoreRestGetDocument` /
`firestoreRestPatchDocument` / `getFirestoreAccessToken`), which need
only `FIREBASE_SERVICE_ACCOUNT_EMAIL` + `FIREBASE_SERVICE_ACCOUNT_KEY`.

Verified via `npx tsc --noEmit` (clean) and `npx vite build` (clean).

## CI guardrail (not yet built)

A small lint script could parse the two files and assert that every
`app.METHOD("/path", …)` in `server.ts` exists in `api/index.ts` (the
reverse is allowed — prod can have routes dev doesn't, like the Vercel
cron). Suggested location: `scripts/check-route-parity.mjs`, wired into
`npm run lint`. Effort: 1–2 hours with AST parsing or 30 minutes with a
regex pass that's "good enough".

Left as a follow-up block since the manual audit (this file) is fresh.
