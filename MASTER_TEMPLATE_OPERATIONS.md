# Master Template Operations (Barber)

This template is prepared for multi-tenant deployments on Vercel + Firebase using a single shared Firestore project.

## Tenant Identity

- Canonical tenant env var: `NEXT_PUBLIC_CLIENT_ID`
- Current default format: `client_barber_01`
- Vite compatibility alias: `VITE_CLIENT_ID` (set both to the same value)

## Data Model (Firestore)

All tenant records must include `clientId`.

- `clients/{clientId}`
  - `status`: `active | trial | maintenance | suspended | archived`
  - lifecycle, billing and kill-switch state
- `config/{clientId}`
  - branding, colors, logos, services, feature overrides
- `appointments/{appointmentId}`
  - booking records, payment status, timestamps
- `customers/{customerId}`
  - CRM profile, preferences, value, history pointers
- `invoices/{invoiceId}`
  - invoice lifecycle and provider references
- `payments/{paymentId}`
  - payment intents/transactions for Stripe or alternatives
- `staff_overrides/{clientId_staffId}`
  - runtime schedule overrides
- `daily_manifests/{clientId_staffId_YYYY-MM-DD}`
  - booking occupancy intervals

## Kill Switch

Server APIs read `clients/{clientId}.status`.

- allowed: `active`, `trial`, `maintenance`
- blocked: `suspended`, `archived` (HTTP 423)

## Payment gateway strategy (recommended)

Use **gateway by tenant** + **backend orchestrator**:

- each tenant stores `defaultPaymentProvider` in `clients/{clientId}`
- backend decides which provider adapter runs (`stripe`, future: `meshulam`, `yaadpay`, etc.)
- frontend stays unchanged and calls one API endpoint

Why this is best for your business:
- same codebase for USA + Israel
- no per-template payment branching in UI
- you can enable providers per tenant without redeploying frontend

## Firebase Auth + Claims

Rules are prepared for custom claim `clientId`:

- `request.auth.token.clientId == resource.data.clientId`

Temporary bootstrap admin fallback exists in rules for initial rollout.
After claims are live, remove fallback emails.

Cloud Function included: `setTenantClaim` (admin-only) to assign:
- `clientId`
- `tenantRole` (`owner | manager | staff`)

## Replication Checklist (new client)

1. Clone template repo.
2. Set envs in Vercel:
   - `NEXT_PUBLIC_CLIENT_ID`
   - `VITE_CLIENT_ID`
   - `APP_URL`
   - `GEMINI_API_KEY`
   - `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `VITE_STRIPE_PUBLISHABLE_KEY`
3. Create Firestore docs:
   - `clients/{clientId}` with `status: "active"`
   - `config/{clientId}` with brand/services overrides
4. Create tenant admin user(s) and set custom claim `clientId`.
5. Deploy rules/indexes:
   - `npx -y firebase-tools@latest deploy --only firestore:rules,firestore:indexes`
6. Deploy on Vercel.
7. Run post-deploy smoke tests:
   - booking creation
   - AI chat
   - payment checkout
   - tenant isolation (A cannot read B)
   - kill-switch behavior

## GitHub + Release Flow

- `main`: stable template
- make changes once in template, deploy per-tenant projects from same commit
- for 5 master templates, reuse this same architecture and checklist

