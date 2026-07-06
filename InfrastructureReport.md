# Infrastructure Report

Generated: 2026-07-06T20:30:32.216Z

## Summary

| Metric | Value |
|--------|-------|
| Session ID | ef179465-9bdb-4a74-b390-052a804720a3 |
| Reuse existing server | no |
| Startup time | 23307 ms |
| API readiness | ready |
| Ollama readiness | healthy |
| Database latency | 236 ms |
| Frontend startup | 8497 ms |
| CPU cores | 12 |
| Memory free / total | 3265 MB / 16240 MB |
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
          "at": "2026-07-06T20:27:59.012Z",
          "by": "ProcessManager",
          "event": "started",
          "sessionId": "ea323172-6163-4506-a410-e401586a1c99",
          "command": "npx tsx server/src/index.ts",
          "name": "api",
          "pid": 2564,
          "startedBy": "ProcessManager.startManagedProcess"
        },
        {
          "at": "2026-07-06T20:27:59.073Z",
          "by": "ProcessManager",
          "event": "started",
          "sessionId": "ea323172-6163-4506-a410-e401586a1c99",
          "command": "npx expo start --web --localhost --port 8081",
          "name": "frontend",
          "pid": 11912,
          "startedBy": "ProcessManager.startManagedProcess"
        },
        {
          "at": "2026-07-06T20:27:59.094Z",
          "by": "ProcessManager",
          "event": "ready-retry",
          "sessionId": "ea323172-6163-4506-a410-e401586a1c99",
          "attempts": 1,
          "error": "fetch failed",
          "name": "api-live",
          "url": "http://127.0.0.1:3002/live"
        },
        {
          "at": "2026-07-06T20:27:59.453Z",
          "by": "ProcessManager",
          "event": "ready-retry",
          "sessionId": "ea323172-6163-4506-a410-e401586a1c99",
          "attempts": 2,
          "error": "fetch failed",
          "name": "api-live",
          "url": "http://127.0.0.1:3002/live"
        },
        {
          "at": "2026-07-06T20:27:59.920Z",
          "by": "ProcessManager",
          "event": "ready-retry",
          "sessionId": "ea323172-6163-4506-a410-e401586a1c99",
          "attempts": 3,
          "error": "fetch failed",
          "name": "api-live",
          "url": "http://127.0.0.1:3002/live"
        },
        {
          "at": "2026-07-06T20:28:00.487Z",
          "by": "ProcessManager",
          "event": "ready-retry",
          "sessionId": "ea323172-6163-4506-a410-e401586a1c99",
          "attempts": 4,
          "error": "fetch failed",
          "name": "api-live",
          "url": "http://127.0.0.1:3002/live"
        },
        {
          "at": "2026-07-06T20:28:01.154Z",
          "by": "ProcessManager",
          "event": "ready-retry",
          "sessionId": "ea323172-6163-4506-a410-e401586a1c99",
          "attempts": 5,
          "error": "fetch failed",
          "name": "api-live",
          "url": "http://127.0.0.1:3002/live"
        },
        {
          "at": "2026-07-06T20:28:01.919Z",
          "by": "ProcessManager",
          "event": "ready-retry",
          "sessionId": "ea323172-6163-4506-a410-e401586a1c99",
          "attempts": 6,
          "error": "fetch failed",
          "name": "api-live",
          "url": "http://127.0.0.1:3002/live"
        },
        {
          "at": "2026-07-06T20:28:02.786Z",
          "by": "ProcessManager",
          "event": "ready-retry",
          "sessionId": "ea323172-6163-4506-a410-e401586a1c99",
          "attempts": 7,
          "error": "fetch failed",
          "name": "api-live",
          "url": "http://127.0.0.1:3002/live"
        },
        {
          "at": "2026-07-06T20:28:03.788Z",
          "by": "ProcessManager",
          "event": "ready",
          "sessionId": "ea323172-6163-4506-a410-e401586a1c99",
          "attempts": 8,
          "durationMs": 4713,
          "name": "api-live",
          "url": "http://127.0.0.1:3002/live"
        },
        {
          "at": "2026-07-06T20:28:03.965Z",
          "by": "ProcessManager",
          "event": "ready",
          "sessionId": "ea323172-6163-4506-a410-e401586a1c99",
          "attempts": 1,
          "durationMs": 174,
          "name": "api-ready",
          "url": "http://127.0.0.1:3002/ready"
        },
        {
          "at": "2026-07-06T20:28:05.611Z",
          "by": "ProcessManager",
          "event": "ready",
          "sessionId": "ea323172-6163-4506-a410-e401586a1c99",
          "attempts": 1,
          "durationMs": 1645,
          "name": "frontend",
          "url": "http://127.0.0.1:8081"
        },
        {
          "at": "2026-07-06T20:28:50.078Z",
          "by": "ProcessManager",
          "event": "stop-requested",
          "sessionId": "ea323172-6163-4506-a410-e401586a1c99",
          "name": "frontend",
          "pid": 11912,
          "reason": "playwright-global-teardown",
          "stoppedBy": "global-teardown.mjs"
        },
        {
          "at": "2026-07-06T20:28:50.326Z",
          "by": "ProcessManager",
          "event": "stopped",
          "sessionId": "ea323172-6163-4506-a410-e401586a1c99",
          "name": "frontend",
          "pid": 11912,
          "reason": "playwright-global-teardown",
          "stoppedBy": "global-teardown.mjs"
        },
        {
          "at": "2026-07-06T20:28:50.327Z",
          "by": "ProcessManager",
          "event": "stop-requested",
          "sessionId": "ea323172-6163-4506-a410-e401586a1c99",
          "name": "api",
          "pid": 2564,
          "reason": "playwright-global-teardown",
          "stoppedBy": "global-teardown.mjs"
        },
        {
          "at": "2026-07-06T20:28:50.557Z",
          "by": "ProcessManager",
          "event": "stopped",
          "sessionId": "ea323172-6163-4506-a410-e401586a1c99",
          "name": "api",
          "pid": 2564,
          "reason": "playwright-global-teardown",
          "stoppedBy": "global-teardown.mjs"
        }
      ],
      "ownerPid": 6248,
      "reuseExistingServer": false,
      "processes": [
        {
          "command": "npx tsx server/src/index.ts",
          "name": "api",
          "pid": 2564,
          "startedAt": "2026-07-06T20:27:59.011Z",
          "startedBy": "ProcessManager.startManagedProcess",
          "stoppedAt": "2026-07-06T20:28:50.557Z",
          "stoppedBy": "global-teardown.mjs"
        },
        {
          "command": "npx expo start --web --localhost --port 8081",
          "name": "frontend",
          "pid": 11912,
          "startedAt": "2026-07-06T20:27:59.073Z",
          "startedBy": "ProcessManager.startManagedProcess",
          "stoppedAt": "2026-07-06T20:28:50.326Z",
          "stoppedBy": "global-teardown.mjs"
        }
      ],
      "sessionId": "ea323172-6163-4506-a410-e401586a1c99",
      "updatedAt": "2026-07-06T20:28:50.560Z"
    },
    "recovered": []
  },
  "live": {
    "attempts": 15,
    "durationMs": 14287,
    "payload": {
      "ok": true,
      "requestId": "17afcf43-7023-4bd3-b181-d7829044737a",
      "service": "ecg-insight-api",
      "uptimeSeconds": 11
    }
  },
  "apiReady": {
    "attempts": 1,
    "durationMs": 248,
    "ok": true
  },
  "apiReadiness": {
    "checks": {
      "database": {
        "details": {
          "activeSessions": 7337,
          "auditEventsLast24h": 625,
          "provider": "postgresql",
          "users": 213
        },
        "durationMs": 236,
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
          "fileCount": 1390,
          "path": "C:\\Users\\Ahmed\\Downloads\\BelatedElasticLoop\\uploads",
          "sizeBytes": 9490637,
          "writable": true
        },
        "durationMs": 238,
        "ok": true,
        "status": "healthy"
      }
    },
    "durationMs": 238,
    "environment": "development",
    "ok": true,
    "service": "ecg-insight-api",
    "timestamp": "2026-07-06T20:29:33.486Z",
    "requestId": "b4a555d7-fe99-4c1a-9e18-c5b68bc208b2",
    "status": "ready"
  },
  "frontend": {
    "attempts": 2,
    "durationMs": 8497,
    "payload": {}
  },
  "ollama": {
    "durationMs": 4,
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
