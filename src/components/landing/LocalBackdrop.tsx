/**
 * LocalBackdrop — fondo fijo con la foto del local (REPLANTEO-01 D5 · FONDO-05, prototipo 2-C). Sólo peluquería.
 *
 * Copia SÓLO el mecanismo `sticky` de LandingBackdrop.tsx (capa `position: sticky; top: 0` con la MISMA altura que el hero
 * —`100lvh`, respaldo `100vh`, R7 precisada 2026-09-19— que ocupa esa altura en el flujo y contenido con el mismo `margin-top` negativo por encima; sin `position: fixed`, sin
 * `background-attachment: fixed`, que iOS ignora). Del resto no se copia nada: ni el overlay `#000`, ni la imagen
 * única, ni el alcance hero + services, ni el zoom/fundido ligados al scroll.
 *
 * Diferencias con D5: el hero queda FUERA (tiene su propio vídeo); el contenedor sticky empieza JUSTO donde termina
 * el hero (nunca antes: nada tapa el hero, R7) y cubre todas las secciones siguientes; dos imágenes (`branding.localPhoto` ≥ 1024 px, `localPhotoMobile`
 * < 1024 px) por <picture>; overlay tonal en `--scrim` (nunca #000); cada sección declara velo (claro, `--surface` a
 * `--veil`) o liso (`--surface-alt`) en index.css. Sin `branding.localPhoto` la capa no se monta y todo va liso.
 * Con `prefers-reduced-motion` nada cambia: es estático.
 */
import React from "react";
import { siteConfig } from "../../config/site";
import { heroSeam } from "../../lib/hero-seam";

export function LocalBackdrop({ hero, children }: { hero: React.ReactNode; children: React.ReactNode }) {
  const photo = siteConfig.branding?.localPhoto;
  const photoMobile = siteConfig.branding?.localPhotoMobile;
  const texture = siteConfig.branding?.texture;
  const h2b = siteConfig.branding?.heroToBackdrop;
  // R20 (costura) y R21 (textura): tokens en <html> que leen el hero (scrim que muere en el pie del clip), la primera sección
  // (banda del pie → velo) y las secciones en textura. El pie 9:16 manda en retrato (el hero sirve hero-v).
  React.useEffect(() => {
    const root = document.documentElement;
    const setFoot = () => {
      const portrait = window.matchMedia("(orientation: portrait)").matches;
      // S6: con costura clara la banda del pie es --surface (haze claro); con oscura, el pie del clip medido
      const foot = heroSeam() === "light" ? getComputedStyle(root).getPropertyValue("--surface").trim() || null : (portrait && h2b?.footPortrait?.hex) || h2b?.foot?.hex;
      if (foot) root.style.setProperty("--hero-foot", foot); else root.style.removeProperty("--hero-foot");
    };
    setFoot();
    if (texture) root.style.setProperty("--texture-url", `url("${texture}")`); else root.style.removeProperty("--texture-url");
    const mq = window.matchMedia("(orientation: portrait)"); mq.addEventListener("change", setFoot);
    return () => { mq.removeEventListener("change", setFoot); root.style.removeProperty("--hero-foot"); root.style.removeProperty("--texture-url"); };
  }, [h2b?.foot?.hex, h2b?.footPortrait?.hex, texture]);
  if (!photo) return <>{hero}<div data-backdrop-content="" data-backdrop-sin-foto="">{children}</div></>;
  return (
    <>
      {hero}
      <div className="relative" data-local-backdrop="">
        {/* Capa 1: la foto del local, fija mientras el bloque está en pantalla; se suelta con el bloque. */}
        <div aria-hidden="true" className="local-backdrop-layer pointer-events-none sticky top-0 z-0 overflow-hidden">
          <picture>
            {photoMobile && <source media="(max-width: 1023px)" srcSet={photoMobile} />}
            <img src={photo} alt="" className="absolute inset-0 h-full w-full object-cover" loading="eager" decoding="async" draggable={false} />
          </picture>
          {/* Overlay tonal: --scrim a baja opacidad para unificar el tono (R11); nunca negro */}
          <div className="absolute inset-0" style={{ backgroundColor: "color-mix(in srgb, var(--scrim, #000) calc(var(--local-tint, 0.06) * 100%), transparent)" }} />
        </div>
        {/* Capa 2: las secciones, por encima de la foto; cada una decide velo o liso */}
        <div className="local-backdrop-content relative z-10" data-backdrop-content="">
          {children}
        </div>
      </div>
    </>
  );
}
