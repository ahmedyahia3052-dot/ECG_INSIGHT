# Integration Test Report

**Generated:** 2026-07-07

## Pipeline

| Metric | Value |
|--------|-------|
| Integration scripts | **96** |
| Entry point | `scripts/run-integration-suite.mjs` |
| Command | `npm test` |

## Domain Coverage

| Domain | Covered | Sample Scripts |
|--------|---------|----------------|
| API | ✓ | `patient-case-management`, `enterprise-auth` |
| Medical Intelligence Core | ✓ | `medical-intelligence-engine.integration.ts`, copilot scripts |
| ECG Analysis | ✓ | `ecg-digitization`, `ecg-interpretation-sprint62` |
| Measurement Engine | ✓ | `sprint15-clinical-measurement-engine` |
| Viewer | ✓ | `ecg-workspace-restoration`, sprint viewer scripts |
| Report Engine | ✓ | `ecg-medical-report-system.integration.ts` |
| Authentication | ✓ | `auth-session-hardening`, `enterprise-auth` |
| Database | ✓ | `patient-case-management`, dashboard lockdown |
| Caching | ✓ | `copilot-stabilization`, runtime recovery |
| Session | ✓ | `auth-session-hardening`, `auth-production-stabilization` |

**Domain coverage: 10/10 (100%)**

## Audit

```bash
node scripts/qa/audit-integration-coverage.mjs
```

Output: `test-results/qa-artifacts/integration-coverage.json`

## SAT Independence

Integration scripts validate **markers and API contracts** only. No production UI or workflow logic was modified for this infrastructure task.

## Validation Status

Full integration suite validated in prior regression stabilization run (`npm test` exit 0). Re-run before release:

```bash
npm test
```

Expected duration: ~15–90 minutes depending on LLM/Ollama availability.
