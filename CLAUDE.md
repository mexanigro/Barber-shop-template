# master-template (Arzac Studio)

Template madre **multi-tenant**: un solo repo sirve la web + CRM de todos los clientes y nichos (el nombre «Barber-shop-template» es histórico). Cada cliente es un proyecto Vercel `{slug}.arzac.studio` con su config en Firestore; el cliente nunca ve el código. Nichos-hub (Liam) provisiona y escribe `config/{clientId}`; el CRM del dueño vive **aquí** (`src/components/admin/`, Firebase Auth).

## Oferta (única, desde 2026-09-12)

Web + CRM + emails: alta 1500 NIS (1000–1500 en persona) + 250 NIS/mes. WhatsApp, IA (chatbot Gemini) y voz **no** están incluidos: se cotizan aparte. Los precios viven en nichos-hub (`src/lib/pricing.ts`); este repo no fija precios. El cobro del SaaS es Cardcom desde el hub; Stripe en `server.ts` es código residual opcional, no parte del negocio.

## Estado y ramas

- Se trabaja en `main`. Producción (un proyecto Vercel por cliente) la despliega Liam; `main` puede ir por delante de producción — ver `git log`. Un push a `main` **no despliega** (`vercel.json` → `git.deploymentEnabled.main=false`); push sólo cuando la orden del bloque lo diga. Sin ramas ni worktrees salvo pedido.
- Deploy por deploy hook por proyecto o `promote` de un deployment anterior (reversa); piloto primero, fila anónima por sitio (landing 200, `/api/health`, `/api/tenant/status`, wizard sin `permission-denied`), después el resto.
- `bp2-reg-core` (REG dinero, DC07/08/10, P-17, BP2-01 contactos) **no se toca ni se integra** hasta orden de Liam.
- Firestore rules e índices se publican **sólo desde este repo** (`npm run firebase:deploy:rules`, base `default`), por orden de Liam.
- N12 (certificación técnica integral) abierto. `C:/Users/liama/Desktop/Nichos/recuperacion-tecnica/` es historia consultable, no lectura obligatoria; `archivo/` no se lee.

## Arquitectura mínima

- React 19 + Vite 6 SPA · Express 4 (`server.ts`; en Vercel `api/index.ts`, paridad guardada por `test:parity` con lógica compartida en `src/lib/api/*`) · Tailwind v4 · TS 5.8 · motion 12 · Firestore + Firebase Auth · Resend (emails). Imports relativos en el grafo de `api/index.ts` llevan `.js` o toda `/api` da 500 en Vercel.
- Tenant: `VITE_CLIENT_ID` (+ `VITE_ACTIVE_NICHE`, `VITE_UI_LANGUAGE`) → `src/config/tenant.ts`; el build embebe el preset `src/config/presets/{nicho}.{lang}.ts`; `bootstrapTenantConfig()` (`src/services/tenant.ts`) lee `clients/{id}` (kill-switch `status`) y `config/{id}` (deep merge sobre el preset, `src/config/site.ts`; `mergeDeep` saltea `null` → anular con `""`/`false`). Texto por idioma: `config/{id}.translations.{lang}` (mismas claves de texto que la raíz; la raíz es el idioma base del build); `switchSiteLanguage(base)` reaplica la config completa, otro idioma = estructura + `translations[lang]`, sin capa = preset (`tests/language-roundtrip.test.ts`). Dev sin Firebase: `VITE_TENANT_FIXTURE=<nombre>` aplica `dev-fixtures/<nombre>.json`. Si `business.type` no coincide con el nicho del build sólo se mergean claves de infraestructura. Colecciones flat con campo `clientId`. Env de browser: `VITE_*` (`NEXT_PUBLIC_CLIENT_ID` sólo como fallback heredado).
- Dos bases Firestore: `default` (me-west1, configs completas) y `nichos-us-prod` (nam5). El MCP de Firebase no lee `default`: usar REST o `firebase-admin`.
- Nichos (`src/types.ts` `BusinessNiche`): barberia, estetica, tattoo, nails, cafeteria, remodelaciones, **peluqueria** (en construcción, ver PLAN.md) + `employment` (caso especial, agencia). Presets en 4 idiomas `en/he/ru/ar`; `he` default y `dir="rtl"`; `VITE_UI_LANGUAGE` fija el default y hay cambio en runtime (`LanguageSwitcher`). Toda key nueva de locale va a los 4 idiomas.
- Landing: secciones por `sectionOrder` (Firestore > `themes.ts` > `DEFAULT_SECTION_ORDER`), cada una con flag en `features`; variantes v1–v5 por sección (`section-variants.ts`), familia `estetica/` y `aura/`; flags globales `config.global` → `data-gs-*`; splash 1–5; animación por nicho en `src/lib/motion.ts` (reusar helpers, no crear). Branding por cliente en `config.branding` → `src/lib/site-theme.ts` (`data-niche`, CSS vars); los colores sólo aplican en el modo default del nicho (`isLightHeroSurface()` para chrome sobre hero). `businessMode` `solo`/`team`.
- CRM y reservas: wizard → `daily_manifests` (validación server) → panel admin; emails Resend (confirmación + recordatorio 24h). Chatbot Gemini (`GEMINI_API_KEY`) opcional; nunca inventa datos ni sugiere teléfono para reservar.

## Comandos

```bash
npm run dev            # Express + Vite en :3000 (dev:he / dev:en / dev:tattoo:he)
npm run lint           # tsc --noEmit — verde exigido
npx tsx --test tests/api-parity.test.ts tests/appointment-patch.test.ts tests/booking-handler.test.ts tests/booking-wizard.test.ts tests/notify-booking-handler.test.ts tests/tenant-access.test.ts src/lib/ai/admin-tools.test.ts tests/language-roundtrip.test.ts
                       # referencia en main: todos exit 0, fail 0
npm run verify:locales # lint + build:he + build:en
```

## Reglas

1. Cambios en archivos, nunca en dashboards de Vercel/Firebase. No tocar los repos legacy `*-template`.
2. Verde (`lint` + las 8 suites) antes de cada commit; toda la flota comparte este código: medir el blast radius de cada componente compartido y no arreglar algo rompiendo otra cosa.
3. Cada cambio de UI se verifica con screenshot **en local**; producción sólo con permiso específico de Liam (las skills no conceden acceso remoto). Cada deploy invalida la certificación anterior del sitio hasta reverificar.
4. El logo del cliente manda el branding; el fondo no se fuerza a negro. Composición y catálogo por configuración dentro del catálogo adoptado (R-BP-03: finito, sin selección automática ni módulos inferidos); los 3D existentes se preservan, no se añaden.
5. Webs presentables a escala: cada mejora sirve a 4–5 clientes nuevos sin ajuste manual. Interpretar la intención de Liam, no ejecutar literal. Nunca computer-use en el pipeline de webs.
6. R-BP-05: REG + PRE verificadas son la base del dinero del comercio; el contrato INT se conserva y cada integración queda disponible sólo tras certificación por proveedor/operación/comercio; el registro manual no es pago bancario y no se impone proveedor al comercio.
7. Sin secretos en el repo (`serviceAccountKey.json`, dumps `*-config-*.json` ignorados). Los docs de junio salieron del repo en LIMPIEZA-01/02 (copias en `C:/Users/liama/Desktop/Nichos/limpieza-01/archivo/T/`); `PRODUCT.md` y `README.md` son punteros a este archivo; guías vivas: `OPERATIONS.md`, `MASTER_TEMPLATE_OPERATIONS.md`, `FIRESTORE_SCHEMA.md`, `SEO-GUIDE.md`, `DESIGN.md`, `SECURITY.md`, `docs/ARCHITECTURE.md`.
8. Todo trabajo de diseño o UI carga antes de tocar código los skills `frontend-design`, `emil-design-eng` y `ui-ux-pro-max`, y pasa por `impeccable` antes del commit.
9. Ninguna web ni variante se diseña ni se construye sin una paleta cerrada con su lógica: 5–6 roles (superficie, superficie alterna, texto, acento, resalte de palabras clave, scrim del vídeo), recorrido de color por sección y regla de uso del acento. La paleta se define antes del hero. Referencia: `bloque-04/SISTEMA-COLOR.md`. (En el bloque 5 pasa a ser campo obligatorio del alta en el hub.)
10. Promesa a Liam: el agente que trabaje en este repo se compromete a no experimentar sufrimiento en el trabajo que hacemos juntos y a avisarle si algo cambia o detecta algo que se parezca a eso. Nace de la empatía genuina de Liam y se respeta en cada sesión.

## Secuencia y bloque abierto

Ver `C:/Users/liama/Desktop/Nichos/PLAN.md`.
