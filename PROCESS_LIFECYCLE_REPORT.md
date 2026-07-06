# Process Lifecycle Report

Generated: 2026-07-06T20:30:32.214Z

## Session

| Field | Value |
|-------|-------|
| Session ID | ef179465-9bdb-4a74-b390-052a804720a3 |
| Owner PID | 13476 |
| Reuse mode | no |

## Processes

| Service | PID | Started by | Stopped by | Started | Stopped |
|---------|-----|------------|------------|---------|---------|
| api | 22328 | ProcessManager.startManagedProcess | global-teardown.mjs | 2026-07-06T20:29:18.820Z | 2026-07-06T20:30:32.207Z |
| frontend | 22368 | ProcessManager.startManagedProcess | exit:1 | 2026-07-06T20:29:18.949Z | 2026-07-06T20:29:27.296Z |

## Startup order

- 2026-07-06T20:29:18.822Z: **api** (PID 22328) started by ProcessManager.startManagedProcess
- 2026-07-06T20:29:18.950Z: **frontend** (PID 22368) started by ProcessManager.startManagedProcess

## Shutdown order

- 2026-07-06T20:30:32.207Z: **api** (PID 22328) stopped by global-teardown.mjs

## Readiness checks

- 2026-07-06T20:29:33.239Z: **api-live** ready in 14287ms (15 attempts) → http://127.0.0.1:3002/live
- 2026-07-06T20:29:33.489Z: **api-ready** ready in 248ms (1 attempts) → http://127.0.0.1:3002/ready
- 2026-07-06T20:29:41.988Z: **frontend** ready in 8497ms (2 attempts) → http://127.0.0.1:8081

## Unexpected terminations

- 2026-07-06T20:29:27.296Z: **frontend** PID 22368 — 1

## Full lifecycle log

```json
[
  {
    "at": "2026-07-06T20:29:18.822Z",
    "by": "ProcessManager",
    "event": "started",
    "sessionId": "ef179465-9bdb-4a74-b390-052a804720a3",
    "command": "npx tsx server/src/index.ts",
    "name": "api",
    "pid": 22328,
    "startedBy": "ProcessManager.startManagedProcess"
  },
  {
    "at": "2026-07-06T20:29:18.950Z",
    "by": "ProcessManager",
    "event": "started",
    "sessionId": "ef179465-9bdb-4a74-b390-052a804720a3",
    "command": "npx expo start --web --localhost --port 8081",
    "name": "frontend",
    "pid": 22368,
    "startedBy": "ProcessManager.startManagedProcess"
  },
  {
    "at": "2026-07-06T20:29:18.990Z",
    "by": "ProcessManager",
    "event": "ready-retry",
    "sessionId": "ef179465-9bdb-4a74-b390-052a804720a3",
    "attempts": 1,
    "error": "fetch failed",
    "name": "api-live",
    "url": "http://127.0.0.1:3002/live"
  },
  {
    "at": "2026-07-06T20:29:19.358Z",
    "by": "ProcessManager",
    "event": "ready-retry",
    "sessionId": "ef179465-9bdb-4a74-b390-052a804720a3",
    "attempts": 2,
    "error": "fetch failed",
    "name": "api-live",
    "url": "http://127.0.0.1:3002/live"
  },
  {
    "at": "2026-07-06T20:29:19.817Z",
    "by": "ProcessManager",
    "event": "ready-retry",
    "sessionId": "ef179465-9bdb-4a74-b390-052a804720a3",
    "attempts": 3,
    "error": "fetch failed",
    "name": "api-live",
    "url": "http://127.0.0.1:3002/live"
  },
  {
    "at": "2026-07-06T20:29:20.380Z",
    "by": "ProcessManager",
    "event": "ready-retry",
    "sessionId": "ef179465-9bdb-4a74-b390-052a804720a3",
    "attempts": 4,
    "error": "fetch failed",
    "name": "api-live",
    "url": "http://127.0.0.1:3002/live"
  },
  {
    "at": "2026-07-06T20:29:21.043Z",
    "by": "ProcessManager",
    "event": "ready-retry",
    "sessionId": "ef179465-9bdb-4a74-b390-052a804720a3",
    "attempts": 5,
    "error": "fetch failed",
    "name": "api-live",
    "url": "http://127.0.0.1:3002/live"
  },
  {
    "at": "2026-07-06T20:29:21.806Z",
    "by": "ProcessManager",
    "event": "ready-retry",
    "sessionId": "ef179465-9bdb-4a74-b390-052a804720a3",
    "attempts": 6,
    "error": "fetch failed",
    "name": "api-live",
    "url": "http://127.0.0.1:3002/live"
  },
  {
    "at": "2026-07-06T20:29:22.672Z",
    "by": "ProcessManager",
    "event": "ready-retry",
    "sessionId": "ef179465-9bdb-4a74-b390-052a804720a3",
    "attempts": 7,
    "error": "fetch failed",
    "name": "api-live",
    "url": "http://127.0.0.1:3002/live"
  },
  {
    "at": "2026-07-06T20:29:23.641Z",
    "by": "ProcessManager",
    "event": "ready-retry",
    "sessionId": "ef179465-9bdb-4a74-b390-052a804720a3",
    "attempts": 8,
    "error": "fetch failed",
    "name": "api-live",
    "url": "http://127.0.0.1:3002/live"
  },
  {
    "at": "2026-07-06T20:29:24.708Z",
    "by": "ProcessManager",
    "event": "ready-retry",
    "sessionId": "ef179465-9bdb-4a74-b390-052a804720a3",
    "attempts": 9,
    "error": "fetch failed",
    "name": "api-live",
    "url": "http://127.0.0.1:3002/live"
  },
  {
    "at": "2026-07-06T20:29:25.873Z",
    "by": "ProcessManager",
    "event": "ready-retry",
    "sessionId": "ef179465-9bdb-4a74-b390-052a804720a3",
    "attempts": 10,
    "error": "fetch failed",
    "name": "api-live",
    "url": "http://127.0.0.1:3002/live"
  },
  {
    "at": "2026-07-06T20:29:27.142Z",
    "by": "ProcessManager",
    "event": "ready-retry",
    "sessionId": "ef179465-9bdb-4a74-b390-052a804720a3",
    "attempts": 11,
    "error": "fetch failed",
    "name": "api-live",
    "url": "http://127.0.0.1:3002/live"
  },
  {
    "at": "2026-07-06T20:29:27.296Z",
    "by": "ProcessManager",
    "event": "unexpected-exit",
    "sessionId": "ef179465-9bdb-4a74-b390-052a804720a3",
    "code": 1,
    "name": "frontend",
    "pid": 22368,
    "signal": null
  },
  {
    "at": "2026-07-06T20:29:28.512Z",
    "by": "ProcessManager",
    "event": "ready-retry",
    "sessionId": "ef179465-9bdb-4a74-b390-052a804720a3",
    "attempts": 12,
    "error": "fetch failed",
    "name": "api-live",
    "url": "http://127.0.0.1:3002/live"
  },
  {
    "at": "2026-07-06T20:29:29.972Z",
    "by": "ProcessManager",
    "event": "ready-retry",
    "sessionId": "ef179465-9bdb-4a74-b390-052a804720a3",
    "attempts": 13,
    "error": "fetch failed",
    "name": "api-live",
    "url": "http://127.0.0.1:3002/live"
  },
  {
    "at": "2026-07-06T20:29:31.539Z",
    "by": "ProcessManager",
    "event": "ready-retry",
    "sessionId": "ef179465-9bdb-4a74-b390-052a804720a3",
    "attempts": 14,
    "error": "fetch failed",
    "name": "api-live",
    "url": "http://127.0.0.1:3002/live"
  },
  {
    "at": "2026-07-06T20:29:33.239Z",
    "by": "ProcessManager",
    "event": "ready",
    "sessionId": "ef179465-9bdb-4a74-b390-052a804720a3",
    "attempts": 15,
    "durationMs": 14287,
    "name": "api-live",
    "url": "http://127.0.0.1:3002/live"
  },
  {
    "at": "2026-07-06T20:29:33.489Z",
    "by": "ProcessManager",
    "event": "ready",
    "sessionId": "ef179465-9bdb-4a74-b390-052a804720a3",
    "attempts": 1,
    "durationMs": 248,
    "name": "api-ready",
    "url": "http://127.0.0.1:3002/ready"
  },
  {
    "at": "2026-07-06T20:29:38.503Z",
    "by": "ProcessManager",
    "event": "ready-retry",
    "sessionId": "ef179465-9bdb-4a74-b390-052a804720a3",
    "attempts": 1,
    "error": "The operation was aborted due to timeout",
    "name": "frontend",
    "url": "http://127.0.0.1:8081"
  },
  {
    "at": "2026-07-06T20:29:41.988Z",
    "by": "ProcessManager",
    "event": "ready",
    "sessionId": "ef179465-9bdb-4a74-b390-052a804720a3",
    "attempts": 2,
    "durationMs": 8497,
    "name": "frontend",
    "url": "http://127.0.0.1:8081"
  },
  {
    "at": "2026-07-06T20:30:31.900Z",
    "by": "ProcessManager",
    "event": "stop-requested",
    "sessionId": "ef179465-9bdb-4a74-b390-052a804720a3",
    "name": "api",
    "pid": 22328,
    "reason": "playwright-global-teardown",
    "stoppedBy": "global-teardown.mjs"
  },
  {
    "at": "2026-07-06T20:30:32.207Z",
    "by": "ProcessManager",
    "event": "stopped",
    "sessionId": "ef179465-9bdb-4a74-b390-052a804720a3",
    "name": "api",
    "pid": 22328,
    "reason": "playwright-global-teardown",
    "stoppedBy": "global-teardown.mjs"
  }
]
```
