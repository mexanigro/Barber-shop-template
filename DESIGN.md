---
name: Nichos Master Template
description: Multi-tenant design system that shapeshifts per niche while sharing structural DNA
colors:
  warm-amber: "#d97706"
  deep-amber: "#b45309"
  carbon-black: "#09090b"
  soft-white: "#fafafa"
  zinc-muted: "#f4f4f5"
  zinc-text: "#71717a"
  warm-card: "#ffffff"
  subtle-border: "#e4e4e7"
  ink-white: "#ededed"
  ink-black: "#050505"
  blush-rose: "#dca2ac"
  deep-mauve: "#6f4a56"
  sandstone: "#b08d79"
  warm-cream: "#d4b5a5"
  teal-urban: "#0d9488"
  oxblood: "#991b1b"
  crimson-neo: "#dc2626"
  sage-line: "#6b8f71"
  lavender-soft: "#8b5cf6"
  noir-gold: "#d4a574"
  frost-slate: "#64748b"
  olive-botanical: "#65744d"
  status-success: "#22c55e"
  status-error: "#ef4444"
  status-warning: "#f59e0b"
typography:
  display:
    fontFamily: "Cormorant Garamond, serif"
    fontSize: "clamp(2.5rem, 7vw, 4.5rem)"
    fontWeight: 300
    lineHeight: 1
    letterSpacing: "0.04em"
  headline:
    fontFamily: "Cormorant Garamond, serif"
    fontSize: "clamp(1.75rem, 4vw, 2.5rem)"
    fontWeight: 400
    lineHeight: 1.15
    letterSpacing: "0.02em"
  body:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "normal"
  label:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.625rem"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "0.1em"
rounded:
  sharp: "0.125rem"
  clinical: "0.5rem"
  default: "0.75rem"
  soft: "1.25rem"
  bubble: "2rem"
  pill: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "40px"
  section: "80px"
components:
  button-primary:
    backgroundColor: "{colors.warm-amber}"
    textColor: "{colors.soft-white}"
    rounded: "{rounded.default}"
    padding: "16px 32px"
  button-primary-hover:
    backgroundColor: "{colors.deep-amber}"
    textColor: "{colors.carbon-black}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.warm-amber}"
    rounded: "{rounded.default}"
    padding: "12px 24px"
  card-interactive:
    backgroundColor: "{colors.warm-card}"
    rounded: "{rounded.default}"
    padding: "24px"
  input-default:
    backgroundColor: "{colors.soft-white}"
    textColor: "{colors.carbon-black}"
    rounded: "{rounded.default}"
    padding: "12px 16px"
  chip-status-success:
    backgroundColor: "rgba(34,197,94,0.1)"
    textColor: "{colors.status-success}"
    rounded: "{rounded.pill}"
    padding: "4px 12px"
  chip-status-error:
    backgroundColor: "rgba(239,68,68,0.1)"
    textColor: "{colors.status-error}"
    rounded: "{rounded.pill}"
    padding: "4px 12px"
---

# Design System: Nichos Master Template

## 1. Overview

**Creative North Star: "The Chameleon Stage"**

A single structural system that completely transforms its visual identity for each business niche. The stage (layout, components, interactions) stays architecturally consistent; the set design (colors, typography, radius, shadows, photography) changes so dramatically that two deployments feel like entirely different products. The transformation is not cosmetic. Each niche carries its own atmosphere, its own weight, its own way of handling light and depth.

The system rejects the template look. If a visitor could see a barbershop deployment next to a nail salon deployment and think "same template," the transformation has failed. Equally, if a developer could look at the admin panel and think "generic SaaS dashboard," the product side has failed. The CRM is not a backoffice; it is the daily instrument of a business owner standing behind a counter with a phone in one hand.

**Key Characteristics:**
- Niche-driven shapeshifting: every visual property (color, type, radius, shadow, motion) adapts per niche
- Dark/light per context, not per preference: the niche's physical reality dictates the default
- CRM density optimized for phone-behind-the-counter usage
- RTL-native: Hebrew and English receive equal structural attention
- Zero visual debt: no inherited patterns from other templates or SaaS conventions

## 2. Colors

A polymorphic palette where each niche carries its own color identity, connected only by the shared token architecture (`--brand-accent`, `--brand-accent-light`, `--brand-surface-dark`) that lets them swap at build time.

### Primary

- **Warm Amber** (#d97706): Default barberia accent. Confident, masculine warmth. Used on CTAs, active states, and the booking wizard's progression. In dark mode lifts to #f59e0b for readability.
- **Ink White** (#ededed): Tattoo accent. Monochrome reversed: the accent IS the absence of color against pure black. Subversive. Type and line work carry all the expression.
- **Blush Rose** (#dca2ac): Nails accent. Soft, warm femininity without cliche pink. Sits in the dusty rose range to avoid childishness. Dark mode shifts to #eab7bf.
- **Sandstone** (#b08d79): Estetica accent. Muted earth tone that reads "clinic, not spa." Warm enough for approachability, desaturated enough for clinical trust.

### Secondary (per-theme variants)

- **Teal Urban** (#0d9488): Barberia urban theme. Cool industrial counterpoint to the warm classic.
- **Oxblood** (#991b1b): Barberia vintage theme. Heritage warmth, leather and wood.
- **Crimson Neo** (#dc2626): Tattoo neo-traditional. Bold, confrontational energy.
- **Sage Line** (#6b8f71): Tattoo fine-line. Gentle, botanical minimalism.
- **Lavender Soft** (#8b5cf6): Nails lavender theme. Ethereal, youthful luxury.
- **Noir Gold** (#d4a574): Nails noir theme. High contrast dramatic glamour.
- **Frost Slate** (#64748b): Estetica frost theme. Clinical serenity.
- **Olive Botanical** (#65744d): Estetica botanical theme. Organic, warm naturalism.

### Neutral

- **Carbon Black** (#09090b): Default dark surface. Not pure black; carries a warm zinc tint.
- **Soft White** (#fafafa): Default light background. Not pure white; slightly warm.
- **Zinc Muted** (#f4f4f5 light / #18181b dark): Secondary surfaces, muted backgrounds.
- **Zinc Text** (#71717a light / #a1a1aa dark): Secondary text, labels, timestamps.
- **Subtle Border** (#e4e4e7 light / #27272a dark): Dividers, card edges, input strokes.

### Named Rules

**The Niche Owns Its Palette Rule.** Every deployment has exactly one accent hue. That hue comes from the niche preset or the client's branding, never from a generic "primary blue." The token `--brand-accent` is the single source of truth; everything else derives from it.

**The Status Is Sacred Rule.** Status colors (emerald success, red error, amber warning) are constant across all niches. They never change. Business-critical signals are not styled by the niche.

## 3. Typography

**Display Font:** Cormorant Garamond (with Georgia fallback) for default niches
**Body Font:** Inter (with system-ui fallback) for default niches
**Gothic Accent:** UnifrakturMaguntia for tattoo blackletter moments
**Script Accent:** Great Vibes for nails decorative moments

**Character:** The default pairing (Cormorant + Inter) creates editorial tension: a refined, high-contrast serif for display against a neutral, technical sans for body. Each niche overrides this entirely. Tattoo uses Cinzel Decorative + Montserrat Alternates. Nails uses Cormorant + Lato. Estetica uses Cormorant + DM Sans. Non-default themes bring their own complete pairings (15+ font families in the system).

### Hierarchy

- **Display** (300, clamp(2.5rem, 7vw, 4.5rem), 1.0): Hero headlines only. Serif family, light weight, tight leading. Maximum impact at minimum density.
- **Headline** (400, clamp(1.75rem, 4vw, 2.5rem), 1.15): Section titles on the landing page. Serif family, slightly heavier than display.
- **Title** (600-700, 1.125rem, 1.4): Card titles, navigation items, CRM section headers. Sans family. Weight carries the hierarchy, not size.
- **Body** (400, 0.875rem, 1.6): All reading text, form labels, CRM content. Sans family. Line-height at 1.6 for comfortable reading; max-width capped at 65ch where prose appears.
- **Label** (700, 0.625rem, 1.0, 0.1em tracking, uppercase): Status badges, stat labels, metadata. Loud despite its size. The tracking and case do the work.

### Named Rules

**The Niche Owns Its Voice Rule.** Font families change completely per niche. A tattoo deployment should feel typographically alien to a nails deployment. The hierarchy ratios and weight contrasts stay consistent; the families swap.

**The Admin Stays Neutral Rule.** The CRM/admin panel always uses the body sans (Inter or niche equivalent). Decorative display faces never appear in the admin. Functional clarity wins over brand expression behind the counter.

## 4. Elevation

Hybrid contextual: depth strategy changes per niche because each niche occupies a different physical reality.

**Barberia (classic):** Warm ambient shadows. `shadow-elevated` uses a large diffuse spread tinted slightly warm. Cards float gently. The room has even, warm overhead light.

**Tattoo (ink):** Flat and sharp. Minimal shadow; depth comes from high-contrast border treatments and tonal separation. The studio is lit by focused spots, not ambient glow. Dark mode shadows are pure black with high opacity.

**Nails (rose):** Soft, pillowy elevation. Shadows carry the niche hue (mauve undertone). Cards feel like they rest on a cushioned surface. The salon is bright, diffused, and warm.

**Estetica (lumiere):** Barely-there shadows with warm sand tint. Clinical environments suppress shadow to feel clean. Depth comes almost entirely from tonal layering (surface → card → card elevated).

### Shadow Vocabulary

- **Elevated (light default):** `0 10px 40px -12px rgb(15 23 42 / 0.08), 0 4px 16px -4px rgb(15 23 42 / 0.06)`. Diffuse, neutral, structural.
- **Elevated (dark default):** `0 18px 48px -16px rgb(0 0 0 / 0.55), inset 0 1px 0 0 rgb(255 255 255 / 0.04)`. Deep void with subtle top edge highlight.
- **Elevated (tattoo dark):** `0 1px 0 0 rgb(255 255 255 / 0.05), 0 4px 32px -8px rgb(0 0 0 / 0.8)`. Hard, dark, almost shadow-less. The 1px top wire is the only relief.
- **Elevated (nails light):** `0 1px 0 0 rgb(255 255 255 / 0.04), 0 8px 28px -10px rgb(111 74 86 / 0.26)`. Mauve-tinted, soft, generous spread.

### Named Rules

**The Niche Casts Its Own Shadow Rule.** Shadow values are never shared across niches. Each niche's `shadow-elevated` carries the hue and character of its physical space. Swapping a nails shadow onto a tattoo card would feel wrong immediately.

## 5. Components

### Buttons

Each niche transforms the button completely through radius, weight, and hover treatment while sharing the same structural markup.

- **Shape:** Determined by niche. Barberia classic: 0.75rem. Tattoo ink: 0.125rem (nearly square). Nails rose: 1.25rem (soft pill). Estetica: 0.5rem (clinical).
- **Primary:** `bg-primary text-primary-foreground`, uppercase, bold, tracking-widest. Padding 16px vertical, 32px horizontal. Full-width on mobile in the booking wizard.
- **Hover:** Shifts to `bg-accent-light text-zinc-950`. Paired with `active:scale-95` for tactile feedback.
- **Ghost:** Transparent background, accent text, subtle border. Used for secondary actions (cancel, back).

### Cards / Containers

- **Glass Card Interactive:** `rounded-3xl border border-border bg-card/90 shadow-elevated backdrop-blur-md`. The signature surface. Niche overrides change radius dramatically: 0.125rem (tattoo), 2rem (nails), 0.5rem (estetica). Tattoo and nails disable backdrop-blur for performance/aesthetic reasons.
- **Glass Panel:** `border border-black/6 bg-background/75 backdrop-blur-xl`. Navigation shell, sidebars. Less prominent than cards.
- **Hover:** `-translate-y-1 shadow-lg` on interactive cards. Tattoo uses `-translate-y-0.5` with border lightening instead of shadow growth.

### Inputs / Fields

- **Style:** `bg-background border border-border rounded-xl`. Focus ring via `ring-accent/20`. Placeholder in muted-foreground.
- **Focus:** Border shifts to accent color. Subtle ring glow (2px, accent at 20% opacity).
- **Nails override:** All inputs receive `border-radius: 1.25rem` via CSS cascade.

### Navigation

- **Admin sidebar:** Fixed left rail (desktop), bottom sheet or slide-over (mobile). Uses glass-panel surface. Active item highlighted with accent background at low opacity.
- **Landing nav:** Transparent over hero, transitions to glass-panel on scroll. Logo + links + CTA button. Hamburger on mobile with slide-in panel.

### Status Badges

Semantic utility classes that stay constant across all niches:
- **Success:** Emerald-tinted background, emerald text, subtle emerald border. Used for confirmed appointments, active status.
- **Error:** Red-tinted background. Cancelled appointments, failures.
- **Warning:** Amber-tinted background. Pending states, attention needed.
- **Neutral:** Muted background, muted text. Inactive, archived, default.

### Chat Bubbles

- **Bot bubble:** `rounded-2xl rounded-tl-sm` creating an asymmetric speech shape. Card background, border, relaxed line-height. Tattoo overrides to 0.125rem (sharp rectangles). Avatar is a circular muted-bg pill with accent icon.

## 6. Do's and Don'ts

### Do:

- **Do** let the niche transform everything: color, type, radius, shadow, motion. The template should be unrecognizable between deployments.
- **Do** use the token architecture (`--brand-accent`, `--brand-accent-light`, `--brand-surface-dark`) as the single source of truth for all color decisions. Every surface derives from these three roots.
- **Do** test every component in all five niches AND both light/dark modes before shipping. 10 visual states minimum per component.
- **Do** keep CRM interactions under 2 taps for the most common tasks (confirm appointment, register walk-in, check today's schedule).
- **Do** respect the physical scene: a barbershop owner in a dim shop at 7am needs different contrast than a nail technician in a bright salon at noon.
- **Do** use semantic status classes (`status-success`, `status-error`, `status-warning`, `status-neutral`) instead of raw color utilities. Status is cross-niche infrastructure.
- **Do** cap body text at 65ch. Use `max-w-prose` or explicit `max-width` on reading blocks.

### Don't:

- **Don't** build generic SaaS dashboard layouts with identical card grids. Every screen earns its own information architecture.
- **Don't** create cookie-cutter layouts that look like Wix or Squarespace service pages. The landing page sells an experience, not a feature list.
- **Don't** over-animate the landing page. Motion serves booking conversion, not spectacle. One entrance animation per section maximum.
- **Don't** let the admin panel feel like a spreadsheet. Data density is good; visual monotony is not. Vary row heights, use color for status, break grids with inline actions.
- **Don't** use `#000000` or `#ffffff`. Every neutral carries a tint toward the niche hue (chroma 0.005-0.01 in OKLCH terms). The existing token system already does this correctly.
- **Don't** apply decorative display fonts in the CRM/admin. Inter (or niche body sans) only behind the counter.
- **Don't** use border-left or border-right greater than 1px as a colored accent stripe on any element.
- **Don't** apply gradient text (`background-clip: text`) anywhere in the system.
- **Don't** use glassmorphism (backdrop-blur) as a decorative default. It exists on glass-panel and glass-card-interactive for structural purpose; nowhere else.
- **Don't** build hero-metric cards (big number, small label, gradient accent). The CRM uses a compact stat strip, not SaaS vanity metrics.
- **Don't** mix niche radius values. If the niche is tattoo (0.125rem), every rounded surface is 0.125rem. No exceptions except circles (avatars, status dots, spinners).
