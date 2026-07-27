import { test, expect } from '../../fixtures/test';

// Regression coverage for the Hospital in-house sub-unit management feature:
// a Hospital admin previously had zero reach into Doctor/Ambulance/Pharmacy/Blood
// Bank/Diagnostic data (those were modeled as fully independent provider orgs, no
// relationship to the hospital). Doctors is used here as the representative CRUD
// flow — Ambulances/Pharmacy/Blood Bank/Diagnostics share the same
// Dialog-add/list/delete pattern (see IMPLEMENTATION_MASTER_PLAN.md session log).
//
// Mocks the API layer via route interception (no live DB in this environment) —
// this verifies the frontend CRUD wiring (add opens a real request, list re-fetches
// and reflects it, delete removes it), not backend persistence, which is covered
// separately by apps/api/src/providers/provider-doctor.service.spec.ts.

function injectHospitalSession() {
  localStorage.setItem('provider_hospital_id', 'e2e-hospital');
  localStorage.setItem('provider_token', 'e2e-mock-token');
  localStorage.setItem('provider_role', 'PROVIDER_STAFF');
  localStorage.setItem('provider_type', 'HOSPITAL');
}

test.describe('Hospital in-house Doctors CRUD', () => {
  test('add, view, and delete an in-house doctor', async ({ page }) => {
    let doctors: Array<{ id: string; name: string; specialty: string; isTeleconsult: boolean; city: string | null }> = [];

    await page.route('**/v1/providers/e2e-hospital/doctors', async (route) => {
      const req = route.request();
      if (req.method() === 'GET') {
        await route.fulfill({ json: { data: doctors, meta: { count: doctors.length } } });
      } else if (req.method() === 'POST') {
        const body = req.postDataJSON();
        const created = { id: 'd1', name: body.name, specialty: body.specialty, isTeleconsult: !!body.isTeleconsult, city: body.city || null };
        doctors = [...doctors, created];
        await route.fulfill({ json: { data: created, meta: {} } });
      } else {
        await route.continue();
      }
    });
    await page.route('**/v1/providers/e2e-hospital/doctors/d1', async (route) => {
      if (route.request().method() === 'DELETE') {
        doctors = doctors.filter((d) => d.id !== 'd1');
        await route.fulfill({ json: { data: { doctorId: 'd1', removed: true }, meta: {} } });
      } else {
        await route.continue();
      }
    });

    await page.goto('/login');
    await page.evaluate(injectHospitalSession);
    await page.goto('/hospital/doctors');

    await expect(page.getByText(/No doctors added yet/i)).toBeVisible();

    await page.getByRole('button', { name: '+ Add doctor' }).click();
    await page.getByLabel('Full name').fill('Anita Rao');
    await page.getByRole('button', { name: /^Add doctor$/ }).click();

    await expect(page.getByText('Dr. Anita Rao')).toBeVisible();
    await expect(page.getByText(/No doctors added yet/i)).not.toBeVisible();

    page.once('dialog', (d) => d.accept());
    await page.getByRole('button', { name: 'Delete' }).click();

    await expect(page.getByText(/No doctors added yet/i)).toBeVisible();
  });
});
