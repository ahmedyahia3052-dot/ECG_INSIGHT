# Process Lifecycle Report

Generated: 2026-07-06T19:26:04.461Z

## Session

| Field | Value |
|-------|-------|
| Session ID | ec583acc-ee81-4b58-b8af-3c1a9374994f |
| Owner PID | 24408 |
| Reuse mode | yes |

## Processes

| Service | PID | Started by | Stopped by | Started | Stopped |
|---------|-----|------------|------------|---------|---------|
| none | - | - | - | - | - |

## Startup order

- none

## Shutdown order

- none

## Readiness checks

- 2026-07-06T19:26:04.293Z: **api-live** ready in 65ms (1 attempts) → http://127.0.0.1:3002/live
- 2026-07-06T19:26:04.337Z: **api-ready** ready in 37ms (1 attempts) → http://127.0.0.1:3002/ready
- 2026-07-06T19:26:04.453Z: **frontend** ready in 111ms (1 attempts) → http://127.0.0.1:8081

## Unexpected terminations

- None recorded in this session

## Full lifecycle log

```json
[
  {
    "at": "2026-07-06T19:26:04.293Z",
    "by": "ProcessManager",
    "event": "ready",
    "sessionId": "ec583acc-ee81-4b58-b8af-3c1a9374994f",
    "attempts": 1,
    "durationMs": 65,
    "name": "api-live",
    "url": "http://127.0.0.1:3002/live"
  },
  {
    "at": "2026-07-06T19:26:04.337Z",
    "by": "ProcessManager",
    "event": "ready",
    "sessionId": "ec583acc-ee81-4b58-b8af-3c1a9374994f",
    "attempts": 1,
    "durationMs": 37,
    "name": "api-ready",
    "url": "http://127.0.0.1:3002/ready"
  },
  {
    "at": "2026-07-06T19:26:04.453Z",
    "by": "ProcessManager",
    "event": "ready",
    "sessionId": "ec583acc-ee81-4b58-b8af-3c1a9374994f",
    "attempts": 1,
    "durationMs": 111,
    "name": "frontend",
    "url": "http://127.0.0.1:8081"
  }
]
```
