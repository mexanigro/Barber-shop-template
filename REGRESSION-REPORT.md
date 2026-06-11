# Regression masivo en producción — 2026-06-11

**Alcance:** 20 webs demo en producción (todas las que existen en Vercel `mexanigros-projects`), cada una testeada en 12 combos (390/768/1440 px × hebreo-RTL/inglés-LTR × light/dark) + pase interactivo (splash, booking wizard, links, chatbot FAB). Total: ~260 cargas de página.

**Tooling:** `scripts/regression/regression-all.mjs` (matriz + checks programáticos), `scripts/regression/aggregate.mjs` (resumen), `scripts/regression/probe-sites.mjs` (descubrimiento de URLs). Resultados crudos en `qa-regression/results/*.json`, screenshots en `qa-regression/shots/`.

## Resultado global

| Web | Estado |
|---|---|
| dari-inks, gooli-ink, igal-tattz, marganink, future-tattoo-piercing, future-tattoo-old | ✅ CLEAN en los 12 combos |
| lekt-grigori (employment) | ✅ OK (ver nota falso positivo) |
| martellin, unas-de-mar | ⚠️ solo link twitter muerto (fixeado) |
| velvet-muse | 🔴 CTA primario del hero muerto (fixeado) |
| santi, pintureria-el-paolo | 🔴 link navbar `#team` fantasma (fixeado) |
| cafe-aristano | 🔴 2 links navbar fantasma + marca ajena en hero (fixeado) |
| barberia, barberia-en (template deploys) | 🔴 CSP bloqueaba Google Analytics (fixeado) |
| nails, tattoo, cafeteria, remodelaciones (template deploys) | 🔴 deploys stale de 6 días con bugs viejos (redeploy disparado) |
| estetica-prueba | ⚠️ menor: badge hero en español sobre web hebrea (no tocado, ver abajo) |

## Bugs críticos encontrados y fixeados

### 1. Links de navbar a secciones inexistentes (template — `efcabaf`)
Los 5 navbars habilitaban links de ancla solo por feature flag, pero una sección solo renderiza si además está en el `sectionOrder` efectivo. Cafetería no tiene `services`/`whyChooseUs` en su orden; remodelaciones no tiene `team`. Resultado: links que no van a ningún lado en santi (`#team`), pintureria-el-paolo (`#team`) y cafe-aristano (`#services`, `#why-choose-us`).
**Fix:** nuevo helper `src/lib/section-presence.ts` (`landingSectionPresent()`), AND-eado en `buildNavLinks` de Navbar v1–v5.

### 2. CTA primario del hero de velvet-muse no hacía nada (config Firestore)
`config/demo-velvet-muse` tenía `hero.ctaPrimaryHref: "#booking"`. El hero renderiza `href ? <a> : <button onClick=abrirWizard>` — y `#booking` no existe como ancla (el booking es un modal). El CTA principal "Book a consultation" era un link muerto.
**Fix:** campo borrado (FieldValue.delete) → vuelve al botón que abre el wizard. Backup en `qa-regression/backups/demo-velvet-muse.json`.

### 3. Marca ajena en el hero de cafe-aristano (config Firestore)
El H1 mostraba "ארומה ויוו" ("Aroma Vivo" — la marca del preset de cafetería) en una web cuyo negocio es Café Aristano.
**Fix:** `hero.titlePrefix: "Café"`, `hero.titleHighlight: "Aristano"`. Backup en `qa-regression/backups/`.

### 4. CSP bloqueaba Google Analytics (template — `efcabaf`)
`script-src` no permitía `googletagmanager.com`; en los deploys con `measurementId` de Firebase (barber-shop-template y barber-shop-template-en) gtag.js moría con error de CSP en cada carga → analytics muerto.
**Fix:** `googletagmanager.com` en script-src y `*.google-analytics.com` + `googletagmanager.com` en connect-src, en los 3 lugares (vercel.json, server.ts, api/index.ts). Parity test 19/19 OK.

### 5. Twitter placeholders muertos en presets (template — `efcabaf`)
`twitter.com/izzycross`, `/onyxandsteel`, `/auranailstudio` (+ handles de staff) devuelven 404 y aparecían en el footer de martellin, unas-de-mar y los templates barberia/nails/tattoo.
**Fix:** las 36 líneas `twitter:` eliminadas de los 12 presets. El render es condicional, así que el ícono simplemente desaparece.

### 6. Deploys stale de 6 días (Vercel)
`nails-template`, `tattoo-template`, `cafeteria-soft-template`, `remodelaciones-template` corrían builds de hace 6 días con bugs ya corregidos en main:
- Imagen Unsplash muerta `photo-1512690196236` (404) en todos los combos — el ID ya no existe en el código actual.
- Navbar desktop a 768px con items fuera de viewport ("Location", "Book Now" hasta x=922 en viewport de 768) — el breakpoint actual es `lg`.
- `preferred_language`/`vite-ui-theme` en localStorage ignorados (RTL y dark mode no conmutaban) — mecanismo viejo.
- Llamada 404 a `firebase.googleapis.com/.../webConfig` en cada carga.
**Fix:** el push `efcabaf` dispara rebuild de los 20 proyectos. Verificación post-deploy abajo.

## No tocado (reportado sin tocar)

- **estetica-prueba**: badge del hero en español ("HACEMOS LABIOS, PÓMULOS, TODA LA CARA, Y LA PIEL") sobre una web en hebreo. Es contenido de config de un cliente "prueba"; decisión de contenido para Liam, no un bug del template.
- **estetica-prueba booking**: el CTA "בואו לייעוץ חינם" no abre el wizard (puede ser scroll-a-contacto por diseño). Pendiente de verificación manual (abajo).
- **Facebook/Instagram placeholders en presets**: probablemente también muertos, pero FB/IG devuelven 200 a bots y no se pueden verificar — no tocados.
- **santi**: CTA secundario del hero trunca el label ("ראו את העב..."). Cosmético, config/copy.
- **lekt-grigori**: "0 secciones / sin H1" es falso positivo — la landing es el selector de audiencia del nicho employment, renderiza bien. El booking-wizard no aplica (usa RegistrationWizard).

## Verificación post-deploy (producción real)

`scripts/regression/verify-fixes.mjs` — **9/9 PASS**:

- ✅ santi: 0 links `#team`
- ✅ pintureria-el-paolo: 0 links `#team`
- ✅ cafe-aristano: 0 links fantasma; h1 = "Café Aristano"
- ✅ velvet-muse: 0 anclas `#booking`; el CTA del hero ahora es botón y **abre el booking wizard**
- ✅ estetica-prueba: su CTA sí abre el wizard (el fallo del primer run era flakiness/timing, no bug)
- ✅ barberia: consola limpia, sin violación CSP de gtag
- ✅ barberia-en: CSP limpia + sin twitter muerto
- ✅ martellin: sin twitter muerto
- ✅ unas-de-mar: sin twitter muerto

### Deploys stale

El push `efcabaf` reconstruyó los 16 proyectos con integración git sana. Los 4 templates stale (nails, tattoo, cafeteria, remodelaciones) **ignoraron el push** (integración git stalled — gotcha conocido) y se deployaron a mano con `vercel deploy --prod` desde un export limpio de `efcabaf` (`git archive`, sin tocar el working tree). Los 4 quedaron ● Ready.

### Re-regresión final de los 4 templates redeployados

Los 12 combos × 4 sitios: **CLEAN**. Confirmado que desaparecieron:
- RTL conmuta (hebreo → `dir=rtl`) y dark/light conmuta en los 4
- Imagen Unsplash muerta: 0 imágenes rotas
- Navbar a 768px ya no desborda el viewport
- Sin llamadas 404 a firebase webConfig
- Booking wizard: abre con contenido en los 4 (`ctaFound:true, opened:true, hasContent:true`)
- Splash: aparece y termina sin quedar atascado

## Estado final: 20/20 webs sin issues críticos en producción.
