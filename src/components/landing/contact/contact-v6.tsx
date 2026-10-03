/**
 * contact-v6.tsx — contacto de peluquería, «ubicación y horarios» + «contacto» (CONTACTO-PIE-01, D-202), migrada de
 * `diseno/contacto/prototipo/proto.{css,js}` (INFORME § 6.9, CONTACTO-01 §§ 2 a 4; cerrada en local el 2026-09-28). La v1 (una sola
 * sección de 1.592 px en móvil) se parte en dos bloques dentro de `#contact`, cada uno un `<section>` con su h2:
 *  - ubicación y horarios: el mapa es UNA tarjeta y un solo control (toda la tarjeta abre Google Maps; el iframe es vista previa: sin
 *    toque, fuera del foco y del lector, en gris con el tinte del acento) y la tarjeta de horarios flota sobre su borde; el mapa se
 *    pide recién a una pantalla de distancia y con la página ya armada (D21, D-204: el prototipo lo pedía con el splash arriba);
 *  - contacto (sólo con `features.showInquiry`): la descripción y el formulario en una tarjeta, con etiquetas reales y el mismo envío
 *    que la v1 (`POST /api/contact`).
 * La dinámica sale de `sections.gallery.variant` (v6 collage → A: en escritorio mapa y tarjeta en sentidos opuestos con el scroll;
 * v7 mosaico → C: quietos). Cada rango de horas en `<bdi dir="ltr">` (D19) y en ruso una palabra de una letra no cierra línea (D18).
 * Lee la dirección en el idioma de la página (`translations.<lang>.contact.address`, D-205). Estilos en index.css (`.ct6…`).
 */
import React from "react";
import { siteConfig } from "../../../config/site";
import { localeConfig } from "../../../config/locale";
import { resolveVariant } from "../../../lib/section-variants";
import { orderedDayKeys, fmtRange } from "../../../lib/hours-display";
import { toWhatsAppNumber } from "../../../lib/whatsapp";
import type { BusinessHours } from "../../../types";

/** Ruso: una palabra de una letra va pegada a la siguiente con espacio duro (D18); también la que sigue a otra de una letra. */
const tipografia = (t: string) => (localeConfig.lang === "ru" ? t.replace(/(?<=^|\s)([а-яё])\s/giu, "$1 ") : t);
const DIAS: (keyof BusinessHours)[] = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
/** La página está armada: el splash se fue (mientras está, el body no scrollea y las secciones todavía no tienen su lugar). */
const armada = () => document.body.style.overflow !== "hidden" && !document.querySelector('[role="dialog"][aria-modal="true"]');

/** D21: el src del mapa recién cuando la tarjeta está a una pantalla de distancia, medido con la página armada. */
function useMapaDiferido(ref: React.RefObject<HTMLElement | null>, src: string): string | null {
  const [listo, setListo] = React.useState<string | null>(null);
  React.useEffect(() => {
    const m = ref.current; if (!m || !src) return;
    let vivo = true, cuadro = 0;
    const cerca = () => { const q = m.getBoundingClientRect(); return q.width > 0 && q.top < window.innerHeight * 2 && q.bottom > -window.innerHeight; };
    // el observador avisa cuando cambia el cruce; antes de dar el mapa por pedido se confirma, dos cuadros después, que la página está
    // armada y la tarjeta sigue cerca (al montar, con el splash arriba, la página todavía no tiene su largo y todo parece cerca)
    const confirmar = () => { cancelAnimationFrame(cuadro); cuadro = requestAnimationFrame(() => { cuadro = requestAnimationFrame(() => {
      if (!vivo) return;
      if (!armada()) { confirmar(); return; }
      if (cerca()) { setListo(src); io.disconnect(); }
    }); }); };
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) confirmar(); }, { rootMargin: "100% 0px" });
    io.observe(m);
    return () => { vivo = false; cancelAnimationFrame(cuadro); io.disconnect(); };
  }, [ref, src]);
  return listo === src ? src : null;
}

/** Pie de un bloque, como el resto de la web: h2 + kicker + la acción. */
function Pie({ id, h2, kicker, accion }: { id: string; h2?: string; kicker?: string; accion?: React.ReactNode }) {
  return (
    <div className="ct6-foot">
      <div>
        <h2 id={id}>{tipografia(h2 || "")}</h2>
        {kicker && <p>{tipografia(kicker)}</p>}
      </div>
      {accion}
    </div>
  );
}

function Formulario() {
  const I = localeConfig.inquiry;
  const [estado, setEstado] = React.useState<"" | "ok" | "error">("");
  const [enviando, setEnviando] = React.useState(false);
  const enviar = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    setEnviando(true); setEstado("");
    // el mismo envío que la v1 (POST /api/contact con name, email, subject, message)
    try {
      const r = await fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(new FormData(form))) });
      if (!r.ok) throw new Error();
      form.reset(); setEstado("ok");
    } catch { setEstado("error"); }
    setEnviando(false);
  };
  const campo = (name: string, label: string, tipo: string, extra: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div className="form6-campo">
      <label htmlFor={`form6-${name}`}>{tipografia(label || "")}</label>
      {tipo === "textarea"
        ? <textarea id={`form6-${name}`} name={name} rows={4} required />
        : <input id={`form6-${name}`} name={name} type={tipo} {...extra} />}
    </div>
  );
  return (
    <form className="form6-card" onSubmit={enviar} data-estado={estado || undefined}>
      {campo("name", I.placeholderName, "text", { required: true, autoComplete: "name" })}
      {campo("email", I.placeholderEmail, "email", { required: true, autoComplete: "email" })}
      {campo("subject", I.placeholderSubject, "text")}
      {campo("message", I.placeholderMessage, "textarea")}
      <button type="submit" className="form6-enviar" disabled={enviando}>{tipografia(I.send || "")}</button>
      <p className="form6-estado" role="status" aria-live="polite">{estado === "ok" ? I.success : estado === "error" ? I.error : ""}</p>
    </form>
  );
}

export function ContactV6() {
  const cfg = siteConfig, L = localeConfig, feat = cfg.features;
  const a = cfg.contact?.address || ({} as Partial<typeof cfg.contact.address>);
  const direccion = [a.street, a.district, a.cityStateZip].map((x) => (x || "").trim()).filter(Boolean).join(", ");
  const dinamica = resolveVariant(cfg.sections.gallery?.variant) === "v7" ? "v7" : "v6";
  const flecha = L.dir === "rtl" ? "↖" : "↗";
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(direccion)}`;
  const mapaRef = React.useRef<HTMLAnchorElement | null>(null);
  const escenaRef = React.useRef<HTMLDivElement | null>(null);
  const conMapa = feat.showLocation && !!direccion;
  const src = useMapaDiferido(mapaRef, conMapa ? `https://www.google.com/maps?q=${encodeURIComponent(direccion)}&output=embed&hl=${L.lang}` : "");

  // A (collage): mapa y horarios en sentidos opuestos (±14 px) ligados al scroll, como las columnas de galería. Nada con reduced-motion.
  React.useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const tick = () => {
      raf = 0; const e = escenaRef.current; if (!e) return;
      const q = e.getBoundingClientRect(), vh = window.innerHeight;
      const p = Math.max(-1, Math.min(1, (q.top + q.height / 2 - vh / 2) / (vh / 2 + q.height / 2)));
      e.style.setProperty("--ct-dy", (p * 14).toFixed(1) + "px");
    };
    const pedir = () => { if (!raf) raf = requestAnimationFrame(tick); };
    tick();
    window.addEventListener("scroll", pedir, { passive: true });
    window.addEventListener("resize", pedir);
    return () => { window.removeEventListener("scroll", pedir); window.removeEventListener("resize", pedir); if (raf) cancelAnimationFrame(raf); };
  }, []);

  if (!feat.showInquiry && !feat.showBusinessHours && !feat.showLocation) return null;
  const hoy = DIAS[new Date().getDay()];
  const numero = toWhatsAppNumber(cfg.contact?.phone || "");
  const c = cfg.sections.contact || ({} as typeof cfg.sections.contact);

  return (
    <section id="contact" data-ct="v6" className="flex flex-col justify-center bg-background px-5 py-8 transition-colors duration-300 sm:px-6 sm:py-24 lg:block">
      <div className="ct6" data-dinamica={dinamica}>
        {(feat.showLocation || feat.showBusinessHours) && (
          <section className="ubi6" aria-labelledby="ubi6-title">
            <div ref={escenaRef} className="ubi6-escena">
              {conMapa && (
                <a ref={mapaRef} className="ubi6-mapa" href={mapsUrl} target="_blank" rel="noopener" aria-label={`${L.location?.openGoogleMaps || ""}: ${direccion}`}>
                  <iframe src={src ?? undefined} title={L.location?.mapAlt || ""} loading="lazy" tabIndex={-1} aria-hidden="true" referrerPolicy="no-referrer-when-downgrade" />
                  <span className="ubi6-tinte" />
                </a>
              )}
              {feat.showBusinessHours && cfg.hours && (
                <div className="ubi6-horas">
                  <p className="ubi6-eyebrow">{tipografia(L.businessHours?.eyebrow || "")}</p>
                  {direccion && <p className="ubi6-dir">{tipografia(direccion)}</p>}
                  <ul className="ubi6-lista">
                    {orderedDayKeys().map((k) => {
                      const slot = cfg.hours[k];
                      return (
                        <li key={k} data-hoy={k === hoy ? "1" : undefined} data-cerrado={!slot ? "1" : undefined}>
                          {/* la pastilla de «hoy» va al lado del día, no dentro (cada texto con su color) */}
                          <span className="ubi6-izq">
                            <span className="ubi6-dia">{tipografia(L.businessHours?.days?.[k]?.label || k)}</span>
                            {k === hoy && <span className="ubi6-hoy">{tipografia(L.businessHours?.today || "")}</span>}
                          </span>
                          <span className="ubi6-rango">{slot ? <bdi dir="ltr">{fmtRange(slot)}</bdi> : tipografia(L.businessHours?.closed || "")}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
            <Pie id="ubi6-title" h2={cfg.sections.location?.subtitle} kicker={cfg.sections.location?.title}
              accion={conMapa ? <a className="ct6-more" href={mapsUrl} target="_blank" rel="noopener">{tipografia(`${L.location?.openInMaps || ""} ${flecha}`)}</a> : undefined} />
          </section>
        )}
        {feat.showInquiry && (
          <section className="form6" aria-labelledby="form6-title">
            <div className="form6-cuerpo">
              {c.description && <p className="form6-desc">{tipografia(c.description)}</p>}
              <Formulario />
            </div>
            <Pie id="form6-title" h2={c.subtitle} kicker={c.title}
              accion={numero ? <a className="ct6-more" href={`https://wa.me/${numero}`} target="_blank" rel="noopener">{`WhatsApp ${flecha}`}</a> : undefined} />
          </section>
        )}
      </div>
    </section>
  );
}
