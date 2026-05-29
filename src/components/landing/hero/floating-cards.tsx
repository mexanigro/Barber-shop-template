import { motion, useReducedMotion } from "motion/react";
import { Calendar, Clock, MapPin, Star } from "lucide-react";

/**
 * `<FloatingCards>` — the two decorative cards that hover next to the
 * Velvet Muse hero copy.
 *
 *   1. AvailabilityCard — clock + time-slot grid + location subcard +
 *      "view full schedule" link. Anchored bottom-left of the copy column.
 *
 *   2. TrustCard        — overlapping avatar stack + 5-star row +
 *      "Trusted by 500+ clients" label. Tucked into the right edge of
 *      the copy column.
 *
 * Both cards micro-bob continuously (translateY 2–4 px in a 4 s loop)
 * with a half-period phase offset so they never sway in sync — that
 * subtle desync is what sells the "papers on a desk" feel from the
 * mockup.
 *
 * The cards are positioned by the Hero parent via Tailwind absolute-
 * positioning utilities. We keep them as a standalone component so the
 * Hero stays readable AND so other variants (future Spa/Salon clients)
 * can drop them onto a custom canvas without rewriting the card guts.
 */

export type AvailabilitySlot = {
  /** Display label, e.g. "10:00 AM". */
  label: string;
  /** Whether this slot is highlighted as the user's current/recommended pick. */
  selected?: boolean;
};

export type AvailabilityCardConfig = {
  /** Heading at the top of the card. */
  title?: string;
  /** Time slots rendered in a 3×2 grid. */
  slots?: AvailabilitySlot[];
  /** Three lines: business name, street, city/zip. */
  address?: {
    name?: string;
    street?: string;
    cityZip?: string;
  };
  /** Optional thumbnail (40×40). Falls back to a generic decorative tile. */
  thumbnailSrc?: string;
  /** Footer link label. Default "View full schedule →". */
  footerLabel?: string;
  /** Footer link href. Default `#contact`. */
  footerHref?: string;
};

export type TrustCardConfig = {
  /** Rating number to show large. Default `"4.9/5"`. */
  rating?: string;
  /** Trust statement. Default `"Trusted by 500+ clients"`. */
  text?: string;
  /** Avatar URLs (3 recommended, will stack with overlap). */
  avatars?: string[];
};

type Props = {
  availability?: AvailabilityCardConfig | false;
  trust?: TrustCardConfig | false;
  /** Optional class for the AvailabilityCard wrapper (positioning). */
  availabilityClassName?: string;
  /** Optional class for the TrustCard wrapper (positioning). */
  trustClassName?: string;
};

const DEFAULT_SLOTS: AvailabilitySlot[] = [
  { label: "10:00 AM", selected: true },
  { label: "12:00 PM" },
  { label: "2:30 PM" },
  { label: "4:00 PM" },
  { label: "6:00 PM" },
  { label: "7:30 PM" },
];

const DEFAULT_AVATARS = [
  // Inline SVG data URLs — opaque ovals tinted with the rose-gold palette
  // so the trust card has something to render even when no real photos
  // are supplied. The Hero owner can override via config.
  encodeAvatar("#c9a37a"),
  encodeAvatar("#8b3a4b"),
  encodeAvatar("#d8b094"),
];

function encodeAvatar(fill: string): string {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'><circle cx='20' cy='20' r='20' fill='${fill}'/><circle cx='20' cy='16' r='6' fill='white' fill-opacity='0.45'/><path d='M8 36 Q20 24, 32 36 Z' fill='white' fill-opacity='0.45'/></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function FloatingCards({
  availability,
  trust,
  availabilityClassName,
  trustClassName,
}: Props) {
  const prefersReduced = useReducedMotion();

  const showAvailability = availability !== false;
  const showTrust = trust !== false;

  return (
    <>
      {showAvailability && (
        <AvailabilityCard
          config={availability || {}}
          className={availabilityClassName}
          prefersReduced={!!prefersReduced}
        />
      )}
      {showTrust && (
        <TrustCard
          config={trust || {}}
          className={trustClassName}
          prefersReduced={!!prefersReduced}
        />
      )}
    </>
  );
}

function AvailabilityCard({
  config,
  className,
  prefersReduced,
}: {
  config: AvailabilityCardConfig;
  className?: string;
  prefersReduced: boolean;
}) {
  const slots = config.slots ?? DEFAULT_SLOTS;
  const title = config.title ?? "Today's availability";
  const footerLabel = config.footerLabel ?? "View full schedule →";
  const footerHref = config.footerHref ?? "#contact";

  return (
    <motion.div
      // Entry: fade + slight rise. Continuous bob handled in CSS via
      // animation keyframes (kept off the JS thread → no rAF tax).
      initial={prefersReduced ? false : { opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className={[
        "vm-bob-a w-[300px] max-w-[88vw] rounded-3xl border border-[#efe4d8] bg-white/85 p-4 shadow-[0_24px_60px_-30px_rgba(95,40,55,0.35)] backdrop-blur-xl",
        className ?? "",
      ].join(" ")}
      style={{
        // Custom property consumed by the CSS keyframe below so the bob
        // amplitude is tweakable without editing global CSS.
        // The actual `@keyframes vm-bob-a` lives in the Hero component's
        // inline <style> block so this file stays self-contained at the
        // component level (no global CSS pollution from a leaf card).
        ["--vm-bob-amp" as string]: prefersReduced ? "0px" : "3px",
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[#5f2837]">
          <Clock size={16} aria-hidden />
          <span className="text-[13px] font-medium">{title}</span>
        </div>
        <Calendar size={16} className="text-[#8b3a4b]" aria-hidden />
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        {slots.map((slot, i) => (
          <button
            key={`${slot.label}-${i}`}
            type="button"
            className={[
              "rounded-full px-2 py-1.5 text-[11px] font-medium transition-colors duration-200",
              slot.selected
                ? "bg-[#8b3a4b] text-white shadow-sm"
                : "bg-[#f7efe4] text-[#5f2837] hover:bg-[#8b3a4b] hover:text-white",
            ].join(" ")}
          >
            {slot.label}
          </button>
        ))}
      </div>

      {(config.address?.name || config.address?.street || config.address?.cityZip) && (
        <div className="mt-4 flex items-center gap-3 rounded-2xl bg-[#fdf6ec] p-2.5">
          <div
            className="h-10 w-10 shrink-0 rounded-xl bg-gradient-to-br from-[#c9a37a] to-[#8b3a4b]"
            style={
              config.thumbnailSrc
                ? {
                    backgroundImage: `url(${config.thumbnailSrc})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }
                : undefined
            }
            aria-hidden
          />
          <div className="flex min-w-0 flex-col text-[10.5px] leading-tight text-[#5f2837]">
            {config.address?.name && (
              <span className="truncate font-semibold">{config.address.name}</span>
            )}
            {config.address?.street && (
              <span className="truncate text-[#7a5965]">{config.address.street}</span>
            )}
            {config.address?.cityZip && (
              <span className="truncate text-[#7a5965]">{config.address.cityZip}</span>
            )}
          </div>
          <MapPin size={14} className="ml-auto text-[#8b3a4b]" aria-hidden />
        </div>
      )}

      <a
        href={footerHref}
        className="mt-3 inline-flex w-full justify-center text-[11px] font-medium text-[#8b3a4b] underline-offset-4 transition hover:underline"
      >
        {footerLabel}
      </a>
    </motion.div>
  );
}

function TrustCard({
  config,
  className,
  prefersReduced,
}: {
  config: TrustCardConfig;
  className?: string;
  prefersReduced: boolean;
}) {
  const rating = config.rating ?? "4.9/5";
  const text = config.text ?? "Trusted by 500+ clients";
  const avatars = config.avatars && config.avatars.length > 0 ? config.avatars : DEFAULT_AVATARS;

  return (
    <motion.div
      initial={prefersReduced ? false : { opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className={[
        "vm-bob-b w-[220px] max-w-[80vw] rounded-3xl border border-[#efe4d8] bg-white/85 p-3.5 shadow-[0_20px_50px_-26px_rgba(95,40,55,0.32)] backdrop-blur-xl",
        className ?? "",
      ].join(" ")}
      style={{
        ["--vm-bob-amp" as string]: prefersReduced ? "0px" : "2.5px",
      }}
    >
      <div className="flex items-center gap-3">
        {/* Avatar stack with overlap + white ring */}
        <div className="flex -space-x-2">
          {avatars.slice(0, 3).map((src, i) => (
            <img
              key={`avatar-${i}`}
              src={src}
              alt=""
              loading="lazy"
              decoding="async"
              className="h-7 w-7 rounded-full border-2 border-white object-cover shadow-sm"
            />
          ))}
        </div>

        <div className="flex flex-col">
          <div className="flex items-center gap-0.5" aria-label={`Rating ${rating}`}>
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                size={10}
                className="fill-[#c9a37a] text-[#c9a37a]"
                aria-hidden
              />
            ))}
          </div>
          <span className="text-[12px] font-semibold leading-tight text-[#5f2837]">{rating}</span>
        </div>
      </div>

      <p className="mt-2 text-[10.5px] leading-tight text-[#7a5965]">{text}</p>
    </motion.div>
  );
}
