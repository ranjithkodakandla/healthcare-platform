import { test, expect } from '../../fixtures/test';

test.describe('Citizen authentication & onboarding', () => {
  test('splash → guest entry surfaces emergency CTAs', async ({
    citizenSplash,
    citizenGuest,
    page,
    stepShot,
  }) => {
    await citizenSplash.open();
    await stepShot(page, 'splash');
    await citizenSplash.continueInEnglish();
    await expect(page).toHaveURL(/\/onboarding\/guest/);
    await expect(page.getByRole('heading', { name: /Need help now/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Request ambulance/i })).toBeVisible();
    await stepShot(page, 'guest');
    await citizenGuest.goToLogin();
    await expect(page).toHaveURL(/\/onboarding\/otp/);
    await expect(page.getByPlaceholder(/10-digit mobile/i)).toBeVisible();
    await stepShot(page, 'otp');
  });

  test('OTP login UI is present (Firebase phone — no WhatsApp)', async ({ page, stepShot }) => {
    await page.goto('/onboarding/otp');
    const privacy = page.getByRole('checkbox');
    if (await privacy.count()) {
      await privacy.check();
    }
    await expect(page.getByRole('button', { name: /Send OTP/i })).toBeVisible();
    await stepShot(page, 'otp-send');
  });
});
