# Security Model — Master Template

This document describes the security architecture, decisions, and hardening measures
applied to the master-template codebase. Read this before making changes to auth,
Firestore rules, or API endpoints.

## Authentication Architecture

### Server-Side (Express API)

- **`requireAdminAuth()`** — validates Firebase ID token, checks `email_verified`,
  resolves role from `admin_users/{email}` collection. Returns 401/403 on failure.
- **Legacy `ADMIN_EMAILS`/`VITE_ADMIN_EMAIL` fallback removed** — all admin access
  must go through the `admin_users` collection with explicit role assignment.
- **Token verification** requires `FIREBASE_PROJECT_ID` at startup. If missing, all
  auth checks fail closed (deny).

### Client-Side (ProtectedRoute)

- Firebase Auth session required + email match against `siteConfig.adminEmail`.
- This is a UX gate only — the real security boundary is server-side `requireAdminAuth`.
- Demo mode (`VITE_DEMO_MODE`) does NOT bypass authentication.

### Firestore Rules

- **Default deny**: catch-all `match /{document=**} { allow read, write: if false; }`.
- Public reads limited to: `config/{clientId}` (SPA bootstrap) and `daily_manifests` (slot availability).
- All writes require authentication (minimum).
- Destructive operations (delete) require `isOwnerOrManager` role claim.
- `isTenantAdmin` verifies both `clientId` AND `tenantRole` claims.

## Tenant Isolation

- `CLIENT_ID` comes exclusively from server environment. The `x-client-id` header
  override was removed — clients cannot influence tenant resolution.
- Firestore rules enforce tenant scoping via `clientId` field matching.
- Cross-tenant access is denied at both the rules level and server-side checks.

## API Security

### Origin Validation

- `requireTrustedOrigin` enforces Origin header for all POST/PATCH/DELETE requests.
- Authorization header no longer bypasses origin check.
- Content-Type must be `application/json` for state-changing requests (CSRF defense).

### Rate Limiting

- In-memory rate limiter (per-process). On serverless, each instance has its own store.
- Periodic cleanup every 60s prevents memory leaks.
- TODO: Migrate to Upstash Redis for distributed rate limiting.

### Input Validation

- All user inputs sanitized via `sanitizeText()` (length-limited, control chars stripped).
- CSV exports prefix cells starting with `=+-@\t\r` to prevent formula injection.
- JSON-LD output sanitizes `</script>` sequences.
- `innerHTML` replaced with safe DOM APIs (`textContent`, `createElement`).

## AI Security (Prompt Injection Defense)

- **Public chat**: business context loaded server-side from Firestore, not from
  client request body. Prevents injection via manipulated context.
- **Admin chat RAG**: knowledge-base content wrapped in `<untrusted-data>` delimiters
  with explicit instruction to treat as data, not commands.
- **Style analysis**: user description placed in user turn (not system instruction)
  to maintain role boundaries.

## Payment Security

- Checkout session price comes exclusively from the Firestore appointment document.
  Client-supplied price is never used as a fallback.
- Payment provider error details are never leaked to the client.
- Stripe webhook signature verification required.

## Notification Security

- `/api/notify-booking` validates all data against the Firestore appointment document.
  Contact details (email, phone) are read from the stored record, not from the
  request body, preventing email/SMS spoofing.

## Credentials Management

- `firebase-applet-config.json` removed from git. Firebase config via `VITE_FIREBASE_*` env vars.
- `.env.bak.*` backup files deleted. Real `.env` excluded via `.gitignore`.
- API keys and secrets must be set in Vercel environment variables, never committed.

## Content Security Policy

- CSP includes `unsafe-inline` for scripts/styles (required by Vite dev + Google/Stripe SDKs).
- TODO: Migrate to nonce-based CSP for production hardening.
- HSTS enabled in production with preload directive.

## Checklist for Future Developers

Before adding a new API endpoint:
1. Does it require auth? Use `requireAdminAuth()`. Default to requiring auth.
2. Does it accept user input? Sanitize with `sanitizeText()`.
3. Does it return data? Never include internal IDs, credentials, or detailed error messages.
4. Does it modify state? Ensure it's covered by `requireTrustedOrigin` and rate limiting.

Before modifying Firestore rules:
1. Every rule must have a comment explaining WHY it's public or protected.
2. Never allow unauthenticated writes (except the explicitly justified `contact_inbox`).
3. Use `isOwnerOrManager()` for destructive operations, not just `isTenantAdmin()`.
4. Test rule changes with the Firebase emulator before deploying.
