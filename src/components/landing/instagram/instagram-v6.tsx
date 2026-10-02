/**
 * instagram-v6.tsx — instagram de peluquería, «abanico de polaroids» (INSTAGRAM-FAQ-01, D-189), migrada de
 * `diseno/instagram/prototipo/proto.{css,js}` (INFORME § 6.8, INSTAGRAM-01 §§ 6 y 7; cerrada en local el 2026-09-28, con el fondo en
 * velo y el arrastre en móvil después del cierre). Va entre reseñas y preguntas (`PELUQUERIA_SECTION_ORDER`), en una
 * `section#instagram` con su h2. Las 6 fotos son polaroids que giran alrededor de un pivote muy por debajo de ellas (una mano de
 * cartas) y se abren con el scroll (`--ig-open`); la que se toca se acerca. La dinámica sale de `sections.gallery.variant` (v6 collage
 * → A: giro y altura desparejos; v7 mosaico → C: simétrico). En móvil (< 600) las de los extremos salen del borde y el abanico se
 * desliza de costado con el dedo. Cada foto es un `<button aria-pressed>` con el alt de la pieza de galería con la misma foto, o
 * «título · n» si no está en la galería (D-192). Pie: h2 + «@cuenta» si hay y una acción con destino: «Instagram» a su url o, sin
 * cuenta, «ver toda la galería» a /galeria (el mismo texto y la misma navegación que galería). Estilos en index.css (`.ig6…`).
 */
import React from "react";
import { siteConfig } from "../../../config/site";
import { localeConfig } from "../../../config/locale";
import { resolveVariant } from "../../../lib/section-variants";
import { handleImgError } from "../../../lib/utils";
import { verTodaLaGaleria } from "../../../lib/gallery";

type Props = { onViewFull?: () => void };
/** A (collage): cada foto con un giro y una altura algo desparejos, como tiradas con la mano; C (mosaico): simétrico. */
const DESPAREJO = [[-2.5, 6], [1.5, -4], [-1, 8], [2, -6], [-1.5, 3], [2.5, -2]];
const movil = () => window.innerWidth < 600;

/** Arrastre de costado en móvil y «traer al centro»: el estado vive en el elemento, como en el prototipo (sin re-render por cuadro). */
type Abanico = HTMLUListElement & { _dx?: number; _cs?: number[]; _arrastro?: boolean };
/** Cuánto tiene que correrse el abanico para que cada foto quede en el centro (medido en la pantalla, sin el corrimiento actual). */
const centros = (a: Abanico) => {
  const dx = parseFloat(getComputedStyle(a).translate) || 0, q = a.getBoundingClientRect(), c = q.left + q.width / 2;
  return Array.from(a.children).map((li) => { const r = li.querySelector(".ig6-marco")!.getBoundingClientRect(); return c - (r.left + r.width / 2 - dx); });
};
const correr = (a: Abanico, x: number) => {
  const cs = a._cs || centros(a); const tope = Math.max(...cs.map(Math.abs));
  a._dx = Math.max(-tope, Math.min(tope, x)); a.style.setProperty("--ig-dx", a._dx.toFixed(1) + "px");
};
const centrar = (a: Abanico, i: number) => { a._cs = centros(a); correr(a, a._cs[i]); };

export function InstagramV6({ onViewFull }: Props) {
  const ig = siteConfig.sections.instagram!;
  const gal = siteConfig.sections.gallery;
  const L = localeConfig;
  const dinamica = resolveVariant(gal?.variant) === "v7" ? "v7" : "v6";
  const flecha = L.dir === "rtl" ? "↖" : "↗";
  const fotos = (ig.images || []).filter(Boolean).slice(0, 6);
  // D-192: el alt de la pieza de galería con la misma foto, en el idioma de la página; si no está en la galería, «título · n»
  const altDe = (src: string, i: number) => {
    const it = (gal?.items || []).find((x) => x && x.src === src);
    return it ? (gal?.alts?.[it.id] || it.alt || "") : `${ig.title || ""} · ${i + 1}`;
  };
  const [cerca, setCerca] = React.useState<number | null>(null);
  const abanicoRef = React.useRef<Abanico | null>(null);

  React.useEffect(() => { setCerca(null); const a = abanicoRef.current; if (a) { a._dx = 0; a.style.removeProperty("--ig-dx"); } }, [L.lang, dinamica, fotos.join("|")]);
  // se abre al entrar en pantalla: cerrado con su centro al 90 % del alto de la ventana, abierto al 55 % (ease-out); quieto y abierto
  // con reduced-motion. Y el arrastre de costado en móvil (hasta 8 px es un toque).
  React.useEffect(() => {
    const a = abanicoRef.current; if (!a) return;
    a._dx = 0;
    let raf = 0;
    const tick = () => {
      raf = 0;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { a.style.setProperty("--ig-open", "1"); return; }
      const q = a.getBoundingClientRect(), c = (q.top + q.height / 2) / window.innerHeight;
      const p = Math.max(0, Math.min(1, (0.9 - c) / 0.35));
      a.style.setProperty("--ig-open", (1 - Math.pow(1 - p, 3)).toFixed(3));
    };
    const pedir = () => { if (!raf) raf = requestAnimationFrame(tick); };
    let x0: number | null = null, d0 = 0, id: number | null = null;
    const abajo = (e: PointerEvent) => { if (!movil()) return; x0 = e.clientX; d0 = a._dx || 0; id = e.pointerId; a._arrastro = false; a._cs = centros(a); };
    const mueve = (e: PointerEvent) => {
      if (x0 === null || e.pointerId !== id) return; const dx = e.clientX - x0;
      if (!a._arrastro && Math.abs(dx) < 8) return;
      if (!a._arrastro) { a._arrastro = true; a.dataset.arrastre = ""; try { a.setPointerCapture(id!); } catch { /* sin captura, el gesto sigue */ } }
      correr(a, d0 + dx);
    };
    const fin = () => { if (x0 === null) return; x0 = null; delete a.dataset.arrastre; setTimeout(() => { a._arrastro = false; }, 0); };
    tick();
    window.addEventListener("scroll", pedir, { passive: true });
    window.addEventListener("resize", pedir);
    a.addEventListener("pointerdown", abajo); a.addEventListener("pointermove", mueve);
    a.addEventListener("pointerup", fin); a.addEventListener("pointercancel", fin);
    return () => {
      window.removeEventListener("scroll", pedir); window.removeEventListener("resize", pedir); if (raf) cancelAnimationFrame(raf);
      a.removeEventListener("pointerdown", abajo); a.removeEventListener("pointermove", mueve);
      a.removeEventListener("pointerup", fin); a.removeEventListener("pointercancel", fin);
    };
  }, []);

  const tocar = (e: React.MouseEvent, i: number) => {
    const a = abanicoRef.current;
    if (a?._arrastro) { e.preventDefault(); return; } // un arrastre no es un toque
    const ya = cerca === i;
    setCerca(ya ? null : i);
    // en móvil, la tocada viene al centro: se mide cuando terminó de acercarse (la transición del marco, 220 ms)
    if (!ya && a && movil()) setTimeout(() => centrar(a, i), 240);
  };

  return (
    <section id="instagram" data-ig="v6" aria-labelledby="ig6-title">
      <div className="ig6" data-dinamica={dinamica}>
        <div className="ig6-inner">
          <ul ref={abanicoRef} className="ig6-abanico" style={{ "--n": fotos.length } as React.CSSProperties}>
            {fotos.map((src, i) => {
              const pos = i - (fotos.length - 1) / 2;
              const [jr, jy] = DESPAREJO[i % 6];
              const estilo = { "--i": pos, zIndex: cerca === i ? 50 : 10 - Math.round(Math.abs(pos) * 2), ...(dinamica === "v6" ? { "--jr": `${jr}deg`, "--jy": `${jy}px` } : {}) } as React.CSSProperties; // las del centro, arriba de la pila
              return (
                <li key={`${src}-${i}`} className="ig6-foto" style={estilo} data-cerca={cerca === i ? "1" : undefined}>
                  <button
                    type="button"
                    className="ig6-marco"
                    aria-pressed={cerca === i}
                    aria-label={altDe(src, i)}
                    onClick={(e) => tocar(e, i)}
                    onFocus={(e) => { const a = abanicoRef.current; if (a && movil() && e.currentTarget.matches(":focus-visible")) centrar(a, i); }} // sólo con teclado: con el dedo, el toque ya la centra
                  >
                    {/* draggable = false: el arrastre nativo de la imagen cancelaba el gesto (pointercancel) */}
                    <img src={src} alt="" draggable={false} loading="lazy" decoding="async" onError={handleImgError} />
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="ig6-foot">
            <div>
              <h2 id="ig6-title">{ig.title || ""}</h2>
              {ig.url && ig.handle && <p>{ig.handle.startsWith("@") ? ig.handle : `@${ig.handle}`}</p>}
            </div>
            {ig.url ? (
              <a className="ig6-more" href={ig.url} target="_blank" rel="noopener">{`Instagram ${flecha}`}</a>
            ) : (
              // sin cuenta: a la galería completa, con el mismo texto y la misma navegación que «ver toda la galería»
              <a className="ig6-more" href="/galeria" onClick={(e) => { if (onViewFull) { e.preventDefault(); onViewFull(); } }}>{`${verTodaLaGaleria(gal, L.gallery.explorePortfolio)} ${flecha}`}</a>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
