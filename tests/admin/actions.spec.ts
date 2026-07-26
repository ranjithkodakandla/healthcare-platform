import { test, expect, hasAdminCreds, env } from '../../fixtures/test';

/**
 * Behavioral admin action checks (Wave B/C).
 * Skips authenticated cases when E2E_ADMIN_PASSWORD is unset.
 */

test.describe('Admin action honesty', () => {
  test('remote assist primary actions are disabled with notice', async ({ page }) => {
    await page.goto('/login');
    await page.evaluate(() => {
      localStorage.setItem('admin_token', 'e2e-mock-token');
      localStorage.setItem(
        'admin_profile',
        JSON.stringify({
          uid: 'e2e',
          email: 'e2e@sahyak.test',
          displayName: 'E2E Admin',
          roleLabel: 'Console Administrator',
        }),
      );
    });
    await page.goto('/support/remote-assist');
    await expect(page.getByText(/not available yet/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Send guidance message/i })).toBeDisabled();
    await expect(page.getByRole('button', { name: /End session/i })).toBeDisabled();
  });
});

test.describe('Admin authenticated actions', () => {
  test.skip(!hasAdminCreds(), 'Set E2E_ADMIN_EMAIL + E2E_ADMIN_PASSWORD');

  test.beforeEach(async ({ adminLogin, page }) => {
    await adminLogin.open();
    await adminLogin.login(env.adminEmail, env.adminPassword);
    await page.waitForURL(/\/dashboard/, { timeout: 60_000 });
  });

  test('New ticket opens a form instead of fabricating a placeholder', async ({ page }) => {
    await page.goto('/support/tickets');
    await page.getByRole('button', { name: /New ticket/i }).click();
    await expect(page.getByText(/Create support ticket/i)).toBeVisible();
    await expect(page.locator('#tkt-subject')).toBeVisible();
    // Must not instantly create a "New ticket from Admin Console" row
    await expect(page.getByText('New ticket from Admin Console')).toHaveCount(0);
  });

  test('provider search lists registry orgs', async ({ page }) => {
    await page.goto('/providers');
    await expect(page.getByRole('heading', { name: 'Providers', exact: true })).toBeVisible({
      timeout: 20_000,
    });
    await page.getByLabel(/Search providers/i).fill('Apollo');
    await page.getByRole('button', { name: /^Search$/i }).click();
    await expect(page.getByText(/Apollo|hosp-/i).first()).toBeVisible({ timeout: 30_000 });
  });

  test('communications Send shows success status (not silent clear)', async ({ page }) => {
    await page.goto('/communications');
    const title = `E2E broadcast ${Date.now()}`;
    await page.getByPlaceholder('Broadcast title').fill(title);
    await page.getByPlaceholder('Message').fill('Wave B honesty check');
    await page.getByRole('button', { name: /^Send$/i }).click();
    await expect(page.getByRole('status')).toContainText(/Broadcast recorded|Draft saved/i, {
      timeout: 30_000,
    });
    await expect(page.getByText(title)).toBeVisible({ timeout: 15_000 });
  });

  test('P0 G3 citizen onboarding shows resolve actions', async ({ page }) => {
    await page.goto('/onboarding/citizen');
    await expect(page.getByText(/Clear flag|Merge accounts|Dismiss as false positive/i).first()).toBeVisible({
      timeout: 30_000,
    });
  });

  test('P0 G5 ticket detail requires case access justification', async ({ page }) => {
    await page.goto('/support/tickets');
    await page.locator('a[href*="/support/tickets/"]').first().click({ timeout: 20_000 });
    await expect(page.getByText(/Case access \(G5\)/i)).toBeVisible({ timeout: 30_000 });
  });

  test('P0 G9 users page exposes Manage controls', async ({ page }) => {
    await page.goto('/users');
    await expect(page.getByRole('button', { name: /^Manage$/i }).first()).toBeVisible({
      timeout: 30_000,
    });
  });
});
