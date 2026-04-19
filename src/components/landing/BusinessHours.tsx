import React from "react";
import { Clock } from "lucide-react";
import { motion } from "motion/react";
import { siteConfig } from "../../config/site";
import type { BusinessHours as BHType } from "../../types";

type DayDef = {
  key: keyof BHType;
  label: string;
  short: string;
};

const DAYS: DayDef[] = [
  { key: "monday",    label: "Monday",    short: "Mon" },
  { key: "tuesday",   label: "Tuesday",   short: "Tue" },
  { key: "wednesday", label: "Wednesday", short: "Wed" },
  { key: "thursday",  label: "Thursday",  short: "Thu" },
  { key: "friday",    label: "Friday",    short: "Fri" },
  { key: "saturday",  label: "Saturday",  short: "Sat" },
  { key: "sunday",    label: "Sunday",    short: "Sun" },
];

/** Maps JS Date.getDay() index (0 = Sunday) to BusinessHours key */
const JS_DAY_TO_KEY: Record<number, keyof BHType> = {
  0: "sunday",
  1: "monday",
  2: "tuesday",
  3: "wednesday",
  4: "thursday",
  5: "friday",
  6: "saturday",
};

/** Converts "09:00" → "9 AM" / "20:00" → "8 PM" */
function fmt(time: string): string {
  const [hStr, mStr] = time.split(":");
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${h12} ${period}` : `${h12}:${mStr} ${period}`;
}

export function BusinessHours() {
  const { hours } = siteConfig;
  const todayKey = JS_DAY_TO_KEY[new Date().getDay()];

  return (
    <section
      id="business-hours"
      className="relative overflow-hidden bg-background px-6 py-24 transition-colors duration-300"
    >
      <div className="max-w-7xl mx-auto">

        {/*
         * ─── MOBILE & TABLET (hidden on lg+) ────────────────────────────────────
         * Centred header → stacked day-row cards.
         * DO NOT touch the classes inside this block.
         */}
        <div className="lg:hidden space-y-12">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex flex-col items-center gap-4 text-center"
          >
            <div className="inline-flex items-center gap-2">
              <Clock size={14} className="text-accent-light" />
              <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-accent-light">
                Opening Hours
              </span>
            </div>
            <h2 className="text-4xl font-black uppercase tracking-tighter text-foreground md:text-5xl">
              When To Find Us
            </h2>
            <p className="max-w-sm text-sm leading-relaxed text-muted-foreground transition-colors duration-300">
              Walk-ins welcome during available slots. For a guaranteed seat,{" "}
              <span className="font-semibold text-foreground">reserve your chair</span>{" "}
              in advance.
            </p>
          </motion.div>

          <div className="space-y-2">
            {DAYS.map((day, i) => {
              const slot = hours[day.key];
              const isToday = day.key === todayKey;
              const isOpen = slot !== null;

              return (
                <motion.div
                  key={day.key}
                  initial={{ opacity: 0, x: -12 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  className={[
                    "flex items-center justify-between rounded-2xl border px-5 py-4 transition-all duration-300",
                    isToday
                      ? "border-accent-light/50 bg-card ring-1 ring-accent-light/20"
                      : "border-border bg-card",
                    !isOpen ? "opacity-50" : "",
                  ].join(" ")}
                >
                  <div className="flex items-center gap-3">
                    {isToday && (
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent-light" />
                    )}
                    <span
                      className={[
                        "text-sm font-bold",
                        isToday ? "text-foreground" : "text-muted-foreground",
                      ].join(" ")}
                    >
                      {day.label}
                    </span>
                    {isToday && (
                      <span className="rounded-full bg-accent-light/20 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-accent-light">
                        Today
                      </span>
                    )}
                  </div>

                  {isOpen ? (
                    <span className="text-sm font-bold tabular-nums text-foreground">
                      {fmt(slot!.start)} – {fmt(slot!.end)}
                    </span>
                  ) : (
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                      Closed
                    </span>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>

        {/*
         * ─── DESKTOP (hidden on mobile/tablet) ──────────────────────────────────
         * 2-column editorial layout:
         *   Left  → serif headline + tagline
         *   Right → clean schedule list inside a rounded card
         */}
        <div className="hidden lg:grid lg:grid-cols-2 lg:gap-24 lg:items-center">

          {/* Left: editorial title block */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="flex flex-col gap-8"
          >
            <div className="inline-flex items-center gap-2">
              <Clock size={14} className="text-accent-light" />
              <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-accent-light">
                Opening Hours
              </span>
            </div>

            <h2 className="font-serif text-6xl font-black uppercase leading-none tracking-tight text-foreground xl:text-7xl">
              When To
              <br />
              Find Us
            </h2>

            {/* Accent rule */}
            <div className="h-px w-16 bg-accent-light" />

            <p className="max-w-xs text-sm leading-relaxed text-muted-foreground transition-colors duration-300">
              Walk-ins welcome during available slots. For a guaranteed seat,{" "}
              <span className="font-semibold text-foreground">reserve your chair</span>{" "}
              in advance.
            </p>
          </motion.div>

          {/* Right: schedule card */}
          <div className="rounded-3xl border border-border bg-card px-8 transition-colors duration-300">
            <ul className="divide-y divide-border">
              {DAYS.map((day, i) => {
                const slot = hours[day.key];
                const isToday = day.key === todayKey;
                const isOpen = slot !== null;

                return (
                  <motion.li
                    key={day.key}
                    initial={{ opacity: 0, x: 12 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.06 }}
                    className={[
                      "flex items-center justify-between py-5 transition-colors duration-300",
                      !isOpen ? "opacity-50" : "",
                    ].join(" ")}
                  >
                    <div className="flex items-center gap-3">
                      {isToday && (
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent-light" />
                      )}
                      <span
                        className={[
                          "text-sm font-bold",
                          isToday ? "text-foreground" : "text-muted-foreground",
                        ].join(" ")}
                      >
                        {day.label}
                      </span>
                      {isToday && (
                        <span className="rounded-full bg-accent-light/20 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-accent-light">
                          Today
                        </span>
                      )}
                    </div>

                    {isOpen ? (
                      <span className="text-sm font-bold tabular-nums text-foreground">
                        {fmt(slot!.start)} – {fmt(slot!.end)}
                      </span>
                    ) : (
                      <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                        Closed
                      </span>
                    )}
                  </motion.li>
                );
              })}
            </ul>
          </div>

        </div>
      </div>
    </section>
  );
}
