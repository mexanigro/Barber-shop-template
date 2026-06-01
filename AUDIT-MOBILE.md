# Mobile UX/UI Audit — Estética Pilot

**Date:** 2026-05-31
**Auditor:** Claude (Impeccable + Emil Design Eng + UI/UX Pro Max)
**Scope:** All landing sections, mobile-first (< 640px), estética niche (Lumière default theme)
**Goal:** Each section = 100dvh, harmonious content, no overflow

---

## Executive Summary

The template's mobile experience has strong bones — the niche token system, motion library, and component architecture are well-built. But mobile layout was clearly designed desktop-first and then adapted via responsive breakpoints. The result: sections overflow vertically, typography is oversized for phone screens, floating elements collide, and there is no scroll-snap system to enforce the "one section = one screen" requirement.

**Critical issues (must fix):**
1. Hero text is 48px+ on mobile — breaks visual hierarchy and overflows viewport
2. No scroll-snap — sections flow freely instead of locking to viewport boundaries
3. Chatbot + ScrollToTop buttons overlap and cover content
4. Services shows only 2 items by default (estética) — should be 4
5. Team section requires excessive scrolling on mobile (full 3:4 portrait cards stacked vertically)

**High-priority issues:**
6. Inconsistent section padding (py-20 to py-28) — no vertical rhythm
7. Navbar shows too many elements on mobile (language switcher + theme toggle + hamburger)
8. Hebrew/Arabic typography uses browser defaults — breaks visual cohesion
9. i18n text overflow on language change
10. No mobile-specific typography scale — desktop sizes serve mobile

---

## 1. Global Architecture

### Current State
- **Page structure:** Natural scroll, no snap. Sections use `min-h-screen` or no height constraint.
- **LandingBackdrop:** Uses `h-[100svh]` sticky layer for hero background — correct approach for mobile address bar, but only covers the hero/backdrop, not all sections.
- **Section padding:** Inconsistent. Hero `pb-24 pt-40`, Services `px-6 py-28`, Team `px-6 py-28`, Gallery `px-6 py-24`, Contact `px-6 py-24`, Footer `px-6 py-16`. No unified vertical rhythm.
- **Viewport units:** Mix of `min-h-screen` (100vh, unreliable on mobile) and `100svh` (only in LandingBackdrop).

### Proposed Changes

**P1 — Scroll Snap System**
Add to global CSS:
```css
/* Mobile only: full-viewport section snapping */
@media (max-width: 1023px) {
  main#main-content {
    scroll-snap-type: y mandatory;
    overflow-y: auto;
    height: 100dvh;
  }

  main#main-content > section,
  main#main-content > [data-section] {
    scroll-snap-align: start;
    height: 100dvh;
    overflow: hidden;        /* prevents content bleed */
    display: flex;
    flex-direction: column;
    justify-content: center; /* vertically centers content */
  }
}
```
- Use `100dvh` (dynamic viewport height) — handles iOS Safari address bar correctly
- `scroll-snap-type: y mandatory` locks each section to full viewport
- `overflow: hidden` on sections prevents content bleeding into next viewport
- Only on `max-width: 1023px` (mobile/tablet) — desktop keeps natural scroll
- `justify-content: center` ensures content is vertically centered, not top-aligned with empty space below

**P2 — Unified Section Wrapper Component**
Create a `<SectionViewport>` wrapper that all landing sections use:
```tsx
<section
  data-section={id}
  className={cn(
    "relative flex flex-col justify-center overflow-hidden px-6",
    "lg:min-h-0 lg:overflow-visible lg:py-28", // desktop: natural flow
    // mobile: 100dvh handled by scroll-snap parent
  )}
>
  {children}
</section>
```
This enforces consistent structure without duplicating height/padding logic in every section.

---

## 2. Hero Section

**File:** `src/components/landing/Hero.tsx`

### Problems

| # | Issue | Severity | Detail |
|---|-------|----------|--------|
| H1 | **Title text too large** | Critical | `text-5xl` (48px) base, scales to `sm:text-7xl`. On a 375px viewport, 48px text with `leading-[1]` creates a 4+ line title that eats 60%+ of the viewport |
| H2 | **Subtitle + CTA spacing excessive** | High | `mb-8` (badge), `mb-6` (title), `mb-6` (divider), `mb-10` (subtitle) = 120px+ of vertical margins before CTAs even appear |
| H3 | **Stats bar overflow** | High | `grid-cols-2` stats bar adds ~120px of height below the main content. Combined with title + subtitle + CTAs, total content exceeds viewport |
| H4 | **Badge too tall** | Medium | Badge pill with stars + text + `py-2.5` + `mb-8` = ~52px consumed before title starts |
| H5 | **Two CTA buttons stack** | Medium | `flex-col gap-3` stacks both CTAs vertically = ~108px of buttons. Second CTA ("Explore Treatments") is already hidden for estética, which is good |
| H6 | **Background image parallax** | Low | `h-[115%]` overshoot is fine for desktop but on mobile the extra 15% image height is wasted memory. Could be `h-full` on mobile |

### Proposed Mobile Specs (< 640px)

```
Badge:          text-[10px], py-1.5 px-3, mb-4, gap-1.5, stars 10px
Title:          text-[clamp(28px,7vw,36px)], leading-[1.05], mb-3
Divider:        mb-3, w-16
Subtitle:       text-sm (14px), mb-6, max-w-[280px], leading-relaxed
CTA Primary:    text-sm, py-3, px-6, full-width
Stats Bar:      grid-cols-2, gap-px, text-[11px] labels, text-lg values, py-3 px-3
```

**Typography scale rationale:**
- Title at `clamp(28px, 7vw, 36px)` fits 3-4 words per line on 375px viewport
- 28px minimum ensures legibility; 36px maximum keeps proportion
- Stats values at `text-lg` (18px) are readable without dominating
- Total vertical budget: ~85% of viewport for content, ~15% for breathing room

**Layout changes:**
- Reduce all vertical margins by ~40% on mobile
- Stats bar: tighten to `py-3 px-3` per stat, `gap-px` between
- Consider moving stats bar inside the hero content flow (not absolute-positioned) to prevent overflow
- Badge: smaller, tighter — it's a nice detail but shouldn't consume 50px of precious vertical space

### Visual Budget (375 x 812 viewport, 100dvh)

```
Navbar:          ~68px (fixed, overlaps)
Badge:           ~32px
Title (3 lines): ~100px
Divider:         ~22px
Subtitle:        ~50px
CTA button:      ~48px
Stats bar:       ~80px
Bottom padding:  ~30px
─────────────────────────
Total:           ~430px of ~744px usable (812 - 68 navbar)
Breathing room:  ~314px (42%) — good
```

---

## 3. Services Section

**File:** `src/components/landing/Services.tsx`

### Problems

| # | Issue | Severity | Detail |
|---|-------|----------|--------|
| S1 | **Only 2 services visible by default** | Critical | Estética `nicheDefault = 2`. Liam wants 4 by default. But 4 full cards (image + text + duration) will NOT fit in 100dvh |
| S2 | **Cards too tall for viewport** | Critical | Each estética card has `aspect-[16/10]` image + `p-5` text + duration badge = ~220px per card. 4 cards = 880px + header = won't fit |
| S3 | **Section header spacing excessive** | High | `py-28` (112px top + bottom) + `mb-16` between header and grid = 240px consumed before first card |
| S4 | **Image aspect ratio too tall** | High | `aspect-[16/10]` = 62.5% of card width dedicated to image height. On full-width mobile cards, that's ~230px of image per card |
| S5 | **Title text oversized** | Medium | `text-4xl md:text-5xl` (36px) for section title is too large for 100dvh context |

### Proposed Solution: Compact Service Cards

**For 4 services in 100dvh on mobile, the cards must be compact:**

Option A — **Horizontal compact cards** (recommended for estética):
```
┌──────────────────────────────┐
│ [img 64x64] Title            │
│             Duration · Book  │
└──────────────────────────────┘
```
- Image: `w-16 h-16 rounded-xl object-cover` (64px square thumbnail)
- Title: `text-base font-medium` (16px)
- Duration badge: `text-xs` (12px)
- Card padding: `p-3` (12px)
- Card height: ~72px
- 4 cards + gaps: ~312px

Option B — **2x2 grid with small vertical cards**:
```
┌─────────┐ ┌─────────┐
│  [img]   │ │  [img]   │
│  Title   │ │  Title   │
│  Dur.    │ │  Dur.    │
└─────────┘ └─────────┘
```
- Image: `aspect-[4/3]` at ~50% width = ~110px tall
- Title: `text-sm font-medium` (14px), line-clamp-1
- Card height: ~165px
- 4 cards (2x2): ~340px + gap

**Recommended: Option A for estética** (clinical, list-based feel matches the niche). Option B can work for nails/barbería (more visual niches).

**Section header mobile:**
```
Eyebrow:     text-[10px], tracking-[0.25em], mb-1.5
Title:       text-[clamp(22px,5.5vw,28px)], mb-2
Subtitle:    text-xs (12px), max-w-[240px], mb-4
```

**Visual Budget (100dvh):**
```
Section header:    ~80px
4 compact cards:   ~312px (Option A) or ~350px (Option B)
"See all" CTA:     ~44px
Breathing room:    ~308px (41%) or ~270px (36%)
─────────────────────────
Total:             ~436-474px of ~744px usable
```

**Config change:** Update `nicheDefault` from 2 to 4 for estética in preset.

**Important:** The layout must still look harmonious with only 2 services (client may have fewer). With Option A, 2 cards would leave ~600px of space — add a subtle illustration or let the section be shorter (not full 100dvh when content is sparse, use `min-height` instead of fixed height).

---

## 4. Navbar

**File:** `src/components/layout/Navbar.tsx`

### Problems

| # | Issue | Severity | Detail |
|---|-------|----------|--------|
| N1 | **Too many elements in mobile top bar** | High | Language switcher + Theme toggle + Hamburger = 3 buttons. Liam wants: logo + language + hamburger only. Sections should be inside hamburger, not in top bar |
| N2 | **Theme toggle visible on mobile** | Medium | Per Liam's feedback, theme toggle should move inside hamburger menu or be removed from mobile entirely |
| N3 | **Section links in hamburger work fine** | OK | Current hamburger menu content is correct — sections + CTA at bottom |

### Proposed Changes

**Mobile top bar (< 1024px):**
```
┌────────────────────────────────┐
│ [Logo]        [Lang] [☰]      │
└────────────────────────────────┘
```
- Remove `<ThemeToggle />` from mobile action bar
- Keep only: `<LanguageSwitcher />` + hamburger button
- Move ThemeToggle inside the hamburger menu (below section links, above CTA)

**Inside hamburger menu:**
```
┌────────────────────────────────┐
│ Services                       │
│ Team                           │
│ Gallery                        │
│ Testimonials                   │
│ Contact                        │
│ ──────────────────             │
│ [☀/☾] Theme Toggle             │
│ ──────────────────             │
│ [📅 Book Consultation]         │
└────────────────────────────────┘
```

**Implementation:**
- In the mobile action bar div (`lg:hidden`), remove `<ThemeToggle />`
- In the mobile menu panel, add `<ThemeToggle />` between the nav links and the CTA divider
- No structural changes needed — just moving the component

---

## 5. Team Section

**File:** `src/components/landing/Team.tsx`

### Problems

| # | Issue | Severity | Detail |
|---|-------|----------|--------|
| T1 | **Cards too tall on mobile** | High | Each card: `aspect-[3/4]` portrait image (~300px at full width) + `p-6` body (~140px) = ~440px per card. 3 staff = 1320px + header = massive vertical scroll |
| T2 | **Full-width cards waste space** | High | `grid-cols-1` on mobile means each card is 100% viewport width. Portrait images at full width are absurdly tall |
| T3 | **Header spacing excessive** | Medium | `mb-20` between header and grid = 80px consumed |
| T4 | **Bio text 3-line clamp** | Low | `line-clamp-3` is appropriate but adds to card height |

### Proposed Solution: Horizontal Scroll

**For team in 100dvh, switch to horizontal scroll carousel on mobile:**
```
┌──────────────────────────────┐
│  Header (title + subtitle)    │
│                               │
│  ┌────────┐ ┌────────┐ ┌──   │
│  │ photo  │ │ photo  │ │     │
│  │        │ │        │ │     │
│  │ Name   │ │ Name   │ │     │
│  │ Role   │ │ Role   │ │     │
│  └────────┘ └────────┘ └──   │
│            ● ○ ○              │
└──────────────────────────────┘
```

**Specs:**
```
Card width:       w-[240px] or w-[65vw]
Image:            aspect-[3/4], h-[200px], object-cover
Card body:        p-4
Name:             text-base font-medium (16px)
Specialty:        text-xs (12px)
Bio:              hidden on mobile (or line-clamp-2 text-xs)
Social icons:     hidden on mobile
Container:        flex overflow-x-auto snap-x snap-mandatory gap-4 pb-4
Each card:        shrink-0 snap-center
```

**Visual Budget:**
```
Section header:    ~70px
Card area:         ~340px (200px image + 100px body + 40px gap/scroll)
Scroll indicators: ~20px
Breathing room:    ~314px (42%)
```

**Liam noted:** Estética team section already works better — likely because estética has fewer staff or solo mode. The fix is for multi-staff layouts across all nichos.

**Alternative for solo mode:** Already has 2-column grid (`lg:grid-cols-2`). On mobile, stack with smaller image:
- Image: `aspect-[4/3]` instead of `aspect-[3/4]`, max-height 200px
- Body text: same but with less margin

---

## 6. Gallery Section

**File:** `src/components/landing/Gallery.tsx`

### Problems

| # | Issue | Severity | Detail |
|---|-------|----------|--------|
| G1 | **Grid doesn't fit 100dvh** | High | 6 images in `grid-cols-2` = 3 rows. With `aspect-[4/3]` per image at ~50% width = ~100px tall each. 3 rows + gaps + header ≈ 450px — this actually fits but leaves little room for the header |
| G2 | **No masonry variant in default renderer** | Medium | Default estética uses `aspect-[4/3]` even grid. Masonry only exists in the tattoo renderer. Liam prefers masonry |
| G3 | **Gallery variants exist but not wired** | Low | `gallery-bento-stats.tsx`, `gallery-grid-with-filters.tsx`, `gallery-portrait-bento-3d-cameo.tsx` exist but require config flags |

### Proposed Solution

**For 100dvh, the 2x3 grid with compact images works:**
```
┌──────────────────────────────┐
│  Gallery header               │
│                               │
│  ┌──────┐ ┌──────┐           │
│  │ img1 │ │ img2 │           │
│  └──────┘ └──────┘           │
│  ┌──────┐ ┌──────┐           │
│  │ img3 │ │ img4 │           │
│  └──────┘ └──────┘           │
│  ┌──────┐ ┌──────┐           │
│  │ img5 │ │ img6 │           │
│  └──────┘ └──────┘           │
│      [View full gallery]      │
└──────────────────────────────┘
```

**Masonry variant for estética:**
- Add masonry layout to the default gallery renderer (not just tattoo)
- Alternate `aspect-[3/4]` and `aspect-square` for visual variety
- Pattern: tall, square, square, tall, square, square (repeating)

**Specs:**
```
Header:       text-[clamp(22px,5.5vw,28px)], mb-4
Grid:         grid-cols-2, gap-2
Images:       mix of aspect-[3/4] and aspect-square
              rounded-xl (estética clinical radius)
              max 6 images on mobile
CTA:          text-xs, mt-4, centered
```

**Visual Budget:**
```
Section header:    ~60px
6 images (2x3):    ~420px (mix of heights)
CTA link:          ~30px
Breathing room:    ~234px (31%)
```

---

## 7. Testimonials Section

**File:** `src/components/landing/Testimonials.tsx`

### Problems

| # | Issue | Severity | Detail |
|---|-------|----------|--------|
| R1 | **Grid mode (≤3) doesn't fit 100dvh** | High | 3 cards stacked vertically: each ~200px (quote + avatar + stars) + header = 700px+ |
| R2 | **Carousel cards too wide** | Medium | `w-[320px]` snap cards work OK but could be tighter |
| R3 | **Quote text too large** | Medium | `text-lg` (18px) italic serif for quote body is generous for mobile |

### Proposed Solution

**Always use horizontal carousel on mobile (even for ≤3 items):**
```
┌──────────────────────────────┐
│  Section header + rating      │
│                               │
│  ┌─────────────────────────┐  │
│  │ ★★★★★                   │  │
│  │ "Quote text here..."    │  │
│  │ ─────────               │  │
│  │ [AV] Name · Title       │  │
│  └─────────────────────────┘  │
│         ← ● ○ ○ →            │
└──────────────────────────────┘
```

**Specs:**
```
Card width:      w-[calc(100vw-48px)] (full width minus padding)
Card padding:    p-4
Stars:           12px, gap-0.5, mb-3
Quote:           text-sm (14px), font-serif, italic, line-clamp-4, mb-4
Divider:         mb-3
Avatar:          h-8 w-8 (32px)
Name:            text-sm font-medium
Title:           text-[11px]
Big quote mark:  text-[60px] (reduced from 80px)
```

**Visual Budget:**
```
Section header:    ~70px (title + rating badge)
Card area:         ~250px
Nav dots:          ~30px
Breathing room:    ~394px (53%) — generous, can increase card height if needed
```

---

## 8. WhyChooseUs Section

**File:** `src/components/landing/WhyChooseUs.tsx`

### Problems

| # | Issue | Severity | Detail |
|---|-------|----------|--------|
| W1 | **Image + content grid overflows** | High | On mobile: portrait image (`aspect-[4/5]`) + 4 benefit cards + heading = way over 100dvh |
| W2 | **Benefits grid single column** | Medium | `grid-cols-1` on mobile stacks 4 benefit cards vertically = ~400px of cards alone |
| W3 | **Estética has compact teaser variant** | Info | Already uses a different layout (4-col, no image, centered). Less problematic |

### Proposed Solution (Estética Teaser)

The estética variant is already more compact. Adjust for 100dvh:

```
Section header:    text-[clamp(22px,5.5vw,28px)], mb-4
Benefits:          grid-cols-2, gap-3 (2x2 grid on mobile)
Each benefit:      icon (20px) + title (14px) + description (12px, line-clamp-2)
                   p-3 text-center
```

**For other niches (image + benefits layout):**
- Hide image on mobile OR reduce to `aspect-[16/9]` max-h-[180px]
- Benefits: 2x2 grid instead of single column
- Each benefit card: compact `p-3` with smaller icon

**Visual Budget (estética teaser):**
```
Section header:    ~70px
4 benefits (2x2):  ~260px
Breathing room:    ~414px (56%)
```

---

## 9. ContactHub Section

**File:** `src/components/landing/ContactHub.tsx`

### Problems

| # | Issue | Severity | Detail |
|---|-------|----------|--------|
| C1 | **Three stacked columns overflow** | High | Form + Hours + Map in single column on mobile = 800px+ |
| C2 | **Form fields consume space** | Medium | Name + Email + Phone + Message (4 rows) + Submit button = ~350px |
| C3 | **Map aspect ratio too tall** | Medium | `aspect-[16/10]` = ~220px map on mobile |

### Proposed Solution

**For 100dvh, show only the essentials:**
- Default mobile view: CTA + essential contact info only
- Full form accessible via "Send Message" button that expands or navigates

**Compact contact layout:**
```
┌──────────────────────────────┐
│  Get In Touch                 │
│                               │
│  📍 Address line              │
│  📞 Phone number              │
│  📧 Email                     │
│  🕐 Today: 9am - 7pm         │
│                               │
│  [Send us a message →]        │
│  [Book Appointment]           │
│                               │
│  ┌────────────────────────┐   │
│  │      Mini Map          │   │
│  └────────────────────────┘   │
└──────────────────────────────┘
```

**Specs:**
```
Header:          text-[clamp(22px,5.5vw,28px)], mb-4
Contact items:   flex items-center gap-3, text-sm, py-2
Today hours:     highlighted with accent color
CTA buttons:     full-width, py-3, text-sm
Mini map:        aspect-[16/7], rounded-xl, max-h-[120px]
```

**Visual Budget:**
```
Section header:    ~60px
Contact info:      ~160px (4 items)
CTA buttons:       ~100px (2 buttons + gap)
Mini map:          ~120px
Breathing room:    ~304px (41%)
```

---

## 10. Instagram Feed Section

**File:** `src/components/landing/InstagramFeed.tsx`

### Current State
- `grid-cols-3` with 6 square images
- Already compact: 3x2 grid + header ≈ fits in viewport
- Subtle rotations add character

### Proposed Adjustments

Minimal changes needed. Tighten spacing:
```
Header:       text-[10px] tracking-[0.2em], mb-6
Grid:         grid-cols-3 gap-2
Images:       aspect-square, rounded-lg
CTA:          mt-4, text-[11px]
```

**This section is one of the best for mobile already.** The 3-column square grid naturally fits 100dvh.

---

## 11. Footer

**File:** `src/components/layout/Footer.tsx`

### Decision

The footer is NOT a full-viewport section. It should be a compact strip after the last snapped section. On mobile, scroll-snap should release after the last content section, allowing the footer to scroll naturally.

**Proposed:**
- Footer stays outside the scroll-snap system
- Compact mobile footer: logo + social icons + legal text
- Full 3-column footer only on desktop

---

## 12. Floating Elements (Critical)

### Chatbot Button (`src/components/chat/Chatbot.tsx`)

**Problem:** `fixed bottom-24 end-6 z-50` — sits at 96px from bottom.
**ScrollToTop:** `fixed bottom-6 end-6 z-40` — sits at 24px from bottom.

**Combined problem:** Both buttons stack vertically in bottom-right corner. Chatbot covers interactive content. Modal fills 95% of mobile screen.

### Proposed Solution

**Reposition both buttons:**
```
ScrollToTop:   fixed bottom-4 end-4 z-40 h-10 w-10 (40px, smaller)
Chatbot:       fixed bottom-4 end-16 z-50 h-12 w-12 (48px)
```

**Side-by-side instead of stacked:**
```
┌──────────────────────────────┐
│                               │
│        [content]              │
│                               │
│              [💬] [↑]         │
└──────────────────────────────┘
```

- Both on the same row, bottom-4 (16px from bottom)
- Chatbot on the left (`end-16`), ScrollToTop on the right (`end-4`)
- Reduces vertical obstruction significantly
- Consider adding `pb-safe` (env(safe-area-inset-bottom)) for notched phones

**Chatbot modal on mobile:**
- Change from `h-[calc(100vh-5rem)]` to `h-[70dvh]` max
- Or use a bottom sheet pattern: slides up from bottom, 60% of viewport, can be dragged to expand

**Safe area insets:**
```css
.fixed-bottom-safe {
  bottom: max(16px, env(safe-area-inset-bottom));
}
```

---

## 13. Typography Scale Proposal

### Current vs Proposed (Mobile < 640px)

| Element | Current | Proposed | Rationale |
|---------|---------|----------|-----------|
| Hero title | `text-5xl` (48px) | `clamp(28px, 7vw, 36px)` | Fits 3-4 words/line on 375px |
| Section title | `text-4xl` (36px) | `clamp(22px, 5.5vw, 28px)` | Proportional to hero |
| Section subtitle/eyebrow | `text-xs` (12px) | `text-[10px]` | Tighter eyebrow |
| Card title | `text-xl` (20px) | `text-base` (16px) | Space-efficient |
| Body text | `text-sm` (14px) | `text-sm` (14px) | No change — already right |
| Button text | `text-base` (16px) | `text-sm` (14px) | Compact CTAs |
| Labels/badges | `text-xs` (12px) | `text-[11px]` | Slightly tighter |
| Stats values | `text-2xl` (24px) | `text-lg` (18px) | Readable, not dominant |

### Hebrew/Arabic Typography

**Problem:** When `dir="rtl"` is set and language is Hebrew, if no explicit Hebrew font is loaded, the browser falls back to system fonts (Arial Hebrew, Tahoma). These have different metrics than the Latin fonts, causing:
- Line height mismatches
- Letter spacing looking wrong (Hebrew doesn't benefit from tracking)
- Weight rendering differences

**Proposed solution:**
1. Add `Heebo` (Hebrew-optimized sans-serif) as fallback for sans in RTL
2. Add `Frank Ruhl Libre` as fallback for serif headings in RTL
3. Reduce `letter-spacing` to `0` or `0.01em` max for Hebrew (wide tracking looks broken in Hebrew)

```css
html[dir="rtl"] {
  --font-sans: "Heebo", "DM Sans", system-ui, sans-serif;
  --font-serif: "Frank Ruhl Libre", "Cormorant Garamond", serif;
  letter-spacing: 0;
}

html[dir="rtl"] h1,
html[dir="rtl"] h2 {
  letter-spacing: 0.01em; /* minimal, not the 0.04em used for Latin */
}
```

4. Add Google Fonts import for Heebo + Frank Ruhl Libre when RTL is active

---

## 14. i18n Text Overflow

### Problem
When switching languages (EN → HE → RU), text length varies significantly. Russian translations are typically 20-40% longer than English. Hebrew is similar length but renders differently due to RTL.

### Proposed Solutions

1. **Fluid typography with `clamp()`** — already partially in use, extend to all headings
2. **`line-clamp` on all card descriptions** — prevent text overflow breaking card heights
3. **`overflow-wrap: break-word`** on all text containers — prevent horizontal overflow
4. **Test with longest translation** — set Russian as default during development to catch overflow early
5. **Truncation utilities:**
```css
.text-balanced {
  text-wrap: balance; /* modern CSS, distributes text evenly across lines */
}
```

---

## 15. Contrast & Legibility

### Estética Light Mode

| Element | Foreground | Background | Contrast Ratio | WCAG AA |
|---------|-----------|------------|----------------|---------|
| Body text | #1c1917 | #faf9f7 | 15.5:1 | Pass |
| Muted text | #78716c | #faf9f7 | 4.2:1 | Pass (barely) |
| Accent on bg | #b08d79 | #faf9f7 | 3.1:1 | **FAIL** |
| Accent on card | #b08d79 | #ffffff | 3.3:1 | **FAIL** |
| Eyebrow labels | #d4b5a5 | #faf9f7 | 1.9:1 | **FAIL** |

**Critical:** The accent color `#b08d79` (sandstone) fails WCAG AA contrast against both the background and white cards. The accent-light `#d4b5a5` is even worse.

**Fix:** The sandstone accent works for decorative elements (borders, icons) but NOT for text. Proposal:
- **Interactive text (links, CTAs):** Use `#8a6b5a` (darker sandstone, ~5.2:1 contrast)
- **Eyebrow labels:** Use `#78716c` (muted-foreground) instead of accent-light
- **Buttons:** Keep accent as bg-color (text is white/dark, which has sufficient contrast)
- **Never use accent-light (#d4b5a5) as text color on light backgrounds**

---

## 16. Dark Mode Issues

### Estética Dark Mode

- Background `#141210` with foreground `#f0ebe6` = 14.8:1 contrast — excellent
- Accent `#c9a898` on `#141210` = 6.2:1 — good
- Card `#1e1a17` on background `#141210` = 1.3:1 — **too subtle**, cards barely differentiate from background

**Fix:** Increase card background brightness:
- Current: `#1e1a17` → Proposed: `#252018` (slightly brighter, maintains warm tone)
- Or add subtle border: `border-border/30` default on all cards in dark mode

### Other Niches (Dark-Default)
- Barbería and tattoo start in dark mode — these need the same card/background differentiation audit
- Tattoo is the most extreme (near-black everything) — relies on borders, which is intentional per DESIGN.md

---

## 17. Animation Additions

Liam mentioned animations could be **added**, not reduced. Proposals:

1. **Section entrance:** Subtle `clipPath` reveal (wipe from bottom) as sections snap into view
2. **Service card hover:** Add `scale(1.02)` + slight shadow lift on touch (currently hover-only with `group-hover`)
3. **Gallery image tap:** Brief `scale(0.97)` feedback on tap
4. **Stats counter:** Animate numbers counting up when hero enters viewport
5. **Testimonial card:** Subtle parallax on the big quotation mark (moves slower than card scroll)

All animations should use the existing `clinical` easing `[0.4, 0, 0.2, 1]` for estética.

---

## 18. Implementation Priority

### Phase 1 — Structural (1-2 days)
1. Add scroll-snap CSS for mobile
2. Create `<SectionViewport>` wrapper
3. Resize hero typography + spacing
4. Fix floating buttons positioning (chatbot + scroll-to-top)
5. Move ThemeToggle inside hamburger on mobile

### Phase 2 — Section Content (2-3 days)
6. Redesign service cards for 100dvh (compact layout)
7. Team section → horizontal carousel on mobile
8. Testimonials → always carousel on mobile
9. ContactHub → compact contact layout
10. WhyChooseUs → tighter 2x2 benefits grid
11. Update `nicheDefault` services count to 4

### Phase 3 — Polish (1-2 days)
12. Hebrew/Arabic typography fixes
13. i18n overflow prevention
14. Contrast fixes (accent text colors)
15. Dark mode card differentiation
16. Additional animations
17. Gallery masonry variant for estética

### Phase 4 — Replicate (1 day)
18. Apply changes to barbería, tattoo, nails, remodelaciones
19. Test all 5 nichos × 3 themes × 2 modes × 3 languages = 90 visual states

---

## Appendix: Section Height Budget Summary (375 x 812, navbar 68px)

| Section | Usable Height | Content Height | Breathing Room |
|---------|--------------|----------------|----------------|
| Hero | 744px | ~430px | 42% |
| Services (4 items) | 744px | ~436px | 41% |
| Team (carousel) | 744px | ~430px | 42% |
| Gallery (2x3) | 744px | ~510px | 31% |
| Testimonials | 744px | ~350px | 53% |
| WhyChooseUs | 744px | ~330px | 56% |
| ContactHub | 744px | ~440px | 41% |
| Instagram | 744px | ~380px | 49% |
| Footer | natural height | ~300px | n/a |

Target: 30-55% breathing room per section. Below 25% feels cramped; above 60% feels empty.
