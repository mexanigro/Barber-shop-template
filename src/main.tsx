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
  if (stored && (stored === "he" || stored === "en" || stored === "ru")) {
    setLocale(stored);
    switchSiteLanguage(stored);
  }

  const tenant = await bootstrapTenantConfig();

  document.documentElement.lang = localeConfig.lang;
  document.documentElement.dir = localeConfig.dir;
  applySiteThemeCssVars();

  // Estetica niche defaults to light mode (overrides index.html flash-prevention)
  if (document.documentElement.dataset.niche === "estetica") {
    const stored = localStorage.getItem("vite-ui-theme");
    if (!stored || window.matchMedia("(min-width: 768px)").matches) {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
    }
  }

  syncDocumentMetaFromSiteConfig();

  if (tenant.suspended) {
    const root = document.getElementById('root');
    if (root) {
      const t = localeConfig.admin.suspended;
      root.innerHTML = `<main style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;font-family:system-ui,sans-serif;background:#0f172a;color:#f8fafc;text-align:center"><div><h1 style="font-size:28px;margin-bottom:10px">${t.title}</h1><p style="opacity:.9;max-width:620px">${t.message}</p></div></main>`;
    }
    return;
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <MotionConfig reducedMotion="user">
        <ErrorBoundary>
          <ThemeProvider
            defaultTheme={document.documentElement.dataset.niche === "estetica" ? "light" : "dark"}
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
