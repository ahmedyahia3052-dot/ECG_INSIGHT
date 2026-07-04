# Process Lifecycle Report

Generated: 2026-07-04T12:36:01.219Z

## Session

| Field | Value |
|-------|-------|
| Session ID | 413ac4fd-3159-49c8-9c7e-1aa92aac17fc |
| Owner PID | 18784 |
| Reuse mode | no |

## Processes

| Service | PID | Started by | Stopped by | Started | Stopped |
|---------|-----|------------|------------|---------|---------|
| api | 31672 | ProcessManager.startManagedProcess | running | 2026-07-04T12:35:47.501Z | - |
| frontend | 26572 | ProcessManager.startManagedProcess | running | 2026-07-04T12:35:47.606Z | - |

## Startup order

- 2026-07-04T12:35:47.502Z: **api** (PID 31672) started by ProcessManager.startManagedProcess
- 2026-07-04T12:35:47.606Z: **frontend** (PID 26572) started by ProcessManager.startManagedProcess

## Shutdown order

- none

## Readiness checks

- 2026-07-04T12:36:00.293Z: **api-live** ready in 12685ms (14 attempts) → http://127.0.0.1:3002/live
- 2026-07-04T12:36:00.785Z: **api-ready** ready in 481ms (1 attempts) → http://127.0.0.1:3002/ready
- 2026-07-04T12:36:01.197Z: **frontend** ready in 409ms (1 attempts) → http://127.0.0.1:8081

## Unexpected terminations

- None recorded in this session

## Full lifecycle log

```json
[
  {
    "at": "2026-07-04T12:35:47.502Z",
    "by": "ProcessManager",
    "event": "started",
    "sessionId": "413ac4fd-3159-49c8-9c7e-1aa92aac17fc",
    "command": "npx tsx server/src/index.ts",
    "name": "api",
    "pid": 31672,
    "startedBy": "ProcessManager.startManagedProcess"
  },
  {
    "at": "2026-07-04T12:35:47.606Z",
    "by": "ProcessManager",
    "event": "started",
    "sessionId": "413ac4fd-3159-49c8-9c7e-1aa92aac17fc",
    "command": "npx expo start --web --localhost --port 8081",
    "name": "frontend",
    "pid": 26572,
    "startedBy": "ProcessManager.startManagedProcess"
  },
  {
    "at": "2026-07-04T12:35:47.634Z",
    "by": "ProcessManager",
    "event": "ready-retry",
    "sessionId": "413ac4fd-3159-49c8-9c7e-1aa92aac17fc",
    "attempts": 1,
    "error": "fetch failed",
    "name": "api-live",
    "url": "http://127.0.0.1:3002/live"
  },
  {
    "at": "2026-07-04T12:35:47.997Z",
    "by": "ProcessManager",
    "event": "ready-retry",
    "sessionId": "413ac4fd-3159-49c8-9c7e-1aa92aac17fc",
    "attempts": 2,
    "error": "fetch failed",
    "name": "api-live",
    "url": "http://127.0.0.1:3002/live"
  },
  {
    "at": "2026-07-04T12:35:48.465Z",
    "by": "ProcessManager",
    "event": "ready-retry",
    "sessionId": "413ac4fd-3159-49c8-9c7e-1aa92aac17fc",
    "attempts": 3,
    "error": "fetch failed",
    "name": "api-live",
    "url": "http://127.0.0.1:3002/live"
  },
  {
    "at": "2026-07-04T12:35:49.038Z",
    "by": "ProcessManager",
    "event": "ready-retry",
    "sessionId": "413ac4fd-3159-49c8-9c7e-1aa92aac17fc",
    "attempts": 4,
    "error": "fetch failed",
    "name": "api-live",
    "url": "http://127.0.0.1:3002/live"
  },
  {
    "at": "2026-07-04T12:35:49.701Z",
    "by": "ProcessManager",
    "event": "ready-retry",
    "sessionId": "413ac4fd-3159-49c8-9c7e-1aa92aac17fc",
    "attempts": 5,
    "error": "fetch failed",
    "name": "api-live",
    "url": "http://127.0.0.1:3002/live"
  },
  {
    "at": "2026-07-04T12:35:50.468Z",
    "by": "ProcessManager",
    "event": "ready-retry",
    "sessionId": "413ac4fd-3159-49c8-9c7e-1aa92aac17fc",
    "attempts": 6,
    "error": "fetch failed",
    "name": "api-live",
    "url": "http://127.0.0.1:3002/live"
  },
  {
    "at": "2026-07-04T12:35:51.331Z",
    "by": "ProcessManager",
    "event": "ready-retry",
    "sessionId": "413ac4fd-3159-49c8-9c7e-1aa92aac17fc",
    "attempts": 7,
    "error": "fetch failed",
    "name": "api-live",
    "url": "http://127.0.0.1:3002/live"
  },
  {
    "at": "2026-07-04T12:35:52.301Z",
    "by": "ProcessManager",
    "event": "ready-retry",
    "sessionId": "413ac4fd-3159-49c8-9c7e-1aa92aac17fc",
    "attempts": 8,
    "error": "fetch failed",
    "name": "api-live",
    "url": "http://127.0.0.1:3002/live"
  },
  {
    "at": "2026-07-04T12:35:53.364Z",
    "by": "ProcessManager",
    "event": "ready-retry",
    "sessionId": "413ac4fd-3159-49c8-9c7e-1aa92aac17fc",
    "attempts": 9,
    "error": "fetch failed",
    "name": "api-live",
    "url": "http://127.0.0.1:3002/live"
  },
  {
    "at": "2026-07-04T12:35:54.539Z",
    "by": "ProcessManager",
    "event": "ready-retry",
    "sessionId": "413ac4fd-3159-49c8-9c7e-1aa92aac17fc",
    "attempts": 10,
    "error": "fetch failed",
    "name": "api-live",
    "url": "http://127.0.0.1:3002/live"
  },
  {
    "at": "2026-07-04T12:35:55.816Z",
    "by": "ProcessManager",
    "event": "ready-retry",
    "sessionId": "413ac4fd-3159-49c8-9c7e-1aa92aac17fc",
    "attempts": 11,
    "error": "fetch failed",
    "name": "api-live",
    "url": "http://127.0.0.1:3002/live"
  },
  {
    "at": "2026-07-04T12:35:57.183Z",
    "by": "ProcessManager",
    "event": "ready-retry",
    "sessionId": "413ac4fd-3159-49c8-9c7e-1aa92aac17fc",
    "attempts": 12,
    "error": "fetch failed",
    "name": "api-live",
    "url": "http://127.0.0.1:3002/live"
  },
  {
    "at": "2026-07-04T12:35:58.650Z",
    "by": "ProcessManager",
    "event": "ready-retry",
    "sessionId": "413ac4fd-3159-49c8-9c7e-1aa92aac17fc",
    "attempts": 13,
    "error": "fetch failed",
    "name": "api-live",
    "url": "http://127.0.0.1:3002/live"
  },
  {
    "at": "2026-07-04T12:36:00.293Z",
    "by": "ProcessManager",
    "event": "ready",
    "sessionId": "413ac4fd-3159-49c8-9c7e-1aa92aac17fc",
    "attempts": 14,
    "durationMs": 12685,
    "name": "api-live",
    "url": "http://127.0.0.1:3002/live"
  },
  {
    "at": "2026-07-04T12:36:00.785Z",
    "by": "ProcessManager",
    "event": "ready",
    "sessionId": "413ac4fd-3159-49c8-9c7e-1aa92aac17fc",
    "attempts": 1,
    "durationMs": 481,
    "name": "api-ready",
    "url": "http://127.0.0.1:3002/ready"
  },
  {
    "at": "2026-07-04T12:36:01.197Z",
    "by": "ProcessManager",
    "event": "ready",
    "sessionId": "413ac4fd-3159-49c8-9c7e-1aa92aac17fc",
    "attempts": 1,
    "durationMs": 409,
    "name": "frontend",
    "url": "http://127.0.0.1:8081"
  }
]
```
