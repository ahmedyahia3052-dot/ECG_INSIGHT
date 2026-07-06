# Infrastructure Report

Generated: 2026-07-06T16:30:11.009Z

## Summary

| Metric | Value |
|--------|-------|
| Session ID | 3a41708f-097f-4841-bbb5-82434f5444a1 |
| Reuse existing server | yes |
| Startup time | 476 ms |
| API readiness | ready |
| Ollama readiness | skipped (mock mode) |
| Database latency | 322 ms |
| Frontend startup | 42 ms |
| CPU cores | 12 |
| Memory free / total | 935 MB / 16240 MB |
| Process lifecycle report | PROCESS_LIFECYCLE_REPORT.md |

## Failed connections

- None

## Step timings

```json
{
  "mode": "reuse-existing-server",
  "live": {
    "attempts": 1,
    "durationMs": 66,
    "payload": {
      "ok": true,
      "requestId": "c82d9424-bce9-4a83-b6b0-3b04ac9a62e5",
      "service": "ecg-insight-api",
      "uptimeSeconds": 140918
    }
  },
  "apiReady": {
    "attempts": 1,
    "durationMs": 336,
    "ok": true
  },
  "apiReadiness": {
    "checks": {
      "database": {
        "details": {
          "activeSessions": 7175,
          "auditEventsLast24h": 165,
          "provider": "postgresql",
          "users": 212
        },
        "durationMs": 322,
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
          "fileCount": 1362,
          "path": "C:\\Users\\Ahmed\\Downloads\\BelatedElasticLoop\\uploads",
          "sizeBytes": 9211197,
          "writable": true
        },
        "durationMs": 162,
        "ok": true,
        "status": "healthy"
      }
    },
    "durationMs": 322,
    "environment": "development",
    "ok": true,
    "service": "ecg-insight-api",
    "timestamp": "2026-07-06T16:30:10.949Z",
    "requestId": "ad0a03e8-cb33-4de5-8611-5b20aec72a73",
    "status": "ready"
  },
  "frontend": {
    "attempts": 1,
    "durationMs": 42,
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
