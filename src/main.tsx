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
import { applySiteThemeCssVars, getNicheDefaultMode } from './lib/site-theme';
import { applyBootMode } from './lib/boot-mode';
import { bootstrapTenantConfig } from './services/tenant';
import type { UiLanguage } from './config/uiLanguage';

async function bootstrap() {
  // Apply persisted language preference (if any) before first render
  const stored = localStorage.getItem("preferred_language") as UiLanguage | null;
  if (stored && (stored === "he" || stored === "en" || stored === "ru" || stored === "ar")) {
    setLocale(stored);
    switchSiteLanguage(stored);
  }

  document.documentElement.lang = localeConfig.lang;
  document.documentElement.dir = localeConfig.dir;
  const root = document.getElementById('root');
  if (root) {
    const waiting = document.createElement('p');
    waiting.setAttribute('role', 'status');
    waiting.textContent = localeConfig.a11y.loadingRoute;
    root.replaceChildren(waiting);
  }

  const tenant = await bootstrapTenantConfig();
  if (tenant.access === 'unavailable') {
    if (root) {
      const message = document.createElement('p');
      message.setAttribute('role', 'alert');
      message.textContent = localeConfig.tenantAccess.unavailable;
      const reload = document.createElement('button');
      reload.type = 'button';
      reload.textContent = localeConfig.tenantAccess.reload;
      reload.addEventListener('click', () => window.location.reload());
      root.replaceChildren(message, reload);
    }
    return;
  }

  applySiteThemeCssVars();

  // D17 / R8 (TRANSICION-02, 2026-09-19): el modo es de la paleta (`branding.mode`), nunca del nicho; `getNicheDefaultMode()`
  // lee `branding.mode` y sólo sin él cae al respaldo del nicho. index.html arranca en `dark` (anti-flash): aquí se corrige
  // al modo real salvo preferencia guardada del visitante (nichos con toggle; peluquería no lo tiene, R12).
  const bootMode = getNicheDefaultMode();
  applyBootMode(document.documentElement, bootMode, localStorage.getItem("vite-ui-theme"));

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
            defaultTheme={bootMode}
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
