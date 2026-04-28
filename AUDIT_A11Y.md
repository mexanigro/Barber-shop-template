# Accessibility Audit — Nichos Barber-Shop Template

**Date:** 2026-04-26
**Scope:** All interactive flows (landing, booking, gallery, chatbot, admin, legal), 5 niche variants × light/dark, RTL (Hebrew), motion.
**Standard:** WCAG 2.1 Level AA + Anthropic Design tokens (source of truth for visual system); Impeccable / ui-ux-pro-max for checklist patterns.

---

## Checklist — Pass / Fail / N/A

### 1. Keyboard Navigation

| Check | Status | Notes |
|---|---|---|
| Tab order follows visual order on landing | **Pass** | Natural DOM flow; nav → hero CTAs → sections → footer |
| Tab order in BookingWizard steps | **Pass** | Single-column form, logical top-to-bottom |
| Escape closes Gallery lightbox | **Pass** | `GalleryPage.tsx:31` — keydown listener |
| Escape closes Booking overlay | **FAIL** | No keydown listener for Escape on booking modal (`App.tsx:246-266`) |
| Escape closes Chatbot panel | **FAIL** | No Escape handler in `Chatbot.tsx` |
| Escape closes PolicyModal | **FAIL** | No keydown Escape in `PolicyModal.tsx` |
| Escape closes mobile nav | **FAIL** | No Escape handler in `Navbar.tsx` mobile menu |
| No focus traps (positive — user can tab out) | **Pass** | No `focus-trap` library used; overlays rely on click-outside |
| Focus moves into modal when opened | **FAIL** | BookingWizard, Chatbot, PolicyModal: no `autoFocus` or focus management on open. Focus stays behind overlay. |
| Focus returns to trigger on modal close | **FAIL** | None of the modals (Booking, Chat, PolicyModal, Lightbox) restore focus to the trigger element |
| Gallery lightbox arrow key navigation | **Pass** | Left/Right arrow keys handled (`GalleryPage.tsx:28-30`) |
| Calendar keyboard operability | **Pass** | Day buttons are `<button>` elements with `focus-visible` ring |
| Skip-to-content link | **FAIL** | No skip navigation link in `Navbar.tsx` or `App.tsx` |
| Service cards as clickable divs | **FAIL** | `Services.tsx:101-113` — entire `motion.div` has `onClick` but no `role="button"` / `tabIndex` / `onKeyDown` → not keyboard-reachable |

### 2. Focus Indicators

| Check | Status | Notes |
|---|---|---|
| Form inputs show focus ring | **Pass** | `focus:ring-2 focus:ring-primary/20` on QuickInquiry; `focus:ring-2 focus:ring-primary/30` on BookingWizard |
| Calendar buttons focus-visible | **Pass** | `focus-visible:ring-2 focus-visible:ring-primary/35` |
| Navbar desktop links focus ring | **FAIL** | `<a>` and `<button>` nav links have no `focus-visible` styles — only hover |
| Navbar brand link focus ring | **FAIL** | `outline-none` with no replacement ring (`Navbar.tsx:113`) |
| Footer brand button focus ring | **FAIL** | `outline-none` with no replacement ring (`Footer.tsx:107`) |
| CTA buttons (Hero, Footer, Services) | **FAIL** | Primary CTAs lack `focus-visible` ring; rely on browser default which is suppressed by some resets |
| Chatbot open/close/send buttons | **Pass** | `aria-label` present; button elements are natively focusable |
| ScrollToTop button | **Pass** | `<button>` with `aria-label` |
| ThemeToggle button | **Pass** | `<button>` with `aria-label` |

### 3. ARIA / Roles / Landmarks

| Check | Status | Notes |
|---|---|---|
| `<nav>` landmark for Navbar | **Pass** | `Navbar.tsx:97` uses `<nav>` element |
| `<main>` landmark | **Pass** | `App.tsx` wraps content in `<main>` |
| `<footer>` landmark | **Pass** | `Footer.tsx:73` uses `<footer>` element |
| `role="dialog"` on SplashScreen | **Pass** | `SplashScreen.tsx:59-61` has `role="dialog" aria-modal="true" aria-label` |
| `role="dialog"` on Booking overlay | **FAIL** | `App.tsx:247-264` booking modal has no `role="dialog"` or `aria-modal` |
| `role="dialog"` on Chatbot panel | **FAIL** | `Chatbot.tsx:108-213` has no dialog role |
| `role="dialog"` on PolicyModal | **FAIL** | `PolicyModal.tsx:16` has no dialog role |
| `role="dialog"` on Gallery lightbox | **FAIL** | `GalleryPage.tsx:131` — no dialog role on lightbox overlay |
| Icon-only buttons have `aria-label` | **Pass** | ScrollToTop, ThemeToggle, Chat open/close/send, Nav toggle, Gallery prev/next/close — all have `aria-label` from `localeConfig.a11y.*` |
| Footer social links have `aria-label` | **Pass** | Instagram, Facebook, Twitter links all have `aria-label` (`Footer.tsx:122,133,144`) |
| QuickInquiry social links `aria-label` | **FAIL** | Instagram/Twitter icons in `QuickInquiry.tsx:105,116` — no `aria-label` |
| `aria-live` region for form success/error | **FAIL** | QuickInquiry success/error toasts (`QuickInquiry.tsx:204-236`) not announced: no `aria-live` or `role="alert"` |
| `aria-live` for chat messages | **FAIL** | New bot messages in `Chatbot.tsx` not announced to screen readers |
| `aria-live` for booking step transitions | **FAIL** | Step changes in BookingWizard not announced |
| `aria-current="page"` on active nav | **FAIL** | Active nav link uses visual style only; no `aria-current` |
| `aria-expanded` on mobile menu toggle | **FAIL** | `Navbar.tsx:176-209` hamburger button lacks `aria-expanded={isOpen}` |
| Form inputs linked to errors | **FAIL** | No `aria-describedby` linking inputs to error messages in QuickInquiry or BookingWizard |
| `aria-hidden` on decorative elements | **Pass** | Hero overlays, SplashScreen decorative parts all use `aria-hidden` |

### 4. Contrast (by Niche × Theme)

| Niche | Theme | Risk Areas | Status |
|---|---|---|---|
| **barberia** | light | `--muted-foreground: #71717a` on `--background: #fafafa` → 4.7:1 ✓ | **Pass** |
| **barberia** | dark | `--muted-foreground: #a1a1aa` on `--background: #09090b` → 5.7:1 ✓ | **Pass** |
| **barberia** | both | `--brand-accent-light: #f59e0b` (amber) on white → 2.9:1 | **FAIL** — accent-light text on white backgrounds (eyebrow labels, section titles) fails 4.5:1 |
| **tattoo** | light | `--brand-accent-light: #1a1a1a` on `#f5f5f5` → ~12:1 ✓ | **Pass** |
| **tattoo** | dark | `--brand-accent-light: #ffffff` on `#050505` → 21:1 ✓ | **Pass** |
| **nails** | light | `--brand-accent-light: #edc2c9` on `--background: #faf8f6` → ~1.4:1 | **FAIL** — very poor contrast for eyebrow/accent text |
| **nails** | light | `--primary: #e8b6bf` on `--primary-foreground: #1a1218` → ~4.8:1 ✓ CTA buttons OK | **Pass** |
| **nails** | dark | `--brand-accent-light: #f5d6db` on `--background: #1b1216` → ~8.6:1 ✓ | **Pass** |
| **nails** | dark | `--muted-foreground: #c1a4aa` on `--card: #24171c` → ~4.8:1 ✓ | **Pass** |
| **estetica** | — | Uses barberia tokens (default). Same findings as barberia. | See above |
| **abogado** | — | Uses barberia tokens (default). Same findings as barberia. | See above |
| All | hero | White text on background image — relies on dark overlay gradients | **Pass** — multiple gradient layers (`from-black/60`) ensure legibility |
| All | hero | `text-white/55` for stat labels (Hero.tsx:207) → effective opacity ~0.55 on dark → ~5.5:1 | **Pass** (borderline) |
| All | hero | `text-white/40` for scroll hint (Hero.tsx:222) → ~3.4:1 on dark | **FAIL** — decorative but carries text content "Scroll" |

### 5. RTL (Hebrew builds)

| Check | Status | Notes |
|---|---|---|
| `dir="rtl"` applied to `<html>` | **Pass** | `main.tsx:15` sets `document.documentElement.dir = localeConfig.dir` |
| `lang="he"` set on `<html>` | **Pass** | `main.tsx:14` sets `document.documentElement.lang` dynamically |
| `index.html` hardcodes `lang="en"` | **FAIL** (minor) | Flash of wrong `lang` attribute until JS hydrates. Mitigated by being build-time correctable. |
| Physical `left-*`/`right-*` positions | **FAIL** | Multiple components use physical `left-*`/`right-*`/`pl-*`/`pr-*` instead of logical `start-*`/`end-*`/`ps-*`/`pe-*`. Key offenders: Chatbot FAB (`right-6`), ScrollToTop (`right-6`), Navbar brand logo, Gallery lightbox arrows (`left-4`/`right-4`), Hero scroll hint (`right-8`), Service price badges (`right-4`), absolute positioned icons across all components. |
| `text-left` / `text-right` on admin tables | **FAIL** | `AdminDashboard.tsx:382` uses `text-left`; should be `text-start` |
| Chat `ml-auto`/`mr-auto` for message alignment | **Pass** | Flex alignment with `ml-auto` is direction-aware in modern browsers when parent has proper dir |
| Chat panel fixed position `right-6` | **FAIL** | Panel and FAB positioned with physical `right-6 bottom-24` — in RTL should be `left-6` (or use `end-6`) |
| `[writing-mode:vertical-rl]` scroll hint | **N/A** | Vertical text is orientation-independent |
| `translate-x` transforms | **Pass** | CSS transforms are not affected by `dir`; visual intent preserved |
| Chevron/Arrow icon directions | **FAIL** | `ChevronRight` icon in Service cards and CTAs points right in both LTR and RTL. In RTL, "forward" should point left. Same for `ArrowRight` in Gallery/Footer CTAs. Should flip via `rtl:rotate-180` or use logical icons. |
| Calendar weekday order | **Pass** | Hebrew config starts week on Sunday (index 0), correct for IL locale |
| `rounded-tr-sm` on chat user bubble | **FAIL** | `Chatbot.tsx:160` uses `rounded-tr-sm` — physical corner, should be `rounded-te-sm` (Tailwind v4 logical) or use `rtl:rounded-tl-sm rtl:rounded-tr-2xl` |

### 6. Motion / `prefers-reduced-motion`

| Check | Status | Notes |
|---|---|---|
| Framer Motion animations throughout | **FAIL** | Extensive use of `motion.div`, `motion.h1`, `motion.p` with `initial`/`animate`/`whileInView` across Hero, Services, Gallery, WhyChooseUs, Testimonials, Navbar, SplashScreen — **none** respect `prefers-reduced-motion` |
| `animate-spin` on RouteLoader | **FAIL** | Tailwind `animate-spin` does not auto-disable under `prefers-reduced-motion` unless configured |
| `animate-bounce` on ScrollToTop arrow | **FAIL** | Same issue |
| `animate-bounce` on chat loading dots | **FAIL** | `Chatbot.tsx:181-183` |
| SplashScreen letter stagger animation | **FAIL** | Runs unconditionally for full `durationMs`; users with vestibular sensitivity cannot skip or reduce |
| `scroll-behavior: smooth` in CSS | **FAIL** | `index.css:165` sets `scroll-behavior: smooth` globally without `@media (prefers-reduced-motion: no-preference)` guard |
| Gallery hover `scale` transforms | **Pass** | Subtle scale (1.03-1.05) on hover is acceptable and not auto-playing |

---

## Top 10 Prioritized Fixes

### 1. [CRITICAL] Add `prefers-reduced-motion` global guard
**Files:** `src/index.css`, potentially `src/App.tsx`
**What:** Wrap `scroll-behavior: smooth` in `@media (prefers-reduced-motion: no-preference)`. Add a global Framer Motion config that reads the media query and disables/reduces animations. Tailwind `animate-*` classes need `motion-safe:` prefix or a CSS `@media` override.
**WCAG:** 2.3.3 Animation from Interactions

### 2. [CRITICAL] Escape key closes all overlays
**Files:** `src/App.tsx` (BookingWizard overlay), `src/components/chat/Chatbot.tsx`, `src/components/shared/PolicyModal.tsx`, `src/components/layout/Navbar.tsx`
**What:** Add `useEffect` keydown listener for `Escape` on each overlay/modal. Mobile nav should also close on Escape.
**WCAG:** 2.1.1 Keyboard

### 3. [CRITICAL] Focus management on modal open/close
**Files:** `src/App.tsx`, `src/components/chat/Chatbot.tsx`, `src/components/shared/PolicyModal.tsx`, `src/components/gallery/GalleryPage.tsx`
**What:** On open: move focus to first interactive element or the modal container with `tabIndex={-1}`. On close: return focus to the trigger element. Use `useRef` to track the trigger.
**WCAG:** 2.4.3 Focus Order

### 4. [CRITICAL] `role="dialog"` + `aria-modal` on all overlays
**Files:** `src/App.tsx` (booking), `src/components/chat/Chatbot.tsx`, `src/components/shared/PolicyModal.tsx`, `src/components/gallery/GalleryPage.tsx`
**What:** Add `role="dialog" aria-modal="true" aria-label="..."` to each overlay container. Use localized labels from `localeConfig`.
**WCAG:** 4.1.2 Name, Role, Value

### 5. [HIGH] Fix accent-light contrast — barberia + nails light
**Files:** `src/index.css`
**What:** `--brand-accent-light: #f59e0b` (barberia) fails 4.5:1 on white. Darken to `#d97706` (the existing `--brand-accent`) for text usage, or use `text-accent` (darker token) for small text and keep `text-accent-light` for large headings (3:1 threshold). For nails light, `--brand-accent-light: #edc2c9` is 1.4:1 — completely unusable for text. Create a separate `--accent-text` token at `#b5838c` (~4.5:1 on `#faf8f6`) for text usage, keep lighter pink for decorative fills.
**WCAG:** 1.4.3 Contrast (Minimum)
**Anthropic Design conflict note:** Anthropic tokens use a separate `text-*` semantic layer for contrast-safe text colors vs `bg-*` fills — same pattern recommended here.

### 6. [HIGH] Service cards keyboard accessibility
**Files:** `src/components/landing/Services.tsx`
**What:** `motion.div` with `onClick` is not keyboard-reachable. Add `role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && onBookClick()}` when booking is enabled. Or refactor to `<button>` / `<a>`.
**WCAG:** 2.1.1 Keyboard

### 7. [HIGH] `aria-expanded` on Navbar mobile toggle
**Files:** `src/components/layout/Navbar.tsx`
**What:** Add `aria-expanded={isOpen}` to the hamburger button (line 176). Minor but critical for screen reader users to know menu state.
**WCAG:** 4.1.2 Name, Role, Value

### 8. [HIGH] `aria-live` regions for dynamic content
**Files:** `src/components/landing/QuickInquiry.tsx`, `src/components/chat/Chatbot.tsx`, `src/components/booking/BookingWizard.tsx`
**What:** QuickInquiry success/error messages: wrap in `aria-live="polite"` or add `role="alert"` to error. Chat: add `aria-live="polite"` on the messages container. Booking: announce step changes via a visually-hidden live region.
**WCAG:** 4.1.3 Status Messages

### 9. [MEDIUM] RTL physical properties → logical
**Files:** Multiple — `Chatbot.tsx`, `ScrollToTop.tsx`, `Navbar.tsx`, `GalleryPage.tsx`, `Hero.tsx`, `Services.tsx`, `AdminDashboard.tsx`
**What:** Replace `left-*`/`right-*` with `start-*`/`end-*`, `pl-*`/`pr-*` with `ps-*`/`pe-*`, `ml-*`/`mr-*` with `ms-*`/`me-*`, `text-left`/`text-right` with `text-start`/`text-end`. For fixed-position elements (Chat FAB, ScrollToTop), use `end-6` instead of `right-6`. For `rounded-tr-sm`, use `rounded-se-sm` (Tailwind v4 logical border-radius).
**Note:** This is a broad refactor. Prioritize user-facing components (Chatbot, Navbar, Gallery) over admin (English-only admin is lower RTL priority).

### 10. [MEDIUM] Skip-to-content link + visible focus rings on nav/CTA
**Files:** `src/App.tsx` or `src/components/layout/Navbar.tsx`, multiple CTA buttons
**What:** Add a visually-hidden-until-focused skip link as first child of `<body>` or `App`: `<a href="#main-content" class="sr-only focus:not-sr-only ...">Skip to content</a>`. Add `id="main-content"` to `<main>`. For nav links and CTA buttons: replace bare `outline-none` with `outline-none focus-visible:ring-2 focus-visible:ring-primary/50` so keyboard users see focus state. Navbar brand link and Footer brand button need this urgently.
**WCAG:** 2.4.1 Bypass Blocks, 2.4.7 Focus Visible

---

## Honorable Mentions (lower priority)

- **`aria-current="page"`** on active nav item — helps screen readers announce current location
- **`aria-describedby`** linking form inputs to their error messages — improves form error comprehension
- **Chevron flip in RTL** — directional icons (`ChevronRight`, `ArrowRight`) should get `rtl:rotate-180` for correct reading direction
- **QuickInquiry social icon-only links** missing `aria-label` — add "Instagram" / "Twitter" labels
- **`index.html` hardcoded `lang="en"`** — consider a Vite plugin or build script to set correct lang at build time based on `VITE_UI_LANGUAGE`
- **Gallery grid items as clickable divs** — `GalleryPage.tsx:89-124` uses `onClick` on `motion.div` without keyboard support; same pattern as Services
- **SplashScreen not skippable** — for motion-sensitive users, the splash should either be instant or skippable via click/Enter
