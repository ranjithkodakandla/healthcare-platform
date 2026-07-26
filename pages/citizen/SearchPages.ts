import { expect } from '@playwright/test';
import { BasePage } from '../BasePage';

export class CitizenSearchPage extends BasePage {
  async openHub(): Promise<void> {
    await this.goto('/search');
  }

  async openBeds(): Promise<void> {
    await this.goto('/search/beds');
    await expect(this.page.locator('body')).toContainText(/bed|ICU|General|hospital/i);
  }

  async openHospitals(): Promise<void> {
    await this.goto('/search/hospitals');
  }

  async openBloodBank(): Promise<void> {
    await this.goto('/search/blood-bank');
  }

  async openDiagnostics(): Promise<void> {
    await this.goto('/search/diagnostics');
  }

  async openDoctors(): Promise<void> {
    await this.goto('/search/doctors');
  }

  async openPharmacy(): Promise<void> {
    await this.goto('/search/pharmacy');
  }

  async openInsurance(): Promise<void> {
    await this.goto('/search/insurance');
  }

  async openCancer(): Promise<void> {
    await this.goto('/search/cancer');
  }
}
