import { useEffect, useRef, useCallback } from "react";

const FOCUSABLE_SELECTORS = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(", ");

/**
 * Provides Escape-to-close, focus-on-open, focus-restore-on-close,
 * and full Tab-cycling focus trap for any modal/overlay.
 * Returns a ref to attach to the modal container.
 *
 * Covers WCAG 2.1.1 (Keyboard), 2.4.3 (Focus Order), and 2.1.2 (No Keyboard Trap — Escape exits).
 */
export function useModalA11y(isOpen: boolean, onClose: () => void) {
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<Element | null>(null);

  // Capture trigger + move focus into modal on open
  useEffect(() => {
    if (isOpen) {
      triggerRef.current = document.activeElement;
      // Small delay lets AnimatePresence render the container before focusing
      const raf = requestAnimationFrame(() => {
        containerRef.current?.focus({ preventScroll: true });
      });
      return () => cancelAnimationFrame(raf);
    } else if (triggerRef.current) {
      // Restore focus to trigger on close
      (triggerRef.current as HTMLElement).focus?.({ preventScroll: true });
      triggerRef.current = null;
    }
  }, [isOpen]);

  // Escape key handler + focus trap (Tab cycling)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }

      // Focus trap: cycle Tab within the modal
      if (e.key === "Tab" && containerRef.current) {
        const focusable = Array.from(
          containerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS)
        );
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          // Shift+Tab: if at start, wrap to end
          if (document.activeElement === first || document.activeElement === containerRef.current) {
            e.preventDefault();
            last.focus();
          }
        } else {
          // Tab: if at end, wrap to start
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  return containerRef;
}
