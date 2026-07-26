import { test, expect } from '../../fixtures/test';
import { assertApiHealthy } from '../../utils/api';

test.describe('Platform API health', () => {
  test('GET /health reports postgres, redis, and AI platform', async ({ request, stepShot, page }) => {
    await assertApiHealthy(request);
    await page.goto('/health');
    await expect(page.locator('body')).toContainText(/"status"\s*:\s*"ok"/);
    await stepShot(page, 'api-health');
  });

  test('bed search returns seeded inventory', async ({ request }) => {
    const res = await request.get('/v1/citizen/beds/search');
    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    expect(Array.isArray(json.data)).toBeTruthy();
    expect(json.data.length).toBeGreaterThan(0);
  });
});
