# Infrastructure Report

Generated: 2026-07-06T19:26:04.463Z

## Summary

| Metric | Value |
|--------|-------|
| Session ID | ec583acc-ee81-4b58-b8af-3c1a9374994f |
| Reuse existing server | yes |
| Startup time | 239 ms |
| API readiness | ready |
| Ollama readiness | skipped (mock mode) |
| Database latency | 23 ms |
| Frontend startup | 111 ms |
| CPU cores | 12 |
| Memory free / total | 2597 MB / 16240 MB |
| Process lifecycle report | PROCESS_LIFECYCLE_REPORT.md |

## Failed connections

- None

## Step timings

```json
{
  "mode": "reuse-existing-server",
  "live": {
    "attempts": 1,
    "durationMs": 65,
    "payload": {
      "ok": true,
      "requestId": "bd493507-2b4a-4d69-99d2-d27e57192a4b",
      "service": "ecg-insight-api",
      "uptimeSeconds": 6466
    }
  },
  "apiReady": {
    "attempts": 1,
    "durationMs": 37,
    "ok": true
  },
  "apiReadiness": {
    "checks": {
      "database": {
        "details": {
          "activeSessions": 7288,
          "auditEventsLast24h": 499,
          "provider": "postgresql",
          "users": 212
        },
        "durationMs": 23,
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
          "fileCount": 1382,
          "path": "C:\\Users\\Ahmed\\Downloads\\BelatedElasticLoop\\uploads",
          "sizeBytes": 9410797,
          "writable": true
        },
        "durationMs": 22,
        "ok": true,
        "status": "healthy"
      }
    },
    "durationMs": 23,
    "environment": "development",
    "ok": true,
    "service": "ecg-insight-api",
    "timestamp": "2026-07-06T19:26:04.334Z",
    "requestId": "10d410c0-a280-4d2f-a2f2-96c23bac9c8e",
    "status": "ready"
  },
  "frontend": {
    "attempts": 1,
    "durationMs": 111,
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
