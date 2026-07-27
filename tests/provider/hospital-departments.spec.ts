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

test.describe('Hospital Case Management (real data + walk-in case)', () => {
  test('shows real cases from the API and adds a walk-in case', async ({ page }) => {
    let cases: Array<{ caseId: string; caseNumber: string; severity: string; status: string; holdId: string; category: string; holdStatus: string; heldAt: string }> = [];

    await page.route('**/v1/providers/e2e-hospital/cases', async (route) => {
      await route.fulfill({ json: { data: cases, meta: { count: cases.length } } });
    });
    await page.route('**/v1/providers/e2e-hospital/cases/walk-in', async (route) => {
      const body = route.request().postDataJSON();
      const created = {
        caseId: 'c1',
        caseNumber: 'HCC-2026-0000001',
        severity: body.severity,
        status: 'INITIATED',
        holdId: 'h1',
        category: body.category,
        holdStatus: 'PENDING',
        heldAt: new Date().toISOString(),
      };
      cases = [...cases, created];
      await route.fulfill({ json: { data: { case: { id: 'c1', caseNumber: created.caseNumber }, hold: { id: 'h1' } }, meta: {} } });
    });
    await page.route('**/v1/providers/e2e-hospital/cases/c1/timeline', async (route) => {
      await route.fulfill({ json: { data: [{ id: 'evt-1', type: 'CASE_CREATED', payload: {}, createdAt: new Date().toISOString() }] } });
    });

    await page.goto('/login');
    await page.evaluate(injectHospitalSession);
    await page.goto('/hospital/cases');

    await expect(page.getByText(/No cases held at this hospital yet/i)).toBeVisible();

    await page.getByRole('button', { name: '+ Add walk-in case' }).click();
    await page.getByLabel('Patient name (optional)').fill('Walk-in Patient');
    await page.getByRole('button', { name: /^Add walk-in case$/ }).click();

    await expect(page.getByRole('button', { name: /HCC-2026-0000001/ })).toBeVisible();
    await expect(page.getByText(/No cases held at this hospital yet/i)).not.toBeVisible();
    await expect(page.getByText('CASE_CREATED')).toBeVisible();
  });
});
