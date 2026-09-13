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
- Firebase Web SDK config is **env-first** via `VITE_FIREBASE_*` (see `src/lib/firebase.ts`). The legacy `firebase-applet-config.json` fallback was removed from git (C-5 security fix). If the required keys (`apiKey`, `authDomain`, `projectId`, `appId`) are empty, the app logs a `[Template Setup]` warning and disables DB/auth features — booking, UI and navigation still work.
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

- Existe una suite automatizada de paridad y módulos compartidos: `npm run test:parity` ejecuta `tsx --test tests/api-parity.test.ts`. `npm run lint` ejecuta `tsc --noEmit`. Estos controles locales no sustituyen la certificación funcional integral.
- For locale verification: `npm run verify:locales` runs lint + both `build:he` and `build:en`.
- The booking wizard connects to Firestore for availability data (`daily_manifests` collection). Without a configured Firebase project with real data, dates may show as "fully booked."

# Secuencia y frontera (Liam, 2026-09-13)

Fuente canónica: `C:/Users/liama/Desktop/Nichos/PLAN-RECUPERACION-TECNICA.md` (secciones «Secuencia posterior a N10 y criterio de cierre técnico» y «Frontera técnica/estética y regla para dos agentes»); estados vigentes en `C:/Users/liama/Desktop/Nichos/recuperacion-tecnica/indice/README.md`. Leer antes de crear o desplegar nada en este repo. Copia literal:

## Secuencia posterior a N10 y criterio de cierre técnico (decidido por Liam, 2026-09-13)
1. N11 operación a escala (lectura): inventario de preguntas con evidencia y plan derivado Capa A/B.
2. Capa A operativa, un tramo por ítem con freeze y acta: cobro recurrente del camino en persona (token y nextChargeAt en verify-payment), cron de cobros programado y probado, monitor-agent vivo o apagado y declarado, suspensión visible para el visitante, Clientes visible desde reservas web, 503 de arranque en frío, dueño en cada demo, emails en hebreo, revisión legal del contrato.
3. Cardcom certificado: sandbox y primer cobro real.
4. N12 certificación técnica integral (parte 10 del plan): seis nichos desde el alta, cuatro idiomas, roles, móvil y escritorio, carga con veinte webs, recuperación completa. Su acta con veredicto «técnica certificada para el alcance declarado» es el criterio de «cierre técnico». Antes de esa acta no hay cierre, aunque todo funcione.
5. Estética, sólo después del acta de N12 y por orden de Liam. La ejecuta Codex.

## Frontera técnica/estética y regla para dos agentes
- Todo diseño es código del template; cada deploy invalida la certificación de ese sitio hasta reverificar. Ningún cambio estético se despliega sin la regresión técnica GREEN: suite del template, fila anónima por sitio, hooks y reversa. N12 deja ese procedimiento como guion cerrado, ejecutable sin criterio humano.
- Claude cierra lo técnico; Codex hace estética después. Los dos trabajan bajo el mismo expediente y método: un ID por tramo, freeze con autorización real de Liam, acta, y ninguno despliega por su cuenta. Deploys: Vercel por hook o promote, Railway por Liam.
- Certificación técnica y aprobación estética son dos actas distintas; una no vale por la otra.

## Régimen de deploy vigente de este template
- Un push a `main` **no despliega**: `vercel.json` → `"git": { "deploymentEnabled": { "main": false } }`. Cada cliente es un proyecto Vercel propio sobre este repo.
- Se despliega **por deploy hook** por proyecto (creado en la UI de Vercel, disparado y revocado en la misma pasada) o por `promote` de un deployment anterior (reversa). Piloto primero (un sitio), fila anónima por sitio (landing 200, `/api/health`, `/api/tenant/status`, wizard sin `permission-denied`), después el resto; reversa = id del deployment anterior por proyecto. Procedimiento de referencia: expediente N07 T3 (`recuperacion-tecnica/informe/N07/apertura-v1/T3/TABLA.md`).
- Firestore rules e índices se publican sólo desde este repo con `firebase deploy` (base `default`, nombrada), por orden de Liam.
