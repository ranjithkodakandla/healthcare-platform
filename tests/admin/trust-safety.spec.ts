import { test, expect, hasAdminCreds, env } from '../../fixtures/test';

/**
 * Wave A — behavioral admin checks (not smoke).
 * Real-login cases skip when E2E_ADMIN_PASSWORD is unset.
 */

async function injectMockSession(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page.evaluate(() => {
    localStorage.setItem('admin_token', 'e2e-mock-token');
    localStorage.setItem(
      'admin_profile',
      JSON.stringify({
        uid: 'e2e',
        email: 'e2e@sahayak.test',
        displayName: 'E2E Admin',
        roleLabel: 'Console Administrator',
      }),
    );
  });
}

test.describe('Admin trust & safety (Wave A)', () => {
  test('sidebar shows Sign out and session identity from profile', async ({ page }) => {
    await injectMockSession(page);
    await page.goto('/dashboard');
    await expect(page.getByRole('button', { name: /^Sign out$/i })).toBeVisible();
    await expect(page.getByText('E2E Admin')).toBeVisible();
  });

  test('ticket detail without id is not an infinite loader', async ({ page }) => {
    await injectMockSession(page);
    await page.goto('/support/tickets/detail');
    await expect(page.getByText(/Select a ticket from the queue/i)).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/Loading ticket/i)).toHaveCount(0);
  });

  test.describe('authenticated flows', () => {
    test.skip(!hasAdminCreds(), 'Set E2E_ADMIN_EMAIL + E2E_ADMIN_PASSWORD');

    test.beforeEach(async ({ adminLogin, page }) => {
      await adminLogin.open();
      await adminLogin.login(env.adminEmail, env.adminPassword);
      await page.waitForURL(/\/dashboard/, { timeout: 60_000 });
    });

    test('real login shows authenticated display name', async ({ page }) => {
      const expected = env.adminEmail
        .split('@')[0]
        .replace(/[._-]+/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());
      await expect(page.getByText(new RegExp(`Ranjith|${expected}`, 'i')).first()).toBeVisible({
        timeout: 20_000,
      });
      await expect(page.getByRole('button', { name: /^Sign out$/i })).toBeVisible();
    });

    test('invite form rejects malformed email before create', async ({ page }) => {
      await page.goto('/users');
      await page.getByRole('button', { name: /Invite staff member/i }).click();
      await expect(page.locator('#invite-email')).toBeVisible({ timeout: 15_000 });
      await page.locator('#invite-email').fill('not-an-email');
      await page.getByRole('button', { name: /^Send invite$/i }).click();
      await expect(page.getByText(/Enter a valid email address/i)).toBeVisible();
      await expect(page.locator('#invite-email')).toBeVisible();
    });

    test('invalid ticket id shows Ticket not found (not raw 500)', async ({ page }) => {
      await page.goto('/support/tickets/detail?id=nonexistent-id-123');
      await expect(page.getByText(/Ticket not found/i)).toBeVisible({ timeout: 30_000 });
      await expect(page.locator('body')).not.toContainText(/Internal server error/i);
      await expect(page.locator('body')).not.toContainText(/GET \/v1\/admin\/support\/tickets/i);
    });

    test('Sign out clears session and returns to login', async ({ page }) => {
      await page.getByRole('button', { name: /^Sign out$/i }).click();
      await page.waitForURL(/\/login/, { timeout: 30_000 });
      await expect(page.getByRole('heading', { name: /Admin Console/i })).toBeVisible();
      const token = await page.evaluate(() => localStorage.getItem('admin_token'));
      expect(token).toBeNull();
    });
  });
});
