/**
 * Dev-only route for QA of the 5-variant section system + global style flags.
 *
 * Loaded only when `import.meta.env.DEV` is true (see App.tsx). Everything is
 * driven by the URL query string so each combination is a clean page load —
 * no Firestore reads, no interactive state. The niche preset provides all the
 * mock data; `applyTenantConfigOverride` injects the variant selection and
 * the `global` style flags in-memory exactly like a Firestore doc would.
 *
 * URL: /dev/variants-preview?section=services&variant=v3
 *      &niche=barberia&lang=en&mode=dark
 *      &global={"borderRadius":"pill","cardStyle":"glass"}   (URL-encoded JSON)
 *
 * section=all renders every variant-bearing section stacked (navbar → footer)
 * with the SAME variant applied to all of them — one full-page screenshot
 * covers the whole system for that variant/theme/dir/viewport combo.
 *
 * Extra params: labels=0 hides the dev section labels in all-mode.
 * The page sets `data-variants-ready="1"` on <body> once animations settle
 * so automated screenshots can wait for a stable paint.
 */

import React from "react";
import { switchSiteToNiche, applyTenantConfigOverride, siteConfig } from "../../config/site";
import { setLocale } from "../../config/locale";
import { applySiteThemeCssVars } from "../../lib/site-theme";
import type { BusinessNiche } from "../../types";
import type { UiLanguage } from "../../config/uiLanguage";

type TenantOverride = Parameters<typeof applyTenantConfigOverride>[0];
import { ThemeProvider } from "../theme/ThemeProvider";
import { Navbar } from "../layout/Navbar";
import { Footer } from "../layout/Footer";
import { SplashScreen } from "../layout/SplashScreen";
import { Hero } from "../landing/Hero";
import { HeroStatsBar, type HeroStat } from "../landing/hero/stats-bar";
import { Services } from "../landing/Services";
import { Team } from "../landing/Team";
import { WhyChooseUs } from "../landing/WhyChooseUs";
import { Gallery } from "../landing/Gallery";
import { Testimonials } from "../landing/Testimonials";
import { InstagramFeed } from "../landing/InstagramFeed";
import { FAQ } from "../landing/FAQ";
import { ContactHub } from "../landing/ContactHub";

const VALID_NICHES: readonly BusinessNiche[] = [
  "barberia",
  "estetica",
  "tattoo",
  "nails",
  "cafeteria",
  "remodelaciones",
];

const VALID_LANGS: readonly UiLanguage[] = ["en", "he", "ru", "ar"];
const RTL_LANGS: ReadonlySet<string> = new Set(["he", "ar"]);
const LIGHT_NICHES: ReadonlySet<BusinessNiche> = new Set(["estetica", "nails", "cafeteria"]);
const VALID_VARIANTS = ["v1", "v2", "v3", "v4", "v5"] as const;
type VariantCode = (typeof VALID_VARIANTS)[number];

type SectionKey =
  | "navbar"
  | "hero"
  | "statsBar"
  | "services"
  | "team"
  | "whyChooseUs"
  | "gallery"
  | "testimonials"
  | "instagram"
  | "faq"
  | "contact"
  | "footer"
  | "splash";

/**
 * Sections rendered (in order) by `section=all`. Splash excluded (fullscreen
 * overlay) and navbar excluded (position:fixed — would overlap every other
 * section in screenshots). Both get QA'd via their dedicated section pages.
 */
const ALL_MODE_SECTIONS: readonly SectionKey[] = [
  "hero",
  "statsBar",
  "services",
  "team",
  "whyChooseUs",
  "gallery",
  "testimonials",
  "instagram",
  "faq",
  "contact",
  "footer",
];

const VALID_SECTIONS: readonly string[] = [...ALL_MODE_SECTIONS, "navbar", "splash", "all"];

/** Sections whose variant lives under `sections.{key}.variant`. */
const NESTED_SECTION_KEYS: ReadonlySet<SectionKey> = new Set([
  "services",
  "team",
  "whyChooseUs",
  "gallery",
  "testimonials",
  "instagram",
  "faq",
  "contact",
]);

type Params = {
  niche: BusinessNiche;
  lang: UiLanguage;
  mode: "dark" | "light";
  variant: VariantCode;
  section: SectionKey | "all" | null;
  global: Record<string, unknown> | null;
  labels: boolean;
};

function readParams(): Params {
  const q = new URLSearchParams(typeof window === "undefined" ? "" : window.location.search);

  const rawNiche = (q.get("niche") || "barberia").toLowerCase();
  const niche = (VALID_NICHES as readonly string[]).includes(rawNiche)
    ? (rawNiche as BusinessNiche)
    : "barberia";

  const rawLang = (q.get("lang") || "en").toLowerCase();
  const lang = (VALID_LANGS as readonly string[]).includes(rawLang)
    ? (rawLang as UiLanguage)
    : "en";

  const rawMode = (q.get("mode") || "").toLowerCase();
  const mode: "dark" | "light" =
    rawMode === "dark" || rawMode === "light"
      ? rawMode
      : LIGHT_NICHES.has(niche)
        ? "light"
        : "dark";

  const rawVariant = (q.get("variant") || "v1").toLowerCase();
  const variant = (VALID_VARIANTS as readonly string[]).includes(rawVariant)
    ? (rawVariant as VariantCode)
    : "v1";

  const rawSection = q.get("section");
  const section =
    rawSection && VALID_SECTIONS.includes(rawSection)
      ? (rawSection as SectionKey | "all")
      : null;

  let global: Record<string, unknown> | null = null;
  const rawGlobal = q.get("global");
  if (rawGlobal) {
    try {
      const parsed = JSON.parse(rawGlobal);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        global = parsed as Record<string, unknown>;
      }
    } catch {
      // eslint-disable-next-line no-console
      console.warn("[VariantsPreview] `global` param is not valid JSON — ignored:", rawGlobal);
    }
  }

  return { niche, lang, mode, variant, section, global, labels: q.get("labels") !== "0" };
}

function buildOverride(p: Params): TenantOverride {
  const override: Record<string, unknown> = {};
  const sections: Record<string, unknown> = {};
  const hero: Record<string, unknown> = {};

  const applyTo = (sec: SectionKey) => {
    if (NESTED_SECTION_KEYS.has(sec)) {
      sections[sec] = { variant: p.variant };
    } else if (sec === "hero") {
      hero.variant = p.variant;
    } else if (sec === "statsBar") {
      hero.statsBar = { variant: p.variant };
    } else if (sec === "navbar" || sec === "footer" || sec === "splash") {
      override[sec] = { variant: p.variant };
      // The navbar's overlay colors depend on which hero variant sits behind
      // it (light editorial v2/v4 vs dark photo) — mirror the variant so the
      // dedicated navbar page exercises the real combination.
      if (sec === "navbar") hero.variant = p.variant;
    }
  };

  if (p.section === "all") {
    ALL_MODE_SECTIONS.forEach(applyTo);
  } else if (p.section) {
    applyTo(p.section);
  }

  if (Object.keys(sections).length > 0) override.sections = sections;
  if (Object.keys(hero).length > 0) override.hero = hero;
  if (p.global) override.global = p.global;

  return override as TenantOverride;
}

/**
 * Run the config swap exactly once per page load, at module scope, BEFORE the
 * first React render — same contract as WizardRefsPreview. Components read
 * `siteConfig` / `localeConfig` at render time, so everything must be in
 * place before React mounts.
 */
let _initialized = false;
function ensureSetup(p: Params): void {
  if (_initialized || typeof document === "undefined") return;
  _initialized = true;

  setLocale(p.lang);
  switchSiteToNiche(p.niche, p.lang);
  applyTenantConfigOverride(buildOverride(p));

  const root = document.documentElement;
  root.lang = p.lang;
  root.dir = RTL_LANGS.has(p.lang) ? "rtl" : "ltr";
  root.classList.toggle("dark", p.mode === "dark");
  root.classList.toggle("light", p.mode === "light");

  applySiteThemeCssVars();
}

const NOOP = () => {};

/** Locale-aware mock stats — English strings inside an RTL page produce
 *  bidi artifacts that read as bugs and pollute the QA reports. */
const MOCK_STATS_BY_LANG: Record<string, HeroStat[]> = {
  en: [
    { icon: "Scissors", title: "Signature Work", description: "Precision in every detail." },
    { icon: "Award", title: "10+ Years", description: "Craft honed over a decade." },
    { icon: "Star", title: "5.0 Rating", description: "Hundreds of happy clients." },
    { icon: "Clock", title: "On Time", description: "Your hour is yours." },
  ],
  he: [
    { icon: "Scissors", title: "עבודה מדויקת", description: "דיוק בכל פרט." },
    { icon: "Award", title: "10+ שנים", description: "מומחיות של עשור." },
    { icon: "Star", title: "דירוג 5.0", description: "מאות לקוחות מרוצים." },
    { icon: "Clock", title: "בזמן", description: "השעה שלך שמורה לך." },
  ],
  ru: [
    { icon: "Scissors", title: "Фирменная работа", description: "Точность в каждой детали." },
    { icon: "Award", title: "10+ лет", description: "Десятилетие мастерства." },
    { icon: "Star", title: "Рейтинг 5.0", description: "Сотни довольных клиентов." },
    { icon: "Clock", title: "Вовремя", description: "Ваш час — только ваш." },
  ],
  ar: [
    { icon: "Scissors", title: "عمل متقن", description: "دقة في كل تفصيلة." },
    { icon: "Award", title: "+10 سنوات", description: "خبرة عقد كامل." },
    { icon: "Star", title: "تقييم 5.0", description: "مئات العملاء الراضين." },
    { icon: "Clock", title: "في الموعد", description: "ساعتك محفوظة لك." },
  ],
};

function SectionLabel({ id, variant }: { id: string; variant: string }) {
  return (
    <div
      dir="ltr"
      style={{
        padding: "6px 16px",
        fontFamily: "monospace",
        fontSize: 11,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        background: "#1d4ed8",
        color: "#fff",
      }}
    >
      {id} · {variant}
    </div>
  );
}

function renderSection(sec: SectionKey, p: Params): React.ReactNode {
  switch (sec) {
    case "navbar":
      return (
        <div style={{ position: "relative", minHeight: 140 }}>
          <Navbar onBookClick={NOOP} onPageChange={NOOP} currentPage="landing" />
        </div>
      );
    case "hero":
      return <Hero onBookClick={NOOP} />;
    case "statsBar":
      return (
        <div className="bg-background px-6 py-12">
          <div className="mx-auto max-w-5xl">
            <HeroStatsBar items={MOCK_STATS_BY_LANG[p.lang] ?? MOCK_STATS_BY_LANG.en} />
          </div>
        </div>
      );
    case "services":
      return <Services onBookClick={NOOP} />;
    case "team":
      return <Team onBookClick={NOOP} />;
    case "whyChooseUs":
      return <WhyChooseUs />;
    case "gallery":
      return <Gallery onViewFull={NOOP} />;
    case "testimonials":
      return <Testimonials />;
    case "instagram":
      return <InstagramFeed />;
    case "faq":
      return <FAQ />;
    case "contact":
      return <ContactHub />;
    case "footer":
      return (
        <Footer onAdminClick={NOOP} onLegalNavigate={NOOP} onPageChange={NOOP} onBookClick={NOOP} />
      );
    case "splash":
      return <SplashScreen />;
    default:
      return null;
  }
}

function IndexPage() {
  const base = "/dev/variants-preview";
  const linkStyle: React.CSSProperties = { color: "#60a5fa", textDecoration: "none" };
  return (
    <div
      dir="ltr"
      style={{
        minHeight: "100vh",
        background: "#0b0b0e",
        color: "#e5e5e5",
        fontFamily: "system-ui",
        padding: 32,
      }}
    >
      <h1 style={{ fontSize: 20, marginBottom: 4 }}>variants-preview (dev only)</h1>
      <p style={{ fontSize: 13, color: "#999", marginBottom: 24 }}>
        Params: section, variant (v1–v5), niche, lang (en/he/ru/ar), mode (dark/light), global
        (JSON), labels=0
      </p>
      {VALID_SECTIONS.map((sec) => (
        <div key={sec} style={{ marginBottom: 8, fontSize: 14 }}>
          <span style={{ display: "inline-block", width: 140, color: "#fbbf24" }}>{sec}</span>
          {VALID_VARIANTS.map((v) => (
            <a
              key={v}
              style={{ ...linkStyle, marginRight: 16 }}
              href={`${base}?section=${sec}&variant=${v}`}
            >
              {v}
            </a>
          ))}
        </div>
      ))}
    </div>
  );
}

export function VariantsPreview() {
  const params = readParams();
  ensureSetup(params);

  // Signal "stable paint" for automated screenshots — generous delay so
  // lazy variant chunks load and whileInView staggers settle.
  React.useEffect(() => {
    const t = setTimeout(() => {
      document.body.setAttribute("data-variants-ready", "1");
    }, 1200);
    return () => {
      clearTimeout(t);
      document.body.removeAttribute("data-variants-ready");
    };
  }, []);

  if (!params.section) return <IndexPage />;

  const sectionsToRender: readonly SectionKey[] =
    params.section === "all" ? ALL_MODE_SECTIONS : [params.section];

  return (
    // ThemeProvider so components using useTheme() (navbar overlay logic)
    // see the requested mode. Unique storageKey per mode keeps a previous
    // run's localStorage from overriding the ?mode= param.
    <ThemeProvider defaultTheme={params.mode} storageKey={`variants-preview-theme-${params.mode}`}>
      <div
        // id=main-content: the data-gs-spacing rules scope to
        // `#main-content section[...]` — mirror the real landing shell so
        // global style flags behave identically in this preview.
        id="main-content"
        className="min-h-screen bg-background text-foreground"
        data-niche={siteConfig.business.type}
      >
        {sectionsToRender.map((sec) => (
          <section key={sec} data-qa={sec}>
            {params.section === "all" && params.labels && (
              <SectionLabel id={sec} variant={params.variant} />
            )}
            {renderSection(sec, params)}
          </section>
        ))}
      </div>
    </ThemeProvider>
  );
}
