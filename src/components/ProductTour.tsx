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

export function ProductTour(props: TourProps) {
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
  const isRtl = lang === "he";
  const feat = siteConfig.features;

  const steps: DriveStep[] = [];

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
    { flag: feat.showInquiry ?? false, element: "#contact", key: "contact" },
    { flag: feat.showBusinessHours, element: "#business-hours", key: "businessHours" },
    { flag: feat.showLocation, element: "#location", key: "location" },
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

  steps.push({
    element: "#chat-toggle",
    popover: {
      title: t.ai.title,
      description: t.ai.description,
      side: isRtl ? "right" : "left",
      align: "center",
    },
  });

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
    stagePadding: 8,
    stageRadius: 12,
    popoverClass: `tour-popover ${isRtl ? "tour-rtl" : ""}`,
    overlayColor: "rgba(0, 0, 0, 0.7)",
    steps,
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
  const isRtl = lang === "he";

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
              // Jump to last step (admin intro) after landing tour rebuilds
              setTimeout(() => {
                if (activeDriver) {
                  const config = (activeDriver as any).getConfig?.();
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

  steps.push({
    popover: {
      title: t.closing.title,
      description: buildClosingHtml(t.closing.description, t.closing.ctaBuy, t.closing.ctaEnd),
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
      stagePadding: 8,
      stageRadius: 12,
      popoverClass: `tour-popover ${isRtl ? "tour-rtl" : ""}`,
      overlayColor: "rgba(0, 0, 0, 0)",
      overlayOpacity: 0,
      steps,
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
  return `<p style="margin-bottom:12px">${description}</p>`;
}

function buildClosingHtml(description: string, ctaBuy: string, ctaEnd: string): string {
  const payUrl = getPaymentUrl();
  return `
    <p style="margin-bottom:16px">${description}</p>
    <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center">
      <a href="${payUrl}" class="tour-cta-buy"
         style="display:inline-block;padding:10px 20px;border-radius:8px;background:#2a7f8a;color:#fff;text-decoration:none;font-weight:600;font-size:14px">
        ${ctaBuy}
      </a>
      <button onclick="document.querySelector('.driver-popover-close-btn')?.click()"
              style="padding:10px 20px;border-radius:8px;border:1px solid #d1d5db;background:transparent;cursor:pointer;font-size:14px;color:inherit">
        ${ctaEnd}
      </button>
    </div>
  `;
}

function injectTourStyles(isRtl: boolean) {
  if (document.getElementById("tour-custom-styles")) return;
  const style = document.createElement("style");
  style.id = "tour-custom-styles";
  style.textContent = `
    .driver-popover {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
      max-width: 380px !important;
    }
    .tour-rtl .driver-popover {
      direction: rtl;
      text-align: right;
    }
    .tour-rtl .driver-popover-footer {
      flex-direction: row-reverse;
    }
    .driver-popover-title {
      font-size: 18px !important;
      font-weight: 700 !important;
    }
    .driver-popover-description {
      font-size: 14px !important;
      line-height: 1.6 !important;
    }
    .driver-popover-footer button {
      border-radius: 6px !important;
      font-size: 13px !important;
      padding: 6px 14px !important;
    }
    .driver-popover-next-btn {
      background: #2a7f8a !important;
      color: #fff !important;
      border: none !important;
    }
    .driver-popover-prev-btn {
      border: 1px solid #d1d5db !important;
    }
    .driver-popover-progress-text {
      font-size: 12px !important;
    }
  `;
  document.head.appendChild(style);
}

function bindClosingButtons(d: Driver) {
  setTimeout(() => {
    document.addEventListener("click", (e) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains("tour-cta-buy")) {
        d.destroy();
      }
    });
  }, 100);
}
