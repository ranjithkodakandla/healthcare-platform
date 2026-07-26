/**
 * UX persona crawl — visits every screen inventory route and captures
 * friction signals (tiny targets, jargon, emoji CTAs, dead controls).
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const CITIZEN_SCREENS = [
  { id: 'C-00', path: '/' },
  { id: 'C-01', path: '/onboarding/splash' },
  { id: 'C-02', path: '/onboarding/guest' },
  { id: 'C-03', path: '/onboarding/otp' },
  { id: 'C-04', path: '/home/dashboard' },
  { id: 'C-05', path: '/home/triage' },
  { id: 'C-06', path: '/home/searching' },
  { id: 'C-07', path: '/home/tracking' },
  { id: 'C-08', path: '/home/arrival' },
  { id: 'C-09', path: '/case/dashboard' },
  { id: 'C-10', path: '/case/timeline' },
  { id: 'C-11', path: '/case/coordinator' },
  { id: 'C-12', path: '/search' },
  { id: 'C-13', path: '/search/beds' },
  { id: 'C-14', path: '/search/bed-detail' },
  { id: 'C-15', path: '/search/bed-hold' },
  { id: 'C-16', path: '/search/doctors' },
  { id: 'C-17', path: '/search/doctor-detail' },
  { id: 'C-18', path: '/search/hospitals' },
  { id: 'C-19', path: '/search/hospital-detail' },
  { id: 'C-20', path: '/search/pharmacy' },
  { id: 'C-21', path: '/search/pharmacy-hold' },
  { id: 'C-22', path: '/search/blood-bank' },
  { id: 'C-23', path: '/search/blood-request' },
  { id: 'C-24', path: '/search/diagnostics' },
  { id: 'C-25', path: '/search/diagnostic-result' },
  { id: 'C-26', path: '/search/insurance' },
  { id: 'C-27', path: '/search/cancer' },
  { id: 'C-28', path: '/search/teleconsult' },
  { id: 'C-29', path: '/account/profile' },
  { id: 'C-30', path: '/account/consent' },
  { id: 'C-31', path: '/account/chronic' },
  { id: 'C-32', path: '/driver/dispatch' },
  { id: 'C-33', path: '/driver/navigate' },
];

const PROVIDER_SCREENS = [
  { id: 'P-01', path: '/login' },
  { id: 'P-02', path: '/hospital/dashboard' },
  { id: 'P-03', path: '/hospital/beds' },
  { id: 'P-04', path: '/hospital/queue' },
  { id: 'P-05', path: '/hospital/clinical-ack' },
  { id: 'P-06', path: '/hospital/cases' },
  { id: 'P-07', path: '/hospital/reports' },
  { id: 'P-08', path: '/hospital/analytics' },
  { id: 'P-09', path: '/hospital/ai-assistant' },
  { id: 'P-10', path: '/hospital/users' },
  { id: 'P-11', path: '/hospital/config' },
  { id: 'P-12', path: '/hospital/audit' },
  { id: 'P-13', path: '/doctor/availability' },
  { id: 'P-14', path: '/ambulance/fleet' },
  { id: 'P-15', path: '/pharmacy/stock' },
  { id: 'P-16', path: '/blood-bank/pre-alerts' },
  { id: 'P-17', path: '/diagnostics/results' },
  { id: 'P-18', path: '/insurance/pre-auth' },
  { id: 'P-19', path: '/insurance/network' },
];

const ADMIN_SCREENS = [
  { id: 'A-01', path: '/login' },
  { id: 'A-02', path: '/dashboard' },
  { id: 'A-03', path: '/onboarding/citizen' },
  { id: 'A-04', path: '/onboarding/provider' },
  { id: 'A-05', path: '/onboarding/provider/verify' },
  { id: 'A-06', path: '/support/tickets' },
  { id: 'A-07', path: '/support/tickets/detail' },
  { id: 'A-08', path: '/support/remote-assist' },
  { id: 'A-09', path: '/issues/board' },
  { id: 'A-10', path: '/issues/sla' },
  { id: 'A-11', path: '/knowledge-base' },
  { id: 'A-12', path: '/users' },
  { id: 'A-13', path: '/workflows' },
  { id: 'A-14', path: '/monitoring' },
  { id: 'A-15', path: '/analytics' },
  { id: 'A-16', path: '/communications' },
  { id: 'A-17', path: '/ai-assistant' },
  { id: 'A-18', path: '/governance' },
  { id: 'A-19', path: '/support/provider-tickets' },
];

const BASE = {
  citizen: process.env.E2E_CITIZEN_URL ?? 'https://sahayak-dev-citizen-j2iqu7nnqq-el.a.run.app',
  provider: process.env.E2E_PROVIDER_URL ?? 'https://sahayak-dev-provider-j2iqu7nnqq-el.a.run.app',
  admin: process.env.E2E_ADMIN_URL ?? 'https://sahayak-dev-admin-j2iqu7nnqq-el.a.run.app',
};

const OUT = path.join(__dirname, '../reports/ux-crawl.json');

async function auditPage(page, app, screen) {
  const url = `${BASE[app]}${screen.path}`;
  const findings = [];
  let status = 'ok';
  let title = '';
  let bodyText = '';

  try {
    const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(900);
    title = await page.title();
    bodyText = (
      await page
        .locator('body')
        .innerText()
        .catch(() => '')
    ).slice(0, 2500);
    const http = resp?.status() ?? 0;
    if (http >= 400) {
      status = `http_${http}`;
      findings.push({ severity: 'P0', issue: `HTTP ${http}` });
    }

    const smallTargets = await page.evaluate(() => {
      const els = [
        ...document.querySelectorAll('a, button, [role="button"], input, select, textarea'),
      ];
      return els
        .map((el) => {
          const r = el.getBoundingClientRect();
          const text = (
            el.innerText ||
            el.getAttribute('aria-label') ||
            el.getAttribute('placeholder') ||
            ''
          )
            .trim()
            .slice(0, 60);
          return { w: Math.round(r.width), h: Math.round(r.height), text, tag: el.tagName };
        })
        .filter((t) => t.w > 0 && t.h > 0 && (t.w < 44 || t.h < 44))
        .slice(0, 12);
    });
    if (smallTargets.length) {
      findings.push({
        severity: 'P1',
        issue: `${smallTargets.length}+ interactive elements under 44px`,
        samples: smallTargets.slice(0, 5),
      });
    }

    const deadClicks = await page.evaluate(() => {
      return [...document.querySelectorAll('div.cursor-pointer, div[class*="cursor-pointer"]')]
        .filter((el) => !el.closest('a,button,[role="button"]'))
        .map((el) => (el.innerText || '').trim().slice(0, 40))
        .filter(Boolean)
        .slice(0, 8);
    });
    if (deadClicks.length) {
      findings.push({
        severity: 'P0',
        issue: 'Clickable-looking divs that are not buttons/links',
        samples: deadClicks,
      });
    }

    const jargon = [
      'BR-05',
      'BR-06',
      'GT-10',
      'FR-',
      'Part I7',
      'DL-007',
      '§13',
      'Firebase Auth',
      'deviceId',
      'caseId',
      'ABAC',
      'RBAC',
      'TTL',
    ].filter((j) => bodyText.includes(j));
    if (jargon.length) {
      findings.push({
        severity: 'P1',
        issue: 'Internal/jargon text visible to users',
        samples: jargon,
      });
    }

    const emojiCtas = await page.evaluate(() => {
      const emoji = /[\u{1F300}-\u{1FAFF}]/u;
      return [...document.querySelectorAll('button, a')]
        .map((el) => (el.innerText || '').trim())
        .filter((t) => emoji.test(t))
        .slice(0, 8);
    });
    if (emojiCtas.length) {
      findings.push({
        severity: 'P2',
        issue: 'Emoji in primary interactive labels',
        samples: emojiCtas,
      });
    }

    const tinyText = await page.evaluate(() => {
      const out = [];
      for (const el of document.querySelectorAll('span, p, label, a, button')) {
        const fs = parseFloat(getComputedStyle(el).fontSize);
        const t = (el.innerText || '').trim();
        if (fs && fs < 12 && t.length > 1 && t.length < 40) out.push({ fs, t: t.slice(0, 40) });
        if (out.length >= 8) break;
      }
      return out;
    });
    if (tinyText.length) {
      findings.push({ severity: 'P1', issue: 'Text smaller than 12px', samples: tinyText });
    }

    const unlabeled = await page.evaluate(() => {
      return [...document.querySelectorAll('input, select, textarea')]
        .filter((el) => {
          const id = el.id;
          const aria = el.getAttribute('aria-label');
          const labelled = id && document.querySelector(`label[for="${id}"]`);
          return !aria && !labelled && !el.closest('label');
        })
        .map((el) => el.getAttribute('placeholder') || el.name || el.type)
        .slice(0, 8);
    });
    if (unlabeled.length) {
      findings.push({
        severity: 'P1',
        issue: 'Inputs without associated labels',
        samples: unlabeled,
      });
    }

    const h1Count = await page.locator('h1').count();
    if (h1Count === 0) findings.push({ severity: 'P2', issue: 'No h1 landmark on screen' });

    if (/Ravi Kumar|ECN-2026-0041|admin\.liveverify@|APL-BLR-0142/i.test(bodyText)) {
      findings.push({
        severity: 'P0',
        issue: 'Hardcoded demo identity / fake case / prefilled test credentials',
        samples: bodyText
          .match(/Ravi Kumar|ECN-2026-\d+|admin\.liveverify@\S*|APL-BLR-0142/gi)
          ?.slice(0, 4),
      });
    }

    if (app === 'citizen') {
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth + 8,
      );
      if (overflow)
        findings.push({ severity: 'P1', issue: 'Horizontal overflow on mobile viewport' });
    }
  } catch (e) {
    status = 'error';
    findings.push({ severity: 'P0', issue: `Navigation failed: ${e.message}` });
  }

  return {
    app,
    id: screen.id,
    path: screen.path,
    url: `${BASE[app]}${screen.path}`,
    status,
    title,
    findingCount: findings.length,
    findings,
    snippet: bodyText.slice(0, 280),
  };
}

async function crawlApp(browser, app, screens) {
  const context = await browser.newContext({
    viewport: app === 'citizen' ? { width: 390, height: 844 } : { width: 1280, height: 800 },
  });
  const page = await context.newPage();
  const results = [];
  for (const screen of screens) {
    process.stdout.write(`  ${app} ${screen.id} ${screen.path}\n`);
    results.push(await auditPage(page, app, screen));
  }
  await context.close();
  return results;
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const all = [];
  console.log('Citizen crawl…');
  all.push(...(await crawlApp(browser, 'citizen', CITIZEN_SCREENS)));
  console.log('Provider crawl…');
  all.push(...(await crawlApp(browser, 'provider', PROVIDER_SCREENS)));
  console.log('Admin crawl…');
  all.push(...(await crawlApp(browser, 'admin', ADMIN_SCREENS)));
  await browser.close();

  const summary = {
    generatedAt: new Date().toISOString(),
    bases: BASE,
    totals: {
      screens: all.length,
      withFindings: all.filter((r) => r.findings.length).length,
      p0: all.flatMap((r) => r.findings).filter((f) => f.severity === 'P0').length,
      p1: all.flatMap((r) => r.findings).filter((f) => f.severity === 'P1').length,
      p2: all.flatMap((r) => r.findings).filter((f) => f.severity === 'P2').length,
    },
    results: all,
  };
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary.totals, null, 2));
  console.log('Wrote', OUT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
