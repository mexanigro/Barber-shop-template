/**
 * footer-v6.tsx — el cierre y el pie de peluquería (CONTACTO-PIE-01, D-202), migrada de `diseno/pie/prototipo/proto.{css,js}`
 * (INFORME § 6.10, PIE-01 §§ 1 y 2; aprobada en local el 2026-09-29). La misma en A y en C; cambia la foto del cierre.
 *  - El cierre (sólo con `features.showBooking`): una tarjeta con la escena que abre la web —el póster del hero; en móvil el vertical—,
 *    el texto sobre el scrim tonal y reservar en contorno (la única acción rellena es la del navbar), que abre el mismo asistente que
 *    la v1. La foto se mueve dentro de la tarjeta con el scroll (±18 px; nada con reduced-motion).
 *  - El pie: la marca (el logo de la tinta del modo, que vuelve arriba, y `brand.tagline`), los MISMOS enlaces que el navbar
 *    (`buildNavLinks` de navbar-v6: texto, orden y ancla), cada uno a su sección —la v1 volvía arriba de todo y ofrecía «¿por qué
 *    elegirnos?»—, el contacto (la dirección en el idioma de la página, D-205) y la barra legal con los 3 legales y «ניהול», que
 *    navegan como en la v1. La marca va aislada en `<bdi>` en la línea «©».
 * Superficie: el footer en --surface y la pared de textura en una capa propia con la máscara de la galería (index.css, `.pie6…`).
 */
import React from "react";
import { siteConfig } from "../../../config/site";
import { localeConfig } from "../../../config/locale";
import { LEGAL_ROUTES, type LegalDocKind } from "../../../config/legalContent";
import type { PublicShellPage } from "../../../types";
import { useAdminAccess } from "../../../hooks/useAdminAccess";
import { toWhatsAppNumber } from "../../../lib/whatsapp";
import { buildNavLinks } from "../navbar/navbar-v6";

/** Ruso: una palabra de una letra va pegada a la siguiente con espacio duro (D18); también la que sigue a otra de una letra. */
const tipografia = (t: string) => (localeConfig.lang === "ru" ? t.replace(/(?<=^|\s)([а-яё])\s/giu, "$1 ") : t);
const suave = () => (window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth") as ScrollBehavior;

/** El modo de la página (html.dark), para el logo de la tinta del modo. */
function useOscuro(): boolean {
  const leer = () => document.documentElement.classList.contains("dark");
  const [oscuro, setOscuro] = React.useState(leer);
  React.useEffect(() => {
    const mo = new MutationObserver(() => setOscuro(leer()));
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => mo.disconnect();
  }, []);
  return oscuro;
}

export function FooterV6({ onAdminClick, onLegalNavigate, onPageChange, onBookClick }: {
  onAdminClick: () => void;
  onLegalNavigate: (policy: LegalDocKind) => void;
  onPageChange: (page: PublicShellPage) => void;
  onBookClick?: () => void;
}) {
  const cfg = siteConfig, L = localeConfig, F = L.footer;
  const { user, loading: authLoading, isAdmin } = useAdminAccess();
  const verAdmin = !authLoading && (!user || isAdmin);
  const oscuro = useOscuro();
  const cardRef = React.useRef<HTMLDivElement | null>(null);
  const flecha = L.dir === "rtl" ? "↖" : "↗";

  // la foto del cierre se mueve dentro de su tarjeta al hacer scroll (como la foto de team en C y el carrusel de services)
  React.useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const tick = () => {
      raf = 0; const c = cardRef.current; if (!c) return;
      const q = c.getBoundingClientRect(), vh = window.innerHeight;
      const p = Math.max(-1, Math.min(1, (q.top + q.height / 2 - vh / 2) / (vh / 2 + q.height / 2)));
      c.style.setProperty("--pie-dy", (p * 18).toFixed(1) + "px");
    };
    const pedir = () => { if (!raf) raf = requestAnimationFrame(tick); };
    tick();
    window.addEventListener("scroll", pedir, { passive: true });
    window.addEventListener("resize", pedir);
    return () => { window.removeEventListener("scroll", pedir); window.removeEventListener("resize", pedir); if (raf) cancelAnimationFrame(raf); };
  }, []);

  const v = cfg.hero?.video ?? ({} as NonNullable<typeof cfg.hero.video>);
  const poster = v.poster || cfg.hero?.backgroundImage || "";
  const logo = oscuro ? (cfg.brand?.logoDark || cfg.brand?.logo) : (cfg.brand?.logo || cfg.brand?.logoDark);
  const enlaces = buildNavLinks().map((x) => ({ href: x.href, txt: L.nav[x.id] })).filter((x) => x.txt);
  const c = cfg.contact || ({} as typeof cfg.contact), ad = c.address || ({} as typeof c.address);
  const direccion = [ad.street, ad.district, ad.cityStateZip].map((s) => (s || "").trim()).filter(Boolean).join(", ");
  const numero = toWhatsAppNumber(c.phone || "");
  const contacto: { txt: string; href: string; ltr?: boolean }[] = [
    ...(direccion ? [{ txt: direccion, href: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(direccion)}` }] : []),
    ...(c.phone ? [{ txt: c.phone, href: `tel:${c.phone.replace(/[^\d+]/g, "")}`, ltr: true }] : []),
    ...(numero ? [{ txt: "WhatsApp", href: `https://wa.me/${numero}` }] : []),
    ...(c.email ? [{ txt: c.email, href: `mailto:${c.email}`, ltr: true }] : []),
    ...(c.social?.instagram ? [{ txt: "Instagram", href: c.social.instagram }] : []),
  ];
  const legales: { kind: LegalDocKind; label: string }[] = [
    { kind: "privacy", label: F.privacyPolicy },
    { kind: "terms", label: F.termsConditions },
    { kind: "cancellation", label: F.cancellationPolicy },
  ];

  const alInicio = (e: React.MouseEvent) => {
    e.preventDefault();
    if (window.location.pathname === "/") window.scrollTo({ top: 0, behavior: suave() });
    else onPageChange("landing");
  };
  const aSeccion = (e: React.MouseEvent, href: string) => {
    e.preventDefault();
    const d = document.querySelector(href);
    if (d) d.scrollIntoView({ behavior: suave() });
    else { onPageChange("landing"); window.location.hash = href; }
  };

  return (
    <footer data-pie="v6" className="border-t border-border bg-muted transition-colors duration-300 dark:bg-background">
      <div className="pie6">
        <div className="pie6-wall" />
        {cfg.features.showBooking && onBookClick && (
          <section className="cierre6" aria-labelledby="cierre6-title">
            <div ref={cardRef} className="cierre6-card">
              <picture>
                {v.portrait?.poster && <source media="(max-width: 767.98px)" srcSet={v.portrait.poster} />}
                <img className="cierre6-foto" src={poster} alt="" loading="lazy" decoding="async" />
              </picture>
              <div className="cierre6-texto">
                <p className="cierre6-eyebrow">{tipografia(F.ctaEyebrow || "")}</p>
                <h2 className="cierre6-titulo" id="cierre6-title">{tipografia(F.ctaTitle || "")}</h2>
                <button type="button" className="cierre6-accion" onClick={onBookClick}>{tipografia(`${L.buttons?.bookAppointment || ""} ${flecha}`)}</button>
              </div>
            </div>
          </section>
        )}
        <div className="pie6-cuerpo">
          <div className="pie6-marca">
            <a className="pie6-logo" href="/" aria-label={cfg.brand?.name || ""} onClick={alInicio}>
              {logo ? <img src={logo} alt="" /> : <span>{tipografia(cfg.brand?.name || "")}</span>}
            </a>
            {cfg.brand?.tagline && <p className="pie6-linea">{tipografia(cfg.brand.tagline)}</p>}
          </div>
          {enlaces.length > 0 && (
            <nav className="pie6-col" aria-labelledby="pie6-nav">
              <h2 className="pie6-h" id="pie6-nav">{tipografia(F.exploreTitle || "")}</h2>
              <ul className="pie6-lista pie6-lista--nav">
                {enlaces.map((x) => <li key={x.href}><a href={x.href} onClick={(e) => aSeccion(e, x.href)}>{tipografia(x.txt)}</a></li>)}
              </ul>
            </nav>
          )}
          <div className="pie6-col">
            <h2 className="pie6-h" id="pie6-contacto">{tipografia(F.contactHeading || "")}</h2>
            <ul className="pie6-lista">
              {contacto.map((x) => (
                <li key={x.href}>
                  <a href={x.href} dir={x.ltr ? "ltr" : undefined} {...(/^https?:/.test(x.href) ? { target: "_blank", rel: "noopener" } : {})}>{tipografia(x.txt)}</a>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="pie6-barra">
          {/* sólo el nombre aislado: con «© año» adentro, un nombre en hebreo daba vuelta el orden en la página en inglés */}
          <p className="pie6-copy">{`© ${new Date().getFullYear()} `}<bdi>{cfg.brand?.name || ""}</bdi>{`. ${tipografia(F.rightsReserved || "")}`}</p>
          <ul className="pie6-legal">
            {legales.map(({ kind, label }) => (
              <li key={kind}><a href={LEGAL_ROUTES[kind]} onClick={(e) => { e.preventDefault(); onLegalNavigate(kind); }}>{tipografia(label)}</a></li>
            ))}
            {verAdmin && <li><button type="button" onClick={onAdminClick}>{tipografia(F.admin)}</button></li>}
          </ul>
        </div>
      </div>
    </footer>
  );
}
