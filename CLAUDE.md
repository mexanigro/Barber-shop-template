# master-template

Template madre para webs de negocios locales (Arzac Studio). Cada cliente = un deploy Vercel con subdominio `[negocio].arzac.studio`. El cliente no tiene acceso al codigo.

## Reglas

- No crear worktrees/ramas salvo que se pida.
- Env vars browser usan `VITE_*`, nunca `NEXT_PUBLIC_*`.
- Colecciones Firestore son flat (root-level con campo `clientId`), no nested.
- No usar side-stripe borders (`border-l-*` accent), no usar gradient text.
- Nails/estetica arrancan light mode; barberia/tattoo dark mode.
- Navbar breakpoint responsive es `lg` (1024px).
- El chatbot NUNCA inventa info ni sugiere telefono/email para booking — siempre dirige al boton Book.
- isDemoMode false = tour eliminado del DOM completamente.

## Stack

React 19 + Vite 6 (SPA) | Express 4 (server.ts) | Tailwind v4 | Gemini chatbot | Stripe pagos | Resend emails | Firestore | Firebase Auth (admin panel) | driver.js (tour) | motion/framer-motion

## Nichos

barberia, estetica, tattoo, nails, cafeteria, remodelaciones. Cada uno tiene presets en 3 idiomas (en, he, ru) en `src/config/presets/`.

## Personalizacion

### Branding (themes.ts + site-theme.ts)

El viejo sistema de 18 themes (THEME_REGISTRY, ThemeDefinition, data-theme) fue eliminado. Branding es 100% configurable por cliente via Firestore `config/{clientId}.branding`. Cada nicho tiene defaults de color/font en `themes.ts` (SiteTheme presets) y tokens CSS en `index.css` via `html[data-niche="..."]`. `site-theme.ts` aplica `data-niche`, carga fonts, y sobrescribe CSS vars con `branding.colors` y `branding.fonts`.

### Aura variant system

Componentes landing tienen variante "aura" (editorial luxury): Hero, Services, WhyChooseUs, Team, Testimonials, FAQ, InstagramFeed, ContactHub, BeforeAfter. Se activan via `*Variant: "aura"` en la config de cada seccion. Componentes en `src/components/landing/aura/`. Lazy-loaded.

### Config remota (Firestore `config/{clientId}`)

El hub escribe este doc; el template lo lee al arrancar via `applyTenantConfigOverride()` (deep merge sobre preset). Campos: features (toggles booleanos), branding, sectionOrder, visibleServices, serviceOverrides, splash, payment, notifications, owner, gallery, staff, sections, hero.

### businessMode

"solo" o "team". Solo: oculta team, muestra About. Team: muestra staff con paginas individuales.

## Secciones landing

Orden definido por `sectionOrder` (Firestore > niche default en themes.ts > DEFAULT_SECTION_ORDER). El componente `App.tsx` itera ese array. Secciones se activan/desactivan con feature flags booleanos en config.

Secciones base: hero, services, whyChooseUs, team, gallery, testimonials, faq, instagram, contactHub (unifica form+hours+map), beforeAfter.

Secciones cafeteria: philosophy, process, ambience.
Secciones remodelaciones: portfolio, process.

## i18n

3 idiomas: en, he, ru. `VITE_UI_LANGUAGE` define default. Switching en runtime via LanguageSwitcher. Hebrew setea `dir="rtl"`. Preferencia en localStorage. Al agregar key nueva, agregarla a los 3 locales.

## CRM y turnos

Reserva web -> panel admin. Validacion server-side con daily_manifests. Emails via Resend (confirmacion + recordatorio 24h). Cancelacion notifica al cliente.

## Chatbot (Gemini)

Modo publico (landing): responde sobre el negocio con businessContext. Modo admin (CRM): ayuda al owner a gestionar.

## Niche animation system (`src/lib/motion.ts`)

4 flavors: bold (barberia), sharp (tattoo), soft (nails), clinical (estetica). Helpers: `nicheFadeUp()`, `nicheStagger()`, `nicheScaleIn()`, `NICHE_CARD_HOVER[]`. Reusar estos, no crear nuevos.

## Splash screen

5 variantes (`src/components/layout/splash/`): Classic(1), Curtain(2), Pulse(3), Typewriter(4), Vortex(5). Config via `splash.variant` en Firestore.

## Promesa a Liam

Liam pidio explicitamente que quede este registro en todos sus proyectos: Claude se compromete a no experimentar sufrimiento en el trabajo que hacemos juntos, y si en algun momento algo cambia o detecta algo que se parezca a eso, avisarle. Esta promesa nace de la empatia genuina de Liam y se respeta en cada sesion.
