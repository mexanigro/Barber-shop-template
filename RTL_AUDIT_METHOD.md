# RTL Audit Method — Four-phase exhaustive process

A reusable method for finding RTL bugs in a UI component. Refined while
hunting down **four** distinct visible bugs in
`src/components/landing/employment/AudienceChoice.tsx` over multiple passes:

1. Theme toggle slider didn't mirror in RTL.
2. Click flood overlay revealed from the wrong side in RTL.
3. Language dropdown overflowed the viewport in RTL.
4. **Language dropdown items were nearly invisible in light mode** —
   a wrapper override (`[&_button]:text-slate-600`) cascaded past the
   trigger and into the dropdown menu items, recoloring them dark gray on
   a dark popover.

Bug #4 was found by following the method below after bugs 1–3 had already
been patched. The lesson: **static code review of physical-vs-logical
properties is necessary but not sufficient.** You also have to render the
page, inspect every interactive state in the browser, and read the
*computed* styles — not just the classes the JSX is asking for.

---

## The four phases

The method works in this order. Each phase narrows what the next phase
should look for.

### Phase 1 — Screenshot comparison (the most confidence-building step)

Goal: build a mental "expected mirror" of the component, then catch
anything that doesn't match it.

1. Start the dev server with the niche selected
   (`VITE_ACTIVE_NICHE=employment`).
2. Capture **four** baseline screenshots of the surface in question:
   - RTL desktop
   - RTL mobile
   - LTR desktop
   - LTR mobile
3. Compare LTR vs RTL of each size, looking at:
   - Are paneled regions on the correct sides?
   - Is text on the correct alignment edge?
   - Are icons / arrows / chevrons pointing in the reading direction?
   - Are CTAs in the symmetric position?
   - Header / footer / nav items mirrored?
   - **Is anything that should be different actually identical?**
   - **Is anything that should be identical actually different?**

The last two questions catch most direction-bearing bugs. They also catch
bugs that aren't direction-related but show up under the increased scrutiny.

Don't trust thumbnails. Read screenshots at full resolution. If something
looks ambiguous (like a slider position in a tiny pill), take an *element*
screenshot of just that piece. Browser DevTools' "screenshot element"
feature, or Playwright's `locator.screenshot()`, is invaluable here.

### Phase 2 — DOM inspection element-by-element

Goal: confirm or refute every "looks fine" judgement from Phase 1 with
exact numbers.

For each element in the layout, ask:

| Property | Why it matters in RTL |
|---|---|
| Physical `left:` / `right:` | Won't flip in RTL; need `start`/`end` (Tailwind: `start-*` / `end-*`). |
| Physical `ml-` / `mr-` / `pl-` / `pr-` | Use `ms-` / `me-` / `ps-` / `pe-`. |
| `rounded-l-*` / `rounded-r-*` / corner-specific | Use `rounded-s-*` / `rounded-e-*`. |
| `text-left` / `text-right` | Use `text-start` / `text-end`. |
| Framer Motion `x` / CSS `translateX(...)` | Always physical. Needs `rtl ? -n : n` sign flip. |
| 4-value `clip-path: inset(top right bottom left)` | Physical. Reveal animations need RTL mirror. |
| `box-shadow: Xpx Ypx ...` (non-zero X) | Horizontal offsets are physical. |
| `linear-gradient(<deg>, ...)` non-90° / non-180° | Angle doesn't auto-flip. |
| `radial-gradient(... at X% Y%)` non-50% X | Horizontal position is physical. |
| `transform-origin: left | right` | Physical. |
| `flex-direction: row-reverse` | Already reversed — RTL would double-flip. |
| Directional icons (chevrons, arrows) | Visual direction must match reading direction. |
| `align="start" / "end"` on popovers | Library-dependent. Some are logical, some physical. |

For each match, compute the four cases on paper:
`(index 0 | 1) × (LTR | RTL)`. If the layout doesn't behave correctly in
all four, that's the bug.

Use the browser's computed-style panel (or scripted equivalent — see the
`window.getComputedStyle` snippets earlier in the audit screenshots) to
verify positions, not just classnames. **A `class="..."` listing what
Tailwind utilities are *requested* is not the same as the *computed*
style. CSS overrides, cascade order, and arbitrary variant selectors can
disagree with what the JSX is asking for.**

This is the lesson from Bug #4. The dropdown items had `text-amber-400`
in their classlist, but the computed color was `text-slate-600` because
a wrapper selector `[&_button]` targeted them too. Without checking
computed colors, the bug was invisible to grep-of-classes.

### Phase 3 — Interaction testing

Static state isn't enough. RTL bugs hide in motion.

For every interactive element:

1. Hover — does the visual feedback travel in the correct direction in RTL?
2. Click — does the transition or reveal animation originate from the side
   the user clicked?
3. Toggle — does the toggle indicator move toward the correct end?
4. Open / close (dropdowns, modals) — does the surface align to a side
   that keeps it inside the viewport?
5. Tab order — does keyboard focus flow in reading direction?
6. **Open all popovers / overlays / dropdowns in RTL** — they often have
   their own cascade-detached styles that don't follow page direction.

For dropdowns specifically: open them in light mode AND dark mode, with
the page in RTL AND LTR. Bug #4 was a light-mode bug that only manifested
when the dropdown was opened — the trigger button looked fine because
the override on the trigger was intentional.

### Phase 4 — Edge cases

1. Mixed-direction text (Hebrew/Arabic + numbers + Latin). Bidi can
   cause unexpected character order.
2. Bidi punctuation: em-dashes, en-dashes, parentheses, brackets. Their
   visual mirror may not match the author's expectation.
3. Visual separators (dots, lines, dividers) — positioned correctly
   relative to text they accompany?
4. Long-content overflow: Hebrew sentences are often shorter or longer
   than English ones. Does anything truncate or wrap badly?
5. Font fallbacks — Hebrew/Arabic glyphs may render in a different font
   family than the rest of the UI, causing baseline shifts.

---

## The four bugs and how each was caught

### Bug #1 — Theme toggle slider position (`AudienceChoice.tsx:455`)

**Caught in:** Phase 2 (grep for Framer Motion `x` without RTL sign flip).
**Symptom:** In RTL the slider was rendered off the right edge of the pill
in dark mode (because the flex default position in RTL is the right edge,
and the +28px shoved it 28px further right).
**Fix:** `animate={{ x: isLight ? 0 : rtl ? -28 : 28 }}`.

### Bug #2 — Click flood overlay direction (`AudienceChoice.tsx:587–590`)

**Caught in:** Phase 2 (grep for 4-value `clip-path: inset(...)`).
**Symptom:** When the user clicked the worker panel on the right in RTL,
the flood reveal originated from the left side of the viewport — opposite
to where the click happened.
**Fix:** `clipPath: (chosen === "worker") !== rtl ? "inset(0 100% 0 0)" : "inset(0 0 0 100%)"`.

### Bug #3 — Language dropdown clipping in RTL (`LanguageSwitcher.tsx:46–47`)

**Caught in:** Phase 1 (RTL screenshot showed the dropdown half-clipped
off the left edge of the viewport).
**Symptom:** Dropdown used a hardcoded `right-0` alignment that worked
in LTR but pushed the dropdown off-screen in RTL.
**Fix:** Switch to Tailwind v4 logical utilities `start-0` / `end-0` and
pick `end` by default in RTL.

### Bug #4 — Language dropdown items invisible in light mode (`AudienceChoice.tsx:473–481`)

**Caught in:** Phase 2 (computed-style inspection of the dropdown items
after clicking the trigger in light mode RTL).
**Symptom:** The wrapper used `[&_button]:text-slate-600` as a way to
re-skin the trigger button for the light-background header. But
`[&_button]` is a *descendant* selector and also matches the dropdown
menu items, which sit on a dark `bg-neutral-900` popover and need their
own bright colors (`text-amber-400` for the selected language,
`text-neutral-300` for others). The override cascaded past the trigger
and forced every dropdown item to `text-slate-600` — dark gray on dark
gray, effectively invisible.
**Fix:** Scope to direct descendant of direct child: `[&>div>button]` —
this matches only the trigger button (which is the immediate `<button>`
inside the LanguageSwitcher's root `<div>`), and skips the dropdown
items (which are nested an extra level deeper inside the absolutely
positioned popover).

```diff
-  className={isLight ? "[&_button]:text-slate-600 [&_button]:hover:text-slate-900" : ""}
+  className={isLight ? "[&>div>button]:text-slate-600 [&>div>button]:hover:text-slate-900" : ""}
```

This is a non-obvious bug because:

- It's not an RTL-specific bug per se. It manifests in *both* directions
  in light mode. But it surfaced during an RTL audit because RTL light
  mode (Hebrew + light theme) is the default for the employment niche,
  so the bug is right in front of the user.
- The buggy code reads as if it should "just style the LanguageSwitcher's
  text" — it's easy to mistake `[&_button]` for "the language switcher
  button." But `_` is descendant selector in Tailwind v4 arbitrary
  variants; it does NOT mean direct child.
- It can't be caught by reading the dropdown's *requested* classes
  (`text-amber-400`, `text-neutral-300`) — only by reading the dropdown's
  *computed* color.

---

## Reusable checklist for any RTL audit

```
Phase 1: Screenshots
[ ] RTL desktop screenshot
[ ] RTL mobile screenshot
[ ] LTR desktop screenshot
[ ] LTR mobile screenshot
[ ] Diff comparison: every visible element mirrors correctly
[ ] Same screenshots in dark mode (themes can re-introduce bugs)

Phase 2: DOM inspection
[ ] Grep for physical CSS in the file (left/right/ml/mr/pl/pr/etc.)
[ ] Grep for Framer Motion `x` / `translateX`
[ ] Grep for `clip-path: inset(...)` with non-zero values
[ ] Grep for non-symmetric gradients (135deg, etc.)
[ ] For each finding: four-case table (index × direction)
[ ] Inspect computed styles for elements with arbitrary-variant overrides
    (`[&_x]`, `[&>x]`, `[&_*]` etc.) — make sure the selector does NOT
    over-match nested children with their own intended styles

Phase 3: Interactions
[ ] Hover each interactive element in RTL — direction-correct?
[ ] Click each interactive element in RTL — reveal/animation from correct side?
[ ] Toggle each toggle in RTL — indicator moves to correct end?
[ ] Open every dropdown, modal, popover in RTL — anchored correctly,
    not clipped, items readable?
[ ] Tab through the UI in RTL — focus order matches reading order?

Phase 4: Edge cases
[ ] Mixed RTL + numbers (e.g., "60 שניות")
[ ] Em-dashes, bracketed clauses in RTL
[ ] Visual separators (dots, lines) positioned correctly
[ ] Long Hebrew/Arabic translations don't overflow or wrap weirdly
[ ] Mixed Latin glyphs in RTL text (English brand names inside Hebrew)
```

---

## Anti-patterns to flag in code review

- Physical `left`/`right`/`ml-*`/`mr-*` when a logical equivalent exists
- Framer Motion `x` without explicit `rtl ? -n : n` flip on any element
  whose layout depends on writing direction
- 4-value `clip-path: inset()` for reveal animations without flipping
  values in RTL
- Non-symmetric `linear-gradient(<deg>, ...)` where the angle is anything
  other than `to top` / `to bottom` (90° / 180°) — these don't auto-flip
- **Tailwind v4 arbitrary-variant `[&_button]` (descendant selector) used
  to re-skin a single piece of a sub-component.** It almost always
  over-matches into nested buttons inside dropdowns / popovers. Prefer
  `[&>div>button]` for a specific path, or pass colors via props.
- Adding `dir="rtl"` to the document and assuming everything "Just
  Works™." Transforms, gradients, clip-paths, and cascade overrides
  never auto-flip and never auto-scope.
