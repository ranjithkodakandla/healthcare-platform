# Security Policy

## Supported versions

| Version / branch      | Supported                |
| --------------------- | ------------------------ |
| `main`                | Yes                      |
| `develop`             | Security fixes accepted  |
| Release tags `v*.*.*` | Yes while marked current |

## Reporting a vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

1. Use [GitHub Security Advisories](https://github.com/ranjithkodakandla/healthcare-platform/security/advisories/new) for private disclosure, **or**
2. Email the maintainers listed on the repository (subject: `SECURITY: Sahayak`).

Include:

- Description and impact
- Reproduction steps / PoC (non-destructive)
- Affected component (`apps/api`, citizen, provider, admin, infra)
- Whether patient/PII data is involved (DPDP relevance)

We aim to acknowledge within **72 hours** and provide a remediation plan within **14 days** for High/Critical issues.

## Secrets & credentials

- Never commit `.env`, service-account JSON, API keys, or tokens.
- Use GitHub Actions secrets / GCP Secret Manager for deploy-time credentials.
- Rotate any key that may have been exposed (including NVIDIA NIM keys).

## Dependency & static security

CI enforces:

- `npm run audit:deps` (fail on High/Critical)
- CodeQL (`codeql.yml`)
- Repository secret scan (`npm run secrets:scan` + Gitleaks)
- GitHub Dependabot / secret scanning (enable in repository settings)

## Healthcare data

This platform processes health-related personal data. Follow `PRIVACY_COMPLIANCE_REPORT.md`, `DATA_FLOW.md`, and `DATA_INVENTORY.md`. Production launch remains **CONDITIONAL** until PRIV-H1–H3 are closed (see Decision Log DL-011).
