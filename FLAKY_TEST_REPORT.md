# Flaky Test Report — Sprint 46.1

## Root Causes Identified (RC-1 / prior runs)

| ID | Cause | Symptom |
|----|-------|---------|
| FLK-001 | Parallel Playwright workers on shared API | Stream timeouts, 401 mid-test |
| FLK-002 | Session/cookie leakage between tests | Dashboard visible when login expected |
| FLK-003 | IndexedDB persistence | Workspace state carry-over |
| FLK-004 | Arbitrary `waitForTimeout` | Race conditions masked, intermittent passes |
| FLK-005 | Sequential suite reuse without process isolation | Memory growth, hung workers |

## Remediation Applied

### Infrastructure (no spec changes required for core fix)

1. **Sequential suite runner** — each suite = new Playwright process
2. **Per-test session destroy** — cookies + all browser storage cleared
3. **Network monitor** — fail on HTTP 5xx, attach slow/failed request logs
4. **Explicit waits** in shared helpers (`qa.ts`)

### Helper-Level `waitForTimeout` Replacements

| File | Before | After |
|------|--------|-------|
| `tests/e2e/utils/qa.ts` `uiLogin` | `waitForTimeout(1000 * attempt)` | `expect.poll` for login screen |
| `tests/e2e/utils/qa.ts` `gotoLogin` | `waitForTimeout(1000 * attempt)` | `expect.poll` backoff |

### Remaining `waitForTimeout` (documented, low priority)

| File | Lines | Context | Risk |
|------|-------|---------|------|
| `sprint23-visual-inspector-ai.spec.ts` | 41, 87 | Canvas render settle | Medium — visual timing |
| `copilot-conversational-v2.spec.ts` | 76 | Stream retry backoff | Medium — copilot SSE |

These are spec-local and not modified in 46.1 (infrastructure-only scope). Future sprint can replace with `waitForRuntimeEvent` / `expect.poll` on stable DOM.

## Race Conditions Removed

- **Auth reset → login**: now polls `auth-login-screen` visibility
- **Platform ready**: `assertPlatformReady` + `waitForApiRecovery` with exponential backoff (network helper)
- **Post-test cleanup**: synchronous destroy prevents next test inheriting open page state

## Timeout-Based Assertions

Replaced with:
- `expect(...).toBeVisible({ timeout })` — Playwright auto-wait
- `expect.poll(...)` — stable state polling
- `page.waitForURL(...)` — navigation-bound waits

## Quality Gate Philosophy

`retries: 0` in Playwright config — flaky tests must fail visibly so infrastructure fixes are validated, not hidden.

## Pre-Existing Non-Flaky Failure

`scripts/sprint21-ecg-workstation-ux-revolution.integration.ts` — marker drift (`monitor glow + beat markers`). This is a **static integration marker** failure, not timing-related. Out of scope for 46.1.
