import { test, expect } from '../../fixtures/test';
import { createGuestEmergencyCase } from '../../utils/api';

test.describe('Citizen emergency golden path (guest — no WhatsApp)', () => {
  test('guest triage UI can start emergency request', async ({
    citizenSplash,
    citizenGuest,
    citizenTriage,
    page,
    stepShot,
  }) => {
    await citizenSplash.open();
    await citizenSplash.continueInEnglish();
    await citizenGuest.requestAmbulance();
    await expect(page).toHaveURL(/\/home\/triage/);
    await stepShot(page, 'triage');
    await citizenTriage.answerCriticalPath();
    await stepShot(page, 'triage-answered');
    await citizenTriage.submitEmergency();
    await citizenTriage.expectSearchingOrCase();
    await stepShot(page, 'post-triage');
  });

  test('API guest case + case dashboard deep-link', async ({ request, page, stepShot }) => {
    const created = await createGuestEmergencyCase(request);
    expect(created.severity).toBeTruthy();
    await page.goto(`/case/dashboard?caseId=${created.caseId}`);
    await expect(page.locator('body')).toBeVisible();
    await stepShot(page, 'case-dashboard');
    await page.goto(`/case/timeline?caseId=${created.caseId}`);
    await stepShot(page, 'case-timeline');
    await page.goto('/case/coordinator');
    await stepShot(page, 'coordinator');
  });

  test('ambulance tracking & arrival screens load', async ({ page, stepShot }) => {
    await page.goto('/home/tracking');
    await stepShot(page, 'tracking');
    await page.goto('/home/arrival');
    await stepShot(page, 'arrival');
    await page.goto('/home/searching');
    await stepShot(page, 'searching');
  });
});
