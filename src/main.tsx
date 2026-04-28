import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MotionConfig } from 'motion/react';
import App from './App.tsx';
import './index.css';
import { ThemeProvider } from './components/theme/ThemeProvider';
import { localeConfig } from './config/locale';
import { syncDocumentMetaFromSiteConfig } from './hooks/useSEO';
import { applySiteThemeCssVars } from './lib/site-theme';
import { bootstrapTenantConfig } from './services/tenant';

async function bootstrap() {
  const tenant = await bootstrapTenantConfig();

  document.documentElement.lang = localeConfig.lang;
  document.documentElement.dir = localeConfig.dir;
  applySiteThemeCssVars();
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
        <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
          <App />
        </ThemeProvider>
      </MotionConfig>
    </StrictMode>,
  );
}

void bootstrap();
