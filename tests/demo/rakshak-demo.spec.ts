import { test, expect } from '../../fixtures/test';
import { env } from '../../utils/env';
import { demoClick, demoHighlight, demoPause, demoScroll, demoShot } from '../../utils/demo';
import { createGuestEmergencyCase } from '../../utils/api';

/**
 * Demo mode — cinematic happiest-path walkthrough for stakeholder video.
 * Run: E2E_DEMO=1 npx playwright test --project=demo
 */
test.describe.configure({ mode: 'serial' });

test('Rakshak cinematic demo — Citizen → Provider → Admin', async ({ page, request }) => {
  test.setTimeout(300_000);

  // Title beat
  await page.goto(env.citizenUrl + '/onboarding/splash');
  await demoPause(page, 2000);
  await demoShot(page, '01-title-citizen-splash');
  await demoHighlight(page, 'text=Sahayak');

  // Citizen journey
  await demoClick(page, /Continue in English/i);
  await demoShot(page, '02-guest-entry');
  await demoClick(page, /Request Ambulance Now/i);
  await demoShot(page, '03-triage');

  await page.getByRole('button', { name: 'Unresponsive' }).click();
  await demoPause(page, 700);
  await page.getByRole('button', { name: /Struggling \/ not breathing/i }).click();
  await demoPause(page, 700);
  await page.getByRole('button', { name: 'Bleeding present' }).click();
  await demoPause(page, 700);

  const submit = page.getByRole('button', { name: /Send Emergency Request/i });
  await submit.waitFor({ state: 'visible' });
  await expect(submit).toBeEnabled({ timeout: 10_000 });
  await submit.click();
  await page.waitForURL(/\/(home\/searching|case\/dashboard)/, { timeout: 60_000 });
  await demoShot(page, '04-emergency-submitted');

  // Directory / AI-backed search
  await page.goto(env.citizenUrl + '/search/beds');
  await demoPause(page, 1500);
  await demoScroll(page, 300);
  await demoShot(page, '05-bed-search');

  await page.goto(env.citizenUrl + '/search/hospitals');
  await demoShot(page, '06-hospitals');

  const created = await createGuestEmergencyCase(request, `demo-${Date.now()}`);
  await page.goto(`${env.citizenUrl}/case/dashboard?caseId=${created.caseId}`);
  await demoPause(page, 1800);
  await demoShot(page, '07-case-tracking');

  // Provider journey
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(env.providerUrl + '/login');
  await demoPause(page, 1500);
  await demoShot(page, '08-provider-login');
  await page.goto(env.providerUrl + '/hospital/dashboard');
  await demoShot(page, '09-provider-dashboard');
  await page.goto(env.providerUrl + '/hospital/beds');
  await demoScroll(page, 250);
  await demoShot(page, '10-provider-beds');
  await page.goto(env.providerUrl + '/hospital/queue');
  await demoShot(page, '11-provider-queue');
  await page.goto(env.providerUrl + '/hospital/ai-assistant');
  await demoShot(page, '12-provider-ai');

  // Admin journey
  await page.goto(env.adminUrl + '/login');
  await demoPause(page, 1500);
  await demoShot(page, '13-admin-login');
  await page.goto(env.adminUrl + '/dashboard');
  await demoShot(page, '14-admin-dashboard');
  await page.goto(env.adminUrl + '/monitoring');
  await demoShot(page, '15-admin-monitoring');
  await page.goto(env.adminUrl + '/ai-assistant');
  await demoShot(page, '16-admin-ai');
  await page.goto(env.adminUrl + '/governance');
  await demoShot(page, '17-admin-governance');

  // Closing
  await page.goto(env.citizenUrl + '/onboarding/splash');
  await demoPause(page, 2500);
  await demoShot(page, '18-summary');
});
