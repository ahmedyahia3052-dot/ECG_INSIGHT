# Infrastructure Report

Generated: 2026-07-04T12:36:01.222Z

## Summary

| Metric | Value |
|--------|-------|
| Session ID | 413ac4fd-3159-49c8-9c7e-1aa92aac17fc |
| Reuse existing server | no |
| Startup time | 13821 ms |
| API readiness | ready |
| Ollama readiness | healthy |
| Database latency | 463 ms |
| Frontend startup | 409 ms |
| CPU cores | 12 |
| Memory free / total | 3075 MB / 16240 MB |
| Process lifecycle report | PROCESS_LIFECYCLE_REPORT.md |

## Failed connections

- None

## Step timings

```json
{
  "mode": "managed-session",
  "recovery": {
    "manifest": {
      "lifecycle": [
        {
          "at": "2026-07-04T12:23:29.754Z",
          "by": "ProcessManager",
          "event": "started",
          "sessionId": "583f66cf-f98d-40c6-8ea1-33339b5a94c8",
          "command": "npx tsx server/src/index.ts",
          "name": "api",
          "pid": 3360,
          "startedBy": "ProcessManager.startManagedProcess"
        },
        {
          "at": "2026-07-04T12:23:29.906Z",
          "by": "ProcessManager",
          "event": "started",
          "sessionId": "583f66cf-f98d-40c6-8ea1-33339b5a94c8",
          "command": "npx expo start --web --localhost --port 8081",
          "name": "frontend",
          "pid": 31540,
          "startedBy": "ProcessManager.startManagedProcess"
        },
        {
          "at": "2026-07-04T12:23:29.962Z",
          "by": "ProcessManager",
          "event": "ready-retry",
          "sessionId": "583f66cf-f98d-40c6-8ea1-33339b5a94c8",
          "attempts": 1,
          "error": "fetch failed",
          "name": "api-live",
          "url": "http://127.0.0.1:3002/live"
        },
        {
          "at": "2026-07-04T12:23:30.335Z",
          "by": "ProcessManager",
          "event": "ready-retry",
          "sessionId": "583f66cf-f98d-40c6-8ea1-33339b5a94c8",
          "attempts": 2,
          "error": "fetch failed",
          "name": "api-live",
          "url": "http://127.0.0.1:3002/live"
        },
        {
          "at": "2026-07-04T12:23:30.805Z",
          "by": "ProcessManager",
          "event": "ready-retry",
          "sessionId": "583f66cf-f98d-40c6-8ea1-33339b5a94c8",
          "attempts": 3,
          "error": "fetch failed",
          "name": "api-live",
          "url": "http://127.0.0.1:3002/live"
        },
        {
          "at": "2026-07-04T12:23:31.387Z",
          "by": "ProcessManager",
          "event": "ready-retry",
          "sessionId": "583f66cf-f98d-40c6-8ea1-33339b5a94c8",
          "attempts": 4,
          "error": "fetch failed",
          "name": "api-live",
          "url": "http://127.0.0.1:3002/live"
        },
        {
          "at": "2026-07-04T12:23:32.063Z",
          "by": "ProcessManager",
          "event": "ready-retry",
          "sessionId": "583f66cf-f98d-40c6-8ea1-33339b5a94c8",
          "attempts": 5,
          "error": "fetch failed",
          "name": "api-live",
          "url": "http://127.0.0.1:3002/live"
        },
        {
          "at": "2026-07-04T12:23:32.835Z",
          "by": "ProcessManager",
          "event": "ready-retry",
          "sessionId": "583f66cf-f98d-40c6-8ea1-33339b5a94c8",
          "attempts": 6,
          "error": "fetch failed",
          "name": "api-live",
          "url": "http://127.0.0.1:3002/live"
        },
        {
          "at": "2026-07-04T12:23:33.706Z",
          "by": "ProcessManager",
          "event": "ready-retry",
          "sessionId": "583f66cf-f98d-40c6-8ea1-33339b5a94c8",
          "attempts": 7,
          "error": "fetch failed",
          "name": "api-live",
          "url": "http://127.0.0.1:3002/live"
        },
        {
          "at": "2026-07-04T12:23:34.687Z",
          "by": "ProcessManager",
          "event": "ready-retry",
          "sessionId": "583f66cf-f98d-40c6-8ea1-33339b5a94c8",
          "attempts": 8,
          "error": "fetch failed",
          "name": "api-live",
          "url": "http://127.0.0.1:3002/live"
        },
        {
          "at": "2026-07-04T12:23:35.767Z",
          "by": "ProcessManager",
          "event": "ready-retry",
          "sessionId": "583f66cf-f98d-40c6-8ea1-33339b5a94c8",
          "attempts": 9,
          "error": "fetch failed",
          "name": "api-live",
          "url": "http://127.0.0.1:3002/live"
        },
        {
          "at": "2026-07-04T12:23:36.924Z",
          "by": "ProcessManager",
          "event": "ready-retry",
          "sessionId": "583f66cf-f98d-40c6-8ea1-33339b5a94c8",
          "attempts": 10,
          "error": "fetch failed",
          "name": "api-live",
          "url": "http://127.0.0.1:3002/live"
        },
        {
          "at": "2026-07-04T12:23:38.189Z",
          "by": "ProcessManager",
          "event": "ready-retry",
          "sessionId": "583f66cf-f98d-40c6-8ea1-33339b5a94c8",
          "attempts": 11,
          "error": "fetch failed",
          "name": "api-live",
          "url": "http://127.0.0.1:3002/live"
        },
        {
          "at": "2026-07-04T12:23:39.553Z",
          "by": "ProcessManager",
          "event": "ready-retry",
          "sessionId": "583f66cf-f98d-40c6-8ea1-33339b5a94c8",
          "attempts": 12,
          "error": "fetch failed",
          "name": "api-live",
          "url": "http://127.0.0.1:3002/live"
        },
        {
          "at": "2026-07-04T12:23:41.016Z",
          "by": "ProcessManager",
          "event": "ready-retry",
          "sessionId": "583f66cf-f98d-40c6-8ea1-33339b5a94c8",
          "attempts": 13,
          "error": "fetch failed",
          "name": "api-live",
          "url": "http://127.0.0.1:3002/live"
        },
        {
          "at": "2026-07-04T12:23:42.631Z",
          "by": "ProcessManager",
          "event": "ready",
          "sessionId": "583f66cf-f98d-40c6-8ea1-33339b5a94c8",
          "attempts": 14,
          "durationMs": 12720,
          "name": "api-live",
          "url": "http://127.0.0.1:3002/live"
        },
        {
          "at": "2026-07-04T12:23:43.025Z",
          "by": "ProcessManager",
          "event": "ready",
          "sessionId": "583f66cf-f98d-40c6-8ea1-33339b5a94c8",
          "attempts": 1,
          "durationMs": 390,
          "name": "api-ready",
          "url": "http://127.0.0.1:3002/ready"
        },
        {
          "at": "2026-07-04T12:23:48.042Z",
          "by": "ProcessManager",
          "event": "ready-retry",
          "sessionId": "583f66cf-f98d-40c6-8ea1-33339b5a94c8",
          "attempts": 1,
          "error": "The operation was aborted due to timeout",
          "name": "frontend",
          "url": "http://127.0.0.1:8081"
        },
        {
          "at": "2026-07-04T12:23:53.409Z",
          "by": "ProcessManager",
          "event": "ready-retry",
          "sessionId": "583f66cf-f98d-40c6-8ea1-33339b5a94c8",
          "attempts": 2,
          "error": "The operation was aborted due to timeout",
          "name": "frontend",
          "url": "http://127.0.0.1:8081"
        },
        {
          "at": "2026-07-04T12:23:58.885Z",
          "by": "ProcessManager",
          "event": "ready-retry",
          "sessionId": "583f66cf-f98d-40c6-8ea1-33339b5a94c8",
          "attempts": 3,
          "error": "The operation was aborted due to timeout",
          "name": "frontend",
          "url": "http://127.0.0.1:8081"
        },
        {
          "at": "2026-07-04T12:24:04.470Z",
          "by": "ProcessManager",
          "event": "ready-retry",
          "sessionId": "583f66cf-f98d-40c6-8ea1-33339b5a94c8",
          "attempts": 4,
          "error": "The operation was aborted due to timeout",
          "name": "frontend",
          "url": "http://127.0.0.1:8081"
        },
        {
          "at": "2026-07-04T12:24:06.607Z",
          "by": "ProcessManager",
          "event": "ready",
          "sessionId": "583f66cf-f98d-40c6-8ea1-33339b5a94c8",
          "attempts": 5,
          "durationMs": 23580,
          "name": "frontend",
          "url": "http://127.0.0.1:8081"
        },
        {
          "at": "2026-07-04T12:35:42.031Z",
          "by": "ProcessManager",
          "event": "stop-requested",
          "sessionId": "583f66cf-f98d-40c6-8ea1-33339b5a94c8",
          "name": "frontend",
          "pid": 31540,
          "reason": "playwright-global-teardown",
          "stoppedBy": "global-teardown.mjs"
        },
        {
          "at": "2026-07-04T12:35:42.471Z",
          "by": "ProcessManager",
          "event": "stopped",
          "sessionId": "583f66cf-f98d-40c6-8ea1-33339b5a94c8",
          "name": "frontend",
          "pid": 31540,
          "reason": "playwright-global-teardown",
          "stoppedBy": "global-teardown.mjs"
        },
        {
          "at": "2026-07-04T12:35:42.473Z",
          "by": "ProcessManager",
          "event": "stop-requested",
          "sessionId": "583f66cf-f98d-40c6-8ea1-33339b5a94c8",
          "name": "api",
          "pid": 3360,
          "reason": "playwright-global-teardown",
          "stoppedBy": "global-teardown.mjs"
        },
        {
          "at": "2026-07-04T12:35:42.821Z",
          "by": "ProcessManager",
          "event": "stopped",
          "sessionId": "583f66cf-f98d-40c6-8ea1-33339b5a94c8",
          "name": "api",
          "pid": 3360,
          "reason": "playwright-global-teardown",
          "stoppedBy": "global-teardown.mjs"
        }
      ],
      "ownerPid": 30368,
      "reuseExistingServer": false,
      "processes": [
        {
          "command": "npx tsx server/src/index.ts",
          "name": "api",
          "pid": 3360,
          "startedAt": "2026-07-04T12:23:29.752Z",
          "startedBy": "ProcessManager.startManagedProcess",
          "stoppedAt": "2026-07-04T12:35:42.821Z",
          "stoppedBy": "global-teardown.mjs"
        },
        {
          "command": "npx expo start --web --localhost --port 8081",
          "name": "frontend",
          "pid": 31540,
          "startedAt": "2026-07-04T12:23:29.906Z",
          "startedBy": "ProcessManager.startManagedProcess",
          "stoppedAt": "2026-07-04T12:35:42.471Z",
          "stoppedBy": "global-teardown.mjs"
        }
      ],
      "sessionId": "583f66cf-f98d-40c6-8ea1-33339b5a94c8",
      "updatedAt": "2026-07-04T12:35:42.825Z"
    },
    "recovered": []
  },
  "live": {
    "attempts": 14,
    "durationMs": 12685,
    "payload": {
      "ok": true,
      "requestId": "9f55130a-2d56-4c88-9998-fa25c57f3175",
      "service": "ecg-insight-api",
      "uptimeSeconds": 10
    }
  },
  "apiReady": {
    "attempts": 1,
    "durationMs": 481,
    "ok": true
  },
  "apiReadiness": {
    "checks": {
      "database": {
        "details": {
          "activeSessions": 5635,
          "auditEventsLast24h": 8594,
          "provider": "postgresql",
          "users": 195
        },
        "durationMs": 463,
        "ok": true,
        "status": "healthy"
      },
      "ollama": {
        "details": {
          "connected": false,
          "mockMode": true,
          "provider": "ollama",
          "required": false,
          "skipped": true
        },
        "durationMs": 0,
        "ok": true,
        "status": "healthy"
      },
      "redis": {
        "details": {
          "connected": false,
          "required": false,
          "skipped": true
        },
        "durationMs": 0,
        "ok": true,
        "status": "skipped"
      },
      "storage": {
        "details": {
          "fileCount": 960,
          "path": "C:\\Users\\Ahmed\\Downloads\\BelatedElasticLoop\\uploads",
          "sizeBytes": 6059760,
          "writable": true
        },
        "durationMs": 458,
        "ok": true,
        "status": "healthy"
      }
    },
    "durationMs": 463,
    "environment": "development",
    "ok": true,
    "service": "ecg-insight-api",
    "timestamp": "2026-07-04T12:36:00.779Z",
    "requestId": "5fafce08-b556-4f66-b635-2a39cc10578c",
    "status": "ready"
  },
  "frontend": {
    "attempts": 1,
    "durationMs": 409,
    "payload": {}
  },
  "ollama": {
    "durationMs": 8,
    "ok": true,
    "version": "0.31.1"
  },
  "redis": {
    "durationMs": 0,
    "ok": true,
    "skipped": true
  }
}
```
