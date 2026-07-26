import type { INestApplication } from '@nestjs/common';
import helmet from 'helmet';

/** Baseline OWASP-friendly HTTP headers for Cloud Run / browser clients. */
export function applyHttpSecurity(app: INestApplication): void {
  app.use(
    helmet({
      // Frontends are on separate origins; CSP for API JSON responses is not useful.
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
}
