import { useEffect } from "react";
import { driver, type DriveStep, type Driver } from "driver.js";
import "driver.js/dist/driver.css";
import { TOUR_CONFIG, getTourTranslations, getTourLanguage } from "../config/tour.config";
import { env } from "../config/env";
import { siteConfig } from "../config/site";

const STORAGE_KEY = `tourCompleted_${env.clientId}`;

function getPaymentUrl(): string {
  return `/pago/${env.clientId}`;
}

type TourProps = {
  onRequestBooking?: () => void;
  onCloseBooking?: () => void;
  onNavigateAdmin?: () => void;
  onNavigateLanding?: () => void;
};

const CRM_TABS = [
  { tab: "overview", translationKey: "crmOverview" },
  { tab: "missions", translationKey: "crmAppointments" },
  { tab: "customers", translationKey: "crmCustomers" },
  { tab: "inbox", translationKey: "crmInbox" },
  { tab: "personnel", translationKey: "crmStaff" },
  { tab: "rules", translationKey: "crmRules" },
] as const;

// Module-level state to survive React remounts during page transitions
let activeDriver: Driver | null = null;
let tourPhase: "idle" | "landing" | "transitioning" | "admin" = "idle";

function destroyDriver() {
  if (activeDriver) {
    try { activeDriver.destroy(); } catch {}
    activeDriver = null;
  }
}

// Store callbacks at module level so they survive remounts
let callbacks: TourProps = {};

export function ProductTour(props: TourProps): null {
  // Update module-level callbacks on every render
  callbacks = props;

  useEffect(() => {
    if (!TOUR_CONFIG.isDemoMode) return;
    if (tourPhase !== "idle") return;

    const alreadySeen = localStorage.getItem(STORAGE_KEY) === "true";
    if (alreadySeen) return;

    const timer = setTimeout(() => startLandingTour(), 1500);
    return () => clearTimeout(timer);
  }, []);

  return null;
}

function startLandingTour() {
  destroyDriver();
  tourPhase = "landing";

  const t = getTourTranslations();
  const lang = getTourLanguage();
  const isRtl = lang === "he" || lang === "ar";
  const feat = siteConfig.features;

  const steps: DriveStep[] = [];

  // Welcome step (no element highlight, centered modal)
  steps.push({
    popover: {
      title: t.welcome.title,
      description: buildWelcomeHtml(t.welcome.description),
    },
  });

  if (feat.showHero) {
    steps.push({
      element: "#hero",
      popover: {
        title: t.hero.title,
        description: t.hero.description,
        side: "bottom",
        align: "center",
      },
    });
  }

  if (feat.showServices) {
    steps.push({
      element: "#services",
      popover: {
        title: t.services.title,
        description: t.services.description,
        side: "top",
        align: "center",
      },
    });
  }

  if (feat.showBooking) {
    steps.push({
      element: "#services",
      popover: {
        title: t.booking.title,
        description: t.booking.description,
        side: "top",
        align: "center",
        onNextClick: () => {
          callbacks.onRequestBooking?.();
          setTimeout(() => {
            callbacks.onCloseBooking?.();
            setTimeout(() => activeDriver?.moveNext(), 400);
          }, 2500);
        },
      },
    });
  }

  const landingSections: Array<{
    flag: boolean;
    element: string;
    key: keyof typeof t;
  }> = [
    { flag: feat.showWhyChooseUs, element: "#why-choose-us", key: "whyChooseUs" },
    { flag: feat.showTeam, element: "#team", key: "team" },
    { flag: feat.showGallery, element: "#gallery", key: "gallery" },
    { flag: feat.showTestimonials, element: "#testimonials", key: "testimonials" },
    { flag: (feat.showInquiry ?? false) || feat.showBusinessHours || feat.showLocation, element: "#contact", key: "contact" },
  ];

  for (const section of landingSections) {
    if (!section.flag) continue;
    const step = t[section.key] as { title: string; description: string };
    steps.push({
      element: section.element,
      popover: {
        title: step.title,
        description: step.description,
        side: "top",
        align: "center",
      },
    });
  }

  // AI chatbot step
  steps.push({
    element: "#chat-toggle",
    popover: {
      title: t.ai.title,
      description: t.ai.description,
      side: isRtl ? "right" : "left",
      align: "center",
    },
  });

  // Transition to admin
  steps.push({
    popover: {
      title: t.adminIntro.title,
      description: t.adminIntro.description,
      onNextClick: () => {
        tourPhase = "transitioning";
        destroyDriver();
        callbacks.onNavigateAdmin?.();
        waitForElement("#admin-content", () => startAdminTour());
      },
    },
  });

  const d = driver({
    showProgress: true,
    showButtons: ["next", "previous"],
    nextBtnText: t.buttons.next,
    prevBtnText: t.buttons.prev,
    animate: true,
    smoothScroll: true,
    stagePadding: 10,
    stageRadius: 14,
    popoverClass: `tour-popover ${isRtl ? "tour-rtl" : ""}`,
    overlayColor: "rgba(0, 0, 0, 0.75)",
    steps,
    onPopoverRender: (popover) => {
      injectSkipLink(popover.wrapper, t.buttons.skip, () => {
        localStorage.setItem(STORAGE_KEY, "true");
        callbacks.onCloseBooking?.();
        tourPhase = "idle";
        d.destroy();
      });
    },
    onDestroyStarted: () => {
      if (tourPhase === "transitioning") {
        d.destroy();
        return;
      }
      localStorage.setItem(STORAGE_KEY, "true");
      callbacks.onCloseBooking?.();
      tourPhase = "idle";
      d.destroy();
    },
  });

  activeDriver = d;
  injectTourStyles(isRtl);
  d.drive();
}

function startAdminTour() {
  destroyDriver();
  tourPhase = "admin";

  const t = getTourTranslations();
  const lang = getTourLanguage();
  const isRtl = lang === "he" || lang === "ar";

  const steps: DriveStep[] = [];

  CRM_TABS.forEach(({ tab, translationKey }, idx) => {
    const step = t[translationKey] as { title: string; description: string };
    steps.push({
      popover: {
        title: step.title,
        description: step.description,
        onNextClick: () => {
          const nextTab = CRM_TABS[idx + 1];
          if (nextTab) {
            setAdminTab(nextTab.tab);
            setTimeout(() => activeDriver?.moveNext(), 300);
          } else {
            activeDriver?.moveNext();
          }
        },
        onPrevClick: () => {
          if (idx === 0) {
            tourPhase = "transitioning";
            destroyDriver();
            callbacks.onNavigateLanding?.();
            waitForElement("#hero", () => {
              startLandingTour();
              setTimeout(() => {
                if (activeDriver) {
                  const config = (activeDriver as unknown as { getConfig?: () => { steps?: unknown[] } }).getConfig?.();
                  const total = config?.steps?.length;
                  if (total) activeDriver.drive(total - 1);
                }
              }, 200);
            });
            return;
          }
          const prevTab = CRM_TABS[idx - 1];
          if (prevTab) {
            setAdminTab(prevTab.tab);
            setTimeout(() => activeDriver?.movePrevious(), 300);
          }
        },
      },
    });
  });

  // Closing step with pricing CTA
  steps.push({
    popover: {
      title: t.closing.title,
      description: buildClosingHtml(t),
      onPrevClick: () => {
        const lastTab = CRM_TABS[CRM_TABS.length - 1];
        setAdminTab(lastTab.tab);
        setTimeout(() => activeDriver?.movePrevious(), 300);
      },
    },
  });

  setAdminTab("overview");

  setTimeout(() => {
    const d = driver({
      showProgress: true,
      showButtons: ["next", "previous"],
      nextBtnText: t.buttons.next,
      prevBtnText: t.buttons.prev,
      animate: true,
      smoothScroll: true,
      stagePadding: 10,
      stageRadius: 14,
      popoverClass: `tour-popover tour-popover-admin ${isRtl ? "tour-rtl" : ""}`,
      overlayColor: "rgba(0, 0, 0, 0)",
      overlayOpacity: 0,
      steps,
      onPopoverRender: (popover) => {
        injectSkipLink(popover.wrapper, t.buttons.skip, () => {
          localStorage.setItem(STORAGE_KEY, "true");
          tourPhase = "idle";
          d.destroy();
        });
      },
      onDestroyStarted: () => {
        if (tourPhase === "transitioning") {
          d.destroy();
          return;
        }
        localStorage.setItem(STORAGE_KEY, "true");
        tourPhase = "idle";
        d.destroy();
      },
    });

    activeDriver = d;
    injectTourStyles(isRtl);
    d.drive();
    bindClosingButtons(d);
  }, 500);
}

export function restartTour() {
  localStorage.removeItem(`tourCompleted_${env.clientId}`);
  tourPhase = "idle";
  window.location.reload();
}

function setAdminTab(tab: string) {
  window.dispatchEvent(new CustomEvent("tour:setAdminTab", { detail: tab }));
}

function waitForElement(selector: string, callback: () => void) {
  let attempts = 0;
  const check = () => {
    if (document.querySelector(selector) || attempts > 30) {
      callback();
    } else {
      attempts++;
      setTimeout(check, 200);
    }
  };
  setTimeout(check, 300);
}

function buildWelcomeHtml(description: string): string {
  return `<p style="margin-bottom:8px;line-height:1.7">${description}</p>`;
}

function buildClosingHtml(t: ReturnType<typeof getTourTranslations>): string {
  const payUrl = getPaymentUrl();
  const c = t.closing;
  const checkSvg = `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" style="flex-shrink:0"><circle cx="7" cy="7" r="7" fill="var(--tour-accent)" opacity="0.15"/><path d="M4 7.2L6.2 9.4L10 5" stroke="var(--tour-accent)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

  const includedHtml = c.included
    .map((item) => `<li style="display:flex;align-items:center;gap:8px;font-size:12px;color:inherit;opacity:0.85">${checkSvg}<span>${item}</span></li>`)
    .join("");

  return `
    <p style="margin-bottom:16px;line-height:1.7;opacity:0.85">${c.description}</p>
    <div class="tour-closing-card">
      <div style="display:flex;align-items:baseline;justify-content:space-between;margin-bottom:12px">
        <span style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;opacity:0.5">${c.priceLabel}</span>
        <span style="font-size:28px;font-weight:800;letter-spacing:-0.02em">${c.priceValue}<span style="font-size:12px;font-weight:500;opacity:0.5">/mo</span></span>
      </div>
      <p style="font-size:11px;opacity:0.6;margin-bottom:14px">${c.priceNote}</p>
      <ul style="list-style:none;padding:0;margin:0 0 16px;display:flex;flex-direction:column;gap:8px">
        ${includedHtml}
      </ul>
      <a href="${payUrl}" class="tour-cta-buy" style="display:flex;align-items:center;justify-content:center;gap:8px;width:100%;padding:14px 20px;border-radius:10px;background:var(--tour-accent);color:var(--primary-foreground, #fff);text-decoration:none;font-weight:700;font-size:14px;letter-spacing:0.01em;transition:opacity 0.2s">
        ${c.ctaBuy}
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 7h8M8 4l3 3-3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </a>
      <button onclick="document.querySelector('.driver-popover-close-btn')?.click()" style="display:block;width:100%;margin-top:8px;padding:10px;border:none;background:none;cursor:pointer;font-size:12px;opacity:0.4;color:inherit;transition:opacity 0.2s" onmouseover="this.style.opacity='0.7'" onmouseout="this.style.opacity='0.4'">
        ${c.ctaEnd}
      </button>
    </div>
  `;
}

function injectTourStyles(isRtl: boolean) {
  if (document.getElementById("tour-custom-styles")) return;
  const style = document.createElement("style");
  style.id = "tour-custom-styles";
  style.textContent = `
    :root {
      --tour-accent: var(--brand-accent, var(--color-accent, #d97706));
      --tour-bg: var(--card, #1a1a1f);
      --tour-fg: var(--card-foreground, #f0f0f2);
      --tour-muted: var(--muted-foreground, #a1a1aa);
      --tour-border: var(--border, #27272a);
      --tour-surface: var(--muted, #18181b);
    }
    .driver-popover {
      font-family: var(--font-sans, Inter, system-ui, sans-serif) !important;
      max-width: 400px !important;
      border-radius: 16px !important;
      border: 1px solid var(--tour-border) !important;
      box-shadow: 0 24px 64px -16px rgba(0,0,0,0.35), 0 8px 20px -8px rgba(0,0,0,0.2) !important;
      background: var(--tour-bg) !important;
      color: var(--tour-fg) !important;
      padding: 24px !important;
    }
    .tour-rtl .driver-popover {
      direction: rtl;
      text-align: right;
    }
    .tour-rtl .driver-popover-footer {
      flex-direction: row-reverse;
    }
    .driver-popover-title {
      font-size: 17px !important;
      font-weight: 700 !important;
      letter-spacing: -0.01em !important;
      margin-bottom: 8px !important;
      color: var(--tour-fg) !important;
    }
    .driver-popover-description {
      font-size: 13px !important;
      line-height: 1.7 !important;
      color: var(--tour-muted) !important;
    }
    .driver-popover-footer {
      margin-top: 16px !important;
      padding-top: 14px !important;
      border-top: 1px solid var(--tour-border) !important;
    }
    .driver-popover-footer button {
      border-radius: 8px !important;
      font-size: 12px !important;
      font-weight: 600 !important;
      padding: 8px 16px !important;
      transition: all 0.15s ease !important;
    }
    .driver-popover-next-btn {
      background: var(--tour-accent) !important;
      color: var(--primary-foreground, #fff) !important;
      border: none !important;
    }
    .driver-popover-next-btn:hover {
      opacity: 0.9 !important;
    }
    .driver-popover-prev-btn {
      border: 1px solid var(--tour-border) !important;
      color: var(--tour-muted) !important;
      background: transparent !important;
    }
    .driver-popover-prev-btn:hover {
      border-color: var(--tour-accent) !important;
      color: var(--tour-fg) !important;
    }
    .driver-popover-progress-text {
      font-size: 10px !important;
      font-weight: 600 !important;
      letter-spacing: 0.05em !important;
      color: var(--tour-muted) !important;
      opacity: 0.6 !important;
    }
    .driver-popover-close-btn {
      color: var(--tour-muted) !important;
    }
    .driver-popover-arrow-side-top .driver-popover-arrow,
    .driver-popover-arrow-side-bottom .driver-popover-arrow,
    .driver-popover-arrow-side-left .driver-popover-arrow,
    .driver-popover-arrow-side-right .driver-popover-arrow {
      border-color: var(--tour-bg) !important;
    }
    .tour-closing-card {
      margin-top: 4px;
      padding: 18px;
      border-radius: 12px;
      background: var(--tour-surface);
      border: 1px solid var(--tour-border);
    }
    .tour-cta-buy:hover {
      opacity: 0.92 !important;
    }
    .tour-skip-link {
      display: block;
      width: 100%;
      padding: 6px 0 0;
      margin-top: 4px;
      border: none;
      background: none;
      cursor: pointer;
      font-size: 10px;
      color: inherit;
      opacity: 0.25;
      text-align: center;
      transition: opacity 0.2s;
    }
    .tour-skip-link:hover {
      opacity: 0.5;
    }
    @media (max-width: 480px) {
      .driver-popover {
        max-width: calc(100vw - 32px) !important;
        padding: 20px !important;
      }
    }
  `;
  document.head.appendChild(style);
}

function injectSkipLink(wrapper: HTMLElement, text: string, onSkip: () => void) {
  const existing = wrapper.querySelector(".tour-skip-link");
  if (existing) existing.remove();
  const link = document.createElement("button");
  link.className = "tour-skip-link";
  link.textContent = text;
  link.addEventListener("click", onSkip);
  wrapper.appendChild(link);
}

function bindClosingButtons(d: Driver) {
  setTimeout(() => {
    document.addEventListener("click", (e) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains("tour-cta-buy") || target.closest(".tour-cta-buy")) {
        d.destroy();
      }
    });
  }, 100);
}
