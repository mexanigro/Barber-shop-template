/**
 * PersistentBookingBar — barra fija inferior (móvil) con dos acciones:
 * reservar (wizard) y WhatsApp (wa.me). BLOQUE-04, brief peluquería, referencia
 * Lamborghini [R5]: un solo elemento de acento por pantalla, radio 0,
 * separación por superficie (borde superior), sin sombras.
 *
 * Se monta sólo si `features.persistentBooking` es true (falso en los seis
 * nichos existentes). Aparece al salir del hero (el hero ya lleva sus dos CTA),
 * sólo por debajo de `lg` (en escritorio el navbar tiene el CTA). Marca
 * `html[data-persistent-booking="1"]` para que index.css eleve los FAB
 * (a11y, scroll-top) y reserve el alto en el body — nada de eso ocurre en los
 * nichos sin la barra.
 */
import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { Calendar, MessageCircle } from "lucide-react";
import { siteConfig } from "../../config/site";
import { localeConfig } from "../../config/locale";
import { toWhatsAppNumber } from "../../lib/whatsapp";

export function PersistentBookingBar({ onBookClick }: { onBookClick: () => void }) {
  const [pastHero, setPastHero] = React.useState(false);

  React.useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-persistent-booking", "1");
    return () => root.removeAttribute("data-persistent-booking");
  }, []);

  React.useEffect(() => {
    // El hero puede montarse después (módulos lazy): buscarlo hasta 5 s antes de rendirse.
    let io: IntersectionObserver | null = null;
    let tries = 0;
    const timer = window.setInterval(() => {
      const hero = document.getElementById("hero");
      if (hero) {
        window.clearInterval(timer);
        io = new IntersectionObserver(([e]) => setPastHero(!e.isIntersecting), { threshold: 0.15 });
        io.observe(hero);
      } else if (++tries > 20) {
        window.clearInterval(timer);
        setPastHero(true);
      }
    }, 250);
    return () => { window.clearInterval(timer); io?.disconnect(); };
  }, []);

  const phone = toWhatsAppNumber(siteConfig.contact.phone);
  const showBooking = siteConfig.features.showBooking;

  return (
    <AnimatePresence>
      {pastHero && (
        <motion.div
          role="region"
          aria-label={localeConfig.buttons.bookNow}
          initial={{ y: 72 }}
          animate={{ y: 0 }}
          exit={{ y: 72 }}
          transition={{ duration: 0.28, ease: [0.23, 1, 0.32, 1] }}
          className="fixed inset-x-0 bottom-0 z-40 flex h-[var(--persistent-booking-h,3.5rem)] items-stretch border-t border-border bg-background pb-[env(safe-area-inset-bottom)] lg:hidden"
        >
          {showBooking && (
            <button
              type="button"
              onClick={onBookClick}
              className="flex flex-1 items-center justify-center gap-2 bg-primary px-4 text-sm font-semibold text-primary-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-foreground/60"
            >
              <Calendar size={16} aria-hidden="true" />
              {localeConfig.buttons.bookNow}
            </button>
          )}
          {phone && (
            <a
              href={`https://wa.me/${phone}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={localeConfig.inquiry.whatsapp}
              className={`flex items-center justify-center gap-2 border-border bg-background px-4 text-sm font-medium text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/60 ${showBooking ? "w-16 border-s" : "flex-1"}`}
            >
              <MessageCircle size={18} aria-hidden="true" />
              {!showBooking && <span>{localeConfig.inquiry.whatsapp}</span>}
            </a>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
