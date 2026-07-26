#!/usr/bin/env node
/**
 * Multi-viewport screenshot capture for responsive review.
 * Writes PNGs under reports/responsive/{app}/{viewport}/...
 */
const { chromium, devices } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', 'reports', 'responsive');

const VIEWPORTS = {
  'iphone-se': devices['iPhone SE'],
  'iphone-14': devices['iPhone 14'],
  pixel: devices['Pixel 7'],
  ipad: devices['iPad (gen 7)'],
  laptop: { viewport: { width: 1366, height: 768 }, isMobile: false, hasTouch: false },
  desktop: { viewport: { width: 1440, height: 900 }, isMobile: false, hasTouch: false },
  phone: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
  tablet: { viewport: { width: 820, height: 1180 }, isMobile: true, hasTouch: true },
};

const CITIZEN =
  process.env.E2E_CITIZEN_URL || 'https://sahayak-dev-citizen-j2iqu7nnqq-el.a.run.app';
const PROVIDER =
  process.env.E2E_PROVIDER_URL || 'https://sahayak-dev-provider-j2iqu7nnqq-el.a.run.app';
const ADMIN = process.env.E2E_ADMIN_URL || 'https://sahayak-dev-admin-j2iqu7nnqq-el.a.run.app';

const PLAN = [
  {
    app: 'citizen',
    base: CITIZEN,
    viewports: ['iphone-se', 'iphone-14', 'pixel', 'ipad', 'desktop'],
    routes: [
      '/onboarding/splash',
      '/onboarding/guest',
      '/home/dashboard',
      '/home/triage',
      '/search/beds',
      '/account/profile',
    ],
  },
  {
    app: 'provider',
    base: PROVIDER,
    viewports: ['desktop', 'laptop', 'tablet', 'phone'],
    routes: ['/login', '/hospital/dashboard', '/hospital/queue', '/hospital/beds'],
  },
  {
    app: 'admin',
    base: ADMIN,
    viewports: ['desktop', 'laptop', 'tablet', 'phone'],
    routes: ['/login', '/dashboard', '/support/tickets', '/onboarding/provider'],
  },
];

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const summary = [];

  for (const suite of PLAN) {
    for (const vpName of suite.viewports) {
      const device = VIEWPORTS[vpName];
      const context = await browser.newContext({
        ...device,
        ignoreHTTPSErrors: true,
      });
      const page = await context.newPage();
      for (const route of suite.routes) {
        const slug = route.replace(/\//g, '_').replace(/^_/, '') || 'root';
        const dir = path.join(OUT, suite.app, vpName);
        fs.mkdirSync(dir, { recursive: true });
        const file = path.join(dir, `${slug}.png`);
        try {
          await page.goto(`${suite.base}${route}`, {
            waitUntil: 'domcontentloaded',
            timeout: 45_000,
          });
          await page.waitForTimeout(600);
          await page.screenshot({ path: file, fullPage: true });
          summary.push({
            app: suite.app,
            viewport: vpName,
            route,
            file: path.relative(process.cwd(), file),
            ok: true,
          });
          process.stdout.write(`✓ ${suite.app} ${vpName} ${route}\n`);
        } catch (err) {
          summary.push({
            app: suite.app,
            viewport: vpName,
            route,
            ok: false,
            error: err instanceof Error ? err.message : String(err),
          });
          process.stdout.write(`✗ ${suite.app} ${vpName} ${route}: ${err}\n`);
        }
      }
      await context.close();
    }
  }

  await browser.close();
  fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(summary, null, 2));
  const ok = summary.filter((s) => s.ok).length;
  const fail = summary.length - ok;
  console.log(`\nResponsive capture: ${ok} ok, ${fail} failed → ${OUT}`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
