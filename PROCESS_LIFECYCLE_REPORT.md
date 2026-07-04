# Process Lifecycle Report

Generated: 2026-07-04T21:56:22.557Z

## Session

| Field | Value |
|-------|-------|
| Session ID | 96cee5f3-c5e0-47a3-85f2-5654a68359e8 |
| Owner PID | 31140 |
| Reuse mode | no |

## Processes

| Service | PID | Started by | Stopped by | Started | Stopped |
|---------|-----|------------|------------|---------|---------|
| api | 15384 | ProcessManager.startManagedProcess | global-teardown.mjs | 2026-07-04T21:43:11.329Z | 2026-07-04T21:56:22.551Z |
| frontend | 29964 | ProcessManager.startManagedProcess | global-teardown.mjs | 2026-07-04T21:43:11.479Z | 2026-07-04T21:56:22.028Z |

## Startup order

- 2026-07-04T21:43:11.331Z: **api** (PID 15384) started by ProcessManager.startManagedProcess
- 2026-07-04T21:43:11.479Z: **frontend** (PID 29964) started by ProcessManager.startManagedProcess

## Shutdown order

- 2026-07-04T21:56:22.029Z: **frontend** (PID 29964) stopped by global-teardown.mjs
- 2026-07-04T21:56:22.551Z: **api** (PID 15384) stopped by global-teardown.mjs

## Readiness checks

- 2026-07-04T21:43:24.132Z: **api-live** ready in 12650ms (14 attempts) → http://127.0.0.1:3002/live
- 2026-07-04T21:43:24.856Z: **api-ready** ready in 721ms (1 attempts) → http://127.0.0.1:3002/ready
- 2026-07-04T21:43:25.613Z: **frontend** ready in 752ms (1 attempts) → http://127.0.0.1:8081

## Unexpected terminations

- None recorded in this session

## Full lifecycle log

```json
[
  {
    "at": "2026-07-04T21:43:11.331Z",
    "by": "ProcessManager",
    "event": "started",
    "sessionId": "96cee5f3-c5e0-47a3-85f2-5654a68359e8",
    "command": "npx tsx server/src/index.ts",
    "name": "api",
    "pid": 15384,
    "startedBy": "ProcessManager.startManagedProcess"
  },
  {
    "at": "2026-07-04T21:43:11.479Z",
    "by": "ProcessManager",
    "event": "started",
    "sessionId": "96cee5f3-c5e0-47a3-85f2-5654a68359e8",
    "command": "npx expo start --web --localhost --port 8081",
    "name": "frontend",
    "pid": 29964,
    "startedBy": "ProcessManager.startManagedProcess"
  },
  {
    "at": "2026-07-04T21:43:11.516Z",
    "by": "ProcessManager",
    "event": "ready-retry",
    "sessionId": "96cee5f3-c5e0-47a3-85f2-5654a68359e8",
    "attempts": 1,
    "error": "fetch failed",
    "name": "api-live",
    "url": "http://127.0.0.1:3002/live"
  },
  {
    "at": "2026-07-04T21:43:11.883Z",
    "by": "ProcessManager",
    "event": "ready-retry",
    "sessionId": "96cee5f3-c5e0-47a3-85f2-5654a68359e8",
    "attempts": 2,
    "error": "fetch failed",
    "name": "api-live",
    "url": "http://127.0.0.1:3002/live"
  },
  {
    "at": "2026-07-04T21:43:12.343Z",
    "by": "ProcessManager",
    "event": "ready-retry",
    "sessionId": "96cee5f3-c5e0-47a3-85f2-5654a68359e8",
    "attempts": 3,
    "error": "fetch failed",
    "name": "api-live",
    "url": "http://127.0.0.1:3002/live"
  },
  {
    "at": "2026-07-04T21:43:12.903Z",
    "by": "ProcessManager",
    "event": "ready-retry",
    "sessionId": "96cee5f3-c5e0-47a3-85f2-5654a68359e8",
    "attempts": 4,
    "error": "fetch failed",
    "name": "api-live",
    "url": "http://127.0.0.1:3002/live"
  },
  {
    "at": "2026-07-04T21:43:13.564Z",
    "by": "ProcessManager",
    "event": "ready-retry",
    "sessionId": "96cee5f3-c5e0-47a3-85f2-5654a68359e8",
    "attempts": 5,
    "error": "fetch failed",
    "name": "api-live",
    "url": "http://127.0.0.1:3002/live"
  },
  {
    "at": "2026-07-04T21:43:14.321Z",
    "by": "ProcessManager",
    "event": "ready-retry",
    "sessionId": "96cee5f3-c5e0-47a3-85f2-5654a68359e8",
    "attempts": 6,
    "error": "fetch failed",
    "name": "api-live",
    "url": "http://127.0.0.1:3002/live"
  },
  {
    "at": "2026-07-04T21:43:15.182Z",
    "by": "ProcessManager",
    "event": "ready-retry",
    "sessionId": "96cee5f3-c5e0-47a3-85f2-5654a68359e8",
    "attempts": 7,
    "error": "fetch failed",
    "name": "api-live",
    "url": "http://127.0.0.1:3002/live"
  },
  {
    "at": "2026-07-04T21:43:16.150Z",
    "by": "ProcessManager",
    "event": "ready-retry",
    "sessionId": "96cee5f3-c5e0-47a3-85f2-5654a68359e8",
    "attempts": 8,
    "error": "fetch failed",
    "name": "api-live",
    "url": "http://127.0.0.1:3002/live"
  },
  {
    "at": "2026-07-04T21:43:17.219Z",
    "by": "ProcessManager",
    "event": "ready-retry",
    "sessionId": "96cee5f3-c5e0-47a3-85f2-5654a68359e8",
    "attempts": 9,
    "error": "fetch failed",
    "name": "api-live",
    "url": "http://127.0.0.1:3002/live"
  },
  {
    "at": "2026-07-04T21:43:18.385Z",
    "by": "ProcessManager",
    "event": "ready-retry",
    "sessionId": "96cee5f3-c5e0-47a3-85f2-5654a68359e8",
    "attempts": 10,
    "error": "fetch failed",
    "name": "api-live",
    "url": "http://127.0.0.1:3002/live"
  },
  {
    "at": "2026-07-04T21:43:19.648Z",
    "by": "ProcessManager",
    "event": "ready-retry",
    "sessionId": "96cee5f3-c5e0-47a3-85f2-5654a68359e8",
    "attempts": 11,
    "error": "fetch failed",
    "name": "api-live",
    "url": "http://127.0.0.1:3002/live"
  },
  {
    "at": "2026-07-04T21:43:21.017Z",
    "by": "ProcessManager",
    "event": "ready-retry",
    "sessionId": "96cee5f3-c5e0-47a3-85f2-5654a68359e8",
    "attempts": 12,
    "error": "fetch failed",
    "name": "api-live",
    "url": "http://127.0.0.1:3002/live"
  },
  {
    "at": "2026-07-04T21:43:22.486Z",
    "by": "ProcessManager",
    "event": "ready-retry",
    "sessionId": "96cee5f3-c5e0-47a3-85f2-5654a68359e8",
    "attempts": 13,
    "error": "fetch failed",
    "name": "api-live",
    "url": "http://127.0.0.1:3002/live"
  },
  {
    "at": "2026-07-04T21:43:24.132Z",
    "by": "ProcessManager",
    "event": "ready",
    "sessionId": "96cee5f3-c5e0-47a3-85f2-5654a68359e8",
    "attempts": 14,
    "durationMs": 12650,
    "name": "api-live",
    "url": "http://127.0.0.1:3002/live"
  },
  {
    "at": "2026-07-04T21:43:24.856Z",
    "by": "ProcessManager",
    "event": "ready",
    "sessionId": "96cee5f3-c5e0-47a3-85f2-5654a68359e8",
    "attempts": 1,
    "durationMs": 721,
    "name": "api-ready",
    "url": "http://127.0.0.1:3002/ready"
  },
  {
    "at": "2026-07-04T21:43:25.613Z",
    "by": "ProcessManager",
    "event": "ready",
    "sessionId": "96cee5f3-c5e0-47a3-85f2-5654a68359e8",
    "attempts": 1,
    "durationMs": 752,
    "name": "frontend",
    "url": "http://127.0.0.1:8081"
  },
  {
    "at": "2026-07-04T21:56:21.587Z",
    "by": "ProcessManager",
    "event": "stop-requested",
    "sessionId": "96cee5f3-c5e0-47a3-85f2-5654a68359e8",
    "name": "frontend",
    "pid": 29964,
    "reason": "playwright-global-teardown",
    "stoppedBy": "global-teardown.mjs"
  },
  {
    "at": "2026-07-04T21:56:22.029Z",
    "by": "ProcessManager",
    "event": "stopped",
    "sessionId": "96cee5f3-c5e0-47a3-85f2-5654a68359e8",
    "name": "frontend",
    "pid": 29964,
    "reason": "playwright-global-teardown",
    "stoppedBy": "global-teardown.mjs"
  },
  {
    "at": "2026-07-04T21:56:22.031Z",
    "by": "ProcessManager",
    "event": "stop-requested",
    "sessionId": "96cee5f3-c5e0-47a3-85f2-5654a68359e8",
    "name": "api",
    "pid": 15384,
    "reason": "playwright-global-teardown",
    "stoppedBy": "global-teardown.mjs"
  },
  {
    "at": "2026-07-04T21:56:22.551Z",
    "by": "ProcessManager",
    "event": "stopped",
    "sessionId": "96cee5f3-c5e0-47a3-85f2-5654a68359e8",
    "name": "api",
    "pid": 15384,
    "reason": "playwright-global-teardown",
    "stoppedBy": "global-teardown.mjs"
  }
]
```
