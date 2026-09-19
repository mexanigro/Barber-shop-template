export type Service = {
  id: string;
  name: string;
  description: string;
  duration: number; // in minutes
  price: number;
  category?: string;
  subtitle?: string;
  image?: string;
  fromPrice?: string;
  features?: string[];
  popular?: boolean;
  /**
   * Optional Lucide icon name (e.g. "Scissors", "Sparkles") rendered by
   * 3D Impact service variants (`list-with-icons`). Falls back to a
   * niche-aware default when omitted. Resolved through
   * `resolveLucideIcon` so unknown names degrade to `HelpCircle`.
   */
  iconName?: string;
  /**
   * Tope del rango de precio (`price` es el mínimo). Sólo informativo:
   * el wizard sigue cobrando/mostrando `price`. Catálogo de peluquería (BLOQUE-04).
   */
  priceMax?: number;
  /**
   * Cómo se contrata el servicio: `reserva` (precio fijo → wizard) o `consulta`
   * (se cotiza → WhatsApp). Ausente = `reserva`, así los nichos existentes no cambian.
   */
  mode?: "reserva" | "consulta";
};

export type TimeRange = {
  start: string; // "HH:mm"
  end: string;   // "HH:mm"
};

export type SessionBreak = TimeRange & {
  label: string;
};

export type WorkDay = {
  isOpen: boolean;
  hours: TimeRange;
  breaks: SessionBreak[];
};

export type WeeklySchedule = {
  monday: WorkDay;
  tuesday: WorkDay;
  wednesday: WorkDay;
  thursday: WorkDay;
  friday: WorkDay;
  saturday: WorkDay;
  sunday: WorkDay;
};

export type BlockedSlot = {
  id: string;
  date: string; // YYYY-MM-DD
  start: string; // HH:mm
  end: string;   // HH:mm
  reason: string;
};

/**
 * Per-day scheduling exception stored in `staff_overrides.dateOverrides`.
 * Key is "YYYY-MM-DD". Takes precedence over the weekly schedule for that date.
 * Legacy `blockedDates: string[]` is kept for backwards compatibility.
 */
export type DateOverride =
  | { type: "dayOff" }
  | { type: "customHours"; start: string; end: string };

export type StaffMember = {
  id: string;
  /** Segmento URL para `/equipo/:slug` (único y estable). */
  slug: string;
  name: string;
  photoUrl: string;
  specialty: string;
  bio: string;
  /** Galería / portafolio del profesional (URLs de imagen). */
  portfolio: string[];
  social?: SocialLinks;
  schedule: WeeklySchedule;
  blockedDates?: string[]; // ["2024-12-25"] — legacy, kept for booking engine compat
  blockedSlots?: BlockedSlot[];
  /** Per-day exceptions: dayOff or custom start/end. Set via admin calendar. */
  dateOverrides?: Record<string, DateOverride>;
  /** Professional philosophy or approach statement (Aura team variant). */
  philosophy?: string;
  /** Professional qualifications / certifications (Aura team variant). */
  qualifications?: string[];
};

export type Testimonial = {
  name: string;
  title: string;
  text: string;
  rating: number;
  /** Optional video testimonial URL (mp4 or embeddable). Used by Testimonials v4. */
  videoUrl?: string;
  /** Optional avatar image URL. Variants fall back to an initial monogram. */
  avatar?: string;
};

export type SocialLinks = {
  instagram?: string;
  facebook?: string;
  twitter?: string;
  whatsapp?: string;
};

export type BusinessHours = {
  monday: { start: string; end: string } | null;
  tuesday: { start: string; end: string } | null;
  wednesday: { start: string; end: string } | null;
  thursday: { start: string; end: string } | null;
  friday: { start: string; end: string } | null;
  saturday: { start: string; end: string } | null;
  sunday: { start: string; end: string } | null;
};

export type SectionHeader = {
  title: string;
  subtitle: string;
  /**
   * Rol de superficie de la sección (SISTEMA-COLOR, BLOQUE-04): `base` = `--surface`,
   * `alt` = `--surface-alt`. Ausente = como siempre (la variante decide). Sólo lo leen las
   * variantes de peluquería (v6+); los seis nichos no cambian.
   */
  surface?: "base" | "alt" | "velo" | "liso";
  /**
   * REPLANTEO-01 D5 (fondo fijo, FONDO-05): opacidad del velo claro (`--surface`) sobre la foto del
   * local cuando `surface: "velo"`, 0–1. Ausente = el token del nicho (`--veil-*`, SISTEMA-COLOR § 2).
   */
  veil?: number;
};

export type Benefit = {
  title: string;
  desc: string;
  iconName: string; // lucide-react icon name as string
};

export type BusinessNiche = "barberia" | "estetica" | "tattoo" | "nails" | "cafeteria" | "remodelaciones" | "peluqueria" | "employment";

/* ═══════════════════════════════════════════════════════════════════════════
 * SECTION VARIANT SYSTEM
 * Every landing section ships 5 visual variants selectable per client from
 * Firestore `config/{clientId}`. "v1" is ALWAYS the original component —
 * existing clients see zero change when the field is absent.
 *
 * Where each section reads its variant from:
 *   hero          → `hero.variant`            (also accepts legacy heroVariant values)
 *   navbar        → `navbar.variant`
 *   services      → `sections.services.variant`
 *   whyChooseUs   → `sections.whyChooseUs.variant`
 *   team          → `sections.team.variant`
 *   gallery       → `sections.gallery.variant`
 *   instagram     → `sections.instagram.variant`
 *   faq           → `sections.faq.variant`
 *   testimonials  → `sections.testimonials.variant`
 *   contact       → `sections.contact.variant`
 *   footer        → `footer.variant`
 *   splash        → `splash.variant` ("v1".."v5" added to the legacy union)
 *   statsBar      → `hero.statsBar.variant`
 *
 * Resolution lives in `src/lib/section-variants.ts#resolveVariant` — any
 * value outside the union (legacy strings, numbers, undefined) maps to "v1".
 * ═══════════════════════════════════════════════════════════════════════════ */

// v6–v9 (BLOQUE-04): variantes genéricas nuevas; un despachador sin módulo para el
// código recibido cae a v1, así los clientes existentes no cambian.
export type SectionVariantValue = "v1" | "v2" | "v3" | "v4" | "v5" | "v6" | "v7" | "v8" | "v9";

/**
 * Global style flags (Firestore `config/{clientId}.global`).
 *
 * Applied by `site-theme.ts#applyGlobalStyleVars()` as `data-gs-*` attributes
 * on `<html>` plus `--gs-*` CSS custom properties. `index.css` ships the
 * attribute-driven rules; section variants consume the `--gs-*` tokens.
 * Every field is optional — an absent field means "niche default, no override"
 * so existing clients render pixel-identical.
 */
export type GlobalStyleConfig = {
  /** Corner rounding for cards/panels. "rounded" = niche default. */
  borderRadius?: "none" | "subtle" | "rounded" | "pill";
  /** Elevation depth for cards/panels. "elevated" = niche default. */
  shadowStyle?: "none" | "subtle" | "elevated" | "dramatic";
  /** Global multiplier on CSS transition durations. */
  transitionSpeed?: "none" | "fast" | "normal" | "slow";
  /** Frosted-glass panels. false strips backdrop blur entirely. */
  glassmorphism?: boolean;
  /** Google Fonts family names. Loaded + applied over niche defaults. */
  fontFamily?: { heading?: string; body?: string };
  /**
   * Accent derivation strategy. "brand" leaves Firestore/niche colors as-is.
   * "monochrome" desaturates the accent; "complementary" rotates the hue 180°
   * into `--gs-accent-alt`; "analogous" rotates ±30°.
   */
  colorScheme?: "brand" | "monochrome" | "complementary" | "analogous";
  /** Vertical rhythm between/inside sections. */
  spacing?: "compact" | "normal" | "spacious";
  /** Gap scale inside grids/lists (consumed by section variants). */
  density?: "dense" | "normal" | "airy";
  /** Button corner geometry, independent from card radius. */
  buttonShape?: "square" | "rounded" | "pill";
  /** SectionDivider rendering style. "none" removes dividers from the DOM. */
  dividerStyle?: "none" | "line" | "gradient" | "ornament";
  /** Gate for scroll-parallax effects in variants that support them. */
  parallaxEnabled?: boolean;
  /** "none" kills all motion; "subtle" shortens it; "rich" = full effects. */
  animationLevel?: "none" | "subtle" | "rich";
  /** Card surface treatment. "elevated" = niche default. */
  cardStyle?: "flat" | "elevated" | "bordered" | "glass";
  /** Image mask shape used by section variants (`--gs-image-radius`). */
  imageStyle?: "square" | "rounded" | "circle" | "blob";
  /** 0–1 darkness of overlays above hero/section background images. */
  overlayOpacity?: number;
  /** false disables decorative gradient layers in section variants. */
  gradientEnabled?: boolean;
  /** Adds a soft text-shadow to headings rendered over imagery. */
  textShadow?: boolean;
  /** Heading tracking. RTL locales force 0 regardless (index.css rule). */
  letterSpacing?: "tight" | "normal" | "wide";
  /** Body copy line-height. */
  lineHeight?: "compact" | "normal" | "relaxed";
};

/** Maps to `index.css` `--brand-accent*` (and optional surface) at runtime per deployment. */
export type SiteTheme = {
  accent: string;
  accentLight: string;
  /** Dark-mode base tint (`--brand-surface-dark`); page background in `.dark`. */
  surfaceDark: string;
};

/* ═══════════════════════════════════════════════════════════════════════════
 * THEME SYSTEM
 * Visual themes are orthogonal to niches: a niche defines CONTENT (services,
 * copy, staff) while a theme defines LOOK (colors, typography, radius,
 * shadows, section order). Each niche has 3 named themes; the first is the
 * default that matches the pre-theme visual identity.
 * ═══════════════════════════════════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════════════════════════════════
 * 3D IMPACT SYSTEM
 * Per-slot configuration for the 3D Impact components (HeroObject3D,
 * AmbientParticles, CTAButton3D). All slots are opt-in: omitting
 * `heroObjects` on the site config leaves the legacy rendering untouched.
 * ═══════════════════════════════════════════════════════════════════════════ */

export type HeroObjectIntensity = "subtle" | "medium" | "strong";
export type AmbientParticleType = "bubbles" | "smoke" | "sparkles" | "pearls" | "none";

/**
 * Splash variant identifier.
 *
 *   • Legacy numeric variants `1-7` keep the existing six clients on their
 *     current splash.
 *   • String "impact-*" variants are the new 3D Impact splash family,
 *     opt-in via Firestore `config/{clientId}.splash.variant`.
 *
 * Numeric aliases (mirrors of the legacy 1-5 codes) accepted as strings
 * so a hub-side editor can list everything as a single union of labels.
 */
export type SplashVariant =
  | 1
  | 2
  | 3
  | 4
  | 5
  | 6
  | 7
  | "classic"
  | "curtain"
  | "pulse"
  | "typewriter"
  | "vortex"
  | "cafeteria"
  | "remodelaciones"
  | "impact-scale"
  | "impact-split"
  | "impact-reveal-3d"
  /**
   * Section-variant codes (5-variant system). "v1" maps to the niche's
   * legacy default; v2–v5 are the new splash family in
   * `src/components/layout/splash/` (fade-scale, particles, gradient
   * sweep, minimal pulse). See `SplashScreen.tsx` for the mapping.
   */
  | SectionVariantValue;

export type SplashConfig = {
  /** Master switch. Set to false to disable the splash entirely. */
  enabled: boolean;
  /**
   * Total visible duration of the splash in milliseconds, BEFORE the exit
   * animation starts. Recommended: ~2100 for legacy variants, ~1500 for
   * impact-scale / impact-split, ~2000 for impact-reveal-3d.
   */
  durationMs: number;
  /**
   * Optional background image URL for the splash screen.
   * Rendered behind all animations with a dark overlay for readability.
   */
  image?: string;
  /**
   * Visual variant. Legacy clients use numeric codes 1-7. New clients
   * opt into the 3D Impact family with `"impact-scale" | "impact-split"
   * | "impact-reveal-3d"`. Omit to let SplashScreen pick a niche default
   * (or `impact-reveal-3d` when `heroObjects.primary` is configured).
   */
  variant?: SplashVariant;
  /** `impact-scale` — number of bands. Default 7. */
  bandCount?: number;
  /** `impact-scale` — band orientation. Default "horizontal". */
  bandDirection?: "horizontal" | "vertical";
  /** `impact-split` — split orientation. Default "horizontal". */
  splitDirection?: "horizontal" | "vertical";
  /** `impact-reveal-3d` — ambient particle layer behind the hero object. */
  ambientParticles?: AmbientParticleType;
  /** Optional dominant color for the splash (hex). Applies to curtain panels, pulse ring, etc. */
  color?: string;
};

/**
 * A single layer inside a `HeroObjectConfig.composition` stack.
 *
 * Layers render back-to-front using `zIndex`, share the wrapper's
 * perspective/tilt/levitation, but each owns its own scroll parallax
 * factor — different `parallaxFactor` values produce real depth as
 * the user scrolls (background layers move less than foreground ones).
 *
 * Every numeric field is optional; defaults match a "no-op" layer that
 * renders the image at the wrapper's centre with full opacity.
 */
export type HeroObjectLayer = {
  /** URL of the transparent PNG to render. */
  src: string;
  /**
   * Offset from the wrapper centre. Each axis accepts a number (px) or
   * a CSS string ("12%", "-1.5rem"). Default `0`.
   */
  offset?: { x?: number | string; y?: number | string };
  /** Uniform scale multiplier. Default `1`. */
  scale?: number;
  /** Static rotation in degrees applied to the image. Default `0`. */
  rotation?: number;
  /**
   * Scroll-parallax multiplier. `1` matches the single-layer parallax
   * magnitude; `0` pins the layer; `>1` makes it travel further than
   * the page. Clamped to `[0, 2]` at render time.
   */
  parallaxFactor?: number;
  /** Stacking order. Higher values render in front. Default `0`. */
  zIndex?: number;
  /** Layer opacity (0–1). Default `1`. */
  opacity?: number;
  /** Overrides the wrapper's intensity for tilt/shadow magnitude. */
  intensity?: HeroObjectIntensity;
};

export type HeroObjectConfig = {
  /** URL of the transparent PNG to render with 3D treatment. */
  src: string;
  /**
   * Optional multi-layer composition. When set, each entry renders as
   * its own image with independent parallax/scale/rotation/opacity, and
   * the `src` field above acts as a fallback for tooling that does not
   * understand layers (or for reduced-motion paths that render a single
   * frame). Layers stack in `zIndex` order, lowest first.
   */
  composition?: HeroObjectLayer[];
  /** Optional ambient layer rendered behind the object. */
  particles?: AmbientParticleType;
  /** Tilt + levitation + shadow magnitude. Default "medium". */
  intensity?: HeroObjectIntensity;
  /** "auto" derives from theme accent. CSS color string otherwise. */
  shadowColor?: string;
};

/** Section IDs for landing page ordering. */
export type LandingSectionId =
  | "hero"
  | "services"
  | "menu"
  | "whyChooseUs"
  | "team"
  | "gallery"
  | "testimonials"
  | "instagram"
  | "inquiry"
  | "businessHours"
  | "location"
  | "contactHub"
  | "philosophy"
  | "process"
  | "ambience"
  | "portfolio"
  | "faq"
  | "beforeAfter"
  | "howItWorks"
  | "jobCategories"
  | "employmentForm";

/** Menu category for the cafeteria filter UI. */
export type MenuCategory = { key: string; label: string };

/** Single menu item (cafeteria niche). */
export type MenuItemConfig = {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  category: string;
  image: string;
};

/** Full menu section config (cafeteria niche). */
export type MenuConfig = {
  title: string;
  subtitle: string;
  categories: MenuCategory[];
  items: MenuItemConfig[];
};

/** Before/After image pair for remodelaciones portfolio. */
export type GalleryPair = {
  before: string;
  after: string;
  caption?: string;
};

/** Before/After case for the interactive comparison slider (Aura variant). */
export type BeforeAfterCase = {
  id: string;
  title: string;
  description: string;
  treatment: string;
  imageBefore: string;
  imageAfter: string;
};

/**
 * Client-level branding overrides (Firestore `config/{clientId}.branding`).
 * `colors` admite, además de los tokens shadcn (background, foreground, card, muted,
 * primary…), los roles de SISTEMA-COLOR (BLOQUE-04): `surface`, `surfaceAlt`, `text`,
 * `textMuted`, `accent`(→ --brand-accent), `accentStrong` (relleno de botones, ≥ 4.5:1 con
 * `accentForeground`), `highlight`, `highlightOnDark`, `scrim` (hex; los degradados lo
 * mezclan con color-mix).
 */
export type BrandingConfig = {
  colors?: Record<string, string>;
  /** PALETA-01: de dónde salió la paleta (entrada de `src/lib/palette.ts`); el porqué viaja con los tokens. */
  paletteMeta?: { source: string; origin: "logo" | "local" | "instagram" | "eleccion"; reason: string; derivedAt: string; niche?: string };
  fonts?: { display?: string; body?: string; googleFontsUrl?: string };
  darkMode?: { colors?: Record<string, string> };
  navbarLogoHeight?: number;
  /** D17 (R8 reescrita, 2026-09-19): modo de la paleta, por web, fijo (R12); ausente = respaldo del nicho. Lo escribe `tools/paleta.mjs`. */
  mode?: "light" | "dark";
  /** SERVICES-02 S6: costura hero → fondo, `dark` (pie del clip) o `light` (haze claro, sólo paleta clara; a prueba). */
  heroSeam?: "dark" | "light";
  /** R21 (D16): textura de la paleta (mosaico 1024 sin costuras o imagen 2560) para las secciones sin foto; sin ella, respaldo `--surface-alt`. */
  texture?: string;
  /** REPLANTEO-01 D5: foto del local (fondo fijo sticky), escritorio ≥ 2560 px de ancho. Sin ella la capa no se monta y todo va liso. */
  localPhoto?: string;
  /** D5: foto del local vertical ≥ 1080×1920 para < 1024 px; sin ella se recorta la de escritorio. */
  localPhotoMobile?: string;
  /** D10 / R19: relación medida entre el pie del clip del hero y el tono de la foto del local, escrita por web (CONTRATOS § transición). */
  heroToBackdrop?: { relation: "same-hue" | "adjacent-hue" | "same-hue-different-light"; mechanism: "photo-starts-at-hero-end" | "scrim-dies-into-photo" | "veil-from-first-pixel"; dH?: number; dL?: number; /** R20: pie del clip (últimas filas) medido por transicion.mjs; el Prompt 6 y costura.mjs lo consumen */ foot?: { hex: string; L: number; C: number; H: number }; /** pie del clip 9:16 (la foto vertical se mide contra él) */ footPortrait?: { hex: string; L: number; C: number; H: number } };
};

/**
 * NichePreset — all fields that vary per business type.
 * Each preset file in src/config/presets/ must satisfy this interface.
 * The remaining fields (features, payment, notifications, adminEmail)
 * live in the base config inside site.ts and never change between niches.
 */
export type NichePreset = {
  businessMode?: "solo" | "team";
  business: {
    type: BusinessNiche;
    legalName: string;
    address: string;
    cancellationPolicy: string;
  };
  brand: {
    name: string;
    tagline: string;
    /** SEO / social snippet; falls back to tagline in useSEO if omitted */
    description?: string;
    /** Logo URL for light backgrounds (light mode). */
    logo?: string;
    /** Logo URL for dark backgrounds (dark mode, hero overlay). Falls back to `logo` when omitted. */
    logoDark?: string;
    /** Lucide icon name used as fallback when neither `logo` nor `logoDark` is defined. */
    logoIconName?: string;
    /**
     * Opt into the editorial in-house SVG monogram (`<LogoSvg/>`). When `true`,
     * BrandLogo renders the parametric monogram + wordmark instead of the
     * image-URL path or the Lucide icon fallback. Used by the Velvet Muse–
     * style Hero variant.
     */
    logoSvg?: boolean;
    /** Two-letter monogram for the editorial logo. Default: first letter of each word in `name`. */
    logoMonogram?: string;
    /** Caps suffix below the wordmark (e.g. "SALON", "STUDIO"). Default `"SALON"`. */
    logoSuffix?: string;
    /** Emoji shown as browser tab favicon. Overridable from Firestore config/{clientId}. */
    faviconEmoji?: string;
    /**
     * Open Graph / Twitter preview image. Absolute `https://…` URL or site path (`/…`).
     * If omitted, `useSEO` uses `hero.backgroundImage` when it is an absolute URL.
     */
    ogImage?: string;
    aiPersona?: string;
  };
  theme: SiteTheme;
  hero: {
    titlePrefix: string;
    titleHighlight: string;
    titleSuffix: string;
    subtitle: string;
    ctaPrimary: string;
    ctaSecondary: string;
    backgroundImage: string;
    /**
     * Background video URL (mp4/webm) for Hero v3. Falls back to a Ken Burns
     * treatment of `backgroundImage` when absent.
     */
    videoUrl?: string;
    /**
     * Bucle corto de fondo para el hero v6 (BLOQUE-04, DESIGN-PELUQUERIA):
     * 6–10 s, mudo, ≤ 1 MB móvil; `webm` antes que `mp4`; `poster` = primer
     * cuadro (AVIF). Sin `video`, o con prefers-reduced-motion, se usa
     * `backgroundImage`. Foto por defecto en los presets; vídeo sólo con clip.
     */
    video?: {
      mp4: string;
      webm?: string;
      poster?: string;
      /** Clip 9:16 para móvil, servido con `<source media="(orientation: portrait)">`; sin él, el horizontal con `cover` + `focus`. */
      portrait?: { mp4: string; webm?: string; poster?: string };
      /** Paisaje a 1280 px para pantallas < 1024 px (MATERIAL-03); `mp4`/`webm` quedan para escritorio (1080p, `media="(min-width: 1024px)"`). Sin él, un solo paisaje. */
      medium?: { mp4: string; webm?: string };
      /** `object-position` del recorte `cover` (p. ej. "50% 30%"): dónde está el sujeto cuando sólo hay un clip. */
      focus?: string;
    };
    /**
     * Hero variant. Legacy values "standard" | "slider" keep their original
     * meaning (slider = remodelaciones). "v1".."v5" select the 5-variant
     * system: v1 = original, v2 = split editorial, v3 = video background,
     * v4 = minimal centered, v5 = parallax layers.
     */
    variant?: "standard" | "slider" | SectionVariantValue;
    /**
     * Section-level variant for the Hero. See `SiteConfig.hero.heroVariant`
     * for the full contract — preset typing mirrors the runtime config so
     * niche presets can opt in directly.
     */
    heroVariant?: "standard" | "slider" | "hero-3d-object" | (string & {});
    eyebrow?: string;
    description?: string;
    ctaPrimaryHref?: string;
    ctaSecondaryHref?: string;
    /** See `SiteConfig.hero.ctaPrimaryLabel`. */
    ctaPrimaryLabel?: string;
    stats?: { value: string; label: string }[];
    beforeImage?: string;
    afterImage?: string;
    /** See `SiteConfig.hero.titleParts`. */
    titleParts?: Array<{
      text: string;
      italic?: boolean;
      color?: string;
      underline?: boolean;
    }>;
    /** See `SiteConfig.hero.theme`. */
    theme?: {
      accent?: string;
      accentLight?: string;
      surface?: string;
      ink?: string;
    };
    /** See `SiteConfig.hero.bg`. */
    bg?: {
      gradient?: string;
      glowColor?: string;
      silkTextureOpacity?: number;
    };
    /** See `SiteConfig.hero.composition`. */
    composition?: {
      primarySrc?: string;
      ribbonSrc?: string;
      backgroundTone?: string;
    };
    /** See `SiteConfig.hero.availabilityCard`. */
    availabilityCard?: {
      enabled?: boolean;
      title?: string;
      slots?: Array<{ label: string; selected?: boolean }>;
      address?: { name?: string; street?: string; cityZip?: string };
      thumbnailSrc?: string;
      footerLabel?: string;
      footerHref?: string;
    };
    /** See `SiteConfig.hero.trustCard`. */
    trustCard?: {
      enabled?: boolean;
      rating?: string;
      text?: string;
      avatars?: string[];
    };
    /** See `SiteConfig.hero.statsBar`. */
    statsBar?: {
      enabled?: boolean;
      items?: Array<{ icon?: string; title: string; description: string }>;
      /**
       * Stats bar variant: v1 = original pill row, v2 = horizontal scroll,
       * v3 = animated counters, v4 = icon + number cards, v5 = minimal inline.
       */
      variant?: SectionVariantValue;
    };
  };
  contact: {
    address: {
      street: string;
      district: string;
      cityStateZip: string;
    };
    phone: string;
    email: string;
    social: SocialLinks;
  };
  hours: BusinessHours;
  services: Service[];
  staff: StaffMember[];
  testimonials: Testimonial[];
  gallery: string[];
  sections: {
    services: SectionHeader & {
      images: string[];
      /** REPLANTEO-01 D4: ids de los 2 servicios destacados en la home (v6 «con precios»); ausente = 2 `popular` o los 2 primeros. */
      featured?: string[];
      /**
       * 5-variant system: v1 = original grid, v2 = horizontal scroll cards,
       * v3 = accordion, v4 = tabbed categories, v5 = masonry. Takes
       * precedence over `servicesVariant` when both are set.
       */
      variant?: SectionVariantValue;
      /**
       * Section-level variant for Services. See
       * `SiteConfig.sections.services.servicesVariant` for the full
       * contract — preset typing mirrors the runtime config so niche
       * presets can opt in directly.
       */
      servicesVariant?: "standard" | "list-with-icons" | "treatment-card-grid" | "card-stack-tabs" | (string & {});
      /** Inner layout for the `list-with-icons` variant: `"grid"` (default) or `"vertical-list"`. */
      layout?: "grid" | "vertical-list" | (string & {});
      /** Slot name read from `siteConfig.heroObjects` for the cameo object. Default `"accent"` (falls back to `"primary"`). */
      heroObjectSlot?: "primary" | "secondary" | "accent" | (string & {});
      /** Show the floating 3D hero cameo. Default true; set false to hide the cameo entirely. */
      show3DObject?: boolean;
      /** Optional pre-title kicker rendered above the headline in the 3D variants. */
      eyebrow?: string;
      /** Optional 1–2 line description rendered below the subtitle in the 3D variants. */
      description?: string;
      /**
       * `card-stack-tabs` variant — tab labels rendered above the card
       * grid. Each tab matches against `service.category`; an "All" tab
       * is prepended at runtime. Untagged services only appear under
       * "All". Omit/empty to render the grid without tabs.
       */
      filters?: string[];
      /** Optional CTA label rendered below the grid (e.g. "Explore all services"). */
      ctaLabel?: string;
      /** Optional CTA href; when set the CTA renders as an anchor. */
      ctaHref?: string;
      /**
       * `card-stack-tabs` variant — secondary CTA pair label, e.g.
       * "Book a consultation". When omitted falls back to the locale
       * book button.
       */
      ctaSecondaryLabel?: string;
      /** `card-stack-tabs` variant — secondary CTA href (anchor). */
      ctaSecondaryHref?: string;
    };
    team: SectionHeader & {
      description: string;
      teamVariant?: "standard" | "aura" | (string & {});
      /**
       * 5-variant system: v1 = original, v2 = horizontal carousel, v3 = grid
       * with hover bio, v4 = featured + list, v5 = minimal avatars.
       */
      variant?: SectionVariantValue;
    };
    whyChooseUs: SectionHeader & {
      benefits: Benefit[];
      mainImage: string;
      badge: string;
      /**
       * 5-variant system: v1 = original, v2 = vertical timeline, v3 =
       * comparison table, v4 = animated counters, v5 = testimonial hybrid.
       */
      variant?: SectionVariantValue;
      whyChooseUsVariant?: "standard" | "icon-grid-3d" | (string & {});
      eyebrow?: string;
      description?: string;
      heroObjectSlot?: "primary" | "secondary" | "accent" | (string & {});
      show3DObject?: boolean;
    };
    testimonials: SectionHeader & {
      testimonialsVariant?: "standard" | "aura" | (string & {});
      /**
       * 5-variant system: v1 = original, v2 = carousel, v3 = masonry cards,
       * v4 = video testimonials, v5 = rating summary + list.
       */
      variant?: SectionVariantValue;
    };
    gallery: SectionHeader & {
      /** REPLANTEO-01 D4: índices de `siteConfig.gallery` que van en la home (4–6); ausente = los 6 primeros. La galería completa va en `/galeria`. */
      selection?: number[];
      /**
       * Section-level variant for Gallery. Independent from the default
       * rendering. When set to `"bento-stats"` (Aurea-style) or
       * `"grid-with-filters"` (Onyx-style) the section renders one of the
       * new 3D Impact layouts. Both variants read images from
       * `siteConfig.gallery` (a `string[]`). The cameo of the floating
       * hero object is rendered when `heroObjects[heroObjectSlot]` (or
       * `heroObjects.primary` as a fallback) is set in the active site
       * config — otherwise the variants render WITHOUT the cameo.
       *
       * If `siteConfig.gallery` is empty the variants log a dev warning
       * once and fall back to the default renderer.
       *
       * Kept as a loose string union so a hub-side editor can extend it
       * without a template rebuild.
       */
      galleryVariant?: "standard" | "bento-stats" | "grid-with-filters" | "portrait-bento-3d-cameo" | (string & {});
      /**
       * 5-variant system: v1 = original grid, v2 = masonry, v3 = lightbox
       * carousel, v4 = before/after slider, v5 = Pinterest columns.
       */
      variant?: SectionVariantValue;
      /**
       * `bento-stats` variant — stats bar below the bento grid. Each
       * entry is rendered as `value` (large) + `label` (small caps).
       * When omitted or empty the stats bar is hidden.
       */
      stats?: { value: string; label: string }[];
      /**
       * `grid-with-filters` variant — chip tabs that filter images.
       * Each filter is matched against `imageTags[<image-url>]`. An
       * "All" tab is always prepended at runtime.
       */
      filters?: string[];
      /**
       * `grid-with-filters` variant — map of image URL → tag list. An
       * image shows under a filter when its tag list includes that
       * filter. Untagged images only show under "All".
       */
      imageTags?: Record<string, string[]>;
      /** Slot name read from `siteConfig.heroObjects` for the cameo object. Default `"accent"` (falls back to `"primary"`). */
      heroObjectSlot?: "primary" | "secondary" | "accent" | (string & {});
      /** Show the floating 3D hero cameo. Default true; set false to hide the cameo entirely. */
      show3DObject?: boolean;
      /** Optional pre-title kicker rendered above the headline in the 3D variants. */
      eyebrow?: string;
      /** Optional 1–2 line description rendered below the subtitle in the 3D variants. */
      description?: string;
      /** Optional CTA label rendered below the grid (e.g. "Explore the full portfolio"). */
      ctaLabel?: string;
      /** Optional CTA href; when set the CTA renders as an anchor. */
      ctaHref?: string;
    };
    location: SectionHeader;
    contact: SectionHeader & {
      description: string;
      /**
       * Section-level variant for the booking/contact section. See
       * `SiteConfig.sections.contact.bookingVariant` for the full
       * contract — preset typing mirrors the runtime config so niche
       * presets can opt in directly.
       */
      bookingVariant?: "standard" | "form-map-hours-3d" | (string & {});
      /**
       * 5-variant system for the contact hub: v1 = original, v2 = split
       * map + form, v3 = floating card, v4 = minimal inline, v5 =
       * full-width immersive.
       */
      variant?: SectionVariantValue;
      /** Slot name read from `siteConfig.heroObjects` for the cameo object. Default `"accent"` (falls back to `"primary"`). */
      heroObjectSlot?: "primary" | "secondary" | "accent" | (string & {});
      /** Show the floating 3D hero cameo. Default true. */
      show3DObject?: boolean;
      /** Render the map column in the 3D variant. Default true. Hidden automatically when `contact.address` is empty. */
      showMap?: boolean;
      /** Render the hours card in the 3D variant. Default true. Hidden automatically when `hours` is empty. */
      showHours?: boolean;
      /** Optional CTA label for the submit button (e.g. "Request a chair"). Falls back to the locale send label. */
      ctaSubmitLabel?: string;
      /** Which form fields to render (in order). When omitted: name + email + service + date + message. */
      formFields?: Array<"name" | "email" | "phone" | "service" | "date" | "message">;
    };
    booking: {
      title: string;
      tagline: string;
      steps: {
        service: string;
        staff: string;
        datetime: string;
        details: string;
        payment: string;
      };
      aiConsultant: {
        title: string;
        subtitle: string;
        description: string;
        agentLabel: string;
        placeholder: string;
      };
      success: {
        title: string;
        confirmed: string;
        requestSaved: string;
        cancelled: string;
      };
    };
    instagram?: {
      title: string;
      handle: string;
      url: string;
      images: string[];
      instagramVariant?: "standard" | "aura" | (string & {});
      /**
       * 5-variant system: v1 = original, v2 = stories style, v3 = grid with
       * captions, v4 = single featured + grid, v5 = auto-scroll carousel.
       */
      variant?: SectionVariantValue;
    };
    admin: {
      staff: {
        title: string;
        scheduleTitle: string;
        commitButton: string;
        enforcementTitle: string;
        enforcementDesc: string;
      };
    };
    philosophy?: {
      title: string;
      subtitle: string;
      intro: string;
      pillars: { number: string; title: string; description: string }[];
    };
    process?: {
      title: string;
      subtitle: string;
      intro?: string;
      steps: { number: string; title: string; description: string; iconName?: string }[];
    };
    ambience?: {
      title: string;
      subtitle: string;
      intro?: string;
      sectors: { label: string; body: string; imageSrc: string }[];
    };
    portfolio?: {
      title: string;
      subtitle: string;
      filters: { key: string; label: string }[];
      projects: {
        title: string;
        type: string;
        description: string;
        duration?: string;
        size?: string;
        filter: string;
        images: string[];
        gallery?: GalleryPair[];
      }[];
    };
    faq?: {
      title: string;
      subtitle: string;
      items: { question: string; answer: string }[];
      faqVariant?: "standard" | "aura" | (string & {});
      /**
       * 5-variant system: v1 = original accordion, v2 = two-column, v3 =
       * searchable, v4 = tabbed by category, v5 = chat-style.
       */
      variant?: SectionVariantValue;
    };
    beforeAfter?: {
      title: string;
      subtitle: string;
      cases: BeforeAfterCase[];
      variant?: SectionVariantValue;
    };
    menu?: MenuConfig;
    howItWorks?: {
      title: string;
      subtitle: string;
      steps: { number: string; title: string; description: string; iconName: string }[];
    };
    jobCategories?: {
      title: string;
      subtitle: string;
      categories: { id: string; label: string; iconName: string; description: string }[];
    };
    employmentForm?: {
      title: string;
      subtitle: string;
      steps: {
        name: { title: string; firstNameLabel: string; lastNameLabel: string };
        city: { title: string; label: string; placeholder: string };
        interest: { title: string };
        experience: {
          title: string;
          experienceLabel: string;
          availabilityLabel: string;
          driversLicenseLabel: string;
          languagesLabel: string;
          languages: { id: string; label: string }[];
          availabilityOptions: { id: string; label: string }[];
        };
        contact: { title: string; phoneLabel: string; emailLabel: string };
        summary: { title: string; submitLabel: string; successTitle: string; successMessage: string };
      };
      cities: string[];
    };
  };
};

/** Rutas del shell público (landing, galería y páginas legales con URL). */
export type PublicShellPage =
  | "landing"
  | "gallery"
  | "services"
  | "projects"
  | "about"
  | "privacy"
  | "terms"
  | "cancellation"
  | "staff-profile"
  /** Employment niche only — dual-audience choice screen. */
  | "audience-choice"
  /** Employment niche only — workers/job-seekers landing (alias of "landing"). */
  | "workers-landing"
  /** Employment niche only — businesses/companies landing. */
  | "business-landing";

/** Parcial recursivo (misma forma que el `DeepPartial` interno de site.ts). */
export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends Record<string, unknown> ? DeepPartial<T[K]> : T[K];
};

/**
 * Capa de texto por idioma escrita por el hub (BLOQUE-04 · 4.2):
 * `config/{id}.translations.{lang}` = subconjunto de SiteConfig con las mismas
 * claves de texto que la raíz. La raíz queda en el idioma base del cliente
 * (`VITE_UI_LANGUAGE`); `translations[base]` no se escribe. Sin capa para un
 * idioma → preset del nicho en ese idioma.
 */
export type SiteTranslations = Partial<Record<"en" | "he" | "ru" | "ar", DeepPartial<SiteConfig>>>;

export type SiteConfig = {
  tenant: {
    clientId: string;
  };
  translations?: SiteTranslations;
  businessMode?: "solo" | "team";
  /**
   * Identidad comercial y marco legal para textos legales dinámicos
   * (privacidad, términos, cancelación) y pie de información.
   */
  business: {
    type: BusinessNiche;
    /** Razón social o nombre legal tal como figura en documentos. */
    legalName: string;
    /** Dirección completa en una sola línea (incl. ciudad, CP, país). */
    address: string;
    /** Plazo mínimo de aviso: p. ej. "24 horas de antelación", "48 horas laborables". */
    cancellationPolicy: string;
  };
  brand: {
    name: string;
    tagline: string;
    /** SEO / social snippet; falls back to tagline in useSEO if omitted */
    description?: string;
    /** Logo URL for light backgrounds (light mode). */
    logo?: string;
    /** Logo URL for dark backgrounds (dark mode, hero overlay). Falls back to `logo` when omitted. */
    logoDark?: string;
    /** Lucide icon name used as fallback when neither `logo` nor `logoDark` is defined. */
    logoIconName?: string;
    /**
     * Opt into the editorial in-house SVG monogram (`<LogoSvg/>`). When `true`,
     * BrandLogo renders the parametric monogram + wordmark instead of the
     * image-URL path or the Lucide icon fallback. Used by the Velvet Muse–
     * style Hero variant.
     */
    logoSvg?: boolean;
    /** Two-letter monogram for the editorial logo. Default: first letter of each word in `name`. */
    logoMonogram?: string;
    /** Caps suffix below the wordmark (e.g. "SALON", "STUDIO"). Default `"SALON"`. */
    logoSuffix?: string;
    /** Emoji shown as browser tab favicon. Overridable from Firestore config/{clientId}. */
    faviconEmoji?: string;
    /**
     * Open Graph / Twitter preview image. Absolute `https://…` URL or site path (`/…`).
     * If omitted, `useSEO` uses `hero.backgroundImage` when it is an absolute URL.
     */
    ogImage?: string;
    aiPersona?: string;
  };
  theme: SiteTheme;
  /** Landing page section ordering. Overridable from Firestore `config/{clientId}.sectionOrder`. */
  sectionOrder?: LandingSectionId[];
  /** Client-level branding overrides (colors, fonts). Applied at runtime over niche defaults. */
  branding?: BrandingConfig;
  /**
   * Global style flags (Firestore `config/{clientId}.global`). Applied as
   * `data-gs-*` attributes + `--gs-*` CSS vars by `applyGlobalStyleVars()`.
   */
  global?: GlobalStyleConfig;
  /**
   * Navbar configuration. `variant`: v1 = original, v2 = centered logo,
   * v3 = hamburger always, v4 = bottom bar on mobile, v5 = transparent overlay,
   * v6 = peluquería (sin fondo sobre el hero + píldora al bajar, sin toggle de tema).
   */
  navbar?: { variant?: SectionVariantValue };
  /**
   * Footer configuration. `variant`: v1 = original, v2 = minimal one-line,
   * v3 = mega columns, v4 = centered stack, v5 = dark contrast.
   */
  footer?: { variant?: SectionVariantValue };
  features: {
    showHero: boolean;
    showWhyChooseUs: boolean;
    showServices: boolean;
    showTeam: boolean;
    showGallery: boolean;
    showTestimonials: boolean;
    showInquiry: boolean;
    showLocation: boolean;
    /** Business hours card shown above the location map. */
    showBusinessHours: boolean;
    /** Instagram teaser grid. Requires sections.instagram data to render. */
    showInstagram: boolean;
    showBooking: boolean;
    /** Rutas `/equipo/:slug` con bio + portafolio; si es false, Team sin navegación a perfil. */
    enableStaffPages: boolean;
    showAbout?: boolean;
    enableAboutPage?: boolean;
    /** Show WhatsApp quick action inside the chatbot. Requires contact.phone to be set. */
    showWhatsAppInChat?: boolean;
    showPhilosophy?: boolean;
    showProcess?: boolean;
    showAmbience?: boolean;
    showPortfolio?: boolean;
    showFaq?: boolean;
    showMenu?: boolean;
    showStock?: boolean;
    /** Toggle visibility of the stats row in the hero section (e.g. "500+ clients served"). */
    showHeroStats?: boolean;
    /** Before/After interactive comparison section (Aura variant). */
    showBeforeAfter?: boolean;
    showHowItWorks?: boolean;
    showJobCategories?: boolean;
    showEmploymentForm?: boolean;
    /**
     * Barra fija inferior (móvil) con reservar + WhatsApp (BLOQUE-04, peluquería).
     * Ausente/false en los seis nichos existentes; true por defecto en peluquería.
     */
    persistentBooking?: boolean;
    /** Chatbot IA (Gemini). Ausente = visible (como siempre); false lo apaga. Peluquería: false (IA a cotizar). */
    showChat?: boolean;
    /** FAB de WhatsApp global (toda la web). Ausente/false en los seis nichos; true por defecto en peluquería. */
    whatsappFab?: boolean;
    /** Botón flotante «subir». Ausente = visible (como siempre); false lo quita. Peluquería: false. */
    scrollToTop?: boolean;
    /** Toggle claro/oscuro. Ausente = como siempre; false = sin toggle y sin tema guardado (R12). Peluquería: false. */
    themeToggle?: boolean;
  };
  /**
   * Optional array of service IDs to show. When set, only services whose `id`
   * appears in this list are displayed (in the listed order). Images are
   * filtered to match. If omitted or empty, all preset services are shown.
   * Set from Firestore `config/{clientId}`.
   */
  visibleServices?: string[];
  /**
   * Per-service overrides keyed by service ID. Allows changing name, price,
   * description, duration, or image for a specific service without replacing
   * the entire services array. The `image` field overrides the corresponding
   * entry in `sections.services.images`.
   * Set from Firestore `config/{clientId}`.
   */
  serviceOverrides?: Record<string, Partial<Omit<Service, "id">> & { image?: string }>;
  /**
   * How many services to show on the landing page. The dedicated services
   * page always shows all visible services. When omitted, a per-niche
   * default is used (estetica 2, nails 3, others 4).
   */
  landingServicesCount?: number;
  hero: {
    titlePrefix: string;
    titleHighlight: string;
    titleSuffix: string;
    subtitle: string;
    ctaPrimary: string;
    ctaSecondary: string;
    backgroundImage: string;
    /**
     * Background video URL (mp4/webm) for Hero v3. Falls back to a Ken Burns
     * treatment of `backgroundImage` when absent.
     */
    videoUrl?: string;
    /**
     * Bucle corto de fondo para el hero v6 (BLOQUE-04, DESIGN-PELUQUERIA):
     * 6–10 s, mudo, ≤ 1 MB móvil; `webm` antes que `mp4`; `poster` = primer
     * cuadro (AVIF). Sin `video`, o con prefers-reduced-motion, se usa
     * `backgroundImage`. Foto por defecto en los presets; vídeo sólo con clip.
     */
    video?: {
      mp4: string;
      webm?: string;
      poster?: string;
      /** Clip 9:16 para móvil, servido con `<source media="(orientation: portrait)">`; sin él, el horizontal con `cover` + `focus`. */
      portrait?: { mp4: string; webm?: string; poster?: string };
      /** Paisaje a 1280 px para pantallas < 1024 px (MATERIAL-03); `mp4`/`webm` quedan para escritorio (1080p, `media="(min-width: 1024px)"`). Sin él, un solo paisaje. */
      medium?: { mp4: string; webm?: string };
      /** `object-position` del recorte `cover` (p. ej. "50% 30%"): dónde está el sujeto cuando sólo hay un clip. */
      focus?: string;
    };
    /**
     * Hero variant. Legacy values "standard" | "slider" keep their original
     * meaning (slider = remodelaciones). "v1".."v5" select the 5-variant
     * system: v1 = original, v2 = split editorial, v3 = video background,
     * v4 = minimal centered, v5 = parallax layers.
     */
    variant?: "standard" | "slider" | SectionVariantValue;
    /**
     * Section-level variant for the Hero. Independent from `variant` (which is
     * tied to the remodelaciones slider). When set to `"hero-3d-object"` the
     * Hero renders the 3D Impact layout (text left + HeroObject3D right on
     * desktop, stacked on mobile). Requires `heroObjects.primary` to be set
     * in the active site config — otherwise the Hero falls back to its
     * default rendering and warns once in dev.
     *
     * Kept as a loose string union so a hub-side editor can extend it without
     * a template rebuild.
     */
    heroVariant?: "standard" | "slider" | "hero-3d-object" | (string & {});
    /** Optional pre-title kicker rendered above the headline (e.g. "PRECISION. ARTISTRY. INTENTION."). */
    eyebrow?: string;
    /** Optional 1–2 line description rendered below the subtitle in the 3D-object variant. */
    description?: string;
    /** Optional structured CTAs for variants that need a label+href pair. */
    ctaPrimaryHref?: string;
    ctaSecondaryHref?: string;
    /** See `SiteConfig.hero.ctaPrimaryLabel`. */
    ctaPrimaryLabel?: string;
    stats?: { value: string; label: string }[];
    beforeImage?: string;
    afterImage?: string;
    /** See `SiteConfig.hero.titleParts`. */
    titleParts?: Array<{
      text: string;
      italic?: boolean;
      color?: string;
      underline?: boolean;
    }>;
    /** See `SiteConfig.hero.theme`. */
    theme?: {
      accent?: string;
      accentLight?: string;
      surface?: string;
      ink?: string;
    };
    /** See `SiteConfig.hero.bg`. */
    bg?: {
      gradient?: string;
      glowColor?: string;
      silkTextureOpacity?: number;
    };
    /** See `SiteConfig.hero.composition`. */
    composition?: {
      primarySrc?: string;
      ribbonSrc?: string;
      backgroundTone?: string;
    };
    /** See `SiteConfig.hero.availabilityCard`. */
    availabilityCard?: {
      enabled?: boolean;
      title?: string;
      slots?: Array<{ label: string; selected?: boolean }>;
      address?: { name?: string; street?: string; cityZip?: string };
      thumbnailSrc?: string;
      footerLabel?: string;
      footerHref?: string;
    };
    /** See `SiteConfig.hero.trustCard`. */
    trustCard?: {
      enabled?: boolean;
      rating?: string;
      text?: string;
      avatars?: string[];
    };
    /** See `SiteConfig.hero.statsBar`. */
    statsBar?: {
      enabled?: boolean;
      items?: Array<{ icon?: string; title: string; description: string }>;
      /**
       * Stats bar variant: v1 = original pill row, v2 = horizontal scroll,
       * v3 = animated counters, v4 = icon + number cards, v5 = minimal inline.
       */
      variant?: SectionVariantValue;
    };
  };
  contact: {
    address: {
      street: string;
      district: string;
      cityStateZip: string;
    };
    phone: string;
    email: string;
    social: SocialLinks;
  };
  hours: BusinessHours;
  services: Service[];
  staff: StaffMember[];
  testimonials: Testimonial[];
  gallery: string[];
  sections: {
    services: SectionHeader & {
      images: string[];
      /** REPLANTEO-01 D4: ids de los 2 servicios destacados en la home (v6 «con precios»); ausente = 2 `popular` o los 2 primeros. */
      featured?: string[];
      /**
       * 5-variant system: v1 = original grid, v2 = horizontal scroll cards,
       * v3 = accordion, v4 = tabbed categories, v5 = masonry. Takes
       * precedence over `servicesVariant` when both are set.
       */
      variant?: SectionVariantValue;
      /**
       * Section-level variant for Services. Independent from the default
       * rendering. When set to `"list-with-icons"` (Onyx-style) or
       * `"treatment-card-grid"` (Aurea-style) the section renders one of
       * the new 3D Impact layouts. The cameo of the floating hero object
       * is rendered when `heroObjects[heroObjectSlot]` (or
       * `heroObjects.primary` as a fallback) is set in the active site
       * config — otherwise the variants render WITHOUT the cameo and the
       * grid stays full-width.
       *
       * If `siteConfig.services` is empty the variants log a dev warning
       * once and fall back to the default renderer.
       *
       * Kept as a loose string union so a hub-side editor can extend it
       * without a template rebuild.
       */
      servicesVariant?: "standard" | "list-with-icons" | "treatment-card-grid" | "card-stack-tabs" | (string & {});
      /**
       * Inner layout for the `list-with-icons` variant only.
       *   - `"grid"`           — 4-column responsive card grid (default).
       *   - `"vertical-list"`  — stacked rows with icon + copy + arrow.
       * Ignored by the `treatment-card-grid` variant.
       */
      layout?: "grid" | "vertical-list" | (string & {});
      /** Slot name read from `siteConfig.heroObjects` for the cameo object. Default `"accent"` (falls back to `"primary"`). */
      heroObjectSlot?: "primary" | "secondary" | "accent" | (string & {});
      /** Show the floating 3D hero cameo. Default true; set false to render the grid without the cameo. */
      show3DObject?: boolean;
      /** Optional pre-title kicker rendered above the headline in the 3D variants. */
      eyebrow?: string;
      /** Optional 1–2 line description rendered below the subtitle in the 3D variants. */
      description?: string;
      /**
       * `card-stack-tabs` variant — tab labels rendered above the card
       * grid. Each tab matches against `service.category`. An "All" tab
       * is prepended at runtime. Untagged services only appear under
       * "All".
       */
      filters?: string[];
      /** Optional CTA label rendered below the grid (e.g. "Explore all services"). */
      ctaLabel?: string;
      /** Optional CTA href; when set the CTA renders as an anchor. */
      ctaHref?: string;
      /** `card-stack-tabs` variant — secondary CTA pair label. */
      ctaSecondaryLabel?: string;
      /** `card-stack-tabs` variant — secondary CTA href. */
      ctaSecondaryHref?: string;
    };
    team: SectionHeader & {
      description: string;
      teamVariant?: "standard" | "aura" | (string & {});
      /**
       * 5-variant system: v1 = original, v2 = horizontal carousel, v3 = grid
       * with hover bio, v4 = featured + list, v5 = minimal avatars.
       */
      variant?: SectionVariantValue;
    };
    whyChooseUs: SectionHeader & {
      benefits: Benefit[];
      mainImage: string;
      badge: string;
      /**
       * 5-variant system: v1 = original, v2 = vertical timeline, v3 =
       * comparison table, v4 = animated counters, v5 = testimonial hybrid.
       */
      variant?: SectionVariantValue;
      /**
       * Section-level variant for Why Choose Us. Independent from the
       * default rendering. When set to `"icon-grid-3d"` the section
       * renders the Aurea/Onyx-style icon-card grid with a side
       * `<HeroObject3D>` (text left + object right on desktop, stacked
       * on mobile). Requires `heroObjects[heroObjectSlot]` (or
       * `heroObjects.primary` as a fallback) to be set in the active
       * site config — otherwise the section falls back to its default
       * rendering and warns once in dev.
       *
       * Kept as a loose string union so a hub-side editor can extend it
       * without a template rebuild.
       */
      whyChooseUsVariant?: "standard" | "icon-grid-3d" | (string & {});
      /** Optional pre-title kicker rendered above the headline in the icon-grid-3d variant. */
      eyebrow?: string;
      /** Optional 1–2 line description rendered below the subtitle in the icon-grid-3d variant. */
      description?: string;
      /** Slot name read from `siteConfig.heroObjects` for the icon-grid-3d variant. Default `"secondary"` (falls back to `"primary"`). */
      heroObjectSlot?: "primary" | "secondary" | "accent" | (string & {});
      /** Hide the side 3D object in the icon-grid-3d variant — cards render full-width. Default true. */
      show3DObject?: boolean;
    };
    testimonials: SectionHeader & {
      testimonialsVariant?: "standard" | "aura" | (string & {});
      /**
       * 5-variant system: v1 = original, v2 = carousel, v3 = masonry cards,
       * v4 = video testimonials, v5 = rating summary + list.
       */
      variant?: SectionVariantValue;
    };
    gallery: SectionHeader & {
      /** REPLANTEO-01 D4: índices de `siteConfig.gallery` que van en la home (4–6); ausente = los 6 primeros. La galería completa va en `/galeria`. */
      selection?: number[];
      /**
       * Section-level variant for Gallery. See
       * `SiteConfig.sections.gallery.galleryVariant` for the full
       * contract — preset typing mirrors the runtime config so niche
       * presets can opt in directly.
       */
      galleryVariant?: "standard" | "bento-stats" | "grid-with-filters" | "portrait-bento-3d-cameo" | (string & {});
      /**
       * 5-variant system: v1 = original grid, v2 = masonry, v3 = lightbox
       * carousel, v4 = before/after slider, v5 = Pinterest columns.
       */
      variant?: SectionVariantValue;
      /** `bento-stats` variant — stat tiles rendered under the bento grid. */
      stats?: { value: string; label: string }[];
      /** `grid-with-filters` variant — filter chip labels (an "All" tab is prepended at runtime). */
      filters?: string[];
      /** `grid-with-filters` variant — map of image URL → tag list (filters match against this). */
      imageTags?: Record<string, string[]>;
      /** Slot name read from `siteConfig.heroObjects` for the cameo. Default `"accent"` (falls back to `"primary"`). */
      heroObjectSlot?: "primary" | "secondary" | "accent" | (string & {});
      /** Show the floating 3D hero cameo. Default true. */
      show3DObject?: boolean;
      /** Optional pre-title kicker rendered above the headline in the 3D variants. */
      eyebrow?: string;
      /** Optional 1–2 line description rendered below the subtitle in the 3D variants. */
      description?: string;
      /** Optional CTA label rendered below the grid. */
      ctaLabel?: string;
      /** Optional CTA href; when set the CTA renders as an anchor. */
      ctaHref?: string;
    };
    location: SectionHeader;
    contact: SectionHeader & {
      description: string;
      /**
       * Section-level variant for the booking/contact section. Independent
       * from the default rendering. When set to `"form-map-hours-3d"`
       * the section renders the 3D Impact layout (form on the left,
       * stacked map + hours on the right at lg+, with an optional
       * floating hero cameo). Requires `contact.address` for the map
       * column and `hours` for the hours card — missing data hides each
       * column independently and the form spans full width as a fallback.
       *
       * Kept as a loose string union so a hub-side editor can extend it
       * without a template rebuild.
       */
      bookingVariant?: "standard" | "form-map-hours-3d" | (string & {});
      /**
       * 5-variant system for the contact hub: v1 = original, v2 = split
       * map + form, v3 = floating card, v4 = minimal inline, v5 =
       * full-width immersive.
       */
      variant?: SectionVariantValue;
      /** Slot name read from `siteConfig.heroObjects` for the cameo object. Default `"accent"` (falls back to `"primary"`). */
      heroObjectSlot?: "primary" | "secondary" | "accent" | (string & {});
      /** Show the floating 3D hero cameo. Default true; set false to hide the cameo entirely. */
      show3DObject?: boolean;
      /** Render the map column in the 3D variant. Default true. Hidden automatically when `contact.address` is empty. */
      showMap?: boolean;
      /** Render the hours card in the 3D variant. Default true. Hidden automatically when `hours` is empty. */
      showHours?: boolean;
      /** Optional CTA label for the submit button (e.g. "Request a chair"). Falls back to the locale send label. */
      ctaSubmitLabel?: string;
      /**
       * Which form fields to render (in order). When omitted the variant
       * renders a sensible default for a booking inquiry: name, email,
       * service, date, message. `phone` is opt-in.
       */
      formFields?: Array<"name" | "email" | "phone" | "service" | "date" | "message">;
    };
    booking: {
      title: string;
      tagline: string;
      steps: {
        service: string;
        staff: string;
        datetime: string;
        details: string;
        payment: string;
      };
      aiConsultant: {
        title: string;
        subtitle: string;
        description: string;
        agentLabel: string;
        placeholder: string;
      };
      success: {
        title: string;
        confirmed: string;
        requestSaved: string;
        cancelled: string;
      };
    };
    instagram?: {
      title: string;
      handle: string;
      url: string;
      images: string[];
      instagramVariant?: "standard" | "aura" | (string & {});
      /**
       * 5-variant system: v1 = original, v2 = stories style, v3 = grid with
       * captions, v4 = single featured + grid, v5 = auto-scroll carousel.
       */
      variant?: SectionVariantValue;
    };
    admin: {
      staff: {
        title: string;
        scheduleTitle: string;
        commitButton: string;
        enforcementTitle: string;
        enforcementDesc: string;
      };
    };
    philosophy?: {
      title: string;
      subtitle: string;
      intro: string;
      pillars: { number: string; title: string; description: string }[];
    };
    process?: {
      title: string;
      subtitle: string;
      intro?: string;
      steps: { number: string; title: string; description: string; iconName?: string }[];
    };
    ambience?: {
      title: string;
      subtitle: string;
      intro?: string;
      sectors: { label: string; body: string; imageSrc: string }[];
    };
    portfolio?: {
      title: string;
      subtitle: string;
      filters: { key: string; label: string }[];
      projects: {
        title: string;
        type: string;
        description: string;
        duration?: string;
        size?: string;
        filter: string;
        images: string[];
        gallery?: GalleryPair[];
      }[];
    };
    faq?: {
      title: string;
      subtitle: string;
      items: { question: string; answer: string }[];
      faqVariant?: "standard" | "aura" | (string & {});
      /**
       * 5-variant system: v1 = original accordion, v2 = two-column, v3 =
       * searchable, v4 = tabbed by category, v5 = chat-style.
       */
      variant?: SectionVariantValue;
    };
    beforeAfter?: {
      title: string;
      subtitle: string;
      cases: BeforeAfterCase[];
      /** v1 = AuraBeforeAfter (clínica); v2 = slider par a par con etiqueta de servicio (peluquería, R3). */
      variant?: SectionVariantValue;
    };
    menu?: MenuConfig;
  };
  payment: {
    enabled: boolean;
    mode: PaymentMode;
    depositAmount?: number;
    depositRequired?: boolean;
    acceptCash?: boolean;
    currency: string;
    /** Provider-agnostic public/publishable key for client-side SDK init. */
    providerPublicKey?: string;
    /** @deprecated Use providerPublicKey. Kept for Stripe backwards compatibility. */
    stripePublishableKey?: string;
    provider?: PaymentProvider;
  };
  notifications: {
    enabled: boolean;
    bookingAlerts: boolean;
    contactInquiries: boolean;
  };
  adminEmail: string;
  /**
   * Intro splash screen shown once per page load (not repeated on SPA navigation).
   * Controlled by splash-session.ts module.
   */
  /**
   * Optional scheduling overrides (merged from Firestore `config/{clientId}`).
   * See `src/lib/schedulingRules.ts` for effective values.
   */
  businessRules?: BusinessRules;
  /**
   * Opt-in 3D Impact slot configuration. Each entry maps a slot name
   * (e.g. "primary", "secondary", "accent") to its image + treatment.
   * When undefined or empty, the 3D Impact components render nothing.
   */
  heroObjects?: Record<string, HeroObjectConfig>;
  /**
   * Global ambient particle layer — pearls / sparkles / bubbles / smoke
   * applied at the hero level (outside the HeroObject3D). When omitted no
   * extra particle layer renders. The editorial Velvet-style hero uses
   * `pearls` by default; legacy clients leave this unset.
   */
  globalAmbientParticles?: {
    type?: AmbientParticleType;
    density?: "light" | "medium" | "heavy";
  };
  splash: SplashConfig;
};

/** Tenant-tunable scheduling (stored in Firestore `config/{clientId}.businessRules`). */
export type BusinessRules = {
  /** Minutes between consecutive appointments (collision buffer). */
  bufferMinutes: number;
  /** How far ahead customers may book (days from today). */
  maxAdvanceBookingDays: number;
  /** Same-day bookings must start at least this many hours from now. */
  minAdvanceBookingHours: number;
  /** When payments are off: if false, new bookings stay `pending` until admin confirms. */
  autoConfirm: boolean;
};

export type PaymentMode = 'none' | 'deposit' | 'full' | 'cash-only';

export type PaymentStatus = 'pending' | 'deposit_required' | 'deposit_paid' | 'paid' | 'failed';

export type AppointmentStatus = 'confirmed' | 'pending' | 'cancelled' | 'completed' | 'expired';

/** Categorise each booking so revenue reports can separate paid work from free consultations / internal meetings. */
export type AppointmentType = 'appointment' | 'consultation' | 'meeting';

export type Appointment = {
  id: string;
  clientId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  serviceId: string;
  staffId: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  duration: number; // minutes, captured at booking
  status: AppointmentStatus;
  /** @default "appointment" — paid service. "consultation" = free. "meeting" = internal. */
  type?: AppointmentType;
  paymentStatus?: PaymentStatus;
  /** Provider-agnostic checkout session ID (Stripe, Cardcom, PayPal, etc.). */
  providerSessionId?: string;
  /** @deprecated Use providerSessionId. Kept for backwards compatibility with existing Stripe records. */
  stripeSessionId?: string;
  /** Actual amount charged in cents, independent of service catalogue price. */
  amountPaidCents?: number;
  createdAt: Date;
};

/** Customer lifecycle stage in the sales pipeline (Bloque F). */
export type CustomerStage = "lead" | "contacted" | "scheduled" | "converted" | "lost";

/**
 * Source attribution. Kept loose (`string` fallback) so a hub-side editor can
 * add channels (`instagram`, `google`, `referral`, …) without a template rebuild.
 */
export type CustomerSource =
  | "booking"
  | "manual"
  | "import"
  | "walkin"
  | "web"
  | "whatsapp"
  | "instagram"
  | "google"
  | "referral"
  | (string & {});

export type Customer = {
  id: string;
  clientId: string;
  fullName: string;
  email: string;
  phone: string;
  tags?: string[];
  // `preferences` retirado (N05 · T4, D-5 b1): tenia tres escritores y CERO lectores.
  // No lo mostraba ningun componente, no era columna de ninguna exportacion CSV y
  // firestore.rules no lo valida. Los documentos de siembra que ya lo tienen conservan
  // su contenido; no se borro nada. No reintroducir sin un lector real.
  lifetimeValueCents?: number;
  lastVisitAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  // Phase 1 CRM additions
  notes?: string;
  visitCount?: number;
  source?: CustomerSource;
  // Phase 2 — walk-in / external tracking
  lastServiceId?: string;
  amountPaidCents?: number;
  paymentMethod?: "cash" | "card" | "transfer" | "other";
  // Phase 3 (Bloque F) — pipeline + segmentation
  /**
   * Etapa explícita; si falta, se conserva la derivación legacy por visitCount.
   * Las coincidencias candidatas de citas no la modifican (customer-pipeline.ts).
   */
  stage?: CustomerStage;
  /** Last time the owner contacted this customer (call, message, etc.). */
  lastContactedAt?: Date;
};

export type PaymentProvider = "none" | "stripe" | "cardcom" | "paypal" | "meshulam" | "bit" | "yaadpay" | "authorize_net" | "square" | "other";

export type Invoice = {
  id: string;
  clientId: string;
  appointmentId?: string;
  customerId?: string;
  currency: string;
  subtotalCents: number;
  taxCents?: number;
  totalCents: number;
  provider: PaymentProvider;
  externalInvoiceId?: string;
  status: "draft" | "issued" | "paid" | "void" | "refunded";
  createdAt: Date;
  updatedAt: Date;
};

export type BusinessSettings = {
  openingHours: {
    start: string;
    end: string;
  };
  bufferTime: number; // minutes between appointments
};

export type InboxStatus = "new" | "read" | "replied" | "archived";

export type ContactInboxItem = {
  id: string;
  clientId: string;
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  source: "web" | "chat" | "manual" | "whatsapp";
  status: InboxStatus;
  customerId?: string;
  repliedAt?: Date;
  createdAt: Date;
};

export type NotificationLog = {
  id: string;
  clientId: string;
  channel: "email" | "whatsapp" | "sms" | "push";
  recipient: string;
  subject?: string;
  type: "booking" | "contact" | "reminder" | "marketing";
  status: "sent" | "failed" | "queued";
  refId?: string;
  providerMessageId?: string;
  error?: string;
  createdAt: Date;
};

export type ProviderMessageStatus = "new" | "read";
export type ProviderMessageSender = "client" | "provider";

export type ProviderMessage = {
  id: string;
  clientId: string;
  businessName: string;
  message: string;
  sender: ProviderMessageSender;
  status: ProviderMessageStatus;
  parentId?: string;
  category?: "maintenance" | "support" | "conversation";
  categoryReason?: string;
  createdAt: Date;
};
