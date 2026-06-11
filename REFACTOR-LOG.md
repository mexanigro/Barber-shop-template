# REFACTOR-LOG — 2026-06-11

Refactor del master template (sesión dedicada). Auditoría con 5 agentes en
paralelo (dead code, patrones, performance, types, consistencia) + verificación
manual de cada hallazgo antes de tocar nada. Contexto operativo: había 3
sesiones Claude paralelas editando este mismo working tree (visual audit,
Playwright E2E, SEO), así que el criterio fue **aplicar solo lo verificado y de
bajo riesgo de colisión, y documentar el resto acá**.

Baseline previa (commit `a2e66b1`): `tsc` con 2 errores pre-existentes,
build OK, parity 19/19, chunk `index` 1,076 kB (270 kB gzip),
`AdminDashboard` 698 kB (179 kB gzip).

---

## Cambios aplicados (commits atómicos)

### 1. `chore(deps): remove unused serverless-http` (`458f679`)
- `serverless-http` no tenía un solo import en src/, server.ts, api/ ni
  scripts/. `api/index.ts` usa handler nativo de Vercel (MICRO_CRM_PLAN.md lo
  documenta como "sin serverless-http").

### 2. `perf: parallel font discovery + stable LanguageContext identity` (`05f8da3`)
- **Fuentes**: el `@import url(fonts.googleapis...)` en `src/index.css` era
  render-blocking y recién se descubría después de bajar el bundle CSS. Movido
  a `<link rel="stylesheet">` en `index.html`, al lado de los `preconnect` que
  ya existían. Misma URL, mismas 7 familias (Cormorant Garamond, DM Sans,
  Inter, Frank Ruhl Libre, Heebo, Amiri, Cairo).
  - Verificado en vivo (preview barberia, RTL): `document.fonts` carga Heebo /
    Cormorant / Amiri desde el nuevo link, 0 errores de consola, landing
    completa renderiza.
- **LanguageContext**: el value del provider era un objeto literal nuevo en
  cada render; ahora `useMemo` → identidad estable para los consumers.

### 3. `types: ...` (`5aa7ada`)
- **tsconfig**: `useUnknownInCatchVariables: true`. Activarlo produjo **cero
  errores nuevos** — todo el codebase ya trataba los catch vars de forma
  segura; ahora lo garantiza el compiler (los ~18 `catch (err)` pasaron de
  `any` implícito a `unknown` sin tocar archivos).
- **services/{inbox,customers,support}**: `docTo*` recibía
  `Record<string, any>` artesanal → `DocumentData` de firebase/firestore
  (idéntico en runtime, semánticamente correcto). `db.ts` quedó afuera a
  propósito: otra sesión lo tenía modificado.
- **Chatbot.tsx**: eliminado `isEmployment` y su branch `bottom-[35%]` —
  código provadamente muerto (el componente hace early-return de
  `WhatsAppFloatingButton` para employment antes de esa línea, así que TS ya
  había narrowed el union; ese era el error TS2367 pre-existente).

### 4. `refactor(navbar): dedupe getAudienceToggleLocale` (`980d1f4`)
- La misma función (incluyendo un double-cast `as unknown as` de
  `localeConfig`) estaba copy-pasteada **verbatim en 5 archivos**: Navbar.tsx
  y navbar-v2..v5. Movida a `src/lib/employment-audience.ts` con tipo
  `AudienceToggleLocale` y sin cast (las 4 locales definen
  `employment.audienceToggle`, el acceso directo tipa bien). −69/+29 líneas.
  - Verificado en vivo (cliente employment, puerto 5187): el toggle renderiza
    los strings hebreos correctos y el click cambia /trabajo ↔ /empresas sin
    errores de consola.

### 5. `chore(deps): add @playwright/test` (`563d9db`)
- `playwright.config.ts` importa `@playwright/test` pero solo estaba instalado
  `playwright` → `tsc --noEmit` siempre salía 1 y `verify:locales` nunca
  llegaba a sus builds. Con el devDep instalado, **`npm run lint` sale 0 por
  primera vez** (de 2 errores pre-existentes a 0).

### Regresión final
- `tsc --noEmit`: 0 errores propios (un error transitorio en
  `BusinessHours.tsx` durante la corrida pertenece a una edición en vuelo de
  otra sesión, archivo que este refactor no tocó).
- `npm run build:he` ✓ y `npm run build:en` ✓.
- `npm run test:parity`: 19/19 ✓.
- Smoke visual: barberia (fuentes/RTL) ✓, employment (audience toggle) ✓.

---

## Hallazgos verificados como FALSOS o ya resueltos

Para futuras auditorías — esto ya está bien, no "arreglarlo":

- **Preconnect a Google Fonts**: ya existía en index.html (líneas 9-10).
- **driver.js en el bundle**: falso; `ProductTour` y `TourButton` ya son
  `React.lazy` y solo se montan si `TOUR_CONFIG.isDemoMode` (App.tsx:529).
- **recharts en landing**: falso; solo lo importan componentes admin, y
  `AdminDashboard` es un chunk lazy separado.
- **`docTo*` sin return types**: falso; los tres ya declaraban
  `: ContactInboxItem` / `: Customer` / `: ProviderMessage`.
- **Patrones ya unificados** (no migrar nada): `cn()` (352 usos, 0 clsx
  directo), `handleImgError`/`revealImg` compartidos (156 usos, 0 inline),
  i18n vía `useLanguage()` + `localeConfig` (un solo patrón), lazy loading
  `React.lazy` consistente (42+), separación `import.meta.env` /
  `process.env` / `config/env.ts` correcta.

## Deuda documentada — NO tocada a propósito (y por qué)

1. **Clases CSS `status-warning` / `status-neutral` / `status-dot-*`**
   (index.css:706-719): 0 usos en componentes, PERO DESIGN.md:252 las
   documenta como API del design system ("status is cross-niche
   infrastructure"). Borrarlas crearía una trampa para quien siga el doc.
   Decisión: se quedan. Si algún día se borran, actualizar DESIGN.md a la vez.

2. **`strict: true` / `strictNullChecks`** en tsconfig: hoy solo hay
   `noImplicitAny` + `useUnknownInCatchVariables`. Activar strict completo
   surfacea cientos de errores → necesita una pasada dedicada con el tree
   quieto. Mayor ROI pendiente en types.

3. **Sweep de `loading="lazy"` / `decoding="async"` / width+height en ~84
   componentes landing**: valioso pero necesita criterio por sección (las
   imágenes above-the-fold del hero NO deben ser lazy o empeora LCP) y choca
   con el patrón `revealImg`. Hacerlo con QA visual por niche, no como sweep
   mecánico — y no con 3 sesiones editando los mismos archivos.

4. **Chunk `index` de 1,076 kB**: las secciones landing base se importan
   eager en App.tsx. Code-splitting por sección es posible pero interactúa con
   whileInView/animaciones (gotchas conocidos en memoria). Pasada dedicada.

5. **Renames de consistencia** (todo document-only por colisión con sesiones
   paralelas + Windows case-insensitive git):
   - Hooks: `useSEO.ts` (camel) vs `use-hero-object.ts`/`use-paper-spring.ts` (kebab).
   - Lib: `dateLocale.ts`, `exportCsv.ts`, `schedulingRules.ts` (camel) vs
     20 archivos kebab.
   - `src/components/ui/calendar.tsx` → `Calendar.tsx` (case-only rename:
     peligroso en Windows/git).
   - 9 variantes kebab-case en `landing/` root que pertenecen a sus subdirs
     (`gallery-bento-stats.tsx` → `gallery/`, etc.).
   - Convención sugerida a futuro: components PascalCase, hooks camelCase
     `useX.ts`, lib kebab-case.

6. **Alias `@/` definido en tsconfig+vite pero 0 usos** (todo es relativo
   `../../`). Adoptarlo = tocar 200+ archivos; hacerlo solo, en un commit
   atómico, con el tree quieto.

7. **Casts `as unknown as` restantes de `localeConfig`**
   (AudienceChoice.tsx:54, BusinessRegistrationForm.tsx:114): únicos (no
   duplicados), con comentario explicando la decisión. La alternativa limpia
   es tipar esas keys en `LocaleConfig`, pero las locales estaban siendo
   editadas por la sesión SEO.

8. **Stripe `apiVersion as any`** (×3: server.ts, api/index.ts,
   payment-gateways.ts): workaround conocido del SDK; se va solo al alinear
   la versión del SDK con la apiVersion.

9. **Formato de fechas mixto** (date-fns ~20 usos vs `toLocaleDateString`
   ~10): ambos correctos; churn > beneficio. Si se unifica: date-fns en
   admin/, toLocale* para display simple en landing.

10. **Motion inline vs helpers de `lib/motion.ts`** (474 inline vs 95
    helpers): no es mecánico — cambia timing/easing visible por niche. Es
    decisión de diseño, no de refactor.
