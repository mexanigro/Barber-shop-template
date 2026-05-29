# Velvet Muse Hero — Configuration tokens

The `hero-3d-object` Hero variant exposes a fully parametric editorial
hero. Every visual decision is reachable from either a niche preset
(`src/config/presets/<niche>.<lang>.ts`) or a Firestore overlay
(`config/{clientId}` deep-merged into `siteConfig` at boot).

The variant is enabled by setting:

```ts
siteConfig.hero.heroVariant = "hero-3d-object";
```

It also requires `siteConfig.heroObjects.primary` to be configured (the
composition the 3D object renders). When neither is set, the Hero falls
back to its standard rendering and warns once in dev.

## Brand tokens (`siteConfig.brand`)

| Token | Type | Default | Purpose |
|---|---|---|---|
| `brand.logoSvg` | `boolean` | `false` | Opt into the in-house `<LogoSvg/>` editorial monogram. Pre-empts both the URL-based logo path and the Lucide icon fallback. |
| `brand.logoMonogram` | `string` | First letter of each word in `brand.name`, sliced to 2 chars | Two-letter monogram drawn inside the SVG logo. |
| `brand.logoSuffix` | `string` | `"SALON"` | Caps suffix below the wordmark, e.g. `"SALON"`, `"STUDIO"`, `"ATELIER"`. |

## Hero tokens (`siteConfig.hero`)

### Title

| Token | Type | Default | Purpose |
|---|---|---|---|
| `hero.titleParts` | `Array<{text, italic?, color?, underline?}>` | Reconstructed from `titlePrefix/titleHighlight/titleSuffix` | Composed title — each entry is a run of text. Italic + color + underline mark an accent word. The italic word gets a hand-drawn SVG underline that "writes itself" when the title enters the viewport. |
| `hero.eyebrow` | `string` | `"Full-Service Salon"` | Letterspaced caps kicker above the title; rendered in `--vm-accent` with a flourish divider next to it. |
| `hero.subtitle` | `string` | (from preset) | Body copy under the title. |
| `hero.ctaPrimary` | `string` | (from preset / locale) | Primary CTA label (legacy field, still honoured). |
| `hero.ctaPrimaryLabel` | `string` | `ctaPrimary` | New override label for the editorial CTA when you want a different phrasing here vs the booking button elsewhere. |
| `hero.ctaPrimaryHref` | `string` | `undefined` | When set, primary CTA renders as an `<a>` instead of a `<button>`. |
| `hero.ctaSecondary` | `string` | (from preset) | Secondary CTA label. |
| `hero.ctaSecondaryHref` | `string` | `"#services"` | Anchor for the secondary CTA. |

### Example titleParts

```ts
titleParts: [
  { text: "Hair that feels like " },
  { text: "you", italic: true, color: "#8b3a4b", underline: true },
  { text: "." },
],
```

### Editorial palette (`hero.theme`)

CSS variables exposed inside the hero element. Descendant components
(TitleWithItalic, FloatingCards, HeroStatsBar, CTAs) consume these.

| Token | Type | Default | Purpose |
|---|---|---|---|
| `hero.theme.accent` | `string (CSS color)` | `#8b3a4b` (burgundy) | `--vm-accent`. CTA fill, eyebrow text, italic word color. |
| `hero.theme.accentLight` | `string (CSS color)` | `#c9a37a` (rose-gold) | `--vm-accent-light`. Stats bar icons, decorative accents. |
| `hero.theme.surface` | `string (CSS color)` | `#fdf6ec` (cream) | `--vm-surface`. Inner card backgrounds. |
| `hero.theme.ink` | `string (CSS color)` | `#3b1820` (ink) | `--vm-ink`. Body copy color on light surfaces. |

### Background (`hero.bg`)

| Token | Type | Default | Purpose |
|---|---|---|---|
| `hero.bg.gradient` | `string (CSS background)` | `linear-gradient(180deg, #fff5ec 0%, #f7f0ea 60%, #f7e8e0 100%)` | The hero base background. |
| `hero.bg.glowColor` | `string (CSS color)` | `#fff8ef` | Color of the radial champagne glow centred behind the composition. |
| `hero.bg.silkTextureOpacity` | `number` | `0.04` | Opacity of the SVG noise overlay (mix-blend-multiply). |

### Composition (`hero.composition`)

| Token | Type | Default | Purpose |
|---|---|---|---|
| `hero.composition.primarySrc` | `string` | — | Reserved override for the primary composition. Today we read `siteConfig.heroObjects.primary.src` directly; this token is reserved for a future shorthand. |
| `hero.composition.ribbonSrc` | `string` | `undefined` | URL of the optional pink-ribbon decoration. When omitted the slot is empty. **Will be wired to the BRIA pipeline output's `decoration-ribbon-pink` slot.** |
| `hero.composition.backgroundTone` | `string (CSS color)` | `undefined` | Reserved. Editorial background tone matching the cutout, for future iterations that need the composition to blend with a custom bg. |

### Availability card (`hero.availabilityCard`)

```ts
hero.availabilityCard?: {
  enabled?: boolean;          // default: true; set false to hide.
  title?: string;             // default: "Today's availability".
  slots?: Array<{ label: string; selected?: boolean }>;
                              // default: 6 placeholder time slots, first one selected.
  address?: { name?: string; street?: string; cityZip?: string };
                              // default: pre-filled from siteConfig.contact / siteConfig.brand.
  thumbnailSrc?: string;      // optional 40×40 image; falls back to a gradient tile.
  footerLabel?: string;       // default: "View full schedule →".
  footerHref?: string;        // default: "#contact".
}
```

### Trust card (`hero.trustCard`)

```ts
hero.trustCard?: {
  enabled?: boolean;          // default: true.
  rating?: string;            // default: "4.9/5".
  text?: string;              // default: "Trusted by 500+ clients".
  avatars?: string[];         // up to 3 URLs; defaults to 3 abstract rose-gold avatars.
}
```

### Stats bar (`hero.statsBar`)

```ts
hero.statsBar?: {
  enabled?: boolean;          // default: true.
  items?: Array<{
    icon?: string;            // Lucide icon name (resolved via resolveLucideIcon).
    title: string;
    description: string;
  }>;
                              // defaults to: Premium Products / Expert Stylists /
                              // Personalized Experience / Luxury. Always.
}
```

## Global ambient (`siteConfig.globalAmbientParticles`)

| Token | Type | Default | Purpose |
|---|---|---|---|
| `globalAmbientParticles.type` | `"pearls" \| "sparkles" \| "bubbles" \| "smoke" \| "none"` | `undefined` (none) | Particle layer rendered at the hero level (outside the HeroObject3D). Velvet Muse default: `"pearls"`. |
| `globalAmbientParticles.density` | `"low" \| "medium" \| "high"` | `"low"` | Particle density. |

## Multi-language fonts

The hero reads the active UI language (`localeConfig.lang`) and resolves a
font pair via `src/lib/typography.ts`:

| Language | Serif | Sans |
|---|---|---|
| `en`, `ru` | Cormorant Garamond | Inter |
| `he` | Frank Ruhl Libre | Heebo |
| `ar` | Amiri | Cairo |

These families are loaded via the single `@import` in `src/index.css`.
Switching language at runtime (via the `LanguageSwitcher`) automatically
re-renders the hero with the matching family — no per-component conditionals.

## Animations checklist

| Element | Technique | Respects reduced motion |
|---|---|---|
| Eyebrow flourish hairline | SVG `pathLength` via `motion.path` | yes |
| Title word-by-word reveal | Framer fade+y stagger per word | yes |
| Italic word underline | SVG `pathLength` whileInView | yes |
| Subtitle / CTA fade-in | Framer fade+y with delay | yes |
| Floating cards entry | Framer fade+y, then CSS `vm-bob-a/b` micro-bob | yes (animation: none) |
| Stats bar entry | Framer fade+y; each item stagger via `delay = 0.3 + i*0.09` | yes |
| Composition tilt | `useMotionValue` mousemove → spring → rotateX/Y | yes (tilt = 0) |
| Composition parallax | `useScroll` + `useTransform` on container `y` | yes (y = undefined) |
| Composition ambient float | CSS `velvet-float-key` keyframe | yes (animation: none) |
| Inner HeroObject3D | levitation + cursor-tracked drop-shadow (existing) | yes |

## Replicable for other clients

Every editorial decision lives under `hero.*`. To roll a new editorial
salon/spa onto this variant:

1. Set `brand.logoSvg = true` plus `brand.logoMonogram = "XY"` and
   `brand.logoSuffix = "STUDIO"` (or similar).
2. Set `hero.heroVariant = "hero-3d-object"`.
3. Provide `siteConfig.heroObjects.primary` with the cutout image.
4. Tune `hero.theme.accent` (e.g. `#0b3a4b` for an emerald spa) and
   `hero.bg.gradient` (e.g. all-cream for a neutral palette).
5. Override `hero.titleParts`, `hero.eyebrow`, `hero.subtitle`,
   `hero.availabilityCard.slots`, `hero.statsBar.items` per client copy.
6. (Optional) Set `globalAmbientParticles.type` to match the brand mood
   (`pearls` for elegant salons, `bubbles` for clinical spas, `sparkles`
   for nail/beauty, `smoke` for moody barbershops).

The variant is fully back-compatible: clients without any of the editorial
tokens (Lumière Clinic, Onyx & Steel) keep rendering through the legacy
`titlePrefix/Highlight/Suffix` triple with the new editorial chrome
disabled.
