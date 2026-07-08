# Process Lifecycle Report

Generated: 2026-07-08T01:37:04.781Z

## Session

| Field | Value |
|-------|-------|
| Session ID | aca4d59f-662d-47d3-87d9-f95b1a6d9c19 |
| Owner PID | 10380 |
| Reuse mode | no |

## Processes

| Service | PID | Started by | Stopped by | Started | Stopped |
|---------|-----|------------|------------|---------|---------|
| api | 3704 | ProcessManager.startManagedProcess | running | 2026-07-08T01:36:54.248Z | - |
| frontend | 20276 | ProcessManager.startManagedProcess | running | 2026-07-08T01:36:55.308Z | - |

## Startup order

- 2026-07-08T01:36:54.248Z: **api** (PID 3704) started by ProcessManager.startManagedProcess
- 2026-07-08T01:36:55.308Z: **frontend** (PID 20276) started by ProcessManager.startManagedProcess

## Shutdown order

- none

## Readiness checks

- 2026-07-08T01:37:03.553Z: **api-live** ready in 8243ms (11 attempts) → http://127.0.0.1:3002/live
- 2026-07-08T01:37:04.014Z: **api-ready** ready in 456ms (1 attempts) → http://127.0.0.1:3002/ready
- 2026-07-08T01:37:04.768Z: **frontend** ready in 751ms (1 attempts) → http://127.0.0.1:8081

## Unexpected terminations

- None recorded in this session

## Full lifecycle log

```json
[
  {
    "at": "2026-07-08T01:36:53.476Z",
    "by": "ProcessManager",
    "event": "port-cleanup",
    "sessionId": "aca4d59f-662d-47d3-87d9-f95b1a6d9c19",
    "killed": [
      25224,
      13360
    ],
    "port": 3002,
    "service": "api"
  },
  {
    "at": "2026-07-08T01:36:54.248Z",
    "by": "ProcessManager",
    "event": "started",
    "sessionId": "aca4d59f-662d-47d3-87d9-f95b1a6d9c19",
    "command": "npx tsx server/src/index.ts",
    "name": "api",
    "pid": 3704,
    "startedBy": "ProcessManager.startManagedProcess"
  },
  {
    "at": "2026-07-08T01:36:54.533Z",
    "by": "ProcessManager",
    "event": "port-cleanup",
    "sessionId": "aca4d59f-662d-47d3-87d9-f95b1a6d9c19",
    "killed": [
      8672
    ],
    "port": 8081,
    "service": "frontend"
  },
  {
    "at": "2026-07-08T01:36:55.308Z",
    "by": "ProcessManager",
    "event": "started",
    "sessionId": "aca4d59f-662d-47d3-87d9-f95b1a6d9c19",
    "command": "npx expo start --web --localhost --port 8081",
    "name": "frontend",
    "pid": 20276,
    "startedBy": "ProcessManager.startManagedProcess"
  },
  {
    "at": "2026-07-08T01:36:55.326Z",
    "by": "ProcessManager",
    "event": "ready-retry",
    "sessionId": "aca4d59f-662d-47d3-87d9-f95b1a6d9c19",
    "attempts": 1,
    "error": "fetch failed",
    "name": "api-live",
    "url": "http://127.0.0.1:3002/live"
  },
  {
    "at": "2026-07-08T01:36:55.695Z",
    "by": "ProcessManager",
    "event": "ready-retry",
    "sessionId": "aca4d59f-662d-47d3-87d9-f95b1a6d9c19",
    "attempts": 2,
    "error": "fetch failed",
    "name": "api-live",
    "url": "http://127.0.0.1:3002/live"
  },
  {
    "at": "2026-07-08T01:36:56.161Z",
    "by": "ProcessManager",
    "event": "ready-retry",
    "sessionId": "aca4d59f-662d-47d3-87d9-f95b1a6d9c19",
    "attempts": 3,
    "error": "fetch failed",
    "name": "api-live",
    "url": "http://127.0.0.1:3002/live"
  },
  {
    "at": "2026-07-08T01:36:56.730Z",
    "by": "ProcessManager",
    "event": "ready-retry",
    "sessionId": "aca4d59f-662d-47d3-87d9-f95b1a6d9c19",
    "attempts": 4,
    "error": "fetch failed",
    "name": "api-live",
    "url": "http://127.0.0.1:3002/live"
  },
  {
    "at": "2026-07-08T01:36:57.393Z",
    "by": "ProcessManager",
    "event": "ready-retry",
    "sessionId": "aca4d59f-662d-47d3-87d9-f95b1a6d9c19",
    "attempts": 5,
    "error": "fetch failed",
    "name": "api-live",
    "url": "http://127.0.0.1:3002/live"
  },
  {
    "at": "2026-07-08T01:36:58.156Z",
    "by": "ProcessManager",
    "event": "ready-retry",
    "sessionId": "aca4d59f-662d-47d3-87d9-f95b1a6d9c19",
    "attempts": 6,
    "error": "fetch failed",
    "name": "api-live",
    "url": "http://127.0.0.1:3002/live"
  },
  {
    "at": "2026-07-08T01:36:59.024Z",
    "by": "ProcessManager",
    "event": "ready-retry",
    "sessionId": "aca4d59f-662d-47d3-87d9-f95b1a6d9c19",
    "attempts": 7,
    "error": "fetch failed",
    "name": "api-live",
    "url": "http://127.0.0.1:3002/live"
  },
  {
    "at": "2026-07-08T01:36:59.988Z",
    "by": "ProcessManager",
    "event": "ready-retry",
    "sessionId": "aca4d59f-662d-47d3-87d9-f95b1a6d9c19",
    "attempts": 8,
    "error": "fetch failed",
    "name": "api-live",
    "url": "http://127.0.0.1:3002/live"
  },
  {
    "at": "2026-07-08T01:37:01.056Z",
    "by": "ProcessManager",
    "event": "ready-retry",
    "sessionId": "aca4d59f-662d-47d3-87d9-f95b1a6d9c19",
    "attempts": 9,
    "error": "fetch failed",
    "name": "api-live",
    "url": "http://127.0.0.1:3002/live"
  },
  {
    "at": "2026-07-08T01:37:02.236Z",
    "by": "ProcessManager",
    "event": "ready-retry",
    "sessionId": "aca4d59f-662d-47d3-87d9-f95b1a6d9c19",
    "attempts": 10,
    "error": "fetch failed",
    "name": "api-live",
    "url": "http://127.0.0.1:3002/live"
  },
  {
    "at": "2026-07-08T01:37:03.553Z",
    "by": "ProcessManager",
    "event": "ready",
    "sessionId": "aca4d59f-662d-47d3-87d9-f95b1a6d9c19",
    "attempts": 11,
    "durationMs": 8243,
    "name": "api-live",
    "url": "http://127.0.0.1:3002/live"
  },
  {
    "at": "2026-07-08T01:37:04.014Z",
    "by": "ProcessManager",
    "event": "ready",
    "sessionId": "aca4d59f-662d-47d3-87d9-f95b1a6d9c19",
    "attempts": 1,
    "durationMs": 456,
    "name": "api-ready",
    "url": "http://127.0.0.1:3002/ready"
  },
  {
    "at": "2026-07-08T01:37:04.768Z",
    "by": "ProcessManager",
    "event": "ready",
    "sessionId": "aca4d59f-662d-47d3-87d9-f95b1a6d9c19",
    "attempts": 1,
    "durationMs": 751,
    "name": "frontend",
    "url": "http://127.0.0.1:8081"
  }
]
```
