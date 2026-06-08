import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MotionConfig } from 'motion/react';
import App from './App.tsx';
import './index.css';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ThemeProvider } from './components/theme/ThemeProvider';
import { LanguageProvider } from './contexts/LanguageContext';
import { localeConfig, setLocale } from './config/locale';
import { switchSiteLanguage } from './config/site';
import { syncDocumentMetaFromSiteConfig } from './hooks/useSEO';
import { applySiteThemeCssVars } from './lib/site-theme';
import { bootstrapTenantConfig } from './services/tenant';
import type { UiLanguage } from './config/uiLanguage';

async function bootstrap() {
  // Apply persisted language preference (if any) before first render
  const stored = localStorage.getItem("preferred_language") as UiLanguage | null;
  if (stored && (stored === "he" || stored === "en" || stored === "ru" || stored === "ar")) {
    setLocale(stored);
    switchSiteLanguage(stored);
  }

  const tenant = await bootstrapTenantConfig();

  document.documentElement.lang = localeConfig.lang;
  document.documentElement.dir = localeConfig.dir;
  applySiteThemeCssVars();

  // Light-default niches override index.html flash-prevention dark class
  const lightNiches = ["estetica", "nails"];
  if (lightNiches.includes(document.documentElement.dataset.niche || "")) {
    const stored = localStorage.getItem("vite-ui-theme");
    if (!stored) {
      // No user preference stored → apply niche default (light)
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
    }
  }

  syncDocumentMetaFromSiteConfig();

  if (tenant.suspended) {
    const root = document.getElementById('root');
    if (root) {
      const t = localeConfig.admin.suspended;
      root.textContent = "";
      const main = document.createElement("main");
      main.style.cssText = "min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;font-family:system-ui,sans-serif;background:#0f172a;color:#f8fafc;text-align:center";
      const wrapper = document.createElement("div");
      const h1 = document.createElement("h1");
      h1.style.cssText = "font-size:28px;margin-bottom:10px";
      h1.textContent = t.title;
      const p = document.createElement("p");
      p.style.cssText = "opacity:.9;max-width:620px";
      p.textContent = t.message;
      wrapper.appendChild(h1);
      wrapper.appendChild(p);
      main.appendChild(wrapper);
      root.appendChild(main);
    }
    return;
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <MotionConfig reducedMotion="user">
        <ErrorBoundary>
          <ThemeProvider
            defaultTheme={lightNiches.includes(document.documentElement.dataset.niche || "") ? "light" : "dark"}
            storageKey="vite-ui-theme"
          >
            <LanguageProvider>
              <App />
            </LanguageProvider>
          </ThemeProvider>
        </ErrorBoundary>
      </MotionConfig>
    </StrictMode>,
  );
}

void bootstrap();
