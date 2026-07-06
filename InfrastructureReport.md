# Infrastructure Report

Generated: 2026-07-06T01:27:07.024Z

## Summary

| Metric | Value |
|--------|-------|
| Session ID | 0c2d4387-a676-4fb7-a018-e7d8e8d7b799 |
| Reuse existing server | yes |
| Startup time | 205 ms |
| API readiness | ready |
| Ollama readiness | skipped (mock mode) |
| Database latency | 141 ms |
| Frontend startup | 23 ms |
| CPU cores | 12 |
| Memory free / total | 1276 MB / 16240 MB |
| Process lifecycle report | PROCESS_LIFECYCLE_REPORT.md |

## Failed connections

- None

## Step timings

```json
{
  "mode": "reuse-existing-server",
  "live": {
    "attempts": 1,
    "durationMs": 25,
    "payload": {
      "ok": true,
      "requestId": "142d2623-16c4-4deb-be5a-34f37ebac015",
      "service": "ecg-insight-api",
      "uptimeSeconds": 86731
    }
  },
  "apiReady": {
    "attempts": 1,
    "durationMs": 147,
    "ok": true
  },
  "apiReadiness": {
    "checks": {
      "database": {
        "details": {
          "activeSessions": 7166,
          "auditEventsLast24h": 500,
          "provider": "postgresql",
          "users": 212
        },
        "durationMs": 141,
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
          "fileCount": 1361,
          "path": "C:\\Users\\Ahmed\\Downloads\\BelatedElasticLoop\\uploads",
          "sizeBytes": 9201217,
          "writable": true
        },
        "durationMs": 75,
        "ok": true,
        "status": "healthy"
      }
    },
    "durationMs": 141,
    "environment": "development",
    "ok": true,
    "service": "ecg-insight-api",
    "timestamp": "2026-07-06T01:27:06.993Z",
    "requestId": "377ad74e-7ef6-46e1-94fa-eaec23b54237",
    "status": "ready"
  },
  "frontend": {
    "attempts": 1,
    "durationMs": 23,
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
