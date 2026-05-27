import { useEffect, useState } from "react";
import { AnimatePresence } from "motion/react";
import { siteConfig } from "../../config/site";
import type { AmbientParticleType, HeroObjectIntensity } from "../../types";
import { AmbientParticles } from "./ambient-particles";
import { CTAButton3D } from "./cta-button-3d";
import { HeroObject3D } from "./hero-object-3d";
import { SplashImpactScale } from "./splash-impact-scale";
import { SplashImpactSplit } from "./splash-impact-split";
import { SplashImpactReveal3D } from "./splash-impact-reveal-3d";
import { resolveLucideIcon } from "../../lib/lucide-icons";
import { Scissors } from "lucide-react";

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
const PARTICLES: AmbientParticleType[] = ["bubbles", "smoke", "sparkles", "none"];

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

  // Hot-inject a primary slot for the demo. Restored on unmount so we
  // don't leak fixture data into other routes inside the same SPA session.
  useEffect(() => {
    const previous = siteConfig.heroObjects;
    siteConfig.heroObjects = {
      primary: {
        src: DEMO_IMAGE,
        intensity,
        particles,
        // "default" omits shadowColor so the new black-alpha default kicks in.
        // "auto" opts into the brand-accent tint (Aurea-style).
        ...(shadowMode === "auto" ? { shadowColor: "auto" } : {}),
      },
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
