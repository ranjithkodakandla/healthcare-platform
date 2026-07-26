import { test } from '../../fixtures/test';
import { coverRequirement, requirementsForApp } from '../../utils/req-coverage';

const reqs = requirementsForApp('Provider');

test.describe('Requirements Traceability — Provider', () => {
  for (const req of reqs) {
    test(`${req.id} — ${req.description}`, async ({ page, request }) => {
      test.info().annotations.push({ type: 'REQ', description: req.id });
      await coverRequirement(req, { page, request });
    });
  }
});
