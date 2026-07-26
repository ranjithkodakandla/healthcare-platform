import { test } from '../../fixtures/test';
import { coverRequirement, requirementsForApp } from '../../utils/req-coverage';

const reqs = requirementsForApp('Citizen');

test.describe('Requirements Traceability — Citizen', () => {
  for (const req of reqs) {
    test(`${req.id} — ${req.description}`, async ({ page, request }) => {
      test.info().annotations.push({ type: 'REQ', description: req.id });
      test.info().annotations.push({
        type: 'FR',
        description: (req.fr ?? []).join(','),
      });
      await coverRequirement(req, { page, request });
    });
  }
});
