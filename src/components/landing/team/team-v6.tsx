/**
 * team-v6.tsx — team de peluquería (TEAM-RESENAS-01, D-173), migrado de `diseno/team/prototipo/proto.{css,js}` (INFORME § 6.5,
 * TEAM-01 §§ 1, 3-bis y 3-ter; cerrado en local el 2026-09-28). La tarjeta es UN control: el enlace al perfil `/equipo/<slug>`
 * con nombre accesible «nombre · especialidad · team.viewProfile». Pie abajo, como services y galería: h2 + kicker + una sola
 * acción de texto que abre el wizard, y la descripción debajo. La dinámica no es un campo: sale de `sections.gallery.variant`
 * (v6 collage → A: zigzag en móvil y columnas que se mueven en escritorio; v7 mosaico → C: la foto se mueve dentro de la tarjeta).
 * Móvil: la misma foto en dos capas (la extensión desenfocada llena la tarjeta y el retrato nítido ocupa un costado); el bloque
 * de texto mide lo que su línea más larga ya partida (CSS no achica una caja después de partir líneas: lo hace `ajustarTexto`).
 * La frase de la tarjeta móvil es la primera oración de la bio y va en todas o en ninguna (CT-2). Ruso: una palabra de una letra
 * no cierra línea (D18). Estilos en index.css (`.team6…`).
 */
import React from "react";
import { siteConfig } from "../../../config/site";
import { localeConfig } from "../../../config/locale";
import { resolveVariant } from "../../../lib/section-variants";
import { handleImgError } from "../../../lib/utils";

type Props = { onBookClick: () => void; onNavigateToStaffProfile?: (slug: string) => void };

/** Las primeras oraciones de `t` que entran en `max` palabras (si la primera no entra, la primera igual). */
const lead = (t: string | undefined, max: number) => {
  if (!t) return "";
  const ss = t.trim().split(/(?<=[.!?…])\s+/);
  let o = "";
  for (const x of ss) { const n = o ? `${o} ${x}` : x; if (n.split(/\s+/).length > max) break; o = n; }
  return o || ss[0];
};
/** Ruso: una palabra de una letra (и, в, с, к, о, у, а, я) va pegada a la siguiente con espacio duro (D18). */
const tipografia = (t: string) => (localeConfig.lang === "ru" ? t.replace(/(^|\s)([а-яё])\s/giu, "$1$2 ") : t);

/** Móvil: cada bloque de texto mide lo que su línea más larga ya partida, así queda apoyado en el borde de afuera. */
function ajustarTexto(raiz: HTMLElement) {
  for (const body of Array.from(raiz.querySelectorAll<HTMLElement>(".team6-body"))) {
    body.style.width = "";
    if (window.innerWidth >= 1024) continue;
    const cs = getComputedStyle(body);
    let izq = Infinity, der = -Infinity;
    for (const hijo of Array.from(body.children)) {
      if (getComputedStyle(hijo).display === "none") continue;
      const r = document.createRange(); r.selectNodeContents(hijo);
      for (const q of Array.from(r.getClientRects())) { izq = Math.min(izq, q.left); der = Math.max(der, q.right); }
    }
    if (der > izq) body.style.width = `${Math.ceil(der - izq + parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight)) + 1}px`;
  }
}

export function TeamV6({ onBookClick, onNavigateToStaffProfile }: Props) {
  const staff = siteConfig.staff ?? [];
  const t = siteConfig.sections.team;
  const L = localeConfig;
  const dinamica = resolveVariant(siteConfig.sections.gallery?.variant) === "v7" ? "v7" : "v6";
  const flecha = L.dir === "rtl" ? "↖" : "↗";
  const linkToProfiles = siteConfig.features.enableStaffPages === true && !!onNavigateToStaffProfile;
  // CT-2: la primera oración de cada bio, escrita como encabezado; si una no entra en 10 palabras, ninguna tarjeta la lleva
  const primeras = staff.map((m) => (m.bio || "").trim().split(/(?<=[.!?…])\s+/)[0]);
  const conFrase = primeras.every((f) => f && f.split(/\s+/).length <= 10);
  const raizRef = React.useRef<HTMLDivElement | null>(null);
  const [pressed, setPressed] = React.useState<number | null>(null);

  React.useEffect(() => {
    const raiz = raizRef.current; if (!raiz) return;
    const ajustar = () => ajustarTexto(raiz);
    ajustar();
    window.addEventListener("resize", ajustar);
    document.fonts?.addEventListener("loadingdone", ajustar);
    // dinámica ligada al scroll (rAF), como galería: --team-dy ±24 px según la posición de la sección; nada con reduced-motion
    const quieto = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    const tick = () => { raf = 0; const q = raiz.getBoundingClientRect(), vh = window.innerHeight; const p = Math.max(-1, Math.min(1, (q.top + q.height / 2 - vh / 2) / (vh / 2 + q.height / 2))); raiz.style.setProperty("--team-dy", (p * 24).toFixed(1) + "px"); };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(tick); };
    if (!quieto) { tick(); window.addEventListener("scroll", onScroll, { passive: true }); window.addEventListener("resize", tick); }
    return () => {
      window.removeEventListener("resize", ajustar);
      document.fonts?.removeEventListener("loadingdone", ajustar);
      window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", tick);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [staff.map((m) => m.id + m.name + m.specialty + (m.bio ?? "")).join("|"), L.lang, dinamica]);

  return (
    // la caja de la sección es la de la v1 (las mismas clases): local monta la variante dentro de ella; fondo y relleno en index.css
    <section id="team" data-team="v6" aria-labelledby="team-title" className="relative flex flex-col justify-center overflow-hidden bg-background px-5 py-8 transition-colors duration-300 sm:px-6 sm:py-28 lg:block">
      <div ref={raizRef} className="team6" data-dinamica={dinamica}>
        <ul className="team6-list">
          {staff.map((m, i) => {
            const href = `/equipo/${encodeURIComponent(m.slug)}`;
            return (
              <li key={m.id ?? i}>
                <a
                  className="team6-card"
                  href={href}
                  aria-label={`${m.name} · ${m.specialty} · ${L.team?.viewProfile || ""}`}
                  data-pressed={pressed === i ? "" : undefined}
                  onClick={(e) => { if (linkToProfiles) { e.preventDefault(); onNavigateToStaffProfile!(m.slug); } }}
                  onPointerDown={() => setPressed(i)}
                  onPointerUp={() => setPressed(null)}
                  onPointerCancel={() => setPressed(null)}
                  onPointerLeave={() => setPressed(null)}
                >
                  {/* móvil: la misma foto, extendida y desenfocada, llena la tarjeta */}
                  <img className="team6-ext" src={m.photoUrl || ""} alt="" loading="lazy" decoding="async" onError={handleImgError} />
                  <div className="team6-photo"><img src={m.photoUrl || ""} alt="" loading="lazy" decoding="async" onError={handleImgError} /></div>
                  <div className="team6-body">
                    <span className="team6-name">{tipografia(m.name)}</span>
                    <span className="team6-role">{tipografia(m.specialty)}</span>
                    {m.bio && <span className="team6-bio">{tipografia(lead(m.bio, 24))}</span>}
                    {conFrase && <span className="team6-tag">{tipografia(primeras[i])}</span>}
                    <span className="team6-cue">{tipografia(`${L.team?.viewProfile || ""} ${flecha}`)}</span>
                  </div>
                </a>
              </li>
            );
          })}
        </ul>
        <div className="team6-foot">
          <div>
            <h2 id="team-title">{tipografia(t.subtitle || "")}</h2>
            <p>{tipografia(t.title || "")}</p>
          </div>
          <button type="button" className="team6-book" onClick={onBookClick}>{tipografia(`${L.buttons?.bookAppointment || ""} ${flecha}`)}</button>
        </div>
        {t.description && <p className="team6-desc">{tipografia(t.description)}</p>}
      </div>
    </section>
  );
}
