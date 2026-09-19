/**
 * LocalBackdrop — fondo fijo con la foto del local (REPLANTEO-01 D5 · FONDO-05, prototipo 2-C). Sólo peluquería.
 *
 * Copia SÓLO el mecanismo `sticky` de LandingBackdrop.tsx (capa `position: sticky; top: 0; height: 100svh` que ocupa
 * 100svh en el flujo y contenido con `margin-top: -100svh` por encima; sin `position: fixed`, sin
 * `background-attachment: fixed`, que iOS ignora). Del resto no se copia nada: ni el overlay `#000`, ni la imagen
 * única, ni el alcance hero + services, ni el zoom/fundido ligados al scroll.
 *
 * Diferencias con D5: el hero queda FUERA (tiene su propio vídeo); el contenedor sticky empieza JUSTO donde termina
 * el hero y cubre todas las secciones siguientes; dos imágenes (`branding.localPhoto` ≥ 1024 px, `localPhotoMobile`
 * < 1024 px) por <picture>; overlay tonal en `--scrim` (nunca #000); cada sección declara velo (claro, `--surface` a
 * `--veil`) o liso (`--surface-alt`) en index.css. Sin `branding.localPhoto` la capa no se monta y todo va liso.
 * Con `prefers-reduced-motion` nada cambia: es estático.
 */
import React from "react";
import { siteConfig } from "../../config/site";

export function LocalBackdrop({ hero, children }: { hero: React.ReactNode; children: React.ReactNode }) {
  const photo = siteConfig.branding?.localPhoto;
  const photoMobile = siteConfig.branding?.localPhotoMobile;
  if (!photo) return <>{hero}{children}</>;
  return (
    <>
      {hero}
      <div className="relative" data-local-backdrop="">
        {/* Capa 1: la foto del local, fija mientras el bloque está en pantalla; se suelta con el bloque. */}
        <div aria-hidden="true" className="pointer-events-none sticky top-0 z-0 h-[100svh] overflow-hidden">
          <picture>
            {photoMobile && <source media="(max-width: 1023px)" srcSet={photoMobile} />}
            <img src={photo} alt="" className="absolute inset-0 h-full w-full object-cover" loading="eager" decoding="async" draggable={false} />
          </picture>
          {/* Overlay tonal: --scrim a baja opacidad para unificar el tono (R11); nunca negro */}
          <div className="absolute inset-0" style={{ backgroundColor: "color-mix(in srgb, var(--scrim, #000) calc(var(--local-tint, 0.06) * 100%), transparent)" }} />
        </div>
        {/* Capa 2: las secciones, por encima de la foto; cada una decide velo o liso */}
        <div className="relative z-10 -mt-[100svh]" data-backdrop-content="">
          {children}
        </div>
      </div>
    </>
  );
}
