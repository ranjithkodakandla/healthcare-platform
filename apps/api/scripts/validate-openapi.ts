import SwaggerParser from '@apidevtools/swagger-parser';
import { join } from 'path';

// M21 contract-test gate, minimal viable form: structural validation that the
// generated spec is a well-formed OpenAPI document. Full Prism-based request/response
// contract testing is deferred until real citizen/provider-facing endpoints exist
// (Phase 4/5) — Admin's endpoints are the first real ones, so this is the first
// non-no-op version of this gate.
async function main() {
  const specPath = join(__dirname, '..', 'openapi.json');
  await SwaggerParser.validate(specPath);
  // eslint-disable-next-line no-console
  console.log(`${specPath} is a valid OpenAPI document.`);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('OpenAPI validation failed:', err);
  process.exit(1);
});
