import { test, expect } from '../../fixtures/test';

test.describe('Citizen directory & resource search', () => {
  test('bed search shows inventory categories/results', async ({ citizenSearch, page, stepShot }) => {
    await citizenSearch.openBeds();
    await stepShot(page, 'beds');
    const filter = page.getByRole('button', { name: /ICU|General|All/i }).first();
    if (await filter.count()) await filter.click();
    await stepShot(page, 'beds-filtered');
  });

  test('nearby hospitals screen', async ({ citizenSearch, page, stepShot }) => {
    await citizenSearch.openHospitals();
    await expect(page.locator('body')).toBeVisible();
    await stepShot(page, 'hospitals');
  });

  test('blood bank, diagnostics, doctors, pharmacy, insurance, cancer', async ({
    citizenSearch,
    page,
    stepShot,
  }) => {
    await citizenSearch.openBloodBank();
    await stepShot(page, 'blood');
    await citizenSearch.openDiagnostics();
    await stepShot(page, 'diagnostics');
    await citizenSearch.openDoctors();
    await stepShot(page, 'doctors');
    await citizenSearch.openPharmacy();
    await stepShot(page, 'pharmacy');
    await citizenSearch.openInsurance();
    await stepShot(page, 'insurance');
    await citizenSearch.openCancer();
    await stepShot(page, 'cancer');
  });

  test('profile / consent / chronic account screens', async ({ page, stepShot }) => {
    await page.goto('/account/profile');
    await stepShot(page, 'profile');
    await page.goto('/account/consent');
    await stepShot(page, 'consent');
    await page.goto('/account/chronic');
    await stepShot(page, 'chronic');
  });
});
