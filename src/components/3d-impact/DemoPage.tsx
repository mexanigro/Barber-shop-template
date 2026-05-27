import { useEffect, useState } from "react";
import { siteConfig } from "../../config/site";
import type { AmbientParticleType, HeroObjectIntensity } from "../../types";
import { AmbientParticles } from "./ambient-particles";
import { CTAButton3D } from "./cta-button-3d";
import { HeroObject3D } from "./hero-object-3d";

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
    </main>
  );
}
