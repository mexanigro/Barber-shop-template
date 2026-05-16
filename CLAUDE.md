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

### Temas (themes.ts)

Cada nicho tiene 3 temas que definen: CSS tokens, section order, fonts. Se aplican via `data-niche` + `data-theme` en `<html>`. Tema activo se resuelve desde `VITE_THEME` o default del nicho.

### Config remota (Firestore `config/{clientId}`)

El hub escribe este doc; el template lo lee al arrancar via `applyTenantConfigOverride()` (deep merge sobre preset). Campos: features (toggles booleanos), activeTheme, visibleServices, serviceOverrides, splash, payment, notifications, owner, gallery, staff, sections, hero.

### businessMode

"solo" o "team". Solo: oculta team, muestra About. Team: muestra staff con paginas individuales.

## Secciones landing

Orden definido por `sectionOrder` en cada tema. El componente `App.tsx` itera ese array. Secciones se activan/desactivan con feature flags booleanos en config.

Secciones base: hero, services, whyChooseUs, team, gallery, testimonials, instagram, contactHub (unifica form+hours+map).

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
