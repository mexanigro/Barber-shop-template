/**
 * gallery-piece.tsx — GALERIA-05 D3 (2026-09-20, CONTRATOS § gallery «estado de presión»): la pieza de la galería (home v6/v7 y
 * rejilla de /galeria) se «levanta» al apoyar el dedo para decir que es clicable. Táctil: `pointerdown` → `data-pressed`;
 * `pointerup` / `pointercancel` / `pointerleave`, `touchmove` > 8 px o `scroll` de la ventana → vuelve. Escritorio: `:hover` por
 * CSS (`@media (hover: hover)`). El click tras un desplazamiento lo cancela el navegador (medido en Chromium y WebKit); la pieza
 * además no abre si bajó por movimiento. `reduced-motion`: la elevación queda (es feedback), sin transición (CSS).
 */
import React from "react";

const MOVE_PX = 8;

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & { onOpen: (e: React.MouseEvent<HTMLButtonElement>) => void };

export function GalleryPiece({ onOpen, children, ...rest }: Props) {
  const ref = React.useRef<HTMLButtonElement>(null);
  const start = React.useRef<{ x: number; y: number } | null>(null);
  const moved = React.useRef(false);
  const lift = (on: boolean) => { const el = ref.current; if (!el) return; if (on) el.dataset.pressed = "1"; else delete el.dataset.pressed; };
  React.useEffect(() => {
    // el scroll de la ventana (rueda, barra, teclado) también baja la pieza
    const onScroll = () => { if (start.current) { moved.current = true; lift(false); } };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  const down = (e: React.PointerEvent<HTMLButtonElement>) => { if (e.pointerType === "mouse") return; start.current = { x: e.clientX, y: e.clientY }; moved.current = false; lift(true); };
  const move = (e: React.PointerEvent<HTMLButtonElement>) => { const s = start.current; if (!s) return; if (Math.hypot(e.clientX - s.x, e.clientY - s.y) > MOVE_PX) { moved.current = true; lift(false); } };
  const up = () => { start.current = null; lift(false); };
  return (
    <button ref={ref} type="button" {...rest} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onPointerLeave={up} onTouchMove={(e) => { const s = start.current; const t = e.touches[0]; if (s && t && Math.hypot(t.clientX - s.x, t.clientY - s.y) > MOVE_PX) { moved.current = true; lift(false); } }} onClick={(e) => { if (moved.current) { moved.current = false; return; } onOpen(e); }}>
      {children}
    </button>
  );
}
