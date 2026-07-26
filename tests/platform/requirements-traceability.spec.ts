import { test } from '../../fixtures/test';
import { coverRequirement, requirementsForApp } from '../../utils/req-coverage';

const reqs = requirementsForApp('Platform');

test.describe('Requirements Traceability — Platform / API', () => {
  for (const req of reqs) {
    test(`${req.id} — ${req.description}`, async ({ page, request }) => {
      test.info().annotations.push({ type: 'REQ', description: req.id });
      await coverRequirement(req, { page, request });
    });
  }
});
