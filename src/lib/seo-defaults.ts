/**
 * SEO defaults per niche + language.
 *
 * Used by:
 *   1. `vite-plugin-seo.ts` at build time → rewrites <title>, og:*, twitter:*,
 *      canonical, and favicon in `index.html` so link previews (WhatsApp,
 *      Facebook, Slack, Twitter) show per-tenant branding without executing JS.
 *   2. `src/hooks/useSEO.ts` at runtime as a fallback when `siteConfig.brand`
 *      hasn't been hydrated from Firestore yet (kept in sync with presets).
 *
 * Each Vercel project sets `VITE_ACTIVE_NICHE` and `VITE_UI_LANGUAGE`. Optional
 * `VITE_BRAND_NAME` / `VITE_BRAND_TAGLINE` / `VITE_BRAND_DESCRIPTION` /
 * `VITE_OG_IMAGE` / `VITE_APP_URL` / `VITE_FAVICON_EMOJI` / `VITE_THEME_ACCENT`
 * env vars override the defaults below.
 */

export type SeoNiche =
  | "barberia"
  | "estetica"
  | "tattoo"
  | "nails"
  | "cafeteria"
  | "remodelaciones"
  | "employment";

export type SeoLang = "en" | "he" | "ru" | "ar";

export type SeoEntry = {
  brand: string;
  tagline: string;
  description: string;
  ogImage: string;
  faviconEmoji: string;
  accent: string;
  locale: string;
};

type LangMap = Record<SeoLang, { tagline: string; description: string }>;

type NicheBase = {
  brand: string;
  ogImage: string;
  faviconEmoji: string;
  accent: string;
  langs: LangMap;
};

const LOCALES: Record<SeoLang, string> = {
  en: "en_US",
  he: "he_IL",
  ru: "ru_RU",
  ar: "ar_SA",
};

const NICHES: Record<SeoNiche, NicheBase> = {
  barberia: {
    brand: "Master Barber",
    ogImage:
      "https://images.unsplash.com/photo-1532710093739-9470acff878f?auto=format&fit=crop&q=80&w=1200",
    faviconEmoji: "✂️",
    accent: "#d97706",
    langs: {
      en: {
        tagline: "Precision craftsmanship for the modern gentleman",
        description:
          "A premier grooming destination where time-honored artistry meets contemporary precision. Book your exclusive grooming experience.",
      },
      he: {
        tagline: "אומנות מדויקת לג׳נטלמן המודרני",
        description:
          "יעד טיפוח מוביל שבו אומנות מסורתית פוגשת דיוק עכשווי. הזמינו את חוויית הטיפוח האקסקלוסיבית שלכם.",
      },
      ru: {
        tagline: "Точное мастерство для современного джентльмена",
        description:
          "Премиум-барбершоп, где традиции встречаются с современной точностью. Запишитесь на эксклюзивный визит.",
      },
      ar: {
        tagline: "حِرفة دقيقة للرجل العصري",
        description:
          "وجهة رائدة للعناية حيث تلتقي الحرفية التقليدية بالدقة المعاصرة. احجز تجربتك الحصرية.",
      },
    },
  },
  estetica: {
    brand: "Aesthetic Studio",
    ogImage:
      "https://images.unsplash.com/photo-1552693673-1bf958298935?auto=format&fit=crop&q=80&w=1200",
    faviconEmoji: "✨",
    accent: "#c084fc",
    langs: {
      en: {
        tagline: "The science of natural beauty",
        description:
          "A premier medical aesthetics clinic specializing in injectable treatments, advanced facials, and skin rejuvenation.",
      },
      he: {
        tagline: "המדע של יופי טבעי",
        description:
          "מרפאת אסתטיקה רפואית מובילה המתמחה בטיפולי הזרקה, טיפולי פנים מתקדמים והתחדשות העור.",
      },
      ru: {
        tagline: "Наука естественной красоты",
        description:
          "Премиум-клиника эстетической медицины: инъекционные процедуры, продвинутый уход за кожей и омоложение.",
      },
      ar: {
        tagline: "علم الجمال الطبيعي",
        description:
          "عيادة تجميل طبية رائدة متخصصة في الحقن والعناية المتقدمة بالبشرة وتجديد شبابها.",
      },
    },
  },
  tattoo: {
    brand: "Ink Studio",
    ogImage:
      "https://images.unsplash.com/photo-1763888647744-c566e723c396?auto=format&fit=crop&q=80&w=1200",
    faviconEmoji: "🖊️",
    accent: "#dc2626",
    langs: {
      en: {
        tagline: "Where skin becomes art",
        description:
          "An elite tattoo studio where master artists transform your vision into a permanent masterpiece. Custom designs and fine line work.",
      },
      he: {
        tagline: "כשהעור הופך לאמנות",
        description:
          "סטודיו קעקועים יוקרתי שבו אמני מאסטר הופכים את החזון שלכם ליצירת מופת קבועה. עיצובים מותאמים אישית ועבודת קווים עדינה.",
      },
      ru: {
        tagline: "Где кожа становится искусством",
        description:
          "Элитная тату-студия: мастера превращают вашу идею в постоянный шедевр. Кастомные дизайны и тонкие линии.",
      },
      ar: {
        tagline: "حيث يتحوّل الجلد إلى فن",
        description:
          "ستوديو وشم نخبوي يحوّل فيه الفنانون رؤيتك إلى تحفة دائمة. تصاميم مخصصة وأعمال خطوط دقيقة.",
      },
    },
  },
  nails: {
    brand: "Nail Studio",
    ogImage:
      "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&q=80&w=1200",
    faviconEmoji: "💅",
    accent: "#f472b6",
    langs: {
      en: {
        tagline: "Where every detail shines",
        description:
          "An upscale nail studio offering precision nail artistry, long-lasting gel systems, and bespoke nail design.",
      },
      he: {
        tagline: "שבכל פרט יש ברק",
        description:
          "סטודיו ציפורניים יוקרתי המציע אמנות ציפורניים מדויקת, מערכות ג׳ל ארוכות-טווח ועיצוב מותאם אישית.",
      },
      ru: {
        tagline: "Где каждая деталь сияет",
        description:
          "Премиум-студия маникюра: точное nail-арт, стойкие гелевые покрытия и индивидуальный дизайн.",
      },
      ar: {
        tagline: "حيث يتألّق كل تفصيل",
        description:
          "ستوديو أظافر راقٍ يقدّم فنون أظافر دقيقة، أنظمة جل تدوم طويلاً، وتصاميم مخصصة.",
      },
    },
  },
  cafeteria: {
    brand: "Specialty Coffee",
    ogImage:
      "https://images.unsplash.com/photo-1445116572660-236099ec97a0?auto=format&fit=crop&q=80&w=1200",
    faviconEmoji: "☕",
    accent: "#92400e",
    langs: {
      en: {
        tagline: "Specialty coffee roasted in small batches",
        description:
          "Small-batch specialty coffee roasted with care. Every cup is a ceremony of flavor and craft.",
      },
      he: {
        tagline: "קפה מיוחד קלוי במנות קטנות",
        description:
          "קפה ספיישלטי במנות קטנות, נקלה בקפידה. כל ספל הוא טקס של טעם ואומנות.",
      },
      ru: {
        tagline: "Спешелти кофе малой обжарки",
        description:
          "Спешелти-кофе малой обжарки, приготовленный с заботой. Каждая чашка — ритуал вкуса и ремесла.",
      },
      ar: {
        tagline: "قهوة مختصة محمّصة بعناية على دفعات صغيرة",
        description:
          "قهوة مختصة محمّصة بعناية على دفعات صغيرة. كل كوب طقس من النكهة والحرفة.",
      },
    },
  },
  remodelaciones: {
    brand: "Painting & Remodeling",
    ogImage:
      "https://images.unsplash.com/photo-1774977737078-7ccc2ac697e6?auto=format&fit=crop&q=80&w=1200",
    faviconEmoji: "🏠",
    accent: "#0ea5e9",
    langs: {
      en: {
        tagline: "Professional house painting & finishes",
        description:
          "Professional interior and exterior painting services. Licensed, insured, and backed by a quality guarantee. Get a free quote today.",
      },
      he: {
        tagline: "צביעת בתים מקצועית וגימור איכותי",
        description:
          "שירותי צביעת פנים וחוץ מקצועיים. רישוי, ביטוח ואחריות איכות. קבלו הצעת מחיר חינם.",
      },
      ru: {
        tagline: "Профессиональная покраска и отделка домов",
        description:
          "Профессиональная внутренняя и наружная покраска. Лицензия, страховка и гарантия качества. Бесплатная смета.",
      },
      ar: {
        tagline: "دهان وطلاء منازل احترافي",
        description:
          "خدمات دهان داخلي وخارجي احترافية. مرخّص ومؤمَّن مع ضمان الجودة. اطلب عرض سعر مجاني اليوم.",
      },
    },
  },
  employment: {
    brand: "Lekt Grigori",
    ogImage:
      "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80&w=1200",
    faviconEmoji: "💼",
    accent: "#E8820C",
    langs: {
      en: {
        tagline: "Connecting people with jobs",
        description:
          "Job placement agency specializing in warehouse, logistics, cleaning, driving, construction, and hospitality positions. We find the right job for you.",
      },
      he: {
        tagline: "מחברים בין אנשים לעבודה",
        description:
          "חברת השמת עובדים המתמחה במשרות מחסנים, לוגיסטיקה, ניקיון, נהגים, בנייה ומסעדנות. אנחנו נמצא לך עבודה.",
      },
      ru: {
        tagline: "Соединяем людей с работой",
        description:
          "Агентство по трудоустройству: склады, логистика, уборка, водители, строительство и общепит. Мы найдём работу для вас.",
      },
      ar: {
        tagline: "نربط الأشخاص بفرص العمل",
        description:
          "وكالة توظيف متخصصة في المستودعات واللوجستيات والتنظيف والسائقين والبناء والضيافة. نجد لك الوظيفة المناسبة.",
      },
    },
  },
};

const NICHE_VALUES = Object.keys(NICHES) as SeoNiche[];
const LANG_VALUES: SeoLang[] = ["en", "he", "ru", "ar"];

function isNiche(s: string): s is SeoNiche {
  return (NICHE_VALUES as string[]).includes(s);
}

function isLang(s: string): s is SeoLang {
  return (LANG_VALUES as string[]).includes(s);
}

export function getSeoDefaults(rawNiche: string | undefined, rawLang: string | undefined): SeoEntry {
  const niche: SeoNiche = isNiche((rawNiche ?? "").toLowerCase()) ? ((rawNiche as string).toLowerCase() as SeoNiche) : "barberia";
  const lang: SeoLang = isLang((rawLang ?? "").toLowerCase()) ? ((rawLang as string).toLowerCase() as SeoLang) : "en";
  const base = NICHES[niche];
  const langPack = base.langs[lang] ?? base.langs.en;
  return {
    brand: base.brand,
    tagline: langPack.tagline,
    description: langPack.description,
    ogImage: base.ogImage,
    faviconEmoji: base.faviconEmoji,
    accent: base.accent,
    locale: LOCALES[lang] ?? "en_US",
  };
}
