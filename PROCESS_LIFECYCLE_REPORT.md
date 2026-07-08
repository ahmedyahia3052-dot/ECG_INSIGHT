# Process Lifecycle Report

Generated: 2026-07-08T15:45:27.555Z

## Session

| Field | Value |
|-------|-------|
| Session ID | d4cd6f35-3e47-49fa-a245-dc1b62618a9b |
| Owner PID | 21584 |
| Reuse mode | no |

## Processes

| Service | PID | Started by | Stopped by | Started | Stopped |
|---------|-----|------------|------------|---------|---------|
| api | 8736 | ProcessManager.startManagedProcess | global-teardown.mjs | 2026-07-08T15:40:55.863Z | 2026-07-08T15:45:27.551Z |
| frontend | 13776 | ProcessManager.startManagedProcess | global-teardown.mjs | 2026-07-08T15:40:57.287Z | 2026-07-08T15:45:27.216Z |

## Startup order

- 2026-07-08T15:40:55.863Z: **api** (PID 8736) started by ProcessManager.startManagedProcess
- 2026-07-08T15:40:57.287Z: **frontend** (PID 13776) started by ProcessManager.startManagedProcess

## Shutdown order

- 2026-07-08T15:45:27.216Z: **frontend** (PID 13776) stopped by global-teardown.mjs
- 2026-07-08T15:45:27.551Z: **api** (PID 8736) stopped by global-teardown.mjs

## Readiness checks

- 2026-07-08T15:41:11.704Z: **api-live** ready in 14412ms (15 attempts) → http://127.0.0.1:3002/live
- 2026-07-08T15:41:12.471Z: **api-ready** ready in 761ms (1 attempts) → http://127.0.0.1:3002/ready
- 2026-07-08T15:41:16.975Z: **frontend** ready in 4494ms (1 attempts) → http://127.0.0.1:8081

## Unexpected terminations

- None recorded in this session

## Full lifecycle log

```json
[
  {
    "at": "2026-07-08T15:40:55.056Z",
    "by": "ProcessManager",
    "event": "port-cleanup",
    "sessionId": "d4cd6f35-3e47-49fa-a245-dc1b62618a9b",
    "killed": [
      23188,
      16908
    ],
    "port": 3002,
    "service": "api"
  },
  {
    "at": "2026-07-08T15:40:55.863Z",
    "by": "ProcessManager",
    "event": "started",
    "sessionId": "d4cd6f35-3e47-49fa-a245-dc1b62618a9b",
    "command": "npx tsx server/src/index.ts",
    "name": "api",
    "pid": 8736,
    "startedBy": "ProcessManager.startManagedProcess"
  },
  {
    "at": "2026-07-08T15:40:56.490Z",
    "by": "ProcessManager",
    "event": "port-cleanup",
    "sessionId": "d4cd6f35-3e47-49fa-a245-dc1b62618a9b",
    "killed": [
      18536
    ],
    "port": 8081,
    "service": "frontend"
  },
  {
    "at": "2026-07-08T15:40:57.287Z",
    "by": "ProcessManager",
    "event": "started",
    "sessionId": "d4cd6f35-3e47-49fa-a245-dc1b62618a9b",
    "command": "npx expo start --web --localhost --port 8081",
    "name": "frontend",
    "pid": 13776,
    "startedBy": "ProcessManager.startManagedProcess"
  },
  {
    "at": "2026-07-08T15:40:57.380Z",
    "by": "ProcessManager",
    "event": "ready-retry",
    "sessionId": "d4cd6f35-3e47-49fa-a245-dc1b62618a9b",
    "attempts": 1,
    "error": "fetch failed",
    "name": "api-live",
    "url": "http://127.0.0.1:3002/live"
  },
  {
    "at": "2026-07-08T15:40:57.746Z",
    "by": "ProcessManager",
    "event": "ready-retry",
    "sessionId": "d4cd6f35-3e47-49fa-a245-dc1b62618a9b",
    "attempts": 2,
    "error": "fetch failed",
    "name": "api-live",
    "url": "http://127.0.0.1:3002/live"
  },
  {
    "at": "2026-07-08T15:40:58.210Z",
    "by": "ProcessManager",
    "event": "ready-retry",
    "sessionId": "d4cd6f35-3e47-49fa-a245-dc1b62618a9b",
    "attempts": 3,
    "error": "fetch failed",
    "name": "api-live",
    "url": "http://127.0.0.1:3002/live"
  },
  {
    "at": "2026-07-08T15:40:58.777Z",
    "by": "ProcessManager",
    "event": "ready-retry",
    "sessionId": "d4cd6f35-3e47-49fa-a245-dc1b62618a9b",
    "attempts": 4,
    "error": "fetch failed",
    "name": "api-live",
    "url": "http://127.0.0.1:3002/live"
  },
  {
    "at": "2026-07-08T15:40:59.441Z",
    "by": "ProcessManager",
    "event": "ready-retry",
    "sessionId": "d4cd6f35-3e47-49fa-a245-dc1b62618a9b",
    "attempts": 5,
    "error": "fetch failed",
    "name": "api-live",
    "url": "http://127.0.0.1:3002/live"
  },
  {
    "at": "2026-07-08T15:41:00.212Z",
    "by": "ProcessManager",
    "event": "ready-retry",
    "sessionId": "d4cd6f35-3e47-49fa-a245-dc1b62618a9b",
    "attempts": 6,
    "error": "fetch failed",
    "name": "api-live",
    "url": "http://127.0.0.1:3002/live"
  },
  {
    "at": "2026-07-08T15:41:01.092Z",
    "by": "ProcessManager",
    "event": "ready-retry",
    "sessionId": "d4cd6f35-3e47-49fa-a245-dc1b62618a9b",
    "attempts": 7,
    "error": "fetch failed",
    "name": "api-live",
    "url": "http://127.0.0.1:3002/live"
  },
  {
    "at": "2026-07-08T15:41:02.062Z",
    "by": "ProcessManager",
    "event": "ready-retry",
    "sessionId": "d4cd6f35-3e47-49fa-a245-dc1b62618a9b",
    "attempts": 8,
    "error": "fetch failed",
    "name": "api-live",
    "url": "http://127.0.0.1:3002/live"
  },
  {
    "at": "2026-07-08T15:41:03.125Z",
    "by": "ProcessManager",
    "event": "ready-retry",
    "sessionId": "d4cd6f35-3e47-49fa-a245-dc1b62618a9b",
    "attempts": 9,
    "error": "fetch failed",
    "name": "api-live",
    "url": "http://127.0.0.1:3002/live"
  },
  {
    "at": "2026-07-08T15:41:04.289Z",
    "by": "ProcessManager",
    "event": "ready-retry",
    "sessionId": "d4cd6f35-3e47-49fa-a245-dc1b62618a9b",
    "attempts": 10,
    "error": "fetch failed",
    "name": "api-live",
    "url": "http://127.0.0.1:3002/live"
  },
  {
    "at": "2026-07-08T15:41:05.548Z",
    "by": "ProcessManager",
    "event": "ready-retry",
    "sessionId": "d4cd6f35-3e47-49fa-a245-dc1b62618a9b",
    "attempts": 11,
    "error": "fetch failed",
    "name": "api-live",
    "url": "http://127.0.0.1:3002/live"
  },
  {
    "at": "2026-07-08T15:41:06.911Z",
    "by": "ProcessManager",
    "event": "ready-retry",
    "sessionId": "d4cd6f35-3e47-49fa-a245-dc1b62618a9b",
    "attempts": 12,
    "error": "fetch failed",
    "name": "api-live",
    "url": "http://127.0.0.1:3002/live"
  },
  {
    "at": "2026-07-08T15:41:08.372Z",
    "by": "ProcessManager",
    "event": "ready-retry",
    "sessionId": "d4cd6f35-3e47-49fa-a245-dc1b62618a9b",
    "attempts": 13,
    "error": "fetch failed",
    "name": "api-live",
    "url": "http://127.0.0.1:3002/live"
  },
  {
    "at": "2026-07-08T15:41:09.946Z",
    "by": "ProcessManager",
    "event": "ready-retry",
    "sessionId": "d4cd6f35-3e47-49fa-a245-dc1b62618a9b",
    "attempts": 14,
    "error": "fetch failed",
    "name": "api-live",
    "url": "http://127.0.0.1:3002/live"
  },
  {
    "at": "2026-07-08T15:41:11.704Z",
    "by": "ProcessManager",
    "event": "ready",
    "sessionId": "d4cd6f35-3e47-49fa-a245-dc1b62618a9b",
    "attempts": 15,
    "durationMs": 14412,
    "name": "api-live",
    "url": "http://127.0.0.1:3002/live"
  },
  {
    "at": "2026-07-08T15:41:12.471Z",
    "by": "ProcessManager",
    "event": "ready",
    "sessionId": "d4cd6f35-3e47-49fa-a245-dc1b62618a9b",
    "attempts": 1,
    "durationMs": 761,
    "name": "api-ready",
    "url": "http://127.0.0.1:3002/ready"
  },
  {
    "at": "2026-07-08T15:41:16.975Z",
    "by": "ProcessManager",
    "event": "ready",
    "sessionId": "d4cd6f35-3e47-49fa-a245-dc1b62618a9b",
    "attempts": 1,
    "durationMs": 4494,
    "name": "frontend",
    "url": "http://127.0.0.1:8081"
  },
  {
    "at": "2026-07-08T15:45:26.811Z",
    "by": "ProcessManager",
    "event": "stop-requested",
    "sessionId": "d4cd6f35-3e47-49fa-a245-dc1b62618a9b",
    "name": "frontend",
    "pid": 13776,
    "reason": "playwright-global-teardown",
    "stoppedBy": "global-teardown.mjs"
  },
  {
    "at": "2026-07-08T15:45:27.216Z",
    "by": "ProcessManager",
    "event": "stopped",
    "sessionId": "d4cd6f35-3e47-49fa-a245-dc1b62618a9b",
    "name": "frontend",
    "pid": 13776,
    "reason": "playwright-global-teardown",
    "stoppedBy": "global-teardown.mjs"
  },
  {
    "at": "2026-07-08T15:45:27.219Z",
    "by": "ProcessManager",
    "event": "stop-requested",
    "sessionId": "d4cd6f35-3e47-49fa-a245-dc1b62618a9b",
    "name": "api",
    "pid": 8736,
    "reason": "playwright-global-teardown",
    "stoppedBy": "global-teardown.mjs"
  },
  {
    "at": "2026-07-08T15:45:27.551Z",
    "by": "ProcessManager",
    "event": "stopped",
    "sessionId": "d4cd6f35-3e47-49fa-a245-dc1b62618a9b",
    "name": "api",
    "pid": 8736,
    "reason": "playwright-global-teardown",
    "stoppedBy": "global-teardown.mjs"
  }
]
```
