import { useEffect, useRef, useCallback } from "react";

/**
 * Provides Escape-to-close, focus-on-open, and focus-restore-on-close
 * for any modal/overlay. Returns a ref to attach to the modal container.
 *
 * Full tab-cycling focus trap is Phase 3; this covers WCAG 2.1.1 (Keyboard)
 * and 2.4.3 (Focus Order) for the critical open/close path.
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

  // Escape key handler
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  return containerRef;
}
