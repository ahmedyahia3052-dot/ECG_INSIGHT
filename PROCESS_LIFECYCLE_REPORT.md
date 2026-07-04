# Process Lifecycle Report

Generated: 2026-07-04T19:04:30.674Z

## Session

| Field | Value |
|-------|-------|
| Session ID | 584e22c8-0dae-49f7-855a-a8e2a4bd9e07 |
| Owner PID | 16280 |
| Reuse mode | no |

## Processes

| Service | PID | Started by | Stopped by | Started | Stopped |
|---------|-----|------------|------------|---------|---------|
| api | 27356 | ProcessManager.startManagedProcess | global-teardown.mjs | 2026-07-04T18:49:47.433Z | 2026-07-04T19:04:30.670Z |
| frontend | 24108 | ProcessManager.startManagedProcess | global-teardown.mjs | 2026-07-04T18:49:47.667Z | 2026-07-04T19:04:30.282Z |

## Startup order

- 2026-07-04T18:49:47.435Z: **api** (PID 27356) started by ProcessManager.startManagedProcess
- 2026-07-04T18:49:47.667Z: **frontend** (PID 24108) started by ProcessManager.startManagedProcess

## Shutdown order

- 2026-07-04T19:04:30.283Z: **frontend** (PID 24108) stopped by global-teardown.mjs
- 2026-07-04T19:04:30.670Z: **api** (PID 27356) stopped by global-teardown.mjs

## Readiness checks

- 2026-07-04T18:50:02.030Z: **api-live** ready in 14360ms (15 attempts) → http://127.0.0.1:3002/live
- 2026-07-04T18:50:02.291Z: **api-ready** ready in 258ms (1 attempts) → http://127.0.0.1:3002/ready
- 2026-07-04T18:50:20.149Z: **frontend** ready in 17855ms (4 attempts) → http://127.0.0.1:8081

## Unexpected terminations

- None recorded in this session

## Full lifecycle log

```json
[
  {
    "at": "2026-07-04T18:49:47.435Z",
    "by": "ProcessManager",
    "event": "started",
    "sessionId": "584e22c8-0dae-49f7-855a-a8e2a4bd9e07",
    "command": "npx tsx server/src/index.ts",
    "name": "api",
    "pid": 27356,
    "startedBy": "ProcessManager.startManagedProcess"
  },
  {
    "at": "2026-07-04T18:49:47.667Z",
    "by": "ProcessManager",
    "event": "started",
    "sessionId": "584e22c8-0dae-49f7-855a-a8e2a4bd9e07",
    "command": "npx expo start --web --localhost --port 8081",
    "name": "frontend",
    "pid": 24108,
    "startedBy": "ProcessManager.startManagedProcess"
  },
  {
    "at": "2026-07-04T18:49:47.708Z",
    "by": "ProcessManager",
    "event": "ready-retry",
    "sessionId": "584e22c8-0dae-49f7-855a-a8e2a4bd9e07",
    "attempts": 1,
    "error": "fetch failed",
    "name": "api-live",
    "url": "http://127.0.0.1:3002/live"
  },
  {
    "at": "2026-07-04T18:49:48.077Z",
    "by": "ProcessManager",
    "event": "ready-retry",
    "sessionId": "584e22c8-0dae-49f7-855a-a8e2a4bd9e07",
    "attempts": 2,
    "error": "fetch failed",
    "name": "api-live",
    "url": "http://127.0.0.1:3002/live"
  },
  {
    "at": "2026-07-04T18:49:48.543Z",
    "by": "ProcessManager",
    "event": "ready-retry",
    "sessionId": "584e22c8-0dae-49f7-855a-a8e2a4bd9e07",
    "attempts": 3,
    "error": "fetch failed",
    "name": "api-live",
    "url": "http://127.0.0.1:3002/live"
  },
  {
    "at": "2026-07-04T18:49:49.111Z",
    "by": "ProcessManager",
    "event": "ready-retry",
    "sessionId": "584e22c8-0dae-49f7-855a-a8e2a4bd9e07",
    "attempts": 4,
    "error": "fetch failed",
    "name": "api-live",
    "url": "http://127.0.0.1:3002/live"
  },
  {
    "at": "2026-07-04T18:49:49.773Z",
    "by": "ProcessManager",
    "event": "ready-retry",
    "sessionId": "584e22c8-0dae-49f7-855a-a8e2a4bd9e07",
    "attempts": 5,
    "error": "fetch failed",
    "name": "api-live",
    "url": "http://127.0.0.1:3002/live"
  },
  {
    "at": "2026-07-04T18:49:50.532Z",
    "by": "ProcessManager",
    "event": "ready-retry",
    "sessionId": "584e22c8-0dae-49f7-855a-a8e2a4bd9e07",
    "attempts": 6,
    "error": "fetch failed",
    "name": "api-live",
    "url": "http://127.0.0.1:3002/live"
  },
  {
    "at": "2026-07-04T18:49:51.428Z",
    "by": "ProcessManager",
    "event": "ready-retry",
    "sessionId": "584e22c8-0dae-49f7-855a-a8e2a4bd9e07",
    "attempts": 7,
    "error": "fetch failed",
    "name": "api-live",
    "url": "http://127.0.0.1:3002/live"
  },
  {
    "at": "2026-07-04T18:49:52.389Z",
    "by": "ProcessManager",
    "event": "ready-retry",
    "sessionId": "584e22c8-0dae-49f7-855a-a8e2a4bd9e07",
    "attempts": 8,
    "error": "fetch failed",
    "name": "api-live",
    "url": "http://127.0.0.1:3002/live"
  },
  {
    "at": "2026-07-04T18:49:53.456Z",
    "by": "ProcessManager",
    "event": "ready-retry",
    "sessionId": "584e22c8-0dae-49f7-855a-a8e2a4bd9e07",
    "attempts": 9,
    "error": "fetch failed",
    "name": "api-live",
    "url": "http://127.0.0.1:3002/live"
  },
  {
    "at": "2026-07-04T18:49:54.612Z",
    "by": "ProcessManager",
    "event": "ready-retry",
    "sessionId": "584e22c8-0dae-49f7-855a-a8e2a4bd9e07",
    "attempts": 10,
    "error": "fetch failed",
    "name": "api-live",
    "url": "http://127.0.0.1:3002/live"
  },
  {
    "at": "2026-07-04T18:49:55.885Z",
    "by": "ProcessManager",
    "event": "ready-retry",
    "sessionId": "584e22c8-0dae-49f7-855a-a8e2a4bd9e07",
    "attempts": 11,
    "error": "fetch failed",
    "name": "api-live",
    "url": "http://127.0.0.1:3002/live"
  },
  {
    "at": "2026-07-04T18:49:57.264Z",
    "by": "ProcessManager",
    "event": "ready-retry",
    "sessionId": "584e22c8-0dae-49f7-855a-a8e2a4bd9e07",
    "attempts": 12,
    "error": "fetch failed",
    "name": "api-live",
    "url": "http://127.0.0.1:3002/live"
  },
  {
    "at": "2026-07-04T18:49:58.740Z",
    "by": "ProcessManager",
    "event": "ready-retry",
    "sessionId": "584e22c8-0dae-49f7-855a-a8e2a4bd9e07",
    "attempts": 13,
    "error": "fetch failed",
    "name": "api-live",
    "url": "http://127.0.0.1:3002/live"
  },
  {
    "at": "2026-07-04T18:50:00.326Z",
    "by": "ProcessManager",
    "event": "ready-retry",
    "sessionId": "584e22c8-0dae-49f7-855a-a8e2a4bd9e07",
    "attempts": 14,
    "error": "fetch failed",
    "name": "api-live",
    "url": "http://127.0.0.1:3002/live"
  },
  {
    "at": "2026-07-04T18:50:02.030Z",
    "by": "ProcessManager",
    "event": "ready",
    "sessionId": "584e22c8-0dae-49f7-855a-a8e2a4bd9e07",
    "attempts": 15,
    "durationMs": 14360,
    "name": "api-live",
    "url": "http://127.0.0.1:3002/live"
  },
  {
    "at": "2026-07-04T18:50:02.291Z",
    "by": "ProcessManager",
    "event": "ready",
    "sessionId": "584e22c8-0dae-49f7-855a-a8e2a4bd9e07",
    "attempts": 1,
    "durationMs": 258,
    "name": "api-ready",
    "url": "http://127.0.0.1:3002/ready"
  },
  {
    "at": "2026-07-04T18:50:07.303Z",
    "by": "ProcessManager",
    "event": "ready-retry",
    "sessionId": "584e22c8-0dae-49f7-855a-a8e2a4bd9e07",
    "attempts": 1,
    "error": "The operation was aborted due to timeout",
    "name": "frontend",
    "url": "http://127.0.0.1:8081"
  },
  {
    "at": "2026-07-04T18:50:12.674Z",
    "by": "ProcessManager",
    "event": "ready-retry",
    "sessionId": "584e22c8-0dae-49f7-855a-a8e2a4bd9e07",
    "attempts": 2,
    "error": "The operation was aborted due to timeout",
    "name": "frontend",
    "url": "http://127.0.0.1:8081"
  },
  {
    "at": "2026-07-04T18:50:18.147Z",
    "by": "ProcessManager",
    "event": "ready-retry",
    "sessionId": "584e22c8-0dae-49f7-855a-a8e2a4bd9e07",
    "attempts": 3,
    "error": "The operation was aborted due to timeout",
    "name": "frontend",
    "url": "http://127.0.0.1:8081"
  },
  {
    "at": "2026-07-04T18:50:20.149Z",
    "by": "ProcessManager",
    "event": "ready",
    "sessionId": "584e22c8-0dae-49f7-855a-a8e2a4bd9e07",
    "attempts": 4,
    "durationMs": 17855,
    "name": "frontend",
    "url": "http://127.0.0.1:8081"
  },
  {
    "at": "2026-07-04T19:04:29.806Z",
    "by": "ProcessManager",
    "event": "stop-requested",
    "sessionId": "584e22c8-0dae-49f7-855a-a8e2a4bd9e07",
    "name": "frontend",
    "pid": 24108,
    "reason": "playwright-global-teardown",
    "stoppedBy": "global-teardown.mjs"
  },
  {
    "at": "2026-07-04T19:04:30.283Z",
    "by": "ProcessManager",
    "event": "stopped",
    "sessionId": "584e22c8-0dae-49f7-855a-a8e2a4bd9e07",
    "name": "frontend",
    "pid": 24108,
    "reason": "playwright-global-teardown",
    "stoppedBy": "global-teardown.mjs"
  },
  {
    "at": "2026-07-04T19:04:30.286Z",
    "by": "ProcessManager",
    "event": "stop-requested",
    "sessionId": "584e22c8-0dae-49f7-855a-a8e2a4bd9e07",
    "name": "api",
    "pid": 27356,
    "reason": "playwright-global-teardown",
    "stoppedBy": "global-teardown.mjs"
  },
  {
    "at": "2026-07-04T19:04:30.670Z",
    "by": "ProcessManager",
    "event": "stopped",
    "sessionId": "584e22c8-0dae-49f7-855a-a8e2a4bd9e07",
    "name": "api",
    "pid": 27356,
    "reason": "playwright-global-teardown",
    "stoppedBy": "global-teardown.mjs"
  }
]
```
