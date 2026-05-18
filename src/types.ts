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
};

export type Testimonial = {
  name: string;
  title: string;
  text: string;
  rating: number;
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
};

export type Benefit = {
  title: string;
  desc: string;
  iconName: string; // lucide-react icon name as string
};

export type BusinessNiche = "barberia" | "estetica" | "tattoo" | "nails" | "cafeteria" | "remodelaciones";

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
  | "faq";

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

/** Union of all visual theme IDs across the six styled niches. */
export type ThemeId =
  | "barberia-classic"
  | "barberia-urban"
  | "barberia-vintage"
  | "tattoo-ink"
  | "tattoo-neo-traditional"
  | "tattoo-fine-line"
  | "nails-rose"
  | "nails-lavender"
  | "nails-noir"
  | "estetica-lumiere"
  | "estetica-frost"
  | "estetica-botanical"
  | "cafeteria-warm"
  | "cafeteria-matcha"
  | "cafeteria-mocha"
  | "remodelaciones-pro"
  | "remodelaciones-slate"
  | "remodelaciones-earth";

/**
 * Visual theme definition. Color tokens, heading styles, radius, and shadow
 * overrides live in `index.css` under `html[data-theme="<id>"]` selectors.
 * This type carries only metadata and runtime-only properties (font URL,
 * section ordering) that JavaScript needs.
 */
export type ThemeDefinition = {
  id: ThemeId;
  /** Human-readable display name (e.g. "Urban", "Vintage"). */
  name: string;
  /** Which niche this theme belongs to. */
  niche: BusinessNiche;
  /**
   * Whether this is the niche's default theme. Default themes do NOT set
   * `data-theme` on `<html>` and rely on existing niche CSS blocks.
   */
  isDefault: boolean;
  /**
   * Google Fonts URL to load at runtime. Empty string when the fonts are
   * already in the global CSS `@import` or handled by the niche default.
   */
  googleFontsUrl: string;
  /** Landing page section rendering order. */
  sectionOrder: LandingSectionId[];
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
    variant?: "standard" | "slider";
    stats?: { value: string; label: string }[];
    beforeImage?: string;
    afterImage?: string;
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
    services: SectionHeader & { images: string[] };
    team: SectionHeader & { description: string };
    whyChooseUs: SectionHeader & {
      benefits: Benefit[];
      mainImage: string;
      badge: string;
    };
    testimonials: SectionHeader;
    gallery: SectionHeader;
    location: SectionHeader;
    contact: SectionHeader & { description: string };
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
    /** Static Instagram grid. Optional per niche; absent means no Instagram section. */
    instagram?: {
      title: string;
      handle: string;
      url: string;
      images: string[];
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
    };
    menu?: MenuConfig;
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
  | "staff-profile";

export type SiteConfig = {
  tenant: {
    clientId: string;
  };
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
     * Open Graph / Twitter preview image. Absolute `https://…` URL or site path (`/…`).
     * If omitted, `useSEO` uses `hero.backgroundImage` when it is an absolute URL.
     */
    ogImage?: string;
    aiPersona?: string;
  };
  theme: SiteTheme;
  /**
   * Visual theme ID (e.g. `"barberia-urban"`). Set in code or via Firestore
   * `config/{clientId}.activeTheme`. `VITE_THEME` env var overrides this
   * for local dev. Omit / `undefined` = niche default theme.
   */
  activeTheme?: string;
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
  hero: {
    titlePrefix: string;
    titleHighlight: string;
    titleSuffix: string;
    subtitle: string;
    ctaPrimary: string;
    ctaSecondary: string;
    backgroundImage: string;
    variant?: "standard" | "slider";
    stats?: { value: string; label: string }[];
    beforeImage?: string;
    afterImage?: string;
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
    services: SectionHeader & { images: string[] };
    team: SectionHeader & { description: string };
    whyChooseUs: SectionHeader & { 
      benefits: Benefit[];
      mainImage: string;
      badge: string;
    };
    testimonials: SectionHeader;
    gallery: SectionHeader;
    location: SectionHeader;
    contact: SectionHeader & { description: string };
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
    /** Static Instagram grid. Optional per niche; absent means no Instagram section. */
    instagram?: {
      title: string;
      handle: string;
      url: string;
      images: string[];
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
    };
    menu?: MenuConfig;
  };
  payment: {
    enabled: boolean;
    mode: PaymentMode;
    depositAmount?: number;
    currency: string;
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
  splash: {
    /** Master switch. Set to false to disable the splash entirely. */
    enabled: boolean;
    /**
     * Total visible duration of the splash in milliseconds, BEFORE the exit
     * animation starts. Recommended: ~2100. The exit curtain adds ~500 ms.
     */
    durationMs: number;
    /**
     * Optional background image URL for the splash screen.
     * Rendered behind all animations with a dark overlay for readability.
     */
    image?: string;
    /**
     * Visual variant (1-5). Each variant has a distinct animation style.
     * 1 = Classic (logo reveal + staggered letters)
     * 2 = Curtain (split panels open to reveal brand)
     * 3 = Pulse (radial burst + logo materialization)
     * 4 = Typewriter (minimal character-by-character typing)
     * 5 = Vortex (orbital particles coalesce into logo)
     * Default: 1
     */
    variant?: 1 | 2 | 3 | 4 | 5;
  };
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

export type PaymentMode = 'none' | 'deposit' | 'full';

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
  stripeSessionId?: string;
  /** Actual amount charged in cents, independent of service catalogue price. */
  amountPaidCents?: number;
  createdAt: Date;
};

export type Customer = {
  id: string;
  clientId: string;
  fullName: string;
  email: string;
  phone: string;
  tags?: string[];
  preferences?: string[];
  lifetimeValueCents?: number;
  lastVisitAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  // Phase 1 CRM additions
  notes?: string;
  visitCount?: number;
  source?: "booking" | "manual" | "import";
  // Phase 2 — walk-in / external tracking
  lastServiceId?: string;
  amountPaidCents?: number;
  paymentMethod?: "cash" | "card" | "transfer" | "other";
};

export type PaymentProvider = "stripe" | "meshulam" | "yaadpay" | "authorize_net" | "square" | "other";

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
  channel: "email" | "sms" | "push";
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
