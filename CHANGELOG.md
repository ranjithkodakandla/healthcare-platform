# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Enterprise GitHub Actions CI/CD (reusable quality workflow, CodeQL, Cloud Run deploy).
- Community files: `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, issue/PR templates.
- Local CI runner (`npm run ci:local`), secret scan, bundle budgets, `DEVOPS.md`, `CI_CD_REPORT.md`.
- Requirements Traceability Matrix (REQ-001…090) and Playwright coverage reports.
- DPDP privacy module, responsive shells, UX persona fixes (Sessions 29–33).

### Security

- Dependency audit gate (fail on High/Critical).
- Secret scanning in CI; CodeQL workflow for javascript-typescript.

## [0.1.0] - 2026-07-26

### Added

- Initial monorepo: NestJS API, Citizen / Provider / Admin Next.js apps, shared-constants.
- GCP Terraform `dev` stack and Cloud Run hosting.
- Playwright E2E suite (citizen, provider, admin, platform, a11y).
