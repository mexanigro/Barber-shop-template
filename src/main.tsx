import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
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
      root.innerHTML = '<main style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;font-family:system-ui,sans-serif;background:#0f172a;color:#f8fafc;text-align:center"><div><h1 style="font-size:28px;margin-bottom:10px">Service Temporarily Unavailable</h1><p style="opacity:.9;max-width:620px">This tenant is currently suspended or archived. Contact support to reactivate the account.</p></div></main>';
    }
    return;
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
        <App />
      </ThemeProvider>
    </StrictMode>,
  );
}

void bootstrap();
