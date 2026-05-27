import { useEffect, useState } from "react";
import { siteConfig } from "../../config/site";
import { AmbientParticles } from "./ambient-particles";
import { HeroObject3D } from "./hero-object-3d";

/**
 * TEMPORARY stress-test surface for Bloque 1 of the 3D Impact system.
 *
 * Mounts 6 simultaneous <HeroObject3D> instances at maximum intensity, plus
 * 2 high-density ambient layers, to surface any per-instance overhead in
 * useScroll / useSpring / will-change bookkeeping when several instances
 * subscribe to the page scroll independently.
 *
 * Worst-case profile:
 *   • 6 × HeroObject3D intensity="strong"
 *   • 2 × AmbientParticles density="high" (12 + 16 nodes)
 *   • A scrollable spacer so parallax + viewport-exit logic actually runs.
 *
 * Reached via `/3d-impact-stress`. Not linked from production navigation.
 * The route gate in App.tsx is also temporary — both should be removed
 * before the stress-test commit goes into the durable branch history.
 */
const DEMO_IMAGE =
  "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=800&auto=format&fit=crop&q=80";

export default function StressPage() {
  const [result, setResult] = useState<string>("");

  useEffect(() => {
    const previous = siteConfig.heroObjects;
    siteConfig.heroObjects = {
      primary: {
        src: DEMO_IMAGE,
        intensity: "strong",
        particles: "none",
      },
    };
    return () => {
      siteConfig.heroObjects = previous;
    };
  }, []);

  // Expose the measurement script on window so it can be triggered via
  // preview_eval without having to inject anonymous code into the page.
  useEffect(() => {
    type ImpactStressGlobal = {
      __impact3dStressRun?: () => Promise<{ avg: number; p95: number; samples: number }>;
    };
    const w = window as unknown as ImpactStressGlobal;
    w.__impact3dStressRun = () =>
      new Promise((resolve) => {
        const frames: number[] = [];
        let lastTs = performance.now();
        const measure = (ts: number) => {
          frames.push(ts - lastTs);
          lastTs = ts;
          if (frames.length < 240) requestAnimationFrame(measure);
        };
        requestAnimationFrame(measure);

        let scrollPos = 0;
        const scrollInterval = window.setInterval(() => {
          scrollPos += 20;
          window.scrollTo({ top: scrollPos, behavior: "auto" });
          if (scrollPos > 3000) window.clearInterval(scrollInterval);
        }, 32);

        window.setTimeout(() => {
          window.clearInterval(scrollInterval);
          const sorted = [...frames].sort((a, b) => a - b);
          const avg = frames.reduce((a, b) => a + b, 0) / frames.length;
          const p95 = sorted[Math.floor(sorted.length * 0.95)] ?? 0;
          const out = { avg, p95, samples: frames.length };
          setResult(JSON.stringify(out, null, 2));
          resolve(out);
        }, 5000);
      });
    return () => {
      delete w.__impact3dStressRun;
    };
  }, []);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <header className="mb-8">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">
            Internal · 3D Impact stress
          </p>
          <h1 className="mt-2 text-3xl font-bold">Multi-instance worst-case</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            6 × HeroObject3D (intensity strong) + 2 × AmbientParticles high.
            Call <code className="rounded bg-card px-1 py-0.5">window.__impact3dStressRun()</code>{" "}
            from the console (or via preview_eval) to measure frame timing
            across ~4 seconds of programmatic scroll.
          </p>
          {result && (
            <pre className="mt-4 max-w-md whitespace-pre-wrap rounded-xl border border-border bg-card p-3 text-xs">
              {result}
            </pre>
          )}
        </header>

        {/* Ambient layers — full-page, behind everything */}
        <div className="pointer-events-none fixed inset-0 -z-10">
          <AmbientParticles type="bubbles" density="high" />
          <AmbientParticles type="sparkles" density="high" />
        </div>

        {/* Row 1 — above the fold */}
        <section className="mb-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="flex items-center justify-center rounded-2xl border border-border bg-card/40 p-6"
            >
              <HeroObject3D slotName="primary" size="md" alt="" priority={i === 0} />
            </div>
          ))}
        </section>

        {/* Scroll spacer — keeps parallax + inView transitions real */}
        <div className="h-[60vh] rounded-2xl border border-dashed border-border" />

        {/* Row 2 — below the fold, exercises viewport exit logic */}
        <section className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {[3, 4, 5].map((i) => (
            <div
              key={i}
              className="flex items-center justify-center rounded-2xl border border-border bg-card/40 p-6"
            >
              <HeroObject3D slotName="primary" size="md" alt="" />
            </div>
          ))}
        </section>

        {/* Long tail so the scroll loop has real distance to cover */}
        <div className="mt-16 h-[200vh] rounded-2xl border border-dashed border-border" />
      </div>
    </main>
  );
}
