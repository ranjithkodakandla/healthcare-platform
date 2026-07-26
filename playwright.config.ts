import { defineConfig, devices } from '@playwright/test';
import path from 'path';

const DEMO = process.env.E2E_DEMO === '1' || process.env.E2E_DEMO === 'true';
const BASE_CITIZEN =
  process.env.E2E_CITIZEN_URL ?? 'https://sahayak-dev-citizen-j2iqu7nnqq-el.a.run.app';
const BASE_PROVIDER =
  process.env.E2E_PROVIDER_URL ?? 'https://sahayak-dev-provider-j2iqu7nnqq-el.a.run.app';
const BASE_ADMIN = process.env.E2E_ADMIN_URL ?? 'https://sahayak-dev-admin-j2iqu7nnqq-el.a.run.app';
const BASE_API = process.env.E2E_API_URL ?? 'https://sahayak-dev-api-j2iqu7nnqq-el.a.run.app';

export default defineConfig({
  testDir: './tests',
  fullyParallel: !DEMO,
  forbidOnly: !!process.env.CI,
  retries: DEMO ? 0 : process.env.CI ? 2 : 1,
  // Single worker on CI avoids Cloud Run cold-start races across parallel browsers.
  workers: DEMO ? 1 : process.env.CI ? 1 : undefined,
  timeout: DEMO ? 180_000 : 90_000,
  expect: { timeout: DEMO ? 20_000 : 12_000 },
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results/results.json' }],
  ],
  outputDir: 'test-results',
  use: {
    trace: 'on',
    screenshot: 'on',
    video: 'on',
    actionTimeout: DEMO ? 20_000 : 15_000,
    navigationTimeout: 45_000,
    locale: 'en-IN',
    timezoneId: 'Asia/Kolkata',
    ...(DEMO
      ? {
          launchOptions: { slowMo: 450 },
        }
      : {}),
  },
  projects: [
    {
      name: 'citizen',
      testMatch: /tests\/citizen\/.*\.spec\.ts/,
      use: {
        ...devices['Pixel 7'],
        baseURL: BASE_CITIZEN,
        geolocation: { latitude: 12.9716, longitude: 77.5946 },
        permissions: ['geolocation'],
      },
    },
    {
      name: 'provider',
      testMatch: /tests\/provider\/.*\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
        baseURL: BASE_PROVIDER,
      },
    },
    {
      name: 'admin',
      testMatch: /tests\/admin\/.*\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
        baseURL: BASE_ADMIN,
      },
    },
    {
      name: 'platform',
      testMatch: /tests\/platform\/.*\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        baseURL: BASE_API,
      },
    },
    {
      name: 'a11y',
      testMatch: /tests\/a11y\/.*\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: 'demo',
      testMatch: /tests\/demo\/.*\.spec\.ts/,
      retries: 0,
      workers: 1,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
        launchOptions: { slowMo: 550 },
        video: 'on',
        trace: 'on',
        screenshot: 'on',
      },
    },
  ],
  metadata: {
    product: 'Sahayak / Rakshak Healthcare Coordination Platform',
    api: BASE_API,
    citizen: BASE_CITIZEN,
    provider: BASE_PROVIDER,
    admin: BASE_ADMIN,
    excludes: ['WhatsApp', 'IVR/SMS outbound accounts'],
  },
});

export const e2ePaths = {
  root: path.resolve(__dirname),
  artifacts: path.resolve(__dirname, 'test-results'),
  report: path.resolve(__dirname, 'playwright-report'),
  demoOut: path.resolve(__dirname, 'Rakshak-Demo.mp4'),
};
