# Sistema de Variantes de Secciones + Flags Globales de Estilo

> Registro de sesión — 2026-06-10. Implementación completa del sistema de 5 variantes
> por sección (13 secciones × 5 = 65 layouts) y de los 19 flags globales de estilo.
> Todo pusheado a `origin/main`, desde `4d2893e` hasta `89e86df` (14 commits).

---

## 1. Qué se hizo

### Foundation (commit `4d2893e` + `b320c19`)

| Pieza | Archivo | Qué hace |
|---|---|---|
| `SectionVariantValue` | `src/types.ts` | Union `"v1"\|"v2"\|"v3"\|"v4"\|"v5"` + campo `variant?` en cada sección del `SiteConfig` |
| `GlobalStyleConfig` | `src/types.ts` | Los 19 flags globales, todos opcionales (ausente = default del nicho) |
| `resolveVariant()` | `src/lib/section-variants.ts` | Resuelve el variant; cualquier valor desconocido/legacy degrada a `"v1"` (contrato de retrocompatibilidad) |
| Helpers | `src/lib/section-variants.ts` | `getGlobalStyle()`, `isParallaxEnabled()`, `isGradientEnabled()`, `getAnimationLevel()`, `getOverlayOpacity(fallback)` |
| `applyGlobalStyleVars()` | `src/lib/site-theme.ts` | Aplica `config.global` como atributos `data-gs-*` + vars `--gs-*` en `<html>`. Llamada desde `applySiteThemeCssVars()` en bootstrap. La derivación de `colorScheme` se re-aplica en cada toggle dark/light (`syncBrandingToTheme`) |
| Tokens CSS | `src/index.css` (bloque "GLOBAL STYLE FLAGS" al final) | Defaults seguros (`--gs-gap`, `--gs-section-py`, `--gs-image-radius`, `--gs-card-radius`, `--gs-btn-radius`, `--gs-overlay-opacity`, `--gs-accent-alt`) + reglas por atributo. **Sin atributo = render pixel-idéntico al actual** |
| Idioma | `src/config/site.ts` | `LANGUAGE_SAFE_KEYS` ahora incluye `global`/`navbar`/`footer`, y `pickLanguageSafeOverride` preserva las claves estructurales de `sections.*` (`variant`, `*Variant`, `layout`, etc.) al cambiar idioma en runtime |
| Divider | `src/components/landing/SectionDivider.tsx` | Lee `global.dividerStyle`: `none` (lo saca del DOM) / `line` / `gradient` (default legacy) / `ornament` |
| Types extra | `src/types.ts` | `hero.videoUrl` (Hero v3), `Testimonial.videoUrl`/`avatar` (Testimonials v4) |

### Las 13 secciones × 5 variantes

v1 = **el componente original, intacto** (el único cambio en cada componente existente es el bloque dispatcher al inicio). Cada variante v2–v5 es un archivo propio, lazy-loaded (`React.lazy` + `<Suspense fallback={null}>`) → chunk separado en el build, el bundle base no crece.

| # | Sección | Flag en Firestore `config/{clientId}` | Archivos | v2 / v3 / v4 / v5 | Commit |
|---|---|---|---|---|---|
| 1 | Hero | `hero.variant` | `src/components/landing/hero/hero-v{2-5}.tsx` | split editorial / video background / minimal centered / parallax layers | `47b98d7` |
| 2 | Navbar | `navbar.variant` | `src/components/layout/navbar/navbar-v{2-5}.tsx` | logo centrado / hamburger always / bottom bar mobile / transparent overlay | `a2ebf3e` |
| 3 | Services | `sections.services.variant` | `src/components/landing/services/services-v{2-5}.tsx` | scroll rail horizontal / accordion / tabs por categoría / masonry | `de02d42` |
| 4 | Why Choose Us | `sections.whyChooseUs.variant` | `src/components/landing/why-choose-us/why-choose-us-v{2-5}.tsx` | timeline vertical / tabla comparativa / counters animados / híbrido con testimonial | `76f6009` |
| 5 | Team | `sections.team.variant` | `src/components/landing/team/team-v{2-5}.tsx` | carousel / grid con hover bio / featured + lista / avatares mínimos | `a937d38` |
| 6 | Gallery | `sections.gallery.variant` | `src/components/landing/gallery/gallery-v{2-5}.tsx` | masonry / lightbox carousel / before-after slider / Pinterest | `f0879df` |
| 7 | Instagram | `sections.instagram.variant` | `src/components/landing/instagram/instagram-v{2-5}.tsx` | stories rail / grid con captions / featured + grid / marquee auto-scroll | `7d7ad2f` |
| 8 | FAQ | `sections.faq.variant` | `src/components/landing/faq/faq-v{2-5}.tsx` | dos columnas / buscable / tabs por categoría / estilo chat | `857d8c2` |
| 9 | Testimonials | `sections.testimonials.variant` | `src/components/landing/testimonials/testimonials-v{2-5}.tsx` | carousel / masonry / video / rating summary + lista | `89e86df` |
| 10 | Contact | `sections.contact.variant` | `src/components/landing/contact/contact-v{2-5}.tsx` | split map+form / floating card / minimal inline / full-width immersive | `aef2667` |
| 11 | Footer | `footer.variant` | `src/components/layout/footer/footer-v{2-5}.tsx` | one-line / mega columnas / centered stack / dark contrast | `767a615` |
| 12 | Splash | `splash.variant` | `src/components/layout/splash/Splash{FadeScale,Particles,GradientSweep,MinimalPulse}.tsx` | fade+scale logo / partículas / gradient sweep / minimal pulse | `27e3f50` |
| 13 | Stats Bar | `hero.statsBar.variant` | `src/components/landing/hero/stats-bar-v{2-5}.tsx` | scroll strip / counters / icon cards / inline mínimo | `9ae5813` |

Dispatchers (el único edit a componentes existentes): `Hero.tsx`, `Navbar.tsx`, `Services.tsx`, `WhyChooseUs.tsx`, `Team.tsx`, `Gallery.tsx`, `InstagramTeaser.tsx` + `InstagramFeed.tsx`, `FAQ.tsx`, `Testimonials.tsx`, `ContactHub.tsx`, `Footer.tsx`, `SplashScreen.tsx`, `hero/stats-bar.tsx`. El check del variant nuevo va ANTES de los checks legacy (`aura`, `icon-grid-3d`, etc.) — un `"v2"` explícito gana; sin flag, todo cae al camino legacy intacto.

### Los 19 flags globales (`config/{clientId}.global`)

```
borderRadius      "none" | "subtle" | "rounded" | "pill"
shadowStyle       "none" | "subtle" | "elevated" | "dramatic"
transitionSpeed   "none" | "fast" | "normal" | "slow"
glassmorphism     boolean
fontFamily        { heading?: string, body?: string }   (Google Fonts)
colorScheme       "brand" | "monochrome" | "complementary" | "analogous"
spacing           "compact" | "normal" | "spacious"
density           "dense" | "normal" | "airy"
buttonShape       "square" | "rounded" | "pill"
dividerStyle      "none" | "line" | "gradient" | "ornament"
parallaxEnabled   boolean
animationLevel    "none" | "subtle" | "rich"
cardStyle         "flat" | "elevated" | "bordered" | "glass"
imageStyle        "square" | "rounded" | "circle" | "blob"
overlayOpacity    number 0–1
gradientEnabled   boolean
textShadow        boolean
letterSpacing     "tight" | "normal" | "wide"   (RTL fuerza 0 igual)
lineHeight        "compact" | "normal" | "relaxed"
```

Mecánica: cada flag → atributo `data-gs-*` en `<html>` + token `--gs-*`. Las reglas CSS viven al final de `index.css` (mismo patrón que los overrides por nicho). `spacing`/`density`/`imageStyle`/`overlayOpacity`/`parallax`/`gradient`/`animationLevel` afectan sobre todo a las variantes nuevas (que consumen los tokens); `borderRadius`/`shadowStyle`/`buttonShape`/`transitionSpeed`/`cardStyle`/`glassmorphism`/`letterSpacing`/`lineHeight`/`textShadow`/`dividerStyle` aplican global.

### Cómo activar (ejemplo de doc Firestore)

```jsonc
// config/{clientId}
{
  "hero": { "variant": "v2", "statsBar": { "variant": "v3" } },
  "navbar": { "variant": "v5" },
  "footer": { "variant": "v2" },
  "splash": { "variant": "v4" },
  "sections": {
    "services": { "variant": "v3" },
    "faq": { "variant": "v5" },
    "gallery": { "variant": "v4" }
  },
  "global": {
    "borderRadius": "pill",
    "colorScheme": "monochrome",
    "animationLevel": "subtle"
  }
}
```

### Convenciones que siguen todas las variantes

- Datos 100% desde `siteConfig` (ya localizado). Microcopy nuevo = `const STRINGS: Record<"en"|"he"|"ru"|"ar">` inline en cada variante (con pluralización gramatical real en ru/ar) — **no se tocaron los archivos de locale**.
- RTL-safe (utilities lógicas `ms/me/ps/pe/start/end`; carousels, sliders y marquees espejados), dark+light (solo tokens semánticos), `prefers-reduced-motion` + `animationLevel` respetados.
- Motion: helpers de `src/lib/motion.ts` (niche flavors, 400–600ms ease-out, stagger 30–100ms, solo transform/opacity).
- Bans del proyecto respetados: sin side-stripe borders, sin gradient text, lucide en vez de emojis.
- Misma `id` de sección que v1 (anclas de navegación intactas); mismos contracts de props; mismo flujo de submit en Contact (`/api/contact`, mismo payload).

### Verificación hecha

- `npx tsc --noEmit` → solo los 2 errores preexistentes (playwright.config.ts + Chatbot.tsx).
- `npm run build` → OK (12.8s); cada variante es su propio chunk lazy.
- Previews barbería/tattoo/nails: cero errores de consola, landing default (v1) renderiza idéntica.
- Team, Instagram y Testimonials fueron además ejercitadas en vivo en el preview con flags temporales (revertidos).
- Hallazgo técnico guardado en memoria: en Tailwind v4 `translate-*`/`scale-*` son propiedades CSS nativas → `transition-[transform,...]` no las anima; usar `transition-[translate,...]` o `transition-transform`.

---

## 2. Qué faltaría por hacer

### Imprescindible antes de usar en clientes reales

1. **QA visual variante por variante.** Las 52 variantes nuevas pasaron tsc/build y review de código, pero solo 3 secciones se montaron en vivo. Falta una pasada visual sistemática (pixel-detective): cada variante × niche dark/light × RTL (he/ar) × 375px. Sugerencia: una página dev tipo `/dev/variants-preview` que itere variantes sin tocar Firestore.
2. **Integración con el hub (Nichos-hub).** El hub tiene que poder escribir los campos nuevos: `{seccion}.variant`, `navbar.variant`, `footer.variant`, `splash.variant` ("v1"–"v5"), `hero.statsBar.variant` y el objeto `global` completo. Hoy solo se pueden setear a mano en Firestore.
3. **Probar los flags globales en combinación.** Cada flag se implementó con reglas conservadoras, pero combinaciones (p. ej. `borderRadius:"none"` + `cardStyle:"glass"` + nicho nails que fuerza radios) pueden pisarse. Hace falta una matriz de prueba de los 19 flags sobre al menos barbería y nails.

### Mejoras pendientes (no bloqueantes)

4. **Hero v3 (video):** ningún cliente tiene `hero.videoUrl` cargado; subir un video de prueba a Storage y verificar poster/pausa/reduced-motion en producción.
5. **Testimonials v4 (video):** ídem — el fallback sin videos está resuelto, pero el camino con `videoUrl` real no se probó contra archivos reales.
6. **Navbar v4 (bottom bar) vs. chatbot:** el launcher del chatbot queda en `bottom-20` en mobile; en iPhones con safe-area grande pueden quedar pegados. Decidir si el chatbot debe subir cuando `navbar.variant === "v4"`.
7. **Navbar v4 en desktop** replica un top bar estándar; si se quiere algo más distintivo en lg+, iterar.
8. **`spacing`/`density` sobre v1:** hoy `spacing` ajusta el padding de secciones top-level con `!important` y `density` solo afecta variantes nuevas (token). Si se quiere que `density` afecte también los grids de v1, hay que decidir selectores seguros.
9. **Documentar el schema en el hub/CLAUDE.md** si este sistema pasa a ser la vía oficial de personalización (hoy este archivo es la única doc).
10. **Code-sync deliberado:** las variantes de Navbar/Footer duplican la lógica de links de v1 (banner "keep in sync manually" en cada archivo) — fue la forma de no tocar v1. Si v1 cambia sus links, actualizar las variantes.
11. **Splash v2–v5 con `splash.image`:** v5 la ignora a propósito (estética vacía); confirmar que está bien o ajustar.
12. **Limpiar los untracked del repo** que no son de esta sesión (`serviceAccountKey.json` ⚠️ credencial en working tree, scripts `update-*.mjs`, dumps `config-dump-*.json`, `API-COSTS-AUDIT.md`) — decidir si se gitignorean, se guardan en otro lado o se borran. `serviceAccountKey.json` no debería quedar ahí.

---

## 3. Mapa rápido de commits

```
4d2893e  foundation: types + tokens + applyGlobalStyleVars + resolveVariant
b320c19  types: hero.videoUrl + Testimonial.videoUrl/avatar
47b98d7  hero v2-v5
de02d42  services v2-v5
76f6009  why-choose-us v2-v5
a2ebf3e  navbar v2-v5
857d8c2  faq v2-v5
f0879df  gallery v2-v5
27e3f50  splash v2-v5
767a615  footer v2-v5
9ae5813  stats-bar v2-v5
aef2667  contact v2-v5
a937d38  team v2-v5
7d7ad2f  instagram v2-v5
89e86df  testimonials v2-v5
```
