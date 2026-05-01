# Project Rules: Barber Master Template (Nichos)

## What This Is

A reusable, high-end multi-tenant template for barbershops (and other niches) with real-time booking, admin dashboard, AI chat, Stripe payments, and centralized business configuration. Part of a strategy of several master templates (same architectural pattern) deployed multi-tenant over a single shared Firestore project, with one Vercel deploy per client (or region).

## Convenciones de trabajo

- No crear worktrees ni ramas separadas salvo que se pida explícitamente.
- Todos los cambios deben aplicarse directamente en los archivos del proyecto.

## Tenant Identity (Never Break)

- Each deploy is identified by `NEXT_PUBLIC_CLIENT_ID` + `VITE_CLIENT_ID` (same value, both required).
- Resolved at: `src/config/tenant.ts` (front) and `server.ts` (Express).
- All Firestore documents scoped to a tenant MUST include `clientId`.
- Firestore rules enforce `request.auth.token.clientId == resource.data.clientId`.
- Express middleware `attachTenantContext` rejects with 403 if `x-client-id` header differs from the server's `CLIENT_ID`.
- `config/{clientId}` is public read (branding/features); `clients/{clientId}` requires admin claim (lifecycle/kill-switch).

### HTTP Status Code Semantics (403 vs 423)

**403 — Identity or trust failure (not "tenant is off")**
- `Tenant mismatch`: middleware `attachTenantContext` compares request client with server `CLIENT_ID`. Mismatch = 403. Means someone is calling the API as another tenant, or env mismatch between front and server.
- `Untrusted origin`: CORS/referrer security check. HTTP security, not Firestore state.
- Rule: 403 = "you are not this tenant / I don't trust this request."

**423 — Tenant blocked by business policy (kill-switch / lifecycle)**
- After confirming the request IS from the correct tenant, `enforceClientActive` reads `clients/{clientId}.status`. If `suspended` or `archived` → 423.
- Meaning: the deploy and `CLIENT_ID` are coherent, but the tenant's operational status in Firestore blocks service (non-payment, end of contract, etc.).
- `active`, `trial`, `maintenance` pass through normally.
- Rule: 423 = "you ARE this tenant, but this client is blocked by status in `clients/{clientId}`."

## Front vs API/Functions Split

**Frontend (React 19 + Vite 6 SPA):**
- Resolves niche preset + UI language at build time (`env.ts` → `site.ts`).
- Bootstraps tenant config from Firestore via `bootstrapTenantConfig()` (deep merge over static preset).
- Handles: landing, booking wizard, gallery, chatbot, admin dashboard, legal pages, staff profiles.
- Reads Firestore directly (SDK web + rules as guard).

**Server (`server.ts`, Express via `tsx`):**
- Routes under `/api/*` — secrets never in the browser bundle.
- AI: `/api/ai/chat`, `/api/ai/analyze` (Gemini REST).
- Payments: `/api/create-checkout-session`, `/api/webhook` (Stripe).
- Notifications: `/api/contact`, `/api/notify-booking` (Resend).
- Health/tenant: `/api/health`, `/api/tenant/status`.
- Security: rate limiting, origin check, tenant context, kill-switch enforcement.

**Cloud Functions (`functions/`):**
- `setTenantClaim`: assigns `clientId` + `tenantRole` custom claims.

## i18n Rules

- `VITE_UI_LANGUAGE` is build-time only (`en` | `he`). One deploy = one language.
- Shell UI copy: `src/config/locales/en.ts` and `he.ts`. Keys MUST be kept in sync.
- Marketing content: `src/config/presets/*.en.ts` / `*.he.ts` (5 niches x 2 languages = 10 files).
- Hebrew deploys set `dir="rtl"` on `<html>`. All UI must respect RTL.
- Convenience scripts: `dev:en`/`dev:he`, `build:en`/`build:he`, `verify:locales`.
- If you add or rename a locale key: update BOTH en.ts and he.ts, then run `verify:locales`.

## Niche Presets

- 5 niches: `barberia`, `estetica`, `abogado`, `tattoo`, `nails`.
- Selected via `VITE_ACTIVE_NICHE` (build-time, default `barberia`).
- Each niche has per-language preset files in `src/config/presets/`.
- CSS tokens per niche: `index.css` has `html[data-niche="tattoo"]` and `html[data-niche="nails"]` overrides.
- If you change `SiteConfig` or `NichePreset` types: update ALL 10 preset files.

## Firebase CLI (Firestore rules + indexes)

- `firebase.json` may list multiple databases (e.g. named `default` + `nichos-us-prod`); each has its own `indexes` file. Deploy updates all of them: `npm run firebase:deploy:firestore`.
- Runtime uses **one** database id: `VITE_FIREBASE_DATABASE_ID` / server env must match the Firestore instance that holds that deploy’s data (`default` vs `nichos-us-prod`, etc.). Do not confuse named database `default` with GCP’s `(default)` id.
- Tenant scheduling overrides live in `config/{clientId}.businessRules` (see **Scheduling** admin tab). `businessRules` is in the safe Firestore overlay list when niche types mismatch.
- Deploy rules and composite indexes: `npm run firebase:deploy:firestore` (runs `deploy --only firestore`).
- **`firebase deploy --only firestore:indexes` is unsafe** with named databases in current `firebase-tools` (internal `.map` on undefined). Use the npm script or full `firestore` deploy.
- First time: `npm run firebase:login`, then `npm run firebase:use:add` to link the Firebase project (writes `.firebaserc`).
- **Manual only:** Firebase Console login, IAM permissions on the GCP project, and creating the Firestore database instance if it does not exist yet—CLI cannot invent the project or DB.

## Firestore Overlay Safety

- `src/services/tenant.ts` does a deep merge of `config/{clientId}` over the static preset.
- If `business.type` in Firestore doesn't match the build's niche, only infrastructure keys merge (features, payment, notifications, adminEmail, splash). Brand/hero/services/staff are NEVER overwritten cross-niche.
- `VITE_DISABLE_FIRESTORE_SITE_OVERRIDE=true` skips even partial merge.

## Risks When Touching UI

1. **i18n breakage**: Any new/renamed locale key must exist in both `en.ts` and `he.ts`.
2. **RTL**: Hebrew builds use `dir="rtl"`. Never assume LTR-only.
3. **Preset coupling**: Changing `SiteConfig`/`NichePreset` types requires updating 10 preset files + Firestore overlay logic.
4. **Module-scope caching**: Components read `siteConfig` (mutable via `applyTenantConfigOverride`). Never cache config values at module scope before bootstrap completes.
5. **Suspense fallbacks**: All lazy-loaded routes use `fallback={null}`. Changes to loading states must not break this pattern.

## Admin Panel

- All admin copy is currently in English only (hardcoded in `AdminDashboard.tsx`, `StaffLogistics.tsx`, `AdminLoginPanel.tsx`, `UnauthorizedAdmin.tsx`).
- Admin is accessed via Footer link → `ProtectedRoute` → Google sign-in → email check against `siteConfig.adminEmail`.
- Admin data flows: Firestore subscriptions (real-time appointments), Firestore reads (staff overrides), AI analysis via `/api/ai/analyze`.

## What a Visual Audit Does NOT Cover

- Booking collision logic (`daily_manifests`, server-side validation).
- Firestore rules / Express middleware security.
- Stripe payment flow (checkout session, webhook, reconciliation).
- Cloud Function claims.
- Firestore indexes correctness.
- Email notification pipeline.
- Vercel configuration (rewrites, env vars per project).
- Cross-tenant data isolation verification.
- Bundle performance / Lighthouse.
- SEO (og tags, meta).
- Programmatic accessibility beyond visible elements.
- Preset coverage for non-barbería niches.
