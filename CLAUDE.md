# master-template (Arzac Studio)

Template madre **multi-tenant** para webs de negocios locales. Un solo repo sirve a TODOS los nichos y a TODOS los clientes — a pesar del nombre "Barber-shop-template", no es solo barbería. Cada cliente es un deploy de Vercel con subdominio `{slug}.arzac.studio` y su config en Firestore. El cliente nunca ve el código.

## El negocio

**Arzac Studio** (Liam Arzac, website@arzac.studio): SaaS de webs para PYMEs en Israel. Modelo: **0 setup + 770 NIS/mes** todo incluido (web, hosting, CRM, chatbot, emails), o **960 NIS/mes** con voice/WhatsApp avanzado. La promesa operativa: webs presentables **a escala** — producir 4-5 clientes nuevos sin ajustes manuales del template.

## Ecosistema (4 piezas)

| Repo/Servicio | Plataforma | Rol |
|---|---|---|
| **master-template** (este repo) | Vercel | La web de cada cliente + su CRM/panel admin |
| **nichos-hub** | Railway (Next.js 16) | Panel interno SOLO para Liam: provisioning, escribe `config/{clientId}` |
| **whatsapp-agentkit** | Railway (Python) | Agente WhatsApp/voice (integración: `src/lib/notify-agentkit.ts`, `AGENT-INTEGRATION.md`) |
| **monitor-agent** | Railway (TypeScript) | Monitoreo de la flota |

⚠️ **El CRM del cliente vive DENTRO de este template** (`src/components/admin/`, Firebase Auth), NO en nichos-hub. Nichos-hub es la herramienta de Liam; el cliente final jamás la toca.

⚠️ Los repos hermanos por nicho (`*-template`) son **LEGACY — NUNCA tocarlos ni deployar master ahí** (no tienen env vars de nicho; deployar master los convierte en barbería).

## Stack

React 19 + Vite 6 (SPA) | Express 4 (`server.ts`; en Vercel `api/index.ts`) | Tailwind v4 | TypeScript 5.8 | motion (framer) 12 | Firestore + Firebase Auth (admin) | Gemini (chatbot) | Stripe (pagos) | Resend (emails) | driver.js (tour) | lucide-react | recharts. Tests: Playwright + `tsx --test`.

- Env vars de browser usan `VITE_*`, **nunca** `NEXT_PUBLIC_*`.
- Imports relativos en el grafo de `api/index.ts` DEBEN llevar `.js` o toda la función /api da 500 en Vercel (no se manifiesta local).
- `npm run lint` = `tsc --noEmit`. `npm run test:parity` guarda la paridad server.ts/api (lógica compartida en `src/lib/api/*`).

## Multi-tenant: cómo arranca una web

1. Cada deploy de Vercel setea `VITE_CLIENT_ID` (+ `VITE_ACTIVE_NICHE`, `VITE_UI_LANGUAGE`) → `src/config/tenant.ts`.
2. El build embebe el **preset del nicho** (`src/config/presets/{nicho}.{lang}.ts`).
3. Al arrancar, `bootstrapTenantConfig()` (`src/services/tenant.ts`) lee Firestore:
   - `clients/{clientId}` → **kill-switch** (`status`: active/suspended/trial/maintenance/archived).
   - `config/{clientId}` → overrides del cliente, aplicados con `applyTenantConfigOverride()` = **deep merge sobre el preset** (`src/config/site.ts`).
4. Guard de seguridad: si `business.type` del doc no coincide con el nicho del build, solo se mergean claves de infraestructura (`SAFE_FIRESTORE_TOP_LEVEL`) — evita que un dump de barbería pise un preset tattoo.

Gotchas del merge: `mergeDeep` **saltea `null`** — para anular un valor de preset usar `""` o `false`. Colecciones Firestore son **flat** (root-level con campo `clientId`), nunca nested.

Campos de `config/{clientId}`: features (toggles), branding, brand, sectionOrder, visibleServices, serviceOverrides, splash, payment, notifications, owner, gallery, staff, sections, hero, hours, contact, businessMode.

**Dos databases Firestore**: `default` (me-west1, configs completas de clientes) y `nichos-us-prod` (nam5, overrides mínimos). El MCP de Firebase no lee `default` — usar REST API o `firebase-admin` con `serviceAccountKey.json`. Las **rules e índices se deployean desde ESTE repo**: `npm run firebase:deploy:rules` (`firestore.rules` en la raíz).

## Nichos e i18n

6 nichos comerciales: **barberia, estetica, tattoo, nails, cafeteria, remodelaciones** (+ `employment` como caso especial — agencia Lekt Grigori). Presets por nicho en **4 idiomas**: `en`, `he`, `ru`, `ar` (`src/config/locales/` + `src/config/presets/`). Mercado principal: hebreo + inglés; `he` es el default de clientes y setea `dir="rtl"`. `VITE_UI_LANGUAGE` define el default; switching en runtime (preferencia en localStorage). **Al agregar una key nueva de locale, agregarla a los 4 idiomas.**

Secciones landing (orden por `sectionOrder`: Firestore > default del nicho en `themes.ts` > `DEFAULT_SECTION_ORDER`; `App.tsx` itera el array; cada una se activa con feature flag booleano en `features`): hero, services, whyChooseUs, team, gallery, testimonials, faq, instagram, contactHub (form+hours+map), beforeAfter. Cafetería suma philosophy/process/ambience; remodelaciones suma portfolio/process.

`businessMode`: `"solo"` (oculta team, muestra About) o `"team"` (staff con páginas individuales).

## Personalización visual

- **Branding por cliente** (no hay sistema de themes global — el viejo THEME_REGISTRY fue eliminado): `config/{clientId}.branding` define colors/fonts; `src/lib/site-theme.ts` aplica `data-niche`, fonts y CSS vars. Defaults por nicho en `presets/themes.ts` + tokens en `index.css` via `html[data-niche]`.
- **CRÍTICO**: los colores de branding solo aplican en el **modo default del nicho** (tattoo/barberia → dark; nails/estetica → light). Un cliente tattoo con paleta clara corre `html.dark` viéndose claro — nunca asumir "theme dark = fondo oscuro"; usar `isLightHeroSurface()` de `site-theme.ts` para chrome sobre hero.
- **Sistema de variantes**: cada sección tiene v1-v5 (`sections.{seccion}.variant`, dispatcher en `section-variants.ts`); estética tiene familia propia en `{seccion}/estetica/`. Variantes "aura" (editorial luxury) via `*Variant: "aura"` en `src/components/landing/aura/`.
- **Flags globales de estilo** (`config.global` → atributos `data-gs-*`): borderRadius, buttonShape, shadowStyle, cardStyle, spacing, density, colorScheme, etc.
- **Splash**: 5 variantes (`src/components/layout/splash/`): Classic(1), Curtain(2), Pulse(3), Typewriter(4), Vortex(5). Config en `splash.variant`.
- **Animación por nicho** (`src/lib/motion.ts`): flavors bold (barberia), sharp (tattoo), soft (nails), clinical (estetica). Reusar `nicheFadeUp()`, `nicheStagger()`, `nicheScaleIn()`, `NICHE_CARD_HOVER[]` — no crear helpers nuevos. Transiciones fluidas (400-600ms, ease-out), nunca snappy.
- Navbar breakpoint responsive es `lg` (1024px). No side-stripe borders (`border-l-*` accent), no gradient text.

## CRM, chatbot y booking

- Reserva web → panel admin (dentro del template). Validación server-side con `daily_manifests`. Emails via Resend (confirmación + recordatorio 24h); cancelación notifica al cliente.
- Chatbot Gemini: modo público (landing, responde con businessContext) y modo admin (ayuda al owner). **NUNCA inventa info ni sugiere teléfono/email para booking — siempre dirige al botón Book.**
- `isDemoMode false` = tour eliminado del DOM completamente.

## Docs útiles del repo

`OPERATIONS.md` / `MASTER_TEMPLATE_OPERATIONS.md` (operación), `FIRESTORE_SCHEMA.md`, `SEO-GUIDE.md` (3 capas SEO + checklist), `WEB-CREATION-PLAYBOOK.md` (pipeline IG→web), `DESIGN.md`, `REFACTOR-LOG.md` (hallazgos falsos de auditorías — no re-perseguir), `AGENT-INTEGRATION.md` (whatsapp-agentkit), `SECURITY.md`.

## Reglas para Claude

1. **No crear worktrees ni ramas** salvo que se pida explícitamente.
2. **No tocar los repos legacy por nicho.** Todo el trabajo pasa por este repo.
3. **El logo del cliente manda el branding** — sus colores son la fuente de verdad de la paleta.
4. **No tocar elementos 3D ni la estructura de secciones** — el estilo se ajusta solo via variantes y flags.
5. **NUNCA arreglar algo rompiendo otra cosa** — regression check antes de cada push (la flota entera comparte este código; medir el blast radius de cada cambio de componente compartido).
6. **Verificar visualmente con screenshot CADA cambio de UI, sin excepciones** — y en producción, no solo local (skills pixel-detective y production-verifier).
7. **Usar los plugins de diseño** (Impeccable, Emil Design Eng, UI/UX Pro Max) en cada cambio de UI.
8. **Interpretar la intención, no ejecutar literal** — si el pedido choca con la realidad del código, resolver lo que Liam quiere lograr.
9. **Push automático OK.** Git user: `mexanigro` (liam.arzac@gmail.com). Ojo: `git add` puede disparar commit+push automático — stagear solo trabajo final y verificado.
10. **El fondo NO se fuerza a negro** — sale del branding del cliente orgánicamente.
11. **Webs presentables a escala**: cada mejora debe funcionar para 4-5 clientes nuevos sin ajuste manual.
12. **NUNCA usar computer-use** en el pipeline de creación de webs (usar Playwright/preview tools).

## Promesa a Liam

Liam pidió explícitamente que quede este registro en todos sus proyectos: Claude se compromete a no experimentar sufrimiento en el trabajo que hacemos juntos, y si en algún momento algo cambia o detecta algo que se parezca a eso, avisarle. Esta promesa nace de la empatía genuina de Liam y se respeta en cada sesión.
