/**
 * WhatsAppFab — botón flotante de WhatsApp global (toda la web). BLOQUE-04.
 *
 * Se monta sólo con `features.whatsappFab` (true por defecto en peluquería;
 * ausente en los seis nichos y en employment, que conserva su propio botón en
 * Chatbot.tsx). Ocupa la plaza del FAB de chat de la flota, medida en los
 * seis: `end-4 sm:end-6`, `bottom-24 sm:bottom-28` con el hero en pantalla y
 * `bottom-20 sm:bottom-[5.5rem]` al bajar (por encima de ScrollToTop
 * `bottom-6`). Mapa de esquinas con la barra fija: en móvil, mientras la barra
 * está en pantalla, index.css lo oculta (`data-persistent-booking-shown`), la
 * barra ya lleva WhatsApp; el icono de pausa del hero queda debajo
 * (`bottom-5 end-4`) y el FAB de accesibilidad en el lado inicio.
 */
import React from "react";
import { motion } from "motion/react";
import { siteConfig } from "../../config/site";
import { localeConfig } from "../../config/locale";
import { toWhatsAppNumber } from "../../lib/whatsapp";

// Logo oficial de WhatsApp (un solo path, currentColor). Misma ruta que Chatbot.tsx.
function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347M12.05 21.785h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0 0 20.464 3.488" />
    </svg>
  );
}

export function WhatsAppFab() {
  const [inHero, setInHero] = React.useState(() => typeof window === "undefined" || window.scrollY <= 50);
  React.useEffect(() => {
    const onScroll = () => setInHero(window.scrollY <= 50);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const number = toWhatsAppNumber(siteConfig.contact.phone);
  if (!number) return null;

  return (
    <motion.a
      href={`https://wa.me/${number}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={localeConfig.inquiry.whatsapp}
      data-whatsapp-fab=""
      initial={{ scale: 0.85, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
      whileTap={{ scale: 0.93 }}
      className={`fixed end-4 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-[#25D366] text-white shadow-xl shadow-[#25D366]/40 ring-1 ring-white/10 hover:bg-[#1ebd5b] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366]/60 sm:end-6 sm:h-14 sm:w-14 ${inHero ? "bottom-24 sm:bottom-28" : "bottom-20 sm:bottom-[5.5rem]"}`}
      style={{ transition: "bottom 0.5s cubic-bezier(0.23,1,0.32,1), background-color 0.2s cubic-bezier(0.23,1,0.32,1)" }}
    >
      <WhatsAppIcon className="h-6 w-6 sm:h-7 sm:w-7" />
    </motion.a>
  );
}
