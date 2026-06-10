/**
 * useSwipeNavigation.ts — shared touch-swipe navigation for gallery
 * carousels and lightboxes.
 *
 * Pointer-events based, zero dependencies. Only touch/pen pointers drive
 * the gesture — mouse is ignored so desktop keeps its arrows and click
 * semantics. Attach `handlers` to the gesture surface (it also needs
 * `touch-action: pan-y` so vertical scroll keeps working) and, optionally,
 * `feedbackRef` to a plain wrapper element that should follow the finger.
 * The feedback element must NOT be a framer-motion node animating
 * transform — the hook writes `style.transform` directly (GPU-only,
 * no React state per frame).
 *
 * Commit rule: horizontal-dominant travel >= 56px, or a flick (>= 24px at
 * >= 0.5 px/ms). Direction mirrors under RTL so a physical swipe always
 * reveals the visually adjacent image — same convention as the existing
 * ArrowLeft/ArrowRight keyboard handling in the lightboxes.
 */
import React from "react";

/** Horizontal travel that commits a navigation regardless of speed. */
const COMMIT_DISTANCE = 56;
/** A flick this fast (px/ms) commits with much less travel. */
const COMMIT_VELOCITY = 0.5;
/** Minimum travel for a velocity-based commit (filters jittery taps). */
const FLICK_MIN_DISTANCE = 24;
/** Movement needed before we decide the gesture axis. */
const AXIS_LOCK_DISTANCE = 10;
/** The feedback element follows the finger at this damped ratio. */
const DRAG_FOLLOW = 0.55;
/** Snap-back/settle curve — matches EASE_OUT_STRONG from lib/motion. */
const SETTLE_TRANSITION = "transform 280ms cubic-bezier(0.23, 1, 0.32, 1)";

export type SwipeNavigationHandlers = {
  onPointerDown: (e: React.PointerEvent<HTMLElement>) => void;
  onPointerMove: (e: React.PointerEvent<HTMLElement>) => void;
  onPointerUp: (e: React.PointerEvent<HTMLElement>) => void;
  onPointerCancel: (e: React.PointerEvent<HTMLElement>) => void;
  onClickCapture: (e: React.MouseEvent<HTMLElement>) => void;
};

export function useSwipeNavigation({
  onPrev,
  onNext,
  isRtl = false,
  enabled = true,
}: {
  onPrev: () => void;
  onNext: () => void;
  isRtl?: boolean;
  enabled?: boolean;
}) {
  const feedbackRef = React.useRef<HTMLDivElement | null>(null);

  const pointerIdRef = React.useRef<number | null>(null);
  const startXRef = React.useRef(0);
  const startYRef = React.useRef(0);
  const startTimeRef = React.useRef(0);
  const axisRef = React.useRef<"h" | "v" | null>(null);
  const swipedRef = React.useRef(false);

  // Keep the latest callbacks without re-creating the handlers.
  const callbacksRef = React.useRef({ onPrev, onNext, isRtl, enabled });
  callbacksRef.current = { onPrev, onNext, isRtl, enabled };

  return React.useMemo(() => {
    const settleBack = () => {
      const el = feedbackRef.current;
      if (!el) return;
      const reduceMotion =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      el.style.transition = reduceMotion ? "none" : SETTLE_TRANSITION;
      el.style.transform = "translateX(0px)";
    };

    const reset = () => {
      pointerIdRef.current = null;
      axisRef.current = null;
    };

    const onPointerDown = (e: React.PointerEvent<HTMLElement>) => {
      if (!callbacksRef.current.enabled) return;
      // Mouse keeps its click/arrow semantics; multi-touch: first finger wins.
      if (e.pointerType === "mouse") return;
      if (pointerIdRef.current !== null) return;
      pointerIdRef.current = e.pointerId;
      startXRef.current = e.clientX;
      startYRef.current = e.clientY;
      startTimeRef.current = performance.now();
      axisRef.current = null;
      swipedRef.current = false;
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        /* detached node or unsupported — gesture still works unbounded */
      }
    };

    const onPointerMove = (e: React.PointerEvent<HTMLElement>) => {
      if (e.pointerId !== pointerIdRef.current) return;
      const dx = e.clientX - startXRef.current;
      const dy = e.clientY - startYRef.current;
      if (axisRef.current === null) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) < AXIS_LOCK_DISTANCE) return;
        axisRef.current = Math.abs(dx) > Math.abs(dy) ? "h" : "v";
      }
      if (axisRef.current !== "h") return;
      const el = feedbackRef.current;
      if (el) {
        el.style.transition = "none";
        el.style.transform = `translateX(${dx * DRAG_FOLLOW}px)`;
      }
    };

    const onPointerUp = (e: React.PointerEvent<HTMLElement>) => {
      if (e.pointerId !== pointerIdRef.current) return;
      const dx = e.clientX - startXRef.current;
      const elapsed = Math.max(1, performance.now() - startTimeRef.current);
      const distance = Math.abs(dx);
      const horizontal = axisRef.current === "h";
      reset();

      // Any horizontal drag suppresses the trailing click (tap-to-open etc.).
      swipedRef.current = horizontal;
      settleBack();
      if (!horizontal) return;

      const isFlick =
        distance >= FLICK_MIN_DISTANCE && distance / elapsed >= COMMIT_VELOCITY;
      if (distance < COMMIT_DISTANCE && !isFlick) return;

      // Swiping left reveals the visually-right image: next under LTR,
      // previous under RTL (mirrors the ArrowRight keyboard mapping).
      const { onPrev: prev, onNext: next, isRtl: rtl } = callbacksRef.current;
      if (dx < 0) (rtl ? prev : next)();
      else (rtl ? next : prev)();
    };

    const onPointerCancel = (e: React.PointerEvent<HTMLElement>) => {
      if (e.pointerId !== pointerIdRef.current) return;
      reset();
      settleBack();
    };

    const onClickCapture = (e: React.MouseEvent<HTMLElement>) => {
      if (!swipedRef.current) return;
      swipedRef.current = false;
      e.preventDefault();
      e.stopPropagation();
    };

    const handlers: SwipeNavigationHandlers = {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel,
      onClickCapture,
    };
    return { handlers, feedbackRef };
  }, []);
}
