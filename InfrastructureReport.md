# Infrastructure Report

Generated: 2026-07-04T21:56:22.559Z

## Summary

| Metric | Value |
|--------|-------|
| Session ID | 96cee5f3-c5e0-47a3-85f2-5654a68359e8 |
| Reuse existing server | no |
| Startup time | 14467 ms |
| API readiness | ready |
| Ollama readiness | skipped (mock mode) |
| Database latency | 705 ms |
| Frontend startup | 752 ms |
| CPU cores | 12 |
| Memory free / total | 3938 MB / 16240 MB |
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
          "at": "2026-07-04T21:38:34.054Z",
          "by": "ProcessManager",
          "event": "started",
          "sessionId": "6832ca55-354c-439c-b80b-b745066b6241",
          "command": "npx tsx server/src/index.ts",
          "name": "api",
          "pid": 30532,
          "startedBy": "ProcessManager.startManagedProcess"
        },
        {
          "at": "2026-07-04T21:38:34.223Z",
          "by": "ProcessManager",
          "event": "started",
          "sessionId": "6832ca55-354c-439c-b80b-b745066b6241",
          "command": "npx expo start --web --localhost --port 8081",
          "name": "frontend",
          "pid": 20476,
          "startedBy": "ProcessManager.startManagedProcess"
        },
        {
          "at": "2026-07-04T21:38:34.257Z",
          "by": "ProcessManager",
          "event": "ready-retry",
          "sessionId": "6832ca55-354c-439c-b80b-b745066b6241",
          "attempts": 1,
          "error": "fetch failed",
          "name": "api-live",
          "url": "http://127.0.0.1:3002/live"
        },
        {
          "at": "2026-07-04T21:38:34.619Z",
          "by": "ProcessManager",
          "event": "ready-retry",
          "sessionId": "6832ca55-354c-439c-b80b-b745066b6241",
          "attempts": 2,
          "error": "fetch failed",
          "name": "api-live",
          "url": "http://127.0.0.1:3002/live"
        },
        {
          "at": "2026-07-04T21:38:35.090Z",
          "by": "ProcessManager",
          "event": "ready-retry",
          "sessionId": "6832ca55-354c-439c-b80b-b745066b6241",
          "attempts": 3,
          "error": "fetch failed",
          "name": "api-live",
          "url": "http://127.0.0.1:3002/live"
        },
        {
          "at": "2026-07-04T21:38:35.655Z",
          "by": "ProcessManager",
          "event": "ready-retry",
          "sessionId": "6832ca55-354c-439c-b80b-b745066b6241",
          "attempts": 4,
          "error": "fetch failed",
          "name": "api-live",
          "url": "http://127.0.0.1:3002/live"
        },
        {
          "at": "2026-07-04T21:38:36.319Z",
          "by": "ProcessManager",
          "event": "ready-retry",
          "sessionId": "6832ca55-354c-439c-b80b-b745066b6241",
          "attempts": 5,
          "error": "fetch failed",
          "name": "api-live",
          "url": "http://127.0.0.1:3002/live"
        },
        {
          "at": "2026-07-04T21:38:37.082Z",
          "by": "ProcessManager",
          "event": "ready-retry",
          "sessionId": "6832ca55-354c-439c-b80b-b745066b6241",
          "attempts": 6,
          "error": "fetch failed",
          "name": "api-live",
          "url": "http://127.0.0.1:3002/live"
        },
        {
          "at": "2026-07-04T21:38:37.938Z",
          "by": "ProcessManager",
          "event": "ready-retry",
          "sessionId": "6832ca55-354c-439c-b80b-b745066b6241",
          "attempts": 7,
          "error": "fetch failed",
          "name": "api-live",
          "url": "http://127.0.0.1:3002/live"
        },
        {
          "at": "2026-07-04T21:38:38.919Z",
          "by": "ProcessManager",
          "event": "ready-retry",
          "sessionId": "6832ca55-354c-439c-b80b-b745066b6241",
          "attempts": 8,
          "error": "fetch failed",
          "name": "api-live",
          "url": "http://127.0.0.1:3002/live"
        },
        {
          "at": "2026-07-04T21:38:39.985Z",
          "by": "ProcessManager",
          "event": "ready-retry",
          "sessionId": "6832ca55-354c-439c-b80b-b745066b6241",
          "attempts": 9,
          "error": "fetch failed",
          "name": "api-live",
          "url": "http://127.0.0.1:3002/live"
        },
        {
          "at": "2026-07-04T21:38:41.142Z",
          "by": "ProcessManager",
          "event": "ready-retry",
          "sessionId": "6832ca55-354c-439c-b80b-b745066b6241",
          "attempts": 10,
          "error": "fetch failed",
          "name": "api-live",
          "url": "http://127.0.0.1:3002/live"
        },
        {
          "at": "2026-07-04T21:38:42.404Z",
          "by": "ProcessManager",
          "event": "ready-retry",
          "sessionId": "6832ca55-354c-439c-b80b-b745066b6241",
          "attempts": 11,
          "error": "fetch failed",
          "name": "api-live",
          "url": "http://127.0.0.1:3002/live"
        },
        {
          "at": "2026-07-04T21:38:43.858Z",
          "by": "ProcessManager",
          "event": "ready",
          "sessionId": "6832ca55-354c-439c-b80b-b745066b6241",
          "attempts": 12,
          "durationMs": 9633,
          "name": "api-live",
          "url": "http://127.0.0.1:3002/live"
        },
        {
          "at": "2026-07-04T21:38:44.309Z",
          "by": "ProcessManager",
          "event": "ready",
          "sessionId": "6832ca55-354c-439c-b80b-b745066b6241",
          "attempts": 1,
          "durationMs": 444,
          "name": "api-ready",
          "url": "http://127.0.0.1:3002/ready"
        },
        {
          "at": "2026-07-04T21:38:44.559Z",
          "by": "ProcessManager",
          "event": "ready",
          "sessionId": "6832ca55-354c-439c-b80b-b745066b6241",
          "attempts": 1,
          "durationMs": 246,
          "name": "frontend",
          "url": "http://127.0.0.1:8081"
        },
        {
          "at": "2026-07-04T21:40:29.120Z",
          "by": "ProcessManager",
          "event": "stop-requested",
          "sessionId": "6832ca55-354c-439c-b80b-b745066b6241",
          "name": "frontend",
          "pid": 20476,
          "reason": "playwright-global-teardown",
          "stoppedBy": "global-teardown.mjs"
        },
        {
          "at": "2026-07-04T21:40:29.504Z",
          "by": "ProcessManager",
          "event": "stopped",
          "sessionId": "6832ca55-354c-439c-b80b-b745066b6241",
          "name": "frontend",
          "pid": 20476,
          "reason": "playwright-global-teardown",
          "stoppedBy": "global-teardown.mjs"
        },
        {
          "at": "2026-07-04T21:40:29.508Z",
          "by": "ProcessManager",
          "event": "stop-requested",
          "sessionId": "6832ca55-354c-439c-b80b-b745066b6241",
          "name": "api",
          "pid": 30532,
          "reason": "playwright-global-teardown",
          "stoppedBy": "global-teardown.mjs"
        },
        {
          "at": "2026-07-04T21:40:29.929Z",
          "by": "ProcessManager",
          "event": "stopped",
          "sessionId": "6832ca55-354c-439c-b80b-b745066b6241",
          "name": "api",
          "pid": 30532,
          "reason": "playwright-global-teardown",
          "stoppedBy": "global-teardown.mjs"
        }
      ],
      "ownerPid": 32468,
      "reuseExistingServer": false,
      "processes": [
        {
          "command": "npx tsx server/src/index.ts",
          "name": "api",
          "pid": 30532,
          "startedAt": "2026-07-04T21:38:34.052Z",
          "startedBy": "ProcessManager.startManagedProcess",
          "stoppedAt": "2026-07-04T21:40:29.928Z",
          "stoppedBy": "global-teardown.mjs"
        },
        {
          "command": "npx expo start --web --localhost --port 8081",
          "name": "frontend",
          "pid": 20476,
          "startedAt": "2026-07-04T21:38:34.223Z",
          "startedBy": "ProcessManager.startManagedProcess",
          "stoppedAt": "2026-07-04T21:40:29.504Z",
          "stoppedBy": "global-teardown.mjs"
        }
      ],
      "sessionId": "6832ca55-354c-439c-b80b-b745066b6241",
      "updatedAt": "2026-07-04T21:40:29.932Z"
    },
    "recovered": []
  },
  "live": {
    "attempts": 14,
    "durationMs": 12650,
    "payload": {
      "ok": true,
      "requestId": "f97fd798-05f9-40bb-a5a0-1d163321e853",
      "service": "ecg-insight-api",
      "uptimeSeconds": 10
    }
  },
  "apiReady": {
    "attempts": 1,
    "durationMs": 721,
    "ok": true
  },
  "apiReadiness": {
    "checks": {
      "database": {
        "details": {
          "activeSessions": 6487,
          "auditEventsLast24h": 5665,
          "provider": "postgresql",
          "users": 203
        },
        "durationMs": 705,
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
          "fileCount": 1196,
          "path": "C:\\Users\\Ahmed\\Downloads\\BelatedElasticLoop\\uploads",
          "sizeBytes": 7885878,
          "writable": true
        },
        "durationMs": 471,
        "ok": true,
        "status": "healthy"
      }
    },
    "durationMs": 706,
    "environment": "development",
    "ok": true,
    "service": "ecg-insight-api",
    "timestamp": "2026-07-04T21:43:24.852Z",
    "requestId": "b29ebfa5-baf7-47bf-9998-7f2a5a4ce6f2",
    "status": "ready"
  },
  "frontend": {
    "attempts": 1,
    "durationMs": 752,
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
