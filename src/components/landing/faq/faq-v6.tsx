/**
 * faq-v6.tsx — faq de peluquería, «fichas sobre la mesa» (INSTAGRAM-FAQ-01, D-189), migrada de `diseno/faq/prototipo/proto.{css,js}`
 * (INFORME § 6.7, FAQ-01 §§ 3-bis y 5; cerrada en local el 2026-09-28, con el fondo en textura después del cierre). Acordeón en
 * profundidad: cada pregunta es UN control (`<button aria-expanded aria-controls>` en un h3) y hay una abierta por vez; la tocada se
 * acerca y su respuesta se despliega como una hoja doblada, las demás se alejan apenas. Cerradas, las columnas se recuestan desde
 * abajo lejos del centro de la pantalla y se enderezan en el centro (ligado al scroll). La dinámica no es un campo: sale de
 * `sections.gallery.variant` (v6 collage → A: dos columnas desfasadas en sentidos opuestos en escritorio; v7 mosaico → C: alineadas y
 * quietas). Pie como el resto: h2 + kicker + la acción F-1 a WhatsApp (sin teléfono, ninguna). Cada rango «45–60» va aislado en
 * `<bdi dir="ltr">` (D19) y en ruso una palabra de una letra no cierra línea (D18). Estilos en index.css (`.faq6…`).
 */
import React from "react";
import { siteConfig } from "../../../config/site";
import { localeConfig } from "../../../config/locale";
import { resolveVariant } from "../../../lib/section-variants";
import { toWhatsAppNumber } from "../../../lib/whatsapp";

/** Ruso: una palabra de una letra va pegada a la siguiente con espacio duro (D18); también la que sigue a otra de una letra. */
const tipografia = (t: string) => (localeConfig.lang === "ru" ? t.replace(/(?<=^|\s)([а-яё])\s/giu, "$1 ") : t);
/** En RTL el guion entre dos números toma la dirección del párrafo y «45–60» se ve «60–45» (regla N1 de Unicode bidi). */
const RANGO = /(\d+(?:[.,]\d+)?\s?[–-]\s?\d+(?:[.,]\d+)?%?)/;
const conRangos = (texto: string) =>
  tipografia(texto).split(RANGO).map((parte, k) => (k % 2 ? <bdi key={k} dir="ltr" className="faq6-rango">{parte}</bdi> : parte || null));

function useColumnas() {
  const consulta = "(min-width: 1024px)";
  const [cols, setCols] = React.useState(() => (window.matchMedia(consulta).matches ? 2 : 1));
  React.useEffect(() => {
    const mq = window.matchMedia(consulta);
    const cambio = () => setCols(mq.matches ? 2 : 1);
    mq.addEventListener("change", cambio);
    return () => mq.removeEventListener("change", cambio);
  }, []);
  return cols;
}

export function FaqV6() {
  const f = siteConfig.sections.faq!;
  const L = localeConfig;
  const items = (f.items || []).filter((x) => x && x.question && x.answer);
  const dinamica = resolveVariant(siteConfig.sections.gallery?.variant) === "v7" ? "v7" : "v6";
  const cols = useColumnas();
  const [abierta, setAbierta] = React.useState<number | null>(null);
  const mesaRef = React.useRef<HTMLDivElement | null>(null);
  const numero = toWhatsAppNumber(siteConfig.contact?.phone || "");
  const flecha = L.dir === "rtl" ? "↖" : "↗";

  React.useEffect(() => { setAbierta(null); }, [L.lang, cols, dinamica, items.map((x) => x.question).join("|")]);
  // «fichas sobre la mesa»: recostadas hasta 12° lejos del centro de la pantalla, derechas en el centro; en A además las dos columnas
  // de escritorio se mueven en sentidos opuestos (±16 px), como el collage. Nada con reduced-motion.
  React.useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const tick = () => {
      raf = 0; const m = mesaRef.current; if (!m) return;
      const q = m.getBoundingClientRect(), vh = window.innerHeight;
      const p = Math.max(-1, Math.min(1, (q.top + q.height / 2 - vh / 2) / (vh / 2 + q.height / 2)));
      m.style.setProperty("--faq-tilt", (Math.min(1, Math.abs(p) * 1.6) * 12).toFixed(2) + "deg");
      m.style.setProperty("--faq-dy", (p * 16).toFixed(1) + "px");
    };
    const pedir = () => { if (!raf) raf = requestAnimationFrame(tick); };
    tick();
    window.addEventListener("scroll", pedir, { passive: true });
    window.addEventListener("resize", pedir);
    return () => { window.removeEventListener("scroll", pedir); window.removeEventListener("resize", pedir); if (raf) cancelAnimationFrame(raf); };
  }, [cols]);

  const columnas: React.ReactNode[][] = Array.from({ length: cols }, (): React.ReactNode[] => []);
  items.forEach((x, i) => {
    const abiertaEsta = abierta === i;
    columnas[i % cols].push(
      <li key={i} className="faq6-item" data-open={abiertaEsta ? "1" : "0"}>
        <div className="faq6-card">
          <h3 className="faq6-h">
            <button type="button" className="faq6-q" id={`faq6-${i}-q`} aria-expanded={abiertaEsta} aria-controls={`faq6-${i}-a`} onClick={() => setAbierta(abiertaEsta ? null : i)}>
              <span className="faq6-qt">{tipografia(x.question)}</span>
              <span className="faq6-sign" aria-hidden="true" />
            </button>
          </h3>
          <div className="faq6-a" id={`faq6-${i}-a`} role="region" aria-labelledby={`faq6-${i}-q`}>
            <div className="faq6-hoja"><p>{conRangos(x.answer)}</p></div>
          </div>
        </div>
      </li>,
    );
  });

  return (
    <section id="faq" data-faq="v6" aria-labelledby="faq6-title">
      <div className="faq6-wall" />
      <div className="faq6" data-dinamica={dinamica} data-hay-abierta={abierta !== null ? "1" : "0"}>
        <div ref={mesaRef} className="faq6-mesa">
          {columnas.map((c, k) => <ul key={k} className="faq6-col">{c}</ul>)}
        </div>
        <div className="faq6-foot">
          <div>
            <h2 id="faq6-title">{tipografia(f.title || "")}</h2>
            <p>{tipografia(f.subtitle || "")}</p>
          </div>
          {numero && (
            <a className="faq6-more" href={`https://wa.me/${numero}`} target="_blank" rel="noopener">{tipografia(`${L.faq.otherQuestion} ${flecha}`)}</a>
          )}
        </div>
      </div>
      {/* FAQPage JSON-LD, como la v1 */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: items.map((x) => ({ "@type": "Question", name: x.question, acceptedAnswer: { "@type": "Answer", text: x.answer } })) }) }}
      />
    </section>
  );
}
