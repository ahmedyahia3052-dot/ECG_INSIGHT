# Infrastructure Report

Generated: 2026-07-04T19:04:30.676Z

## Summary

| Metric | Value |
|--------|-------|
| Session ID | 584e22c8-0dae-49f7-855a-a8e2a4bd9e07 |
| Reuse existing server | no |
| Startup time | 32918 ms |
| API readiness | ready |
| Ollama readiness | skipped (mock mode) |
| Database latency | 239 ms |
| Frontend startup | 17855 ms |
| CPU cores | 12 |
| Memory free / total | 1845 MB / 16240 MB |
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
          "at": "2026-07-04T17:46:33.339Z",
          "by": "ProcessManager",
          "event": "started",
          "sessionId": "676fbd69-c7b6-4e5a-8b5a-1274f15f9d2d",
          "command": "npx tsx server/src/index.ts",
          "name": "api",
          "pid": 32628,
          "startedBy": "ProcessManager.startManagedProcess"
        },
        {
          "at": "2026-07-04T17:46:33.535Z",
          "by": "ProcessManager",
          "event": "started",
          "sessionId": "676fbd69-c7b6-4e5a-8b5a-1274f15f9d2d",
          "command": "npx expo start --web --localhost --port 8081",
          "name": "frontend",
          "pid": 28292,
          "startedBy": "ProcessManager.startManagedProcess"
        },
        {
          "at": "2026-07-04T17:46:33.588Z",
          "by": "ProcessManager",
          "event": "ready-retry",
          "sessionId": "676fbd69-c7b6-4e5a-8b5a-1274f15f9d2d",
          "attempts": 1,
          "error": "fetch failed",
          "name": "api-live",
          "url": "http://127.0.0.1:3002/live"
        },
        {
          "at": "2026-07-04T17:46:33.951Z",
          "by": "ProcessManager",
          "event": "ready-retry",
          "sessionId": "676fbd69-c7b6-4e5a-8b5a-1274f15f9d2d",
          "attempts": 2,
          "error": "fetch failed",
          "name": "api-live",
          "url": "http://127.0.0.1:3002/live"
        },
        {
          "at": "2026-07-04T17:46:34.417Z",
          "by": "ProcessManager",
          "event": "ready-retry",
          "sessionId": "676fbd69-c7b6-4e5a-8b5a-1274f15f9d2d",
          "attempts": 3,
          "error": "fetch failed",
          "name": "api-live",
          "url": "http://127.0.0.1:3002/live"
        },
        {
          "at": "2026-07-04T17:46:34.987Z",
          "by": "ProcessManager",
          "event": "ready-retry",
          "sessionId": "676fbd69-c7b6-4e5a-8b5a-1274f15f9d2d",
          "attempts": 4,
          "error": "fetch failed",
          "name": "api-live",
          "url": "http://127.0.0.1:3002/live"
        },
        {
          "at": "2026-07-04T17:46:35.652Z",
          "by": "ProcessManager",
          "event": "ready-retry",
          "sessionId": "676fbd69-c7b6-4e5a-8b5a-1274f15f9d2d",
          "attempts": 5,
          "error": "fetch failed",
          "name": "api-live",
          "url": "http://127.0.0.1:3002/live"
        },
        {
          "at": "2026-07-04T17:46:36.408Z",
          "by": "ProcessManager",
          "event": "ready-retry",
          "sessionId": "676fbd69-c7b6-4e5a-8b5a-1274f15f9d2d",
          "attempts": 6,
          "error": "fetch failed",
          "name": "api-live",
          "url": "http://127.0.0.1:3002/live"
        },
        {
          "at": "2026-07-04T17:46:37.270Z",
          "by": "ProcessManager",
          "event": "ready-retry",
          "sessionId": "676fbd69-c7b6-4e5a-8b5a-1274f15f9d2d",
          "attempts": 7,
          "error": "fetch failed",
          "name": "api-live",
          "url": "http://127.0.0.1:3002/live"
        },
        {
          "at": "2026-07-04T17:46:38.232Z",
          "by": "ProcessManager",
          "event": "ready-retry",
          "sessionId": "676fbd69-c7b6-4e5a-8b5a-1274f15f9d2d",
          "attempts": 8,
          "error": "fetch failed",
          "name": "api-live",
          "url": "http://127.0.0.1:3002/live"
        },
        {
          "at": "2026-07-04T17:46:39.298Z",
          "by": "ProcessManager",
          "event": "ready-retry",
          "sessionId": "676fbd69-c7b6-4e5a-8b5a-1274f15f9d2d",
          "attempts": 9,
          "error": "fetch failed",
          "name": "api-live",
          "url": "http://127.0.0.1:3002/live"
        },
        {
          "at": "2026-07-04T17:46:40.469Z",
          "by": "ProcessManager",
          "event": "ready-retry",
          "sessionId": "676fbd69-c7b6-4e5a-8b5a-1274f15f9d2d",
          "attempts": 10,
          "error": "fetch failed",
          "name": "api-live",
          "url": "http://127.0.0.1:3002/live"
        },
        {
          "at": "2026-07-04T17:46:41.742Z",
          "by": "ProcessManager",
          "event": "ready-retry",
          "sessionId": "676fbd69-c7b6-4e5a-8b5a-1274f15f9d2d",
          "attempts": 11,
          "error": "fetch failed",
          "name": "api-live",
          "url": "http://127.0.0.1:3002/live"
        },
        {
          "at": "2026-07-04T17:46:43.215Z",
          "by": "ProcessManager",
          "event": "ready",
          "sessionId": "676fbd69-c7b6-4e5a-8b5a-1274f15f9d2d",
          "attempts": 12,
          "durationMs": 9676,
          "name": "api-live",
          "url": "http://127.0.0.1:3002/live"
        },
        {
          "at": "2026-07-04T17:46:43.833Z",
          "by": "ProcessManager",
          "event": "ready",
          "sessionId": "676fbd69-c7b6-4e5a-8b5a-1274f15f9d2d",
          "attempts": 1,
          "durationMs": 612,
          "name": "api-ready",
          "url": "http://127.0.0.1:3002/ready"
        },
        {
          "at": "2026-07-04T17:46:44.785Z",
          "by": "ProcessManager",
          "event": "ready",
          "sessionId": "676fbd69-c7b6-4e5a-8b5a-1274f15f9d2d",
          "attempts": 1,
          "durationMs": 949,
          "name": "frontend",
          "url": "http://127.0.0.1:8081"
        },
        {
          "at": "2026-07-04T17:48:37.128Z",
          "by": "ProcessManager",
          "event": "stop-requested",
          "sessionId": "676fbd69-c7b6-4e5a-8b5a-1274f15f9d2d",
          "name": "frontend",
          "pid": 28292,
          "reason": "playwright-global-teardown",
          "stoppedBy": "global-teardown.mjs"
        },
        {
          "at": "2026-07-04T17:48:37.601Z",
          "by": "ProcessManager",
          "event": "stopped",
          "sessionId": "676fbd69-c7b6-4e5a-8b5a-1274f15f9d2d",
          "name": "frontend",
          "pid": 28292,
          "reason": "playwright-global-teardown",
          "stoppedBy": "global-teardown.mjs"
        },
        {
          "at": "2026-07-04T17:48:37.607Z",
          "by": "ProcessManager",
          "event": "stop-requested",
          "sessionId": "676fbd69-c7b6-4e5a-8b5a-1274f15f9d2d",
          "name": "api",
          "pid": 32628,
          "reason": "playwright-global-teardown",
          "stoppedBy": "global-teardown.mjs"
        },
        {
          "at": "2026-07-04T17:48:38.207Z",
          "by": "ProcessManager",
          "event": "stopped",
          "sessionId": "676fbd69-c7b6-4e5a-8b5a-1274f15f9d2d",
          "name": "api",
          "pid": 32628,
          "reason": "playwright-global-teardown",
          "stoppedBy": "global-teardown.mjs"
        }
      ],
      "ownerPid": 3092,
      "reuseExistingServer": false,
      "processes": [
        {
          "command": "npx tsx server/src/index.ts",
          "name": "api",
          "pid": 32628,
          "startedAt": "2026-07-04T17:46:33.337Z",
          "startedBy": "ProcessManager.startManagedProcess",
          "stoppedAt": "2026-07-04T17:48:38.207Z",
          "stoppedBy": "global-teardown.mjs"
        },
        {
          "command": "npx expo start --web --localhost --port 8081",
          "name": "frontend",
          "pid": 28292,
          "startedAt": "2026-07-04T17:46:33.535Z",
          "startedBy": "ProcessManager.startManagedProcess",
          "stoppedAt": "2026-07-04T17:48:37.601Z",
          "stoppedBy": "global-teardown.mjs"
        }
      ],
      "sessionId": "676fbd69-c7b6-4e5a-8b5a-1274f15f9d2d",
      "updatedAt": "2026-07-04T17:48:38.210Z"
    },
    "recovered": []
  },
  "live": {
    "attempts": 15,
    "durationMs": 14360,
    "payload": {
      "ok": true,
      "requestId": "159e0236-cb7f-46fe-9a8f-8bdaae295ed1",
      "service": "ecg-insight-api",
      "uptimeSeconds": 11
    }
  },
  "apiReady": {
    "attempts": 1,
    "durationMs": 258,
    "ok": true
  },
  "apiReadiness": {
    "checks": {
      "database": {
        "details": {
          "activeSessions": 6294,
          "auditEventsLast24h": 6272,
          "provider": "postgresql",
          "users": 201
        },
        "durationMs": 239,
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
          "fileCount": 1144,
          "path": "C:\\Users\\Ahmed\\Downloads\\BelatedElasticLoop\\uploads",
          "sizeBytes": 7458660,
          "writable": true
        },
        "durationMs": 246,
        "ok": true,
        "status": "healthy"
      }
    },
    "durationMs": 247,
    "environment": "development",
    "ok": true,
    "service": "ecg-insight-api",
    "timestamp": "2026-07-04T18:50:02.289Z",
    "requestId": "84a7e346-9716-42e8-8285-b7cebfbe4d9a",
    "status": "ready"
  },
  "frontend": {
    "attempts": 4,
    "durationMs": 17855,
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
