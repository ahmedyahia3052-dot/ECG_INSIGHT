# Infrastructure Report

Generated: 2026-07-08T15:45:27.557Z

## Summary

| Metric | Value |
|--------|-------|
| Session ID | d4cd6f35-3e47-49fa-a245-dc1b62618a9b |
| Reuse existing server | no |
| Startup time | 22895 ms |
| API readiness | ready |
| Ollama readiness | healthy |
| Database latency | 734 ms |
| Frontend startup | 4494 ms |
| CPU cores | 12 |
| Memory free / total | 1557 MB / 16240 MB |
| Process lifecycle report | PROCESS_LIFECYCLE_REPORT.md |

## Failed connections

- None

## Step timings

```json
{
  "mode": "managed-session",
  "recovery": {
    "recovered": [],
    "skipped": "no-manifest"
  },
  "live": {
    "attempts": 15,
    "durationMs": 14412,
    "payload": {
      "ok": true,
      "requestId": "9be54c54-a716-4443-96c0-c578f07b1557",
      "service": "ecg-insight-api",
      "uptimeSeconds": 12
    }
  },
  "apiReady": {
    "attempts": 1,
    "durationMs": 761,
    "ok": true
  },
  "apiReadiness": {
    "checks": {
      "database": {
        "details": {
          "activeSessions": 10366,
          "auditEventsLast24h": 3144,
          "provider": "postgresql",
          "users": 250
        },
        "durationMs": 734,
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
          "fileCount": 1920,
          "path": "C:\\Users\\Ahmed\\Downloads\\BelatedElasticLoop\\uploads",
          "sizeBytes": 14057104,
          "writable": true
        },
        "durationMs": 729,
        "ok": true,
        "status": "healthy"
      }
    },
    "durationMs": 734,
    "environment": "development",
    "ok": true,
    "service": "ecg-insight-api",
    "timestamp": "2026-07-08T15:41:12.466Z",
    "requestId": "61969e4d-d6f8-4178-8bac-932aa5bd6d82",
    "status": "ready"
  },
  "frontend": {
    "attempts": 1,
    "durationMs": 4494,
    "payload": {}
  },
  "ollama": {
    "durationMs": 9,
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
