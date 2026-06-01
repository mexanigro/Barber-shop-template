/**
 * Toma 2 screenshots mobile (hero + services) para cada nicho.
 * Uso: node scripts/take-niche-screenshots.mjs
 */
import { chromium } from 'playwright';
import { execSync, spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const NICHOS = ['nails', 'remodelaciones', 'cafeteria'];
const PORT = 4200;
const VIEWPORT = { width: 390, height: 844, deviceScaleFactor: 2 };

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function waitForServer(port, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    function check() {
      const req = http.get(`http://localhost:${port}`, (res) => {
        res.resume();
        resolve();
      });
      req.on('error', () => {
        if (Date.now() - start > timeoutMs) {
          reject(new Error(`Server on port ${port} not ready after ${timeoutMs}ms`));
        } else {
          setTimeout(check, 500);
        }
      });
      req.setTimeout(1000, () => {
        req.destroy();
        setTimeout(check, 500);
      });
    }
    check();
  });
}

async function takeScreenshots(niche) {
  console.log(`\n=== ${niche.toUpperCase()} ===`);

  // 1. Build
  console.log(`  Building...`);
  execSync(`npx vite build --mode ${niche}`, {
    cwd: ROOT,
    stdio: 'inherit',
    env: { ...process.env },
  });

  // 2. Start preview server
  console.log(`  Starting preview on port ${PORT}...`);
  const preview = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
    cwd: ROOT,
    stdio: 'pipe',
    shell: true,
    env: { ...process.env },
  });

  preview.stdout.on('data', d => process.stdout.write('  [preview] ' + d));
  preview.stderr.on('data', d => process.stdout.write('  [preview:err] ' + d));

  // Poll until server responds
  console.log(`  Waiting for server...`);
  await waitForServer(PORT, 30000);
  await sleep(1000); // extra settle time

  // 3. Screenshots with Playwright
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: VIEWPORT.width, height: VIEWPORT.height },
    deviceScaleFactor: VIEWPORT.deviceScaleFactor,
    isMobile: true,
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
  });

  const page = await context.newPage();

  try {
    await page.goto(`http://localhost:${PORT}`, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
  } catch {
    // fallback: try load event
    await page.goto(`http://localhost:${PORT}`, { waitUntil: 'load', timeout: 30000 });
  }

  await sleep(6000); // wait for splash to finish + animations

  // Hero screenshot (after splash dismisses)
  const heroPath = path.join(ROOT, `mobile-${niche}-hero.png`);
  await page.screenshot({ path: heroPath, fullPage: false });
  console.log(`  Saved: mobile-${niche}-hero.png`);

  // Scroll to services section with fallbacks
  const scrolled = await page.evaluate(() => {
    const el =
      document.querySelector('#services') ||
      document.querySelector('[data-section="services"]');
    if (el) {
      el.scrollIntoView({ behavior: 'instant', block: 'start' });
      return true;
    }
    // fallback: 2 viewport heights
    window.scrollBy(0, window.innerHeight * 2);
    return false;
  });
  console.log(`  Scrolled to services via ${scrolled ? '#services selector' : '2x viewport fallback'}`);
  await sleep(2000);

  const servicesPath = path.join(ROOT, `mobile-${niche}-services.png`);
  await page.screenshot({ path: servicesPath, fullPage: false });
  console.log(`  Saved: mobile-${niche}-services.png`);

  await browser.close();

  // 4. Kill preview
  preview.kill('SIGTERM');
  await sleep(1500);
}

// Main
(async () => {
  for (const niche of NICHOS) {
    await takeScreenshots(niche);
  }
  console.log('\nDone! 6 screenshots saved.');
})().catch(err => {
  console.error(err);
  process.exit(1);
});
