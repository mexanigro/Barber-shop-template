# AGENTS.md

## Cursor Cloud specific instructions

### Overview

This is the **master-template** — a multi-tenant SPA for local businesses (barbershops, salons, tattoo studios, cafeterias, etc.) deployed per-client to `[negocio].arzac.studio` via Vercel. Each deployment uses a single Firebase project with flat Firestore collections scoped by `clientId`.

### Quick Reference

| Action | Command |
|--------|---------|
| Install deps | `npm install` |
| Dev server | `npm run dev` (Express + Vite on `:3000`) |
| Lint (type check) | `npm run lint` (`tsc --noEmit`) |
| Build | `npm run build` |
| Build Hebrew | `npm run build:he` |
| Dev Hebrew | `npm run dev:he` |

### Development Server

- `npm run dev` runs `tsx server.ts` which starts an Express server with Vite dev middleware on port 3000.
- The server gracefully disables features when API keys are missing (Stripe, Gemini, Resend). The app runs fine without them — booking, UI, and navigation all work.
- Firebase Web SDK config falls back to `firebase-applet-config.json` (hardcoded project `barbertemplate-madre`) when `VITE_FIREBASE_*` env vars are empty. This is sufficient for local development with read-only Firestore access.
- Hot reload works via Vite's HMR for frontend code. Server-side changes (to `server.ts`) require restarting the dev process.

### Environment Variables

- Copy `.env.example` to `.env` for local dev. Most features work without secrets (they degrade gracefully with console logs instead of actual emails/payments/AI).
- Browser env vars use `VITE_*` prefix (never `NEXT_PUBLIC_*`).
- The `APP_URL` defaults to `http://localhost:3000` when not set.

### Key Architecture Notes

- `server.ts` is the monolithic Express backend (~1600 lines) serving all `/api/*` routes.
- `api/index.ts` is a near-duplicate of `server.ts` packaged for Vercel Serverless Functions — keep them in sync when changing API logic.
- `functions/` contains a single Firebase Cloud Function (`setTenantClaim`); it requires `npm install` in that subdirectory separately but is optional for local dev.
- The functions directory has a `node: 20` engine constraint; Node 22 works with a warning but doesn't break anything.

### Testing Considerations

- There is no automated test suite (no Jest/Vitest configured). Validation is done via `tsc --noEmit` (type checking) and manual browser testing.
- For locale verification: `npm run verify:locales` runs lint + both `build:he` and `build:en`.
- The booking wizard connects to Firestore for availability data (`daily_manifests` collection). Without a configured Firebase project with real data, dates may show as "fully booked."
