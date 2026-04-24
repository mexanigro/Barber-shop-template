<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/9e7fef67-4fb7-47d2-a07c-c0a93f69e20c

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Copy [.env.example](.env.example) and add server-side credentials where needed (AI routes read from the environment loaded by `tsx server.ts`, not from the browser bundle)
3. Run the app:
   `npm run dev`

## UI language (English / Hebrew)

Navigation labels, booking button text, and document direction (`dir`/`lang`) follow `VITE_UI_LANGUAGE` at **build time** (`en` or `he`). Treat each client deployment as a single language: set the variable in `.env`, rebuild, and deploy — same pattern as the Remodelaciones reference template.

Convenience scripts (Windows-safe via `cross-env`): `npm run dev:he` / `npm run dev:en`, `npm run build:he` / `npm run build:en`, and `npm run verify:locales` (lint + both builds).

All **shell UI** copy (nav, booking wizard, contact form, gallery chrome, legal page titles, chatbot, business hours, a11y labels, `date-fns` month names in the calendar, etc.) lives in `src/config/locales/en.ts` and `he.ts`, mirroring the Remodelaciones pattern. Long-form marketing content stays in the niche presets (`src/config/presets/*.en.ts` / `*.he.ts`).

## Multi-tenant operation (Vercel + Firebase)

This template is prepared for tenant isolation with `NEXT_PUBLIC_CLIENT_ID` (default: `client_barber_01`).

- Frontend loads tenant config from `config/{clientId}`
- API routes are tenant-scoped and enforce kill-switch via `clients/{clientId}.status`
- Firestore rules enforce `clientId` segmentation across records

Full runbook: [`MASTER_TEMPLATE_OPERATIONS.md`](./MASTER_TEMPLATE_OPERATIONS.md)

## Firebase deployment (this project)

This repository is prelinked to Firebase project `barbertemplate-madre`.

```bash
npm run firebase:login
npm run firebase:use
npm run firebase:deploy:rules
npm run functions:install
npm run functions:deploy
```

If login fails in headless shells, use:
`npx -y firebase-tools@latest login --no-localhost`

## Admin Cloud Function (custom claims)

Function: `setTenantClaim`

Purpose: assign multi-tenant claims (`clientId`, `tenantRole`) to Firebase Auth users.

Request (POST):
- Auth header: `Authorization: Bearer <firebase-id-token-from-admin>`
- Body:
```json
{
  "email": "admin@client.com",
  "clientId": "client_barber_01",
  "role": "owner"
}
```

Allowed bootstrap admin(s): `ADMIN_BOOTSTRAP_EMAILS` (defaults to `liam.arzac@gmail.com`).
