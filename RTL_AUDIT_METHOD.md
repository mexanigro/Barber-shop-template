# RTL Audit Method — How I Found 2 Visible Bugs in `AudienceChoice.tsx`

This document captures the exact process I followed to find two RTL bugs that
were visible to the user but not described to me. The goal is to turn this
into a reusable "RTL audit" skill.

The component lives at `src/components/landing/employment/AudienceChoice.tsx`.
It is a full-viewport split-pane choice screen with a header (brand + theme
toggle + language switcher), two image panels, a footer hint, and a flood
overlay that plays when the user clicks. The component is supposed to be
"RTL-aware throughout" (its own docblock says so), so the bugs are not gross
violations — they are the kind of thing a careful eye picks up.

---

## Step 1 — Map the surface before touching anything

Before reading code, I framed what I was looking for. RTL bugs come in
three flavors, ranked by visibility to a real user:

1. **Persistent, always-visible bugs** — e.g. a control that renders in the
   wrong spot the moment the page loads. These are the bugs a user definitely
   sees.
2. **Interaction-revealed bugs** — e.g. a hover/click animation that travels
   in the wrong direction. Visible the moment the user touches anything.
3. **Subtle-decoration bugs** — e.g. a 135° gradient that doesn't mirror.
   Technically wrong but most users won't notice.

The brief said "the user can see them," which biased me toward flavors 1 and 2.

## Step 2 — Read the component end-to-end

I read all 590 lines of `AudienceChoice.tsx` in one pass with `Read`. I did
**not** grep first. I needed the mental model of the layout before I could
spot what was direction-sensitive.

Key surfaces I noted:

- Header band with brand, theme toggle, language switcher.
- Two `<Panel>` instances, each with: background image, tint overlay, accent
  glow, hairline divider, icon+badge, headline+sub, CTA chip.
- Footer hint.
- Flood overlay on click (clip-path reveal).

## Step 3 — Build a checklist of "direction-bearing" properties

I scanned for any CSS or motion value that could behave differently in RTL.
The grep targets are predictable — this is the reusable part of the method:

| Pattern | Why it matters |
|---|---|
| `left:` / `right:` (physical) | Won't flip in RTL — `start`/`end` would. |
| `ml-` / `mr-` / `pl-` / `pr-` | Physical margins/padding. Tailwind has `ms-`/`me-`/`ps-`/`pe-` logical variants. |
| `rounded-l-*` / `rounded-r-*` / `rounded-tl-*` etc. | Physical corners. Use `rounded-s-*` / `rounded-e-*`. |
| `text-left` / `text-right` | Use `text-start` / `text-end`. |
| `translateX(...)` / `x:` in motion | Always physical — needs an explicit sign flip when `dir=rtl`. |
| `linear-gradient(<deg>, …)` | Angle is physical. 135° looks different mirrored. |
| `clip-path: inset(top right bottom left)` | The 4-value form is physical. |
| `radial-gradient(... at X% Y%)` | The X% position is physical. |
| `transform-origin: left/right` | Physical. |
| `box-shadow: Xpx Ypx ...` | If X is non-zero, it's a horizontal offset and is physical. |
| `flex-direction: row-reverse` | Already reversed — applying again in RTL is a double flip. |
| Icons with directional meaning (arrows, chevrons) | Must visually point in the reading direction. |
| `align="end"` / `align="start"` in popovers | Library-dependent; some are logical, some are physical. |

For each match, the question is the same: **"What does this look like when
`dir=rtl` is applied to the document?"** If the answer is "exactly the same,"
that's the bug — RTL needs a horizontal mirror for direction-bearing things.

## Step 4 — Walk the file with the checklist

I went through `AudienceChoice.tsx` block by block. Findings (good and bad):

### Header

- `flex items-center justify-between` — logical (`justify-between` works on
  the main axis, which flips in RTL). **OK.**
- Brand: `flex items-center gap-2.5` with icon then text. DOM order flips
  visually in RTL. **OK.**
- Language switcher: uses `align="end"`. **OK** (logical).
- **Theme toggle slider** —
  ```tsx
  <motion.span animate={{ x: isLight ? 0 : 28 }} … />
  ```
  This is a Framer Motion `x` (physical `translateX`). The parent toggle is
  `flex items-center p-[3px]`. In LTR the slider's default flex position is
  on the **left**, so `x: 0` = light/sun-on-left, `x: 28` = dark/moon-on-right.
  In RTL the flex layout flips the slider's default position to the **right**,
  so `x: 0` actually puts the sun on the right (wrong), and `x: 28` pushes
  the slider 28px further right (off the toggle bounds). **Bug #1 candidate.**

### Panel header row (icon + label)

- `flex w-full items-start justify-between gap-3` — auto-flips. **OK.**

### Background image + tints

- `objectPosition: "50% 38%"` — symmetric. **OK.**
- Tint `linear-gradient(135deg, …)` — angle is physical, won't mirror, but
  the colors are translucent washes with no clear "start" — visually neutral.
  **Not a user-visible bug.**
- Radial glow at `inset-y-0 w-[55%]` with conditional `left`/`right` and
  `0%`/`100%` derived from `(index === 0) === rtl`. I traced all 4 cases
  (worker LTR, worker RTL, business LTR, business RTL) and the glow lands
  on the visual outer edge in every case. **OK — already RTL-aware.**

### Hairline divider

- `lg:end-0` / `lg:start-0` — logical, flip correctly. **OK.**

### CTA chip

- Container `flex items-center gap-3` — auto-flips DOM order. **OK.**
- Group hover slide: `x: hovered ? (rtl ? -6 : 6) : 0` — explicit RTL flip,
  motion goes "inward" in both directions. **OK.**
- `ArrowLeft` icon with `className={rtl ? "" : "rotate-180"}` — in LTR
  rotates to point right (forward), in RTL stays pointing left (forward).
  **OK.**

### Click flood overlay

- ```tsx
  initial={{ clipPath: `inset(0 ${chosen === "worker" ? "100%" : "0"} 0 ${chosen === "worker" ? "0" : "100%"})` }}
  animate={{ clipPath: "inset(0 0 0 0)" }}
  ```
  `inset(top right bottom left)` is physical. For "worker" the initial state
  hides the overlay from the right side (revealing left→right). In LTR the
  worker panel sits on the **left**, so the flood originates from the worker
  panel — correct. In RTL the worker panel sits on the visual **right**, but
  the flood still originates from the **left** — wrong side. The user clicks
  the panel on the right, the flood comes from the opposite side. The
  reveal feels disconnected from the click. **Bug #2 candidate.**

### Footer

- Symmetric padding, centered. **OK.**

## Step 5 — Confirm hypotheses in the browser

The static analysis gave me two candidates:

1. **Theme toggle slider position/animation** (always visible in RTL).
2. **Click flood overlay direction** (visible on click in RTL).

I started the dev server with `VITE_ACTIVE_NICHE=employment VITE_UI_LANGUAGE=he`,
opened it in a Playwright-controlled browser, and:

- Took a screenshot of the page in RTL at desktop width. Confirmed the
  toggle slider was visibly off-position (sun on the wrong side / slider
  poking past the toggle's rounded edge on dark mode).
- Clicked the worker panel. Confirmed the flood overlay revealed from the
  side opposite the panel the user clicked — the wrong spatial cue.
- For comparison, took the same screenshots in `VITE_UI_LANGUAGE=en` (LTR)
  and confirmed both behaviors looked correct.

This A/B comparison is the test of an RTL bug: **"Is the LTR version of the
same interaction visually consistent with the click target, while the RTL
version is not?"** If yes, the asymmetry is the bug.

## Step 6 — Fix and re-verify

### Fix 1 — Theme toggle

The slider has to translate toward the **end** of the toggle to indicate
"dark," regardless of writing direction. Two options:

- Conditional sign (`x: isLight ? 0 : (rtl ? -28 : 28)`). Simple.
- Use a single shared transform that doesn't depend on `dir` — e.g. position
  the slider with `start: 0` + `end: auto`, then animate `x`. Equivalent
  cleanliness; I went with the conditional sign because it's a one-line
  change.

### Fix 2 — Flood overlay

Make the inset originate from the panel the user actually clicked. In RTL
the worker panel is visually on the right, so the flood should hide on the
**left** initially (and reveal rightward to leftward). The cleanest
implementation flips the inset values when `rtl` is true.

### Re-verify

After each fix:

1. Reload the dev server (HMR handles it).
2. Take a screenshot in RTL and compare to the broken one (Before/After).
3. Take a screenshot in LTR to confirm the fix didn't regress LTR.
4. Click the panel and watch the flood — confirm it now originates from
   the clicked panel in both directions.

## Reusable mental checklist (for the skill)

When auditing any component for RTL bugs:

1. Read the file end-to-end.
2. Grep for every pattern in the table in Step 3.
3. For each hit, write the four cases on paper: `(index 0|1) × (LTR|RTL)`
   and confirm the visual outcome is correct in all four. If the code
   doesn't have an `index`, just `(LTR|RTL)`.
4. Pay special attention to:
   - Framer Motion `x` / CSS `translateX` (always physical)
   - `clip-path: inset(...)` (the 4-value form is physical)
   - Box shadows with horizontal offsets
   - Gradient angles (any non-vertical/horizontal angle)
   - Icons with directional meaning
5. Verify in the browser with side-by-side LTR vs RTL screenshots before
   and after each fix.
6. Test interactions, not just static state — toggles, hover, click flood,
   slide-ins. RTL bugs hide in motion.

## Anti-patterns to call out in code review

- Using physical `left`/`right`/`ml-*`/`mr-*` when logical equivalents exist.
- Using Framer Motion `x` without an explicit `rtl ? -n : n` flip on any
  element whose layout depends on writing direction.
- Using 4-value `clip-path: inset()` for reveal animations without flipping
  the values in RTL.
- Adding `dir="rtl"` to the document and assuming everything Just Works™.
  Transforms, gradients, and clip-paths never auto-flip.
