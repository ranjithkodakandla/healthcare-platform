import { test as base, expect, Page } from '@playwright/test';
import { env, hasAdminCreds, hasProviderCreds } from '../utils/env';
import { CitizenSplashPage } from '../pages/citizen/SplashPage';
import { CitizenGuestPage } from '../pages/citizen/GuestPage';
import { CitizenTriagePage } from '../pages/citizen/TriagePage';
import { CitizenSearchPage } from '../pages/citizen/SearchPages';
import { ProviderLoginPage } from '../pages/provider/LoginPage';
import { ProviderShellPage } from '../pages/provider/ShellPage';
import { AdminLoginPage } from '../pages/admin/LoginPage';
import { AdminShellPage } from '../pages/admin/ShellPage';

type Fixtures = {
  citizenSplash: CitizenSplashPage;
  citizenGuest: CitizenGuestPage;
  citizenTriage: CitizenTriagePage;
  citizenSearch: CitizenSearchPage;
  providerLogin: ProviderLoginPage;
  providerShell: ProviderShellPage;
  adminLogin: AdminLoginPage;
  adminShell: AdminShellPage;
  stepShot: (page: Page, name: string) => Promise<void>;
};

export const test = base.extend<Fixtures>({
  citizenSplash: async ({ page }, use) => use(new CitizenSplashPage(page)),
  citizenGuest: async ({ page }, use) => use(new CitizenGuestPage(page)),
  citizenTriage: async ({ page }, use) => use(new CitizenTriagePage(page)),
  citizenSearch: async ({ page }, use) => use(new CitizenSearchPage(page)),
  providerLogin: async ({ page }, use) => use(new ProviderLoginPage(page)),
  providerShell: async ({ page }, use) => use(new ProviderShellPage(page)),
  adminLogin: async ({ page }, use) => use(new AdminLoginPage(page)),
  adminShell: async ({ page }, use) => use(new AdminShellPage(page)),
  stepShot: async ({}, use, testInfo) => {
    await use(async (page, name) => {
      const safe = name.replace(/[^\w.-]+/g, '_');
      await page.screenshot({
        path: testInfo.outputPath(`step-${safe}.png`),
        fullPage: true,
      });
    });
  },
});

export { expect, env, hasAdminCreds, hasProviderCreds };
