# Infrastructure Report

Generated: 2026-07-04T22:51:58.996Z

## Summary

| Metric | Value |
|--------|-------|
| Session ID | cc757d2e-651d-4ee6-96da-6572a6edc871 |
| Reuse existing server | no |
| Startup time | 13345 ms |
| API readiness | ready |
| Ollama readiness | skipped (mock mode) |
| Database latency | 504 ms |
| Frontend startup | 1203 ms |
| CPU cores | 12 |
| Memory free / total | 2771 MB / 16240 MB |
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
          "at": "2026-07-04T22:37:02.713Z",
          "by": "ProcessManager",
          "event": "started",
          "sessionId": "89b24daf-9c8e-4e9e-b6c1-b91021d3b11e",
          "command": "npx tsx server/src/index.ts",
          "name": "api",
          "pid": 9804,
          "startedBy": "ProcessManager.startManagedProcess"
        },
        {
          "at": "2026-07-04T22:37:02.883Z",
          "by": "ProcessManager",
          "event": "started",
          "sessionId": "89b24daf-9c8e-4e9e-b6c1-b91021d3b11e",
          "command": "npx expo start --web --localhost --port 8081",
          "name": "frontend",
          "pid": 23296,
          "startedBy": "ProcessManager.startManagedProcess"
        },
        {
          "at": "2026-07-04T22:37:02.909Z",
          "by": "ProcessManager",
          "event": "ready-retry",
          "sessionId": "89b24daf-9c8e-4e9e-b6c1-b91021d3b11e",
          "attempts": 1,
          "error": "fetch failed",
          "name": "api-live",
          "url": "http://127.0.0.1:3002/live"
        },
        {
          "at": "2026-07-04T22:37:03.277Z",
          "by": "ProcessManager",
          "event": "ready-retry",
          "sessionId": "89b24daf-9c8e-4e9e-b6c1-b91021d3b11e",
          "attempts": 2,
          "error": "fetch failed",
          "name": "api-live",
          "url": "http://127.0.0.1:3002/live"
        },
        {
          "at": "2026-07-04T22:37:03.743Z",
          "by": "ProcessManager",
          "event": "ready-retry",
          "sessionId": "89b24daf-9c8e-4e9e-b6c1-b91021d3b11e",
          "attempts": 3,
          "error": "fetch failed",
          "name": "api-live",
          "url": "http://127.0.0.1:3002/live"
        },
        {
          "at": "2026-07-04T22:37:04.310Z",
          "by": "ProcessManager",
          "event": "ready-retry",
          "sessionId": "89b24daf-9c8e-4e9e-b6c1-b91021d3b11e",
          "attempts": 4,
          "error": "fetch failed",
          "name": "api-live",
          "url": "http://127.0.0.1:3002/live"
        },
        {
          "at": "2026-07-04T22:37:04.975Z",
          "by": "ProcessManager",
          "event": "ready-retry",
          "sessionId": "89b24daf-9c8e-4e9e-b6c1-b91021d3b11e",
          "attempts": 5,
          "error": "fetch failed",
          "name": "api-live",
          "url": "http://127.0.0.1:3002/live"
        },
        {
          "at": "2026-07-04T22:37:05.741Z",
          "by": "ProcessManager",
          "event": "ready-retry",
          "sessionId": "89b24daf-9c8e-4e9e-b6c1-b91021d3b11e",
          "attempts": 6,
          "error": "fetch failed",
          "name": "api-live",
          "url": "http://127.0.0.1:3002/live"
        },
        {
          "at": "2026-07-04T22:37:06.624Z",
          "by": "ProcessManager",
          "event": "ready-retry",
          "sessionId": "89b24daf-9c8e-4e9e-b6c1-b91021d3b11e",
          "attempts": 7,
          "error": "fetch failed",
          "name": "api-live",
          "url": "http://127.0.0.1:3002/live"
        },
        {
          "at": "2026-07-04T22:37:07.593Z",
          "by": "ProcessManager",
          "event": "ready-retry",
          "sessionId": "89b24daf-9c8e-4e9e-b6c1-b91021d3b11e",
          "attempts": 8,
          "error": "fetch failed",
          "name": "api-live",
          "url": "http://127.0.0.1:3002/live"
        },
        {
          "at": "2026-07-04T22:37:08.658Z",
          "by": "ProcessManager",
          "event": "ready-retry",
          "sessionId": "89b24daf-9c8e-4e9e-b6c1-b91021d3b11e",
          "attempts": 9,
          "error": "fetch failed",
          "name": "api-live",
          "url": "http://127.0.0.1:3002/live"
        },
        {
          "at": "2026-07-04T22:37:09.827Z",
          "by": "ProcessManager",
          "event": "ready-retry",
          "sessionId": "89b24daf-9c8e-4e9e-b6c1-b91021d3b11e",
          "attempts": 10,
          "error": "fetch failed",
          "name": "api-live",
          "url": "http://127.0.0.1:3002/live"
        },
        {
          "at": "2026-07-04T22:37:11.091Z",
          "by": "ProcessManager",
          "event": "ready-retry",
          "sessionId": "89b24daf-9c8e-4e9e-b6c1-b91021d3b11e",
          "attempts": 11,
          "error": "fetch failed",
          "name": "api-live",
          "url": "http://127.0.0.1:3002/live"
        },
        {
          "at": "2026-07-04T22:37:12.464Z",
          "by": "ProcessManager",
          "event": "ready-retry",
          "sessionId": "89b24daf-9c8e-4e9e-b6c1-b91021d3b11e",
          "attempts": 12,
          "error": "fetch failed",
          "name": "api-live",
          "url": "http://127.0.0.1:3002/live"
        },
        {
          "at": "2026-07-04T22:37:14.032Z",
          "by": "ProcessManager",
          "event": "ready",
          "sessionId": "89b24daf-9c8e-4e9e-b6c1-b91021d3b11e",
          "attempts": 13,
          "durationMs": 11145,
          "name": "api-live",
          "url": "http://127.0.0.1:3002/live"
        },
        {
          "at": "2026-07-04T22:37:14.653Z",
          "by": "ProcessManager",
          "event": "ready",
          "sessionId": "89b24daf-9c8e-4e9e-b6c1-b91021d3b11e",
          "attempts": 1,
          "durationMs": 616,
          "name": "api-ready",
          "url": "http://127.0.0.1:3002/ready"
        },
        {
          "at": "2026-07-04T22:37:15.284Z",
          "by": "ProcessManager",
          "event": "ready",
          "sessionId": "89b24daf-9c8e-4e9e-b6c1-b91021d3b11e",
          "attempts": 1,
          "durationMs": 625,
          "name": "frontend",
          "url": "http://127.0.0.1:8081"
        },
        {
          "at": "2026-07-04T22:38:14.381Z",
          "by": "ProcessManager",
          "event": "stop-requested",
          "sessionId": "89b24daf-9c8e-4e9e-b6c1-b91021d3b11e",
          "name": "frontend",
          "pid": 23296,
          "reason": "playwright-global-teardown",
          "stoppedBy": "global-teardown.mjs"
        },
        {
          "at": "2026-07-04T22:38:14.724Z",
          "by": "ProcessManager",
          "event": "stopped",
          "sessionId": "89b24daf-9c8e-4e9e-b6c1-b91021d3b11e",
          "name": "frontend",
          "pid": 23296,
          "reason": "playwright-global-teardown",
          "stoppedBy": "global-teardown.mjs"
        },
        {
          "at": "2026-07-04T22:38:14.727Z",
          "by": "ProcessManager",
          "event": "stop-requested",
          "sessionId": "89b24daf-9c8e-4e9e-b6c1-b91021d3b11e",
          "name": "api",
          "pid": 9804,
          "reason": "playwright-global-teardown",
          "stoppedBy": "global-teardown.mjs"
        },
        {
          "at": "2026-07-04T22:38:15.176Z",
          "by": "ProcessManager",
          "event": "stopped",
          "sessionId": "89b24daf-9c8e-4e9e-b6c1-b91021d3b11e",
          "name": "api",
          "pid": 9804,
          "reason": "playwright-global-teardown",
          "stoppedBy": "global-teardown.mjs"
        }
      ],
      "ownerPid": 17512,
      "reuseExistingServer": false,
      "processes": [
        {
          "command": "npx tsx server/src/index.ts",
          "name": "api",
          "pid": 9804,
          "startedAt": "2026-07-04T22:37:02.711Z",
          "startedBy": "ProcessManager.startManagedProcess",
          "stoppedAt": "2026-07-04T22:38:15.176Z",
          "stoppedBy": "global-teardown.mjs"
        },
        {
          "command": "npx expo start --web --localhost --port 8081",
          "name": "frontend",
          "pid": 23296,
          "startedAt": "2026-07-04T22:37:02.883Z",
          "startedBy": "ProcessManager.startManagedProcess",
          "stoppedAt": "2026-07-04T22:38:14.724Z",
          "stoppedBy": "global-teardown.mjs"
        }
      ],
      "sessionId": "89b24daf-9c8e-4e9e-b6c1-b91021d3b11e",
      "updatedAt": "2026-07-04T22:38:15.180Z"
    },
    "recovered": []
  },
  "live": {
    "attempts": 13,
    "durationMs": 11174,
    "payload": {
      "ok": true,
      "requestId": "598daf9a-0bae-44b0-b339-d5fa6759625a",
      "service": "ecg-insight-api",
      "uptimeSeconds": 8
    }
  },
  "apiReady": {
    "attempts": 1,
    "durationMs": 526,
    "ok": true
  },
  "apiReadiness": {
    "checks": {
      "database": {
        "details": {
          "activeSessions": 6583,
          "auditEventsLast24h": 5684,
          "provider": "postgresql",
          "users": 206
        },
        "durationMs": 504,
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
          "fileCount": 1222,
          "path": "C:\\Users\\Ahmed\\Downloads\\BelatedElasticLoop\\uploads",
          "sizeBytes": 8084067,
          "writable": true
        },
        "durationMs": 499,
        "ok": true,
        "status": "healthy"
      }
    },
    "durationMs": 504,
    "environment": "development",
    "ok": true,
    "service": "ecg-insight-api",
    "timestamp": "2026-07-04T22:38:45.387Z",
    "requestId": "b3f7864c-83ba-4aa8-8ad9-203bb9230129",
    "status": "ready"
  },
  "frontend": {
    "attempts": 1,
    "durationMs": 1203,
    "payload": {}
  },
  "ollama": {
    "durationMs": 0,
    "ok": true,
    "skipped": true
  },
  "redis": {
    "durationMs": 0,
    "ok": true,
    "skipped": true
  }
}
```
