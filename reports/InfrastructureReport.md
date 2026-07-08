# Infrastructure Report

Generated: 2026-07-08T01:37:04.784Z

## Summary

| Metric | Value |
|--------|-------|
| Session ID | aca4d59f-662d-47d3-87d9-f95b1a6d9c19 |
| Reuse existing server | no |
| Startup time | 11752 ms |
| API readiness | ready |
| Ollama readiness | healthy |
| Database latency | 437 ms |
| Frontend startup | 751 ms |
| CPU cores | 12 |
| Memory free / total | 4673 MB / 16240 MB |
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
          "at": "2026-07-08T01:36:02.923Z",
          "by": "ProcessManager",
          "event": "port-cleanup",
          "sessionId": "f70b69f8-c9de-4214-a74f-f41d6e0b2efd",
          "killed": [
            26236,
            13164
          ],
          "port": 3002,
          "service": "api"
        },
        {
          "at": "2026-07-08T01:36:03.691Z",
          "by": "ProcessManager",
          "event": "started",
          "sessionId": "f70b69f8-c9de-4214-a74f-f41d6e0b2efd",
          "command": "npx tsx server/src/index.ts",
          "name": "api",
          "pid": 20432,
          "startedBy": "ProcessManager.startManagedProcess"
        },
        {
          "at": "2026-07-08T01:36:03.967Z",
          "by": "ProcessManager",
          "event": "port-cleanup",
          "sessionId": "f70b69f8-c9de-4214-a74f-f41d6e0b2efd",
          "killed": [
            1452
          ],
          "port": 8081,
          "service": "frontend"
        },
        {
          "at": "2026-07-08T01:36:04.742Z",
          "by": "ProcessManager",
          "event": "started",
          "sessionId": "f70b69f8-c9de-4214-a74f-f41d6e0b2efd",
          "command": "npx expo start --web --localhost --port 8081",
          "name": "frontend",
          "pid": 4264,
          "startedBy": "ProcessManager.startManagedProcess"
        },
        {
          "at": "2026-07-08T01:36:04.758Z",
          "by": "ProcessManager",
          "event": "ready-retry",
          "sessionId": "f70b69f8-c9de-4214-a74f-f41d6e0b2efd",
          "attempts": 1,
          "error": "fetch failed",
          "name": "api-live",
          "url": "http://127.0.0.1:3002/live"
        },
        {
          "at": "2026-07-08T01:36:05.126Z",
          "by": "ProcessManager",
          "event": "ready-retry",
          "sessionId": "f70b69f8-c9de-4214-a74f-f41d6e0b2efd",
          "attempts": 2,
          "error": "fetch failed",
          "name": "api-live",
          "url": "http://127.0.0.1:3002/live"
        },
        {
          "at": "2026-07-08T01:36:05.585Z",
          "by": "ProcessManager",
          "event": "ready-retry",
          "sessionId": "f70b69f8-c9de-4214-a74f-f41d6e0b2efd",
          "attempts": 3,
          "error": "fetch failed",
          "name": "api-live",
          "url": "http://127.0.0.1:3002/live"
        },
        {
          "at": "2026-07-08T01:36:06.150Z",
          "by": "ProcessManager",
          "event": "ready-retry",
          "sessionId": "f70b69f8-c9de-4214-a74f-f41d6e0b2efd",
          "attempts": 4,
          "error": "fetch failed",
          "name": "api-live",
          "url": "http://127.0.0.1:3002/live"
        },
        {
          "at": "2026-07-08T01:36:06.817Z",
          "by": "ProcessManager",
          "event": "ready-retry",
          "sessionId": "f70b69f8-c9de-4214-a74f-f41d6e0b2efd",
          "attempts": 5,
          "error": "fetch failed",
          "name": "api-live",
          "url": "http://127.0.0.1:3002/live"
        },
        {
          "at": "2026-07-08T01:36:07.581Z",
          "by": "ProcessManager",
          "event": "ready-retry",
          "sessionId": "f70b69f8-c9de-4214-a74f-f41d6e0b2efd",
          "attempts": 6,
          "error": "fetch failed",
          "name": "api-live",
          "url": "http://127.0.0.1:3002/live"
        },
        {
          "at": "2026-07-08T01:36:08.450Z",
          "by": "ProcessManager",
          "event": "ready-retry",
          "sessionId": "f70b69f8-c9de-4214-a74f-f41d6e0b2efd",
          "attempts": 7,
          "error": "fetch failed",
          "name": "api-live",
          "url": "http://127.0.0.1:3002/live"
        },
        {
          "at": "2026-07-08T01:36:09.417Z",
          "by": "ProcessManager",
          "event": "ready-retry",
          "sessionId": "f70b69f8-c9de-4214-a74f-f41d6e0b2efd",
          "attempts": 8,
          "error": "fetch failed",
          "name": "api-live",
          "url": "http://127.0.0.1:3002/live"
        },
        {
          "at": "2026-07-08T01:36:10.514Z",
          "by": "ProcessManager",
          "event": "ready",
          "sessionId": "f70b69f8-c9de-4214-a74f-f41d6e0b2efd",
          "attempts": 9,
          "durationMs": 5770,
          "name": "api-live",
          "url": "http://127.0.0.1:3002/live"
        },
        {
          "at": "2026-07-08T01:36:10.838Z",
          "by": "ProcessManager",
          "event": "ready",
          "sessionId": "f70b69f8-c9de-4214-a74f-f41d6e0b2efd",
          "attempts": 1,
          "durationMs": 320,
          "name": "api-ready",
          "url": "http://127.0.0.1:3002/ready"
        },
        {
          "at": "2026-07-08T01:36:11.826Z",
          "by": "ProcessManager",
          "event": "ready",
          "sessionId": "f70b69f8-c9de-4214-a74f-f41d6e0b2efd",
          "attempts": 1,
          "durationMs": 985,
          "name": "frontend",
          "url": "http://127.0.0.1:8081"
        }
      ],
      "ownerPid": 18204,
      "reuseExistingServer": false,
      "processes": [
        {
          "command": "npx tsx server/src/index.ts",
          "name": "api",
          "pid": 20432,
          "startedAt": "2026-07-08T01:36:03.691Z",
          "startedBy": "ProcessManager.startManagedProcess",
          "stoppedAt": null,
          "stoppedBy": null
        },
        {
          "command": "npx expo start --web --localhost --port 8081",
          "name": "frontend",
          "pid": 4264,
          "startedAt": "2026-07-08T01:36:04.742Z",
          "startedBy": "ProcessManager.startManagedProcess",
          "stoppedAt": null,
          "stoppedBy": null
        }
      ],
      "sessionId": "f70b69f8-c9de-4214-a74f-f41d6e0b2efd",
      "updatedAt": "2026-07-08T01:36:11.836Z"
    },
    "recovered": []
  },
  "live": {
    "attempts": 11,
    "durationMs": 8243,
    "payload": {
      "ok": true,
      "requestId": "0d7e87e1-57eb-4b9c-b399-5b6780c0a5bd",
      "service": "ecg-insight-api",
      "uptimeSeconds": 7
    }
  },
  "apiReady": {
    "attempts": 1,
    "durationMs": 456,
    "ok": true
  },
  "apiReadiness": {
    "checks": {
      "database": {
        "details": {
          "activeSessions": 10361,
          "auditEventsLast24h": 3892,
          "provider": "postgresql",
          "users": 243
        },
        "durationMs": 437,
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
          "fileCount": 1919,
          "path": "C:\\Users\\Ahmed\\Downloads\\BelatedElasticLoop\\uploads",
          "sizeBytes": 14047124,
          "writable": true
        },
        "durationMs": 363,
        "ok": true,
        "status": "healthy"
      }
    },
    "durationMs": 437,
    "environment": "development",
    "ok": true,
    "service": "ecg-insight-api",
    "timestamp": "2026-07-08T01:37:04.012Z",
    "requestId": "b24946e3-4662-4ab7-805b-db9cc11d404a",
    "status": "ready"
  },
  "frontend": {
    "attempts": 1,
    "durationMs": 751,
    "payload": {}
  },
  "ollama": {
    "durationMs": 6,
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
