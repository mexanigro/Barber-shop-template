import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, LayoutGroup } from "motion/react";
import { siteConfig } from "../../config/site";
import type { AmbientParticleType, HeroObjectIntensity } from "../../types";
import { AmbientParticles } from "./ambient-particles";
import { CTAButton3D } from "./cta-button-3d";
import { HeroObject3D } from "./hero-object-3d";
import { SplashImpactScale } from "./splash-impact-scale";
import { SplashImpactSplit } from "./splash-impact-split";
import { SplashImpactReveal3D, SPLASH_HERO_LAYOUT_ID } from "./splash-impact-reveal-3d";
import { HeroVariant3DObject } from "../landing/hero-variant-3d-object";
import { WhyChooseUsIconGrid3D } from "../landing/why-choose-us-icon-grid-3d";
import { ServicesListWithIcons } from "../landing/services-list-with-icons";
import { ServicesTreatmentCardGrid } from "../landing/services-treatment-card-grid";
import { ServicesCardStackTabs } from "../landing/services-card-stack-tabs";
import { GalleryBentoStats } from "../landing/gallery-bento-stats";
import { GalleryGridWithFilters } from "../landing/gallery-grid-with-filters";
import { GalleryPortraitBentoCameo } from "../landing/gallery-portrait-bento-3d-cameo";
import { BookingFormMapHours3D } from "../landing/booking-form-map-hours-3d";
import { PaperCard } from "./paper-card";
import type { HeroObjectConfig, Service } from "../../types";
import { resolveLucideIcon } from "../../lib/lucide-icons";
import { Scissors } from "lucide-react";

type HeroVariantFixture = "full" | "minimal";

type WcuSlot = "primary" | "secondary" | "accent";

type ServicesVariantFixture = "list-with-icons" | "treatment-card-grid" | "card-stack-tabs";

type GalleryVariantFixture = "bento-stats" | "grid-with-filters" | "portrait-bento-3d-cameo";

type ImpactSplashVariant = "impact-scale" | "impact-split" | "impact-reveal-3d";

/**
 * Internal route for visual validation of the 3D Impact core.
 * NOT linked from production navigation — reached via `/3d-impact-demo`.
 *
 * Injects a temporary `heroObjects.primary` slot into the runtime
 * site config so the components have something to render even though
 * no production client has configured them yet.
 */
const DEMO_IMAGE =
  "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=800&auto=format&fit=crop&q=80";

const INTENSITIES: HeroObjectIntensity[] = ["subtle", "medium", "strong"];
const PARTICLES: AmbientParticleType[] = ["bubbles", "smoke", "sparkles", "pearls", "none"];

export default function DemoPage() {
  const [forceReduced, setForceReduced] = useState(false);
  const [intensity, setIntensity] = useState<HeroObjectIntensity>("medium");
  const [particles, setParticles] = useState<AmbientParticleType>("bubbles");
  const [shadowMode, setShadowMode] = useState<"default" | "auto">("default");

  // Splash Impact controls
  const [activeSplash, setActiveSplash] = useState<ImpactSplashVariant | null>(null);
  const [bandCount, setBandCount] = useState<number>(7);
  const [bandDirection, setBandDirection] = useState<"horizontal" | "vertical">("horizontal");
  const [splitDirection, setSplitDirection] = useState<"horizontal" | "vertical">("horizontal");
  const [splashParticles, setSplashParticles] = useState<AmbientParticleType>("bubbles");
  const [splashDuration, setSplashDuration] = useState<number>(1500);
  const [splashRunId, setSplashRunId] = useState<number>(0);
  // Whether the splash→hero shared-layout test is armed. When true, the
  // destination hero below mounts with `layoutId=SPLASH_HERO_LAYOUT_ID`
  // so an `impact-reveal-3d` splash transfers its hero image into it on
  // exit (one continuous travel, not a crossfade).
  const [transitionArmed, setTransitionArmed] = useState(false);
  const transitionAnchorRef = useRef<HTMLDivElement>(null);

  // Hero variant fixture — toggles which mocked siteConfig.hero shape we
  // feed the `HeroVariant3DObject` below.  `full` exercises every
  // optional field (eyebrow + description + 2 CTAs); `minimal` exercises
  // the bare-minimum path (no eyebrow, no description, single CTA).
  const [heroVariantFixture, setHeroVariantFixture] =
    useState<HeroVariantFixture>("full");

  // Why-Choose-Us icon-grid-3d controls — drive which slot the new
  // variant reads and whether it shows the side object at all.
  const [wcuSlot, setWcuSlot] = useState<WcuSlot>("secondary");
  const [wcuShowObject, setWcuShowObject] = useState(true);
  const [wcuBenefitCount, setWcuBenefitCount] = useState<2 | 3 | 4>(4);

  // Services variant controls — drive which 3D variant renders, the
  // inner layout for list-with-icons, the cameo slot, and the service
  // mock size so we can exercise the empty-image and many-services paths.
  const [servicesVariant, setServicesVariant] =
    useState<ServicesVariantFixture>("list-with-icons");
  const [servicesLayout, setServicesLayout] = useState<"grid" | "vertical-list">(
    "grid",
  );
  const [servicesShowObject, setServicesShowObject] = useState(true);
  const [servicesSlot, setServicesSlot] = useState<WcuSlot>("accent");
  const [servicesCount, setServicesCount] = useState<0 | 3 | 6 | 8>(6);
  const [servicesWithImages, setServicesWithImages] = useState(true);

  // Gallery variant controls — drive which Gallery variant renders,
  // the cameo slot, image count (3 to exercise the bento fallback to a
  // simple grid, 6 for the full bento, 12 for the filterable grid), and
  // whether the stats bar is populated.
  const [galleryVariant, setGalleryVariant] =
    useState<GalleryVariantFixture>("bento-stats");
  const [gallerySlot, setGallerySlot] = useState<WcuSlot>("accent");
  const [galleryShowObject, setGalleryShowObject] = useState(true);
  const [galleryCount, setGalleryCount] = useState<3 | 6 | 8 | 12>(6);
  const [galleryWithStats, setGalleryWithStats] = useState(true);

  // Velvet Muse paper-physics demo controls — replay button forces
  // the grid to remount so the entrance animations replay.
  const [paperRunId, setPaperRunId] = useState(0);

  // heroObjects composition demo — slot id we mount the composition
  // under (separate from `primary`) so we don't collide with the rest
  // of the demo. Replay button cycles the React key on the host so the
  // entry animation re-runs.
  const [compositionRunId, setCompositionRunId] = useState(0);

  // Booking variant controls — drive the cameo slot + the three flag
  // toggles (showMap, showHours, show3DObject). The data toggles
  // (`withAddress` / `withHours`) exercise the fallback paths that
  // hide each column independently when the underlying data is empty.
  const [bookingSlot, setBookingSlot] = useState<WcuSlot>("accent");
  const [bookingShowObject, setBookingShowObject] = useState(true);
  const [bookingShowMap, setBookingShowMap] = useState(true);
  const [bookingShowHours, setBookingShowHours] = useState(true);
  const [bookingWithAddress, setBookingWithAddress] = useState(true);
  const [bookingWithHours, setBookingWithHours] = useState(true);

  // Hot-inject a primary slot for the demo. Restored on unmount so we
  // don't leak fixture data into other routes inside the same SPA session.
  // `secondary` + `accent` are also injected so the WhyChooseUs icon-grid
  // section below can exercise the slot fallback logic.
  useEffect(() => {
    const previous = siteConfig.heroObjects;
    const baseSlot = {
      src: DEMO_IMAGE,
      intensity,
      particles,
      // "default" omits shadowColor so the new black-alpha default kicks in.
      // "auto" opts into the brand-accent tint (Aurea-style).
      ...(shadowMode === "auto" ? { shadowColor: "auto" as const } : {}),
    };
    siteConfig.heroObjects = {
      primary: baseSlot,
      secondary: baseSlot,
      accent: baseSlot,
    };
    return () => {
      siteConfig.heroObjects = previous;
    };
  }, [intensity, particles, shadowMode]);

  // Force prefers-reduced-motion at the media-query level so the toggle
  // affects child components without a global setting change.
  useEffect(() => {
    const id = "impact3d-demo-reduced-motion";
    const existing = document.getElementById(id);
    if (forceReduced) {
      if (!existing) {
        const tag = document.createElement("style");
        tag.id = id;
        // Disable all CSS animations + transitions, and Motion's MotionConfig
        // is already set to `reducedMotion="user"` so this toggle alone is
        // enough to simulate the OS-level preference for component logic.
        tag.textContent = `
          *, *::before, *::after {
            animation-duration: 0.001ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.001ms !important;
            scroll-behavior: auto !important;
          }
        `;
        document.head.appendChild(tag);
      }
    } else if (existing) {
      existing.remove();
    }
    return () => {
      document.getElementById(id)?.remove();
    };
  }, [forceReduced]);

  return (
    <LayoutGroup>
    <main className="min-h-screen bg-background py-16 text-foreground">
      <div className="mx-auto max-w-5xl px-6">
        <header className="mb-10">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">
            Internal · 3D Impact demo
          </p>
          <h1 className="mt-2 text-3xl font-bold">Core component playground</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Visual validation surface for Bloque 1. Not linked from the public
            site. Useful for tuning intensity + particle combinations before
            wiring section-level variants.
          </p>
        </header>

        {/* Controls */}
        <section className="mb-10 grid gap-4 rounded-2xl border border-border bg-card p-5 sm:grid-cols-2 lg:grid-cols-4">
          <label className="flex flex-col gap-2 text-sm">
            <span className="font-semibold">Intensity</span>
            <select
              value={intensity}
              onChange={(e) => setIntensity(e.target.value as HeroObjectIntensity)}
              className="rounded-md border border-border bg-background px-3 py-2 text-sm"
            >
              {INTENSITIES.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-2 text-sm">
            <span className="font-semibold">Particles</span>
            <select
              value={particles}
              onChange={(e) => setParticles(e.target.value as AmbientParticleType)}
              className="rounded-md border border-border bg-background px-3 py-2 text-sm"
            >
              {PARTICLES.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-2 text-sm">
            <span className="font-semibold">Shadow</span>
            <select
              value={shadowMode}
              onChange={(e) => setShadowMode(e.target.value as "default" | "auto")}
              className="rounded-md border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="default">default (black α)</option>
              <option value="auto">auto (brand-accent)</option>
            </select>
          </label>

          <label className="flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={forceReduced}
              onChange={(e) => setForceReduced(e.target.checked)}
              className="h-4 w-4 rounded border-border"
            />
            <span className="font-semibold">Simulate prefers-reduced-motion</span>
          </label>
        </section>

        {/* HeroObject3D */}
        <section className="mb-16">
          <h2 className="mb-4 text-xl font-bold">HeroObject3D</h2>
          <p className="mb-6 text-sm text-muted-foreground">
            Move your mouse over the image — tilt + shadow follow the cursor.
            Scroll the page to see the parallax + viewport entry / dim.
          </p>
          <div className="flex items-center justify-center rounded-3xl border border-border bg-gradient-to-br from-card to-background p-10">
            <HeroObject3D
              slotName="primary"
              priority
              size="xl"
              alt="3D impact demo object"
            />
          </div>
        </section>

        {/* AmbientParticles standalone */}
        <section className="mb-16">
          <h2 className="mb-4 text-xl font-bold">AmbientParticles (all types)</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PARTICLES.map((t) => (
              <div
                key={t}
                className="relative h-48 overflow-hidden rounded-2xl border border-border bg-card"
              >
                <AmbientParticles type={t} density="medium" />
                <div className="absolute inset-x-0 bottom-3 text-center text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {t}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* CTAButton3D */}
        <section className="mb-16">
          <h2 className="mb-4 text-xl font-bold">CTAButton3D (all variants)</h2>
          <div className="flex flex-wrap gap-4">
            <CTAButton3D variant="primary" intensity={intensity}>
              Primary action
            </CTAButton3D>
            <CTAButton3D variant="secondary" intensity={intensity}>
              Secondary action
            </CTAButton3D>
            <CTAButton3D variant="outline" intensity={intensity}>
              Outline action
            </CTAButton3D>
          </div>
        </section>

        {/* Splash Impact playground */}
        <section className="mb-16">
          <h2 className="mb-4 text-xl font-bold">Splash Impact variants</h2>
          <p className="mb-6 text-sm text-muted-foreground">
            Trigger each splash over the demo page. Adjust the controls below
            and use <em>Replay</em> to re-run with the current settings.
            <br />
            <span className="text-xs">
              Tip: <code className="rounded bg-card px-1 py-0.5">impact-reveal-3d</code> reads
              <code className="ml-1 rounded bg-card px-1 py-0.5">heroObjects.primary</code> from the active
              config (the same slot the controls above mutate).
            </span>
          </p>

          <div className="mb-6 grid gap-4 rounded-2xl border border-border bg-card p-5 sm:grid-cols-2 lg:grid-cols-4">
            <label className="flex flex-col gap-2 text-sm">
              <span className="font-semibold">Duration (ms)</span>
              <input
                type="number"
                min={400}
                max={4000}
                step={100}
                value={splashDuration}
                onChange={(e) => setSplashDuration(Number(e.target.value) || 1500)}
                className="rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm">
              <span className="font-semibold">Bands (scale)</span>
              <input
                type="number"
                min={3}
                max={14}
                value={bandCount}
                onChange={(e) => setBandCount(Number(e.target.value) || 7)}
                className="rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm">
              <span className="font-semibold">Direction (scale)</span>
              <select
                value={bandDirection}
                onChange={(e) => setBandDirection(e.target.value as "horizontal" | "vertical")}
                className="rounded-md border border-border bg-background px-3 py-2 text-sm"
              >
                <option value="horizontal">horizontal</option>
                <option value="vertical">vertical</option>
              </select>
            </label>
            <label className="flex flex-col gap-2 text-sm">
              <span className="font-semibold">Direction (split)</span>
              <select
                value={splitDirection}
                onChange={(e) => setSplitDirection(e.target.value as "horizontal" | "vertical")}
                className="rounded-md border border-border bg-background px-3 py-2 text-sm"
              >
                <option value="horizontal">horizontal</option>
                <option value="vertical">vertical</option>
              </select>
            </label>
            <label className="flex flex-col gap-2 text-sm">
              <span className="font-semibold">Particles (reveal-3d)</span>
              <select
                value={splashParticles}
                onChange={(e) => setSplashParticles(e.target.value as AmbientParticleType)}
                className="rounded-md border border-border bg-background px-3 py-2 text-sm"
              >
                {PARTICLES.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => {
                setActiveSplash("impact-scale");
                setSplashRunId((n) => n + 1);
              }}
              className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-light"
            >
              Run impact-scale
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveSplash("impact-split");
                setSplashRunId((n) => n + 1);
              }}
              className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-light"
            >
              Run impact-split
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveSplash("impact-reveal-3d");
                setSplashRunId((n) => n + 1);
              }}
              className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-light"
            >
              Run impact-reveal-3d
            </button>
            {activeSplash && (
              <button
                type="button"
                onClick={() => setSplashRunId((n) => n + 1)}
                className="rounded-full border border-border bg-card px-5 py-2.5 text-sm font-semibold text-foreground hover:border-accent/40"
              >
                Replay {activeSplash}
              </button>
            )}
            {activeSplash && (
              <button
                type="button"
                onClick={() => setActiveSplash(null)}
                className="rounded-full border border-border bg-transparent px-5 py-2.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
              >
                Dismiss
              </button>
            )}
          </div>
        </section>

        {/* Splash → Hero shared-layout transition */}
        <section className="mb-16">
          <h2 className="mb-4 text-xl font-bold">Splash → Hero transition</h2>
          <p className="mb-6 text-sm text-muted-foreground">
            Arms a destination <code className="rounded bg-card px-1 py-0.5">HeroObject3D</code>{" "}
            with <code className="rounded bg-card px-1 py-0.5">layoutId={`"${SPLASH_HERO_LAYOUT_ID}"`}</code>.
            While armed, running the{" "}
            <code className="rounded bg-card px-1 py-0.5">impact-reveal-3d</code> splash makes
            its hero image <em>travel into</em> the destination on exit — one continuous
            object, not a fade-then-pop.
            <br />
            <span className="text-xs">
              Tip: turn on <em>Simulate prefers-reduced-motion</em> above to verify the
              fallback (no shared transition, static reveal).
            </span>
          </p>

          <div className="mb-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setTransitionArmed((v) => !v)}
              className={[
                "rounded-full px-5 py-2.5 text-sm font-semibold transition-colors",
                transitionArmed
                  ? "bg-accent text-white hover:bg-accent-light"
                  : "border border-border bg-card text-foreground hover:border-accent/40",
              ].join(" ")}
              aria-pressed={transitionArmed}
            >
              {transitionArmed ? "Disarm destination" : "Arm destination"}
            </button>
            <button
              type="button"
              disabled={!transitionArmed}
              onClick={() => {
                setActiveSplash("impact-reveal-3d");
                setSplashRunId((n) => n + 1);
                // Scroll the destination into view so the transition lands
                // where the user is looking — otherwise the splash dismisses
                // to off-screen and the travel feels like a teleport.
                transitionAnchorRef.current?.scrollIntoView({
                  behavior: "auto",
                  block: "center",
                });
              }}
              className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 enabled:hover:bg-accent-light"
            >
              Run splash → hero
            </button>
            <button
              type="button"
              disabled={!transitionArmed}
              onClick={() => {
                setActiveSplash("impact-reveal-3d");
                setSplashRunId((n) => n + 1);
              }}
              className="rounded-full border border-border bg-card px-5 py-2.5 text-sm font-semibold text-foreground disabled:cursor-not-allowed disabled:opacity-50 enabled:hover:border-accent/40"
            >
              Replay
            </button>
          </div>

          <div
            ref={transitionAnchorRef}
            className="flex min-h-[24rem] items-center justify-end rounded-3xl border border-dashed border-accent/40 bg-gradient-to-br from-card to-background p-10"
          >
            {transitionArmed ? (
              <HeroObject3D
                slotName="primary"
                size="lg"
                alt="Splash → hero shared layout destination"
                layoutId={SPLASH_HERO_LAYOUT_ID}
              />
            ) : (
              <p className="text-center text-sm text-muted-foreground">
                Destination not armed. Press <em>Arm destination</em> to mount a{" "}
                <code className="rounded bg-card px-1 py-0.5">HeroObject3D</code> with the
                shared <code className="rounded bg-card px-1 py-0.5">layoutId</code> here.
              </p>
            )}
          </div>
        </section>

        {/* Test hero variants — mounts the production HeroVariant3DObject
            with a mocked `siteConfig.hero` shape so we can validate the
            Aurea/Onyx layout without editing a real preset. */}
        <section className="mb-16">
          <h2 className="mb-4 text-xl font-bold">Test hero variants</h2>
          <p className="mb-6 text-sm text-muted-foreground">
            Renders the production <code className="rounded bg-card px-1 py-0.5">HeroVariant3DObject</code>{" "}
            (the section the app mounts when{" "}
            <code className="rounded bg-card px-1 py-0.5">hero.heroVariant === "hero-3d-object"</code>).
            The <em>minimal</em> fixture drops eyebrow + description + the
            secondary CTA so the empty-field path is also covered.
          </p>

          <div className="mb-4 flex flex-wrap gap-2 text-sm">
            <button
              type="button"
              onClick={() => setHeroVariantFixture("full")}
              className={
                "rounded-full px-4 py-1.5 font-semibold transition-colors " +
                (heroVariantFixture === "full"
                  ? "bg-accent text-white"
                  : "bg-card text-foreground hover:border-accent/40 border border-border")
              }
            >
              Full (eyebrow + 2 CTAs)
            </button>
            <button
              type="button"
              onClick={() => setHeroVariantFixture("minimal")}
              className={
                "rounded-full px-4 py-1.5 font-semibold transition-colors " +
                (heroVariantFixture === "minimal"
                  ? "bg-accent text-white"
                  : "bg-card text-foreground hover:border-accent/40 border border-border")
              }
            >
              Minimal (no eyebrow, 1 CTA)
            </button>
          </div>

          <div className="overflow-hidden rounded-3xl border border-border bg-background">
            <HeroVariantPreview
              fixture={heroVariantFixture}
              onBookClick={() => window.alert("Book CTA — preview only.")}
            />
          </div>
        </section>

        {/* Test why-choose-us variants — mounts the production
            WhyChooseUsIconGrid3D with a mocked
            `siteConfig.sections.whyChooseUs` shape so we can validate
            the icon-grid layout, show3DObject toggle, and slot
            fallback without editing a real preset. */}
        <section className="mb-16">
          <h2 className="mb-4 text-xl font-bold">Test why-choose-us variants</h2>
          <p className="mb-6 text-sm text-muted-foreground">
            Renders the production{" "}
            <code className="rounded bg-card px-1 py-0.5">WhyChooseUsIconGrid3D</code>{" "}
            (the section the app mounts when{" "}
            <code className="rounded bg-card px-1 py-0.5">
              whyChooseUs.whyChooseUsVariant === "icon-grid-3d"
            </code>
            ). Toggle <em>Show 3D object</em> to confirm the cards-only
            collapse path. Switching the slot re-reads from{" "}
            <code className="rounded bg-card px-1 py-0.5">siteConfig.heroObjects</code>.
          </p>

          <div className="mb-6 grid gap-4 rounded-2xl border border-border bg-card p-5 sm:grid-cols-3">
            <label className="flex flex-col gap-2 text-sm">
              <span className="font-semibold">Slot</span>
              <select
                value={wcuSlot}
                onChange={(e) => setWcuSlot(e.target.value as WcuSlot)}
                className="rounded-md border border-border bg-background px-3 py-2 text-sm"
              >
                <option value="primary">primary</option>
                <option value="secondary">secondary (default)</option>
                <option value="accent">accent</option>
              </select>
            </label>
            <label className="flex flex-col gap-2 text-sm">
              <span className="font-semibold">Benefits</span>
              <select
                value={String(wcuBenefitCount)}
                onChange={(e) =>
                  setWcuBenefitCount(Number(e.target.value) as 2 | 3 | 4)
                }
                className="rounded-md border border-border bg-background px-3 py-2 text-sm"
              >
                <option value="2">2 (sparse)</option>
                <option value="3">3 (single column)</option>
                <option value="4">4 (2×2 grid)</option>
              </select>
            </label>
            <label className="flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={wcuShowObject}
                onChange={(e) => setWcuShowObject(e.target.checked)}
                className="h-4 w-4 rounded border-border"
              />
              <span className="font-semibold">Show 3D object</span>
            </label>
          </div>

          <div className="overflow-hidden rounded-3xl border border-border bg-background">
            <WhyChooseUsPreview
              slot={wcuSlot}
              showObject={wcuShowObject}
              benefitCount={wcuBenefitCount}
            />
          </div>
        </section>

        {/* Test services variants — mounts the production
            ServicesListWithIcons / ServicesTreatmentCardGrid with a
            mocked `siteConfig.services` + `sections.services` shape so we
            can validate the new Onyx and Aurea layouts without editing a
            real preset. */}
        <section className="mb-16">
          <h2 className="mb-4 text-xl font-bold">Test services variants</h2>
          <p className="mb-6 text-sm text-muted-foreground">
            Renders the production{" "}
            <code className="rounded bg-card px-1 py-0.5">ServicesListWithIcons</code> /{" "}
            <code className="rounded bg-card px-1 py-0.5">ServicesTreatmentCardGrid</code>{" "}
            (the sections the app mounts when{" "}
            <code className="rounded bg-card px-1 py-0.5">
              services.servicesVariant === "list-with-icons" | "treatment-card-grid"
            </code>
            ). Toggle the count to exercise the 0-services fallback. The{" "}
            <em>Layout</em> control only applies to{" "}
            <code className="rounded bg-card px-1 py-0.5">list-with-icons</code>.
          </p>

          <div className="mb-6 grid gap-4 rounded-2xl border border-border bg-card p-5 sm:grid-cols-2 lg:grid-cols-3">
            <label className="flex flex-col gap-2 text-sm">
              <span className="font-semibold">Variant</span>
              <select
                value={servicesVariant}
                onChange={(e) =>
                  setServicesVariant(e.target.value as ServicesVariantFixture)
                }
                className="rounded-md border border-border bg-background px-3 py-2 text-sm"
              >
                <option value="list-with-icons">list-with-icons (Onyx)</option>
                <option value="treatment-card-grid">treatment-card-grid (Aurea)</option>
                <option value="card-stack-tabs">card-stack-tabs (Velvet Muse)</option>
              </select>
            </label>
            <label className="flex flex-col gap-2 text-sm">
              <span className="font-semibold">Layout (Onyx only)</span>
              <select
                value={servicesLayout}
                onChange={(e) =>
                  setServicesLayout(e.target.value as "grid" | "vertical-list")
                }
                disabled={servicesVariant !== "list-with-icons"}
                className="rounded-md border border-border bg-background px-3 py-2 text-sm disabled:opacity-50"
              >
                <option value="grid">grid (4-col)</option>
                <option value="vertical-list">vertical-list</option>
              </select>
            </label>
            <label className="flex flex-col gap-2 text-sm">
              <span className="font-semibold">Slot</span>
              <select
                value={servicesSlot}
                onChange={(e) => setServicesSlot(e.target.value as WcuSlot)}
                className="rounded-md border border-border bg-background px-3 py-2 text-sm"
              >
                <option value="accent">accent (default)</option>
                <option value="primary">primary</option>
                <option value="secondary">secondary</option>
              </select>
            </label>
            <label className="flex flex-col gap-2 text-sm">
              <span className="font-semibold">Services</span>
              <select
                value={String(servicesCount)}
                onChange={(e) =>
                  setServicesCount(Number(e.target.value) as 0 | 3 | 6 | 8)
                }
                className="rounded-md border border-border bg-background px-3 py-2 text-sm"
              >
                <option value="0">0 (fallback to legacy)</option>
                <option value="3">3 (under landing budget)</option>
                <option value="6">6 (typical)</option>
                <option value="8">8 (over budget — CTA shows)</option>
              </select>
            </label>
            <label className="flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={servicesWithImages}
                onChange={(e) => setServicesWithImages(e.target.checked)}
                className="h-4 w-4 rounded border-border"
              />
              <span className="font-semibold">Service images</span>
            </label>
            <label className="flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={servicesShowObject}
                onChange={(e) => setServicesShowObject(e.target.checked)}
                className="h-4 w-4 rounded border-border"
              />
              <span className="font-semibold">Show 3D cameo</span>
            </label>
          </div>

          <div className="overflow-hidden rounded-3xl border border-border bg-background">
            <ServicesPreview
              variant={servicesVariant}
              layout={servicesLayout}
              slot={servicesSlot}
              showObject={servicesShowObject}
              count={servicesCount}
              withImages={servicesWithImages}
            />
          </div>
        </section>

        {/* Test gallery variants — mounts the production
            GalleryBentoStats / GalleryGridWithFilters with a mocked
            `siteConfig.gallery` + `sections.gallery` shape so we can
            validate each layout in isolation. */}
        <section className="mb-16">
          <h2 className="mb-4 text-xl font-bold">Test gallery variants</h2>
          <p className="mb-6 text-sm text-muted-foreground">
            Renders the production{" "}
            <code className="rounded bg-card px-1 py-0.5">GalleryBentoStats</code> /{" "}
            <code className="rounded bg-card px-1 py-0.5">GalleryGridWithFilters</code>{" "}
            (the sections the app mounts when{" "}
            <code className="rounded bg-card px-1 py-0.5">
              gallery.galleryVariant === "bento-stats" | "grid-with-filters"
            </code>
            ). The 3-image fixture exercises the bento fallback to a simple
            grid. The filter chips on the Onyx variant manage their own state —
            click them in the preview to confirm the filtering reacts.
          </p>

          <div className="mb-6 grid gap-4 rounded-2xl border border-border bg-card p-5 sm:grid-cols-2 lg:grid-cols-3">
            <label className="flex flex-col gap-2 text-sm">
              <span className="font-semibold">Variant</span>
              <select
                value={galleryVariant}
                onChange={(e) =>
                  setGalleryVariant(e.target.value as GalleryVariantFixture)
                }
                className="rounded-md border border-border bg-background px-3 py-2 text-sm"
              >
                <option value="bento-stats">bento-stats (Aurea)</option>
                <option value="grid-with-filters">grid-with-filters (Onyx)</option>
                <option value="portrait-bento-3d-cameo">portrait-bento-3d-cameo (Velvet Muse)</option>
              </select>
            </label>
            <label className="flex flex-col gap-2 text-sm">
              <span className="font-semibold">Slot</span>
              <select
                value={gallerySlot}
                onChange={(e) => setGallerySlot(e.target.value as WcuSlot)}
                className="rounded-md border border-border bg-background px-3 py-2 text-sm"
              >
                <option value="accent">accent (default)</option>
                <option value="primary">primary</option>
                <option value="secondary">secondary</option>
              </select>
            </label>
            <label className="flex flex-col gap-2 text-sm">
              <span className="font-semibold">Images</span>
              <select
                value={String(galleryCount)}
                onChange={(e) =>
                  setGalleryCount(Number(e.target.value) as 3 | 6 | 8 | 12)
                }
                className="rounded-md border border-border bg-background px-3 py-2 text-sm"
              >
                <option value="3">3 (bento fallback to simple grid)</option>
                <option value="6">6 (Aurea bento)</option>
                <option value="8">8 (Velvet Muse portrait bento)</option>
                <option value="12">12 (typical filterable grid)</option>
              </select>
            </label>
            <label className="flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={galleryShowObject}
                onChange={(e) => setGalleryShowObject(e.target.checked)}
                className="h-4 w-4 rounded border-border"
              />
              <span className="font-semibold">Show 3D cameo</span>
            </label>
            <label className="flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={galleryWithStats}
                onChange={(e) => setGalleryWithStats(e.target.checked)}
                className="h-4 w-4 rounded border-border"
              />
              <span className="font-semibold">
                Stats bar (Aurea only)
              </span>
            </label>
          </div>

          <div className="overflow-hidden rounded-3xl border border-border bg-background">
            <GalleryPreview
              variant={galleryVariant}
              slot={gallerySlot}
              showObject={galleryShowObject}
              count={galleryCount}
              withStats={galleryWithStats}
            />
          </div>
        </section>

        {/* Test booking variant — mounts the production
            BookingFormMapHours3D with a mocked `siteConfig.sections.contact`
            shape so we can validate the form / map / hours layout in
            isolation. The data toggles drop `contact.address` and `hours`
            so the empty-data fallback path is exercised too. */}
        <section className="mb-16">
          <h2 className="mb-4 text-xl font-bold">Test booking variant</h2>
          <p className="mb-6 text-sm text-muted-foreground">
            Renders the production{" "}
            <code className="rounded bg-card px-1 py-0.5">BookingFormMapHours3D</code>{" "}
            (the section the app mounts when{" "}
            <code className="rounded bg-card px-1 py-0.5">
              contact.bookingVariant === "form-map-hours-3d"
            </code>
            ). The <em>Data</em> toggles drop the underlying address /
            hours so the empty-data fallback path is covered without
            editing a real preset.
          </p>

          <div className="mb-6 grid gap-4 rounded-2xl border border-border bg-card p-5 sm:grid-cols-2 lg:grid-cols-3">
            <label className="flex flex-col gap-2 text-sm">
              <span className="font-semibold">Slot</span>
              <select
                value={bookingSlot}
                onChange={(e) => setBookingSlot(e.target.value as WcuSlot)}
                className="rounded-md border border-border bg-background px-3 py-2 text-sm"
              >
                <option value="accent">accent (default)</option>
                <option value="primary">primary</option>
                <option value="secondary">secondary</option>
              </select>
            </label>
            <label className="flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={bookingShowObject}
                onChange={(e) => setBookingShowObject(e.target.checked)}
                className="h-4 w-4 rounded border-border"
              />
              <span className="font-semibold">Show 3D cameo</span>
            </label>
            <label className="flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={bookingShowMap}
                onChange={(e) => setBookingShowMap(e.target.checked)}
                className="h-4 w-4 rounded border-border"
              />
              <span className="font-semibold">Show map (flag)</span>
            </label>
            <label className="flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={bookingShowHours}
                onChange={(e) => setBookingShowHours(e.target.checked)}
                className="h-4 w-4 rounded border-border"
              />
              <span className="font-semibold">Show hours (flag)</span>
            </label>
            <label className="flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={bookingWithAddress}
                onChange={(e) => setBookingWithAddress(e.target.checked)}
                className="h-4 w-4 rounded border-border"
              />
              <span className="font-semibold">Data: address present</span>
            </label>
            <label className="flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={bookingWithHours}
                onChange={(e) => setBookingWithHours(e.target.checked)}
                className="h-4 w-4 rounded border-border"
              />
              <span className="font-semibold">Data: hours present</span>
            </label>
          </div>

          <div className="overflow-hidden rounded-3xl border border-border bg-background">
            <BookingPreview
              slot={bookingSlot}
              showObject={bookingShowObject}
              showMap={bookingShowMap}
              showHours={bookingShowHours}
              withAddress={bookingWithAddress}
              withHours={bookingWithHours}
            />
          </div>
        </section>

        {/* heroObjects composition — multi-layer parallax stack. */}
        <section className="mb-16">
          <h2 className="mb-4 text-xl font-bold">heroObjects composition</h2>
          <p className="mb-6 text-sm text-muted-foreground">
            Mounts a <code className="rounded bg-card px-1 py-0.5">HeroObject3D</code>{" "}
            whose slot defines a <code className="rounded bg-card px-1 py-0.5">composition</code>{" "}
            stack: three layers with different parallax factors so the
            background pearl moves less than the foreground scissors as
            the page scrolls. Each layer also gets its own offset, scale,
            rotation, and shadow magnitude.
          </p>

          <div className="mb-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setCompositionRunId((n) => n + 1)}
              className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-light"
            >
              Replay entrance
            </button>
          </div>

          <div className="rounded-3xl border border-border bg-gradient-to-br from-card to-background p-10">
            <CompositionPreview key={compositionRunId} ambientParticles={particles} />
          </div>

          <p className="mt-4 text-xs text-muted-foreground">
            Scroll the page below — each layer parallaxes by its own
            factor. Toggle <em>Simulate prefers-reduced-motion</em> above
            to see the static stack fallback (layers position but don't
            animate).
          </p>
        </section>

        {/* Paper physics — grid of six PaperCards with a replay button. */}
        <section className="mb-16">
          <h2 className="mb-4 text-xl font-bold">Paper physics</h2>
          <p className="mb-6 text-sm text-muted-foreground">
            Six <code className="rounded bg-card px-1 py-0.5">PaperCard</code>{" "}
            wrappers driven by <code className="rounded bg-card px-1 py-0.5">usePaperSpring</code>.
            Spring is tuned so the card accelerates in, decelerates with
            a barely-there overshoot, and settles cleanly — papery, not
            bouncy. Reduced-motion path collapses to a quick easeOut
            tween (toggle the simulate switch above).
          </p>

          <div className="mb-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setPaperRunId((n) => n + 1)}
              className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-light"
            >
              Replay entrance
            </button>
          </div>

          <div
            key={paperRunId}
            className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
          >
            {PAPER_DEMO_CARDS.map((card, i) => (
              <PaperCard
                key={`${paperRunId}-${i}`}
                delay={i * 0.08}
                intensity={card.intensity}
                onClick={() => window.alert(`PaperCard ${i + 1} — preview only.`)}
                ariaLabel={card.title}
                className="block h-full"
              >
                <div className="flex h-full flex-col gap-3 rounded-3xl border border-border/60 bg-card p-6 shadow-sm">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-accent">
                    {card.tag}
                  </p>
                  <h3 className="font-serif text-xl font-semibold text-card-foreground">
                    {card.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {card.body}
                  </p>
                  <div className="mt-auto text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    intensity: {card.intensity}
                  </div>
                </div>
              </PaperCard>
            ))}
          </div>
        </section>

        {/* Scrollable tail so parallax + viewport exit have room to play */}
        <section className="mb-16">
          <h2 className="mb-4 text-xl font-bold">Scroll spacer</h2>
          <p className="text-sm text-muted-foreground">
            Keep scrolling — when the hero object leaves the viewport, its
            opacity should drop to ~0.4 instead of disappearing entirely.
          </p>
          <div className="mt-8 h-[120vh] rounded-2xl border border-dashed border-border" />
        </section>

        <a
          href="/"
          className="text-sm font-bold uppercase tracking-widest text-accent hover:underline"
        >
          ← Back to site
        </a>
      </div>

      {/* Splash overlay — keyed by splashRunId so Replay re-mounts the
          component and re-triggers its entry animations. */}
      <AnimatePresence>
        {activeSplash && (
          <SplashRunner
            key={`${activeSplash}-${splashRunId}`}
            variant={activeSplash}
            durationMs={splashDuration}
            bandCount={bandCount}
            bandDirection={bandDirection}
            splitDirection={splitDirection}
            ambientParticles={splashParticles}
            onFinish={() => setActiveSplash(null)}
          />
        )}
      </AnimatePresence>
    </main>
    </LayoutGroup>
  );
}

type SplashRunnerProps = {
  variant: ImpactSplashVariant;
  durationMs: number;
  bandCount: number;
  bandDirection: "horizontal" | "vertical";
  splitDirection: "horizontal" | "vertical";
  ambientParticles: AmbientParticleType;
  onFinish: () => void;
};

/**
 * Mounts an impact splash variant for the duration provided, then auto-dismisses
 * (matching the real SplashScreen lifecycle — `App.tsx` unmounts the splash on
 * a timer of `splash.durationMs`).
 */
function SplashRunner({
  variant,
  durationMs,
  bandCount,
  bandDirection,
  splitDirection,
  ambientParticles,
  onFinish,
}: SplashRunnerProps) {
  useEffect(() => {
    const id = window.setTimeout(onFinish, durationMs);
    return () => window.clearTimeout(id);
  }, [durationMs, onFinish]);

  const Icon = resolveLucideIcon(siteConfig.brand.logoIconName, Scissors);
  const baseProps = {
    brand: {
      name: siteConfig.brand.name,
      logo: siteConfig.brand.logo,
      logoDark: siteConfig.brand.logoDark,
      logoIconName: siteConfig.brand.logoIconName,
    },
    durationMs,
    logoSrc: siteConfig.brand.logoDark ?? siteConfig.brand.logo ?? undefined,
    Icon,
    backgroundImage: siteConfig.splash?.image,
  };

  if (variant === "impact-scale") {
    return (
      <SplashImpactScale
        {...baseProps}
        bandCount={bandCount}
        bandDirection={bandDirection}
      />
    );
  }
  if (variant === "impact-split") {
    return <SplashImpactSplit {...baseProps} splitDirection={splitDirection} />;
  }
  return <SplashImpactReveal3D {...baseProps} ambientParticles={ambientParticles} />;
}

/**
 * Mounts `<HeroVariant3DObject>` with a mocked `siteConfig.hero` shape so
 * we can validate the section in isolation. Restores the previous hero
 * config on unmount so the rest of the demo page (and any subsequent SPA
 * navigation) sees the original values.
 *
 * `full`     — every optional field populated (eyebrow + description + 2 CTAs).
 * `minimal`  — only the required title + subtitle + primary CTA.
 */
function HeroVariantPreview({
  fixture,
  onBookClick,
}: {
  fixture: HeroVariantFixture;
  onBookClick: () => void;
}) {
  useEffect(() => {
    const previousHero = siteConfig.hero;
    if (fixture === "full") {
      siteConfig.hero = {
        ...previousHero,
        heroVariant: "hero-3d-object",
        eyebrow: "PRECISION. ARTISTRY. INTENTION.",
        titlePrefix: "Crafted",
        titleHighlight: "with care.",
        titleSuffix: "",
        subtitle: "A studio-grade experience for a service that matters.",
        description:
          "Cuts, shaves and finishes by master barbers — booking is open all week.",
        ctaPrimary: "Book your seat",
        ctaSecondary: "Explore services",
      };
    } else {
      siteConfig.hero = {
        ...previousHero,
        heroVariant: "hero-3d-object",
        eyebrow: undefined,
        titlePrefix: "Crafted",
        titleHighlight: "with care.",
        titleSuffix: "",
        subtitle: "A studio-grade experience for a service that matters.",
        description: undefined,
        ctaPrimary: "Book your seat",
        ctaSecondary: "",
      };
    }
    return () => {
      siteConfig.hero = previousHero;
    };
  }, [fixture]);

  // Key forces a remount when the fixture changes so the hero re-runs
  // its entry animations instead of cross-fading text in place.
  return <HeroVariant3DObject key={fixture} onBookClick={onBookClick} />;
}

const WCU_DEMO_BENEFITS = [
  {
    iconName: "ShieldCheck",
    title: "Master craft, every visit",
    desc: "10+ years of training behind every cut, every line — no shortcuts.",
  },
  {
    iconName: "Sparkles",
    title: "Studio-grade products",
    desc: "Premium pomades, oils, and finishes selected to last beyond the appointment.",
  },
  {
    iconName: "Clock",
    title: "Punctual, never rushed",
    desc: "You're booked into the chair on time and given the room your style needs.",
  },
  {
    iconName: "Crown",
    title: "Tailored to your style",
    desc: "Consultation built into every visit — we adapt to your hair, not the other way around.",
  },
];

/**
 * Mounts `<WhyChooseUsIconGrid3D>` with a mocked
 * `siteConfig.sections.whyChooseUs` shape so we can validate the
 * section in isolation. Restores the previous shape on unmount so
 * the rest of the demo page (and any subsequent SPA navigation) sees
 * the original values.
 */
function WhyChooseUsPreview({
  slot,
  showObject,
  benefitCount,
}: {
  slot: WcuSlot;
  showObject: boolean;
  benefitCount: 2 | 3 | 4;
}) {
  // Capture the original shape exactly once so cleanup can restore it.
  const originalRef = useRef(siteConfig.sections.whyChooseUs);

  // Mutate `siteConfig` synchronously during render — the WCU child reads
  // from the singleton at render time, so the override has to land BEFORE
  // it commits. `useMemo` makes the mutation idempotent across re-renders
  // that don't change controls. Demo-only; production code never mutates
  // siteConfig from a component.
  useMemo(() => {
    siteConfig.sections.whyChooseUs = {
      ...originalRef.current,
      title: "Why us",
      subtitle: "Built around the craft, every detail.",
      whyChooseUsVariant: "icon-grid-3d",
      eyebrow: "WHY US",
      description:
        "Every appointment is built around the craft — from the consultation to the finishing pass.",
      heroObjectSlot: slot,
      show3DObject: showObject,
      benefits: WCU_DEMO_BENEFITS.slice(0, benefitCount),
    };
  }, [slot, showObject, benefitCount]);

  // Restore the original shape on unmount so the rest of the SPA session
  // sees the untouched preset.
  useEffect(() => {
    return () => {
      siteConfig.sections.whyChooseUs = originalRef.current;
    };
  }, []);

  // Key forces a remount when controls change so the entry animations
  // replay instead of crossfading in place.
  return (
    <WhyChooseUsIconGrid3D
      key={`${slot}-${showObject ? "obj" : "noobj"}-${benefitCount}`}
    />
  );
}

/**
 * Module-level snapshot of the original siteConfig services + section.services
 * shape. Captured once on the FIRST mount of ServicesPreview so we don't
 * mistake a mocked value for the original after React 19 StrictMode's
 * mount → unmount → remount cycle in dev.
 */
let servicesPreviewOriginals: {
  services: typeof siteConfig.services;
  section: typeof siteConfig.sections.services;
  landingServicesCount: typeof siteConfig.landingServicesCount;
} | null = null;

const SERVICE_IMAGE_POOL = [
  "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=900&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=900&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=900&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1593702275687-f8b402bf1fb5?w=900&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=900&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1633681926022-84c23e8cb6ee?w=900&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1605497788044-5a32c7078486?w=900&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1635273051937-a4b2c3a1f9fb?w=900&auto=format&fit=crop&q=80",
];

const SERVICES_DEMO_CATALOGUE: Service[] = [
  {
    id: "svc-signature-cut",
    name: "Signature Cut",
    category: "Cut",
    description:
      "A consultation-led cut tailored to your hair pattern, lifestyle, and finish — done with classical scissor work.",
    duration: 45,
    price: 38,
    fromPrice: "from $38",
    iconName: "Scissors",
  },
  {
    id: "svc-hot-shave",
    name: "Hot Towel Shave",
    category: "Shave",
    description:
      "Pre-shave oil, hot towel, single straight-razor pass, post-shave balm. The original 30-minute reset.",
    duration: 30,
    price: 32,
    fromPrice: "from $32",
    iconName: "Droplet",
  },
  {
    id: "svc-beard-sculpt",
    name: "Beard Sculpt",
    category: "Beard",
    description:
      "Outline, line-up, and clipper-over-comb shaping with a beard oil finish. Built for week-on-week consistency.",
    duration: 30,
    price: 25,
    fromPrice: "from $25",
    iconName: "Crown",
  },
  {
    id: "svc-fade-redux",
    name: "Skin Fade Redux",
    category: "Cut",
    description:
      "Bald-fade refresh between cuts. Clipper detail + neck cleanup so your shape stays sharp.",
    duration: 25,
    price: 22,
    fromPrice: "from $22",
    iconName: "Sparkles",
  },
  {
    id: "svc-kids",
    name: "Junior Cut",
    category: "Cut",
    description:
      "Calm chair-side process for kids 12 and under. Same finish quality, friendlier pace, comic books on tap.",
    duration: 30,
    price: 18,
    fromPrice: "from $18",
    iconName: "Heart",
  },
  {
    id: "svc-consultation",
    name: "Style Consultation",
    category: "Consultation",
    description:
      "Sit-down session for new clients or before a big change. Free with any booked service the same week.",
    duration: 20,
    price: 0,
    iconName: "HelpCircle",
  },
  {
    id: "svc-grooming-package",
    name: "The Full Grooming",
    category: "Package",
    description:
      "Cut + shave + beard sculpt, end-to-end. Built as a treat — block the calendar and arrive early.",
    duration: 90,
    price: 78,
    fromPrice: "from $78",
    iconName: "Award",
  },
  {
    id: "svc-color",
    name: "Grey Blending",
    category: "Color",
    description:
      "Subtle clipper-paired colour blending for natural grey camouflage — no commitment, no flat finish.",
    duration: 50,
    price: 45,
    fromPrice: "from $45",
    iconName: "Palette",
  },
];

const SERVICES_DEMO_FILTERS = ["Cut", "Shave", "Beard", "Color", "Package", "Consultation"];

/**
 * Mounts `<ServicesListWithIcons>` or `<ServicesTreatmentCardGrid>` with a
 * mocked `siteConfig.services` + `siteConfig.sections.services` shape so we
 * can validate each layout in isolation. Restores the previous shapes on
 * unmount so the rest of the SPA session sees the original preset.
 *
 * `count = 0` drops every service so we can verify both variants delegate
 * back to the legacy renderer (caller will see the standard Services
 * grid render below the Services.tsx switch).
 */
function ServicesPreview({
  variant,
  layout,
  slot,
  showObject,
  count,
  withImages,
}: {
  variant: ServicesVariantFixture;
  layout: "grid" | "vertical-list";
  slot: WcuSlot;
  showObject: boolean;
  count: 0 | 3 | 6 | 8;
  withImages: boolean;
}) {
  // Capture the originals on first mount via a module-level cache so
  // React StrictMode's mount → cleanup → remount cycle in dev doesn't
  // pollute the ref with the mock that the first mount installed. The
  // first ServicesPreview to mount captures the originals; later
  // mounts read from the same cache.
  if (!servicesPreviewOriginals) {
    servicesPreviewOriginals = {
      services: siteConfig.services,
      section: siteConfig.sections.services,
      landingServicesCount: siteConfig.landingServicesCount,
    };
  }
  const original = servicesPreviewOriginals;

  // Mutate `siteConfig` synchronously during render — the children
  // read from the singleton at render time, so the override has to
  // land BEFORE they commit. Demo-only; production code never mutates
  // siteConfig from a component.
  const slice = SERVICES_DEMO_CATALOGUE.slice(0, count).map((service, i) => ({
    ...service,
    image: withImages ? SERVICE_IMAGE_POOL[i % SERVICE_IMAGE_POOL.length] : undefined,
  }));
  siteConfig.services = slice;
  // The variants cap their card grid by `landingServicesCount`. Lift it
  // to the mock count so every selected service actually paints.
  siteConfig.landingServicesCount = count;
  // Velvet Muse variant gets a softer headline (the component renders
  // the last word in italic so the copy reads "Crafted with care").
  const isVelvet = variant === "card-stack-tabs";
  siteConfig.sections.services = {
    ...original.section,
    title: isVelvet ? "The studio menu" : "Treatments",
    subtitle: isVelvet
      ? "Crafted with care."
      : "Crafted to fit, never one-size-fits-all.",
    images: withImages ? SERVICE_IMAGE_POOL.slice(0, 8) : [],
    servicesVariant: variant,
    layout,
    eyebrow: isVelvet ? "PRECISION. ARTISTRY. INTENTION." : "THE MENU",
    description:
      "Eight services across the studio. Every booking includes a consultation pass so the finish lands the way you want it.",
    heroObjectSlot: slot,
    show3DObject: showObject,
    // Filters only matter for card-stack-tabs but injecting them
    // always is harmless — the other variants ignore the field.
    filters: SERVICES_DEMO_FILTERS,
    ctaLabel: isVelvet ? "View full menu" : "Explore all services",
    ctaSecondaryLabel: "Book a consultation",
  };

  useEffect(() => {
    return () => {
      siteConfig.services = original.services;
      siteConfig.sections.services = original.section;
      siteConfig.landingServicesCount = original.landingServicesCount;
    };
  }, [original]);

  // When count is 0 we want to validate the dev-warning fallback path —
  // mount neither variant component directly; render a notice instead.
  if (count === 0) {
    return (
      <div className="bg-card/40 p-10 text-center">
        <p className="text-sm font-semibold text-muted-foreground">
          Fallback path — siteConfig.services is empty. The Services.tsx switch
          warns once in dev and renders the legacy Services component (not
          shown here to keep the demo isolated).
        </p>
      </div>
    );
  }

  // Key forces a remount when controls change so entry animations replay
  // instead of crossfading in place.
  const renderKey = `${variant}-${layout}-${slot}-${showObject ? "obj" : "noobj"}-${count}-${withImages ? "img" : "noimg"}`;

  if (variant === "list-with-icons") {
    return (
      <ServicesListWithIcons
        key={renderKey}
        onBookClick={(id) =>
          window.alert(id ? `Book CTA for "${id}" — preview only.` : "Book CTA — preview only.")
        }
        onNavigateToServices={() =>
          window.alert("Navigate to /services — preview only.")
        }
      />
    );
  }
  if (variant === "card-stack-tabs") {
    return (
      <ServicesCardStackTabs
        key={renderKey}
        onBookClick={(id) =>
          window.alert(id ? `Book CTA for "${id}" — preview only.` : "Book CTA — preview only.")
        }
        onNavigateToServices={() =>
          window.alert("Navigate to /services — preview only.")
        }
      />
    );
  }

  return (
    <ServicesTreatmentCardGrid
      key={renderKey}
      onBookClick={(id) =>
        window.alert(id ? `Book CTA for "${id}" — preview only.` : "Book CTA — preview only.")
      }
      onNavigateToServices={() =>
        window.alert("Navigate to /services — preview only.")
      }
    />
  );
}

/**
 * Module-level snapshot of the original siteConfig gallery + sections.gallery
 * shape. Captured once on the FIRST mount of GalleryPreview so React 19
 * StrictMode's mount → unmount → remount cycle doesn't pollute the ref
 * with the mock that the first mount installed.
 */
let galleryPreviewOriginals: {
  gallery: typeof siteConfig.gallery;
  section: typeof siteConfig.sections.gallery;
} | null = null;

const GALLERY_IMAGE_POOL = [
  "https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=900&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=900&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1593702275687-f8b402bf1fb5?w=900&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=900&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1633681926022-84c23e8cb6ee?w=900&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1605497788044-5a32c7078486?w=900&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1635273051937-a4b2c3a1f9fb?w=900&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=900&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1622287162716-f311baa1a2b8?w=900&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1581065178026-390bc4e78dad?w=900&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1517832606299-7ae9b720a186?w=900&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1582095133179-bfd08e2fc6b3?w=900&auto=format&fit=crop&q=80",
];

const GALLERY_DEMO_FILTERS = [
  "Fine Line",
  "Black & Grey",
  "Realism",
  "Ornamental",
  "Color",
];

const GALLERY_DEMO_STATS = [
  { value: "350+", label: "Transformations" },
  { value: "98%", label: "Satisfied Customers" },
  { value: "12", label: "Years in the studio" },
  { value: "24h", label: "Average reply time" },
];

/**
 * Map of demo image URL → tag list. Deterministic round-robin
 * assignment across `GALLERY_DEMO_FILTERS` so the Onyx filter chips
 * have non-uniform, non-empty bucket sizes for visual validation.
 * Some images carry two tags so we exercise the multi-tag pill row.
 */
const GALLERY_DEMO_IMAGE_TAGS: Record<string, string[]> = GALLERY_IMAGE_POOL.reduce<
  Record<string, string[]>
>((acc, src, i) => {
  const primary = GALLERY_DEMO_FILTERS[i % GALLERY_DEMO_FILTERS.length];
  const secondary =
    i % 3 === 0
      ? GALLERY_DEMO_FILTERS[(i + 2) % GALLERY_DEMO_FILTERS.length]
      : undefined;
  acc[src] = secondary ? [primary, secondary] : [primary];
  return acc;
}, {});

/**
 * Mounts `<GalleryBentoStats>` or `<GalleryGridWithFilters>` with a
 * mocked `siteConfig.gallery` + `siteConfig.sections.gallery` shape so
 * we can validate each layout in isolation. Restores the previous
 * shapes on unmount so the rest of the SPA session sees the original
 * preset.
 */
function GalleryPreview({
  variant,
  slot,
  showObject,
  count,
  withStats,
}: {
  variant: GalleryVariantFixture;
  slot: WcuSlot;
  showObject: boolean;
  count: 3 | 6 | 8 | 12;
  withStats: boolean;
}) {
  // Capture the originals on first mount via a module-level cache so
  // React StrictMode's mount → cleanup → remount cycle in dev doesn't
  // pollute the ref with a mock that the first mount installed.
  if (!galleryPreviewOriginals) {
    galleryPreviewOriginals = {
      gallery: siteConfig.gallery,
      section: siteConfig.sections.gallery,
    };
  }
  const original = galleryPreviewOriginals;

  // Mutate `siteConfig` synchronously during render — the children
  // read from the singleton at render time, so the override has to
  // land BEFORE they commit. Demo-only; production code never mutates
  // siteConfig from a component.
  const slice = GALLERY_IMAGE_POOL.slice(0, count);
  siteConfig.gallery = slice;
  const isPortraitBento = variant === "portrait-bento-3d-cameo";
  siteConfig.sections.gallery = {
    ...original.section,
    title: isPortraitBento ? "Recent transformations" : "Gallery",
    subtitle: isPortraitBento
      ? "Recent transformations"
      : "Work that left the studio.",
    galleryVariant: variant,
    eyebrow: isPortraitBento ? "THE PORTFOLIO" : "PORTFOLIO",
    description:
      "A rotating selection of recent work — every booking starts with a consultation against this catalogue.",
    heroObjectSlot: slot,
    show3DObject: showObject,
    stats: withStats ? GALLERY_DEMO_STATS : [],
    filters: GALLERY_DEMO_FILTERS,
    imageTags: GALLERY_DEMO_IMAGE_TAGS,
    ctaLabel: isPortraitBento ? "See the gallery" : "Explore the full portfolio",
  };

  useEffect(() => {
    return () => {
      siteConfig.gallery = original.gallery;
      siteConfig.sections.gallery = original.section;
    };
  }, [original]);

  // Key forces a remount when controls change so entry animations
  // replay instead of crossfading in place.
  const renderKey = `${variant}-${slot}-${showObject ? "obj" : "noobj"}-${count}-${withStats ? "stats" : "nostats"}`;

  if (variant === "bento-stats") {
    return (
      <GalleryBentoStats
        key={renderKey}
        onViewFull={() => window.alert("Navigate to /gallery — preview only.")}
      />
    );
  }
  if (variant === "portrait-bento-3d-cameo") {
    return (
      <GalleryPortraitBentoCameo
        key={renderKey}
        onViewFull={() => window.alert("Navigate to /gallery — preview only.")}
      />
    );
  }

  return (
    <GalleryGridWithFilters
      key={renderKey}
      onViewFull={() => window.alert("Navigate to /gallery — preview only.")}
    />
  );
}

/**
 * Module-level snapshot of the original siteConfig contact + hours +
 * sections.contact shape. Captured once on the FIRST mount of
 * BookingPreview so React 19 StrictMode's mount → unmount → remount
 * cycle in dev doesn't pollute the ref with a mock that the first
 * mount installed.
 */
let bookingPreviewOriginals: {
  contact: typeof siteConfig.contact;
  hours: typeof siteConfig.hours;
  section: typeof siteConfig.sections.contact;
} | null = null;

const BOOKING_DEMO_ADDRESS = {
  street: "12 Rothschild Blvd",
  district: "Lev Ha'Ir",
  cityStateZip: "Tel Aviv-Yafo 66881",
};

const BOOKING_DEMO_HOURS: typeof siteConfig.hours = {
  monday: { start: "10:00", end: "20:00" },
  tuesday: { start: "10:00", end: "20:00" },
  wednesday: { start: "10:00", end: "20:00" },
  thursday: { start: "10:00", end: "21:00" },
  friday: { start: "09:00", end: "16:00" },
  saturday: null,
  sunday: { start: "10:00", end: "18:00" },
};

const BOOKING_EMPTY_HOURS: typeof siteConfig.hours = {
  monday: null,
  tuesday: null,
  wednesday: null,
  thursday: null,
  friday: null,
  saturday: null,
  sunday: null,
};

/**
 * Mounts `<BookingFormMapHours3D>` with a mocked
 * `siteConfig.sections.contact` + `siteConfig.contact` + `siteConfig.hours`
 * shape so we can validate the variant in isolation. Restores the
 * previous shapes on unmount so the rest of the SPA session sees the
 * original preset.
 *
 * `withAddress = false` clears `contact.address` so the map column
 * falls back (hidden). `withHours = false` clears `hours` so the
 * hours card falls back (hidden). Both off collapses to a full-width
 * form — the safest fallback path.
 */
function BookingPreview({
  slot,
  showObject,
  showMap,
  showHours,
  withAddress,
  withHours,
}: {
  slot: WcuSlot;
  showObject: boolean;
  showMap: boolean;
  showHours: boolean;
  withAddress: boolean;
  withHours: boolean;
}) {
  // Capture the originals on first mount via a module-level cache so
  // React StrictMode's mount → cleanup → remount cycle in dev doesn't
  // pollute the ref with a mock that the first mount installed.
  if (!bookingPreviewOriginals) {
    bookingPreviewOriginals = {
      contact: siteConfig.contact,
      hours: siteConfig.hours,
      section: siteConfig.sections.contact,
    };
  }
  const original = bookingPreviewOriginals;

  // Mutate `siteConfig` synchronously during render — the children
  // read from the singleton at render time, so the override has to
  // land BEFORE they commit. Demo-only; production code never mutates
  // siteConfig from a component.
  siteConfig.contact = {
    ...original.contact,
    address: withAddress
      ? BOOKING_DEMO_ADDRESS
      : { street: "", district: "", cityStateZip: "" },
  };
  siteConfig.hours = withHours ? BOOKING_DEMO_HOURS : BOOKING_EMPTY_HOURS;
  siteConfig.sections.contact = {
    ...original.section,
    title: "Book a chair",
    subtitle: "Reserve your seat — we'll confirm by reply.",
    description:
      "Pick the service that fits, suggest a date, and tell us anything we should know. We answer every inquiry within 24 hours.",
    bookingVariant: "form-map-hours-3d",
    heroObjectSlot: slot,
    show3DObject: showObject,
    showMap,
    showHours,
    ctaSubmitLabel: "Request a chair",
  };

  useEffect(() => {
    return () => {
      siteConfig.contact = original.contact;
      siteConfig.hours = original.hours;
      siteConfig.sections.contact = original.section;
    };
  }, [original]);

  // Key forces a remount when controls change so entry animations
  // replay instead of crossfading in place.
  const renderKey = `${slot}-${showObject ? "obj" : "noobj"}-${showMap ? "m" : "nm"}-${showHours ? "h" : "nh"}-${withAddress ? "a" : "na"}-${withHours ? "wh" : "nwh"}`;

  return <BookingFormMapHours3D key={renderKey} />;
}

/* ── heroObjects.composition demo ─────────────────────────────────── */

const COMPOSITION_SLOT_NAME = "composition_demo";

/** Three transparent PNG-ish images so the layered stack reads as
 *  background + midground + foreground at distinct parallax factors. */
const COMPOSITION_IMAGES = {
  back: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=600&auto=format&fit=crop&q=80",
  mid: "https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=600&auto=format&fit=crop&q=80",
  front: "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=600&auto=format&fit=crop&q=80",
};

/**
 * Injects a composed slot into `siteConfig.heroObjects` for the
 * duration of the demo section so the multi-layer parallax stack has
 * something to render. Cleanup restores the previous slots.
 */
function CompositionPreview({
  ambientParticles,
}: {
  ambientParticles: AmbientParticleType;
}) {
  // Mutate `siteConfig.heroObjects` synchronously during render — the
  // child `<HeroObject3D>` reads from the singleton at render time and
  // a useEffect-deferred assignment would mean the first commit sees no
  // slot and bails to `fallback`. Demo-only; production code never
  // mutates siteConfig from a component.
  const composedConfig: HeroObjectConfig = {
    // `src` is required by the schema but ignored when composition is
    // set — keep one as a tooling fallback.
    src: COMPOSITION_IMAGES.mid,
    particles: ambientParticles,
    intensity: "medium",
    composition: [
      {
        src: COMPOSITION_IMAGES.back,
        zIndex: 0,
        parallaxFactor: 0.35,
        scale: 1.1,
        opacity: 0.55,
        rotation: -2,
        intensity: "subtle",
        offset: { x: "-6%", y: "-2%" },
      },
      {
        src: COMPOSITION_IMAGES.mid,
        zIndex: 1,
        parallaxFactor: 0.8,
        scale: 0.9,
        opacity: 0.92,
        rotation: 1,
        intensity: "medium",
        offset: { x: "4%", y: "4%" },
      },
      {
        src: COMPOSITION_IMAGES.front,
        zIndex: 2,
        parallaxFactor: 1.4,
        scale: 0.55,
        opacity: 1,
        rotation: -6,
        intensity: "strong",
        offset: { x: "12%", y: "10%" },
      },
    ],
  };
  siteConfig.heroObjects = {
    ...(siteConfig.heroObjects ?? {}),
    [COMPOSITION_SLOT_NAME]: composedConfig,
  };

  // Cleanup removes the composed slot only — the rest of the demo's
  // `primary/secondary/accent` slots are managed by their own effect.
  useEffect(() => {
    return () => {
      if (siteConfig.heroObjects) {
        const next = { ...siteConfig.heroObjects };
        delete next[COMPOSITION_SLOT_NAME];
        siteConfig.heroObjects = next;
      }
    };
  }, []);

  return (
    <div className="flex items-center justify-center">
      <HeroObject3D
        slotName={COMPOSITION_SLOT_NAME}
        size="xl"
        alt="Multi-layer composition demo"
      />
    </div>
  );
}

/* ── Paper physics demo cards ─────────────────────────────────────── */

const PAPER_DEMO_CARDS: {
  tag: string;
  title: string;
  body: string;
  intensity: "subtle" | "medium" | "strong";
}[] = [
  {
    tag: "Settle",
    title: "Cuts that hold shape",
    body: "Precision scissor work tuned to the way your hair actually grows — the cut keeps its outline for weeks.",
    intensity: "medium",
  },
  {
    tag: "Detail",
    title: "Hand-tinted finishes",
    body: "Tone-on-tone glazing with a soft-light finish — no flat color, no harsh edges, no surprises in daylight.",
    intensity: "medium",
  },
  {
    tag: "Texture",
    title: "Smoothing without flatness",
    body: "A balanced keratin treatment that calms frizz and keeps movement — never glued, never reflective.",
    intensity: "strong",
  },
  {
    tag: "Volume",
    title: "Extensions, undetectable",
    body: "Bespoke human-hair lengths matched to your shade map — fitted in a single session, brushable everywhere.",
    intensity: "subtle",
  },
  {
    tag: "Care",
    title: "At-home reset rituals",
    body: "A two-product reset for between visits. We send you home with the routine, not a sales pitch.",
    intensity: "medium",
  },
  {
    tag: "Time",
    title: "Bookings that respect your day",
    body: "Tight scheduling so the salon never feels rushed — you arrive, you sit, the work happens, you leave.",
    intensity: "subtle",
  },
];
