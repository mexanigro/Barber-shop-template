# UI + A11y Smoke Test Checklist

**Frequency:** Before any PR that touches landing, booking, chat, gallery, or RTL/i18n.
**Setup:** `npm run dev:en` running on `localhost:3000`. For RTL pass: `npm run dev:he`.

---

## a) Booking Flow

1. Tab to "Book Appointment" CTA in Hero — confirm visible `focus-visible` ring.
2. Click / press Enter to open booking panel.
3. Confirm panel has `role="dialog"` and focus moves inside on open.
4. Press Escape — panel should close and focus return to trigger button.
5. Re-open. Tab through all steps (service → staff → date → time → confirm).
6. Confirm no focus escapes the panel while open.
7. Submit — confirm success state appears and is announced (no silent success).

## b) Chat (Chatbot FAB)

1. Tab to the FAB button (bottom-right / bottom-left in RTL).
2. Press Enter — chat panel opens. Confirm focus moves to input.
3. Type a message and send — confirm response appears and chat container is live region (no need to re-focus to hear new messages).
4. Press Escape — panel closes, focus returns to FAB.
5. In RTL build: confirm FAB is on the left (`end-6` = left in RTL).

## c) Gallery + Lightbox

1. Open Gallery page. Tab to first gallery item.
2. Press Enter — lightbox opens. Confirm focus moves inside.
3. Tab between Prev / Next / Close controls — all reachable by keyboard.
4. Press Escape — lightbox closes, focus returns to trigger item.
5. Confirm backdrop and panel animate at `DUR_MODAL_ENTER` (≈220ms), not spring-jerky.
6. In mobile viewport (375px): confirm arrows are ≥44×44px tap targets.

## d) RTL Quick Pass (`npm run dev:he`)

1. Open landing in browser with `dir="rtl"` confirmed on `<html>`.
2. Navbar: logo left, links right, hamburger on left side on mobile.
3. Hero: text left-aligned (start), scroll indicator bottom-left (end).
4. WhyChooseUs: badge floats to bottom-left (−end-6 = left in RTL).
5. Chatbot FAB: bottom-left corner.
6. ScrollToTop button: bottom-left corner.
7. Scan for any element that visually bleeds or overlaps due to physical `left/right` still in use.

## e) Reduced-Motion Quick Pass

1. In Chrome DevTools → Rendering → Emulate: `prefers-reduced-motion: reduce`.
2. Reload page — SplashScreen should be instant or skippable (no prolonged fade/scale).
3. Scroll through all landing sections — no Y-translate entrance animations, no stagger.
4. Open booking panel — entrance should be instant or opacity-only (no scale/translate).
5. Open chat — same as booking.
6. Open lightbox — same as booking.
7. Chatbot bouncing dots: should be static or hidden.
8. Framer `MotionConfig reducedMotion="user"` is the global governor — verify it is present in `App.tsx`.

---

## Automated A11y

Run against a live dev server:

```bash
# LTR
npm run dev:en   # terminal 1
npm run a11y     # terminal 2 — saves a11y-report.json

# RTL
npm run dev:he   # terminal 1
npm run a11y:he  # terminal 2
```

Zero violations in `a11y-report.json` = green. Any `critical` or `serious` violation = block merge.

---

## Pass Criteria

| Flow | Must Pass |
|---|---|
| Booking | Opens, traps focus, Escape closes, form submits |
| Chat | Opens, live region, Escape closes, FAB in correct corner (RTL) |
| Gallery | Opens, keyboard nav, Escape closes |
| RTL | No physical-direction layout breaks in key elements |
| Reduced-motion | No entrance animations, no looping motion |
| Automated axe | 0 critical/serious violations |
