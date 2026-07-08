# Sprint 66 — Enterprise Notification & Clinical Event Engine

Backend-only enterprise notification and clinical event module for ECG Insight Enterprise.

## Module

`server/src/modules/enterprise-notification-engine/`

## Database models

| Model | Purpose |
|-------|---------|
| `Notification` | Extended with `clinicalEventId`, `engineVersion`, recipient relations |
| `NotificationRecipient` | Per-user delivery tracking across enterprise delivery modes |
| `NotificationRule` | Event-to-notification rule catalog |
| `ClinicalEvent` | Published clinical event audit trail |
| `NotificationTemplate` | Existing template store reused by rule engine |
| `NotificationDeliveryLog` | Existing delivery audit log reused for all channels |

Migration: `prisma/migrations/20260708070000_sprint66_enterprise_notification_event_engine/`

## Clinical event types

- Critical ECG
- High Risk ECG
- Physician Review Required
- Follow-up Due
- Follow-up Overdue
- AI Analysis Completed
- Report Approved
- Report Rejected
- Report Exported
- Case Archived
- Case Restored
- Timeline Updated

## Delivery modes

- In-App (`IN_APP`) — delivered immediately
- Email Ready (`EMAIL_READY`) — queued for email dispatch
- Webhook Ready (`WEBHOOK_READY`) — queued webhook payload
- Push Ready (`PUSH_READY`) — queued push notification
- SMS Ready (`SMS_READY`) — future SMS channel placeholder

## API

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/notifications` | Existing notification center list (unchanged) |
| GET | `/api/notifications/unread` | Enterprise unread notifications for current user |
| POST | `/api/notifications/read` | Mark notifications read (`notificationIds` or `all`) |
| POST | `/api/events/publish` | Publish clinical event and fan out notifications |
| GET | `/api/events/history` | Clinical event history with filters |

## Audit actions

- `CLINICAL_EVENT_PUBLISHED`
- `NOTIFICATION_ENGINE_DELIVERED`
- `NOTIFICATION_ENGINE_READ`

## Engine flow

1. `POST /events/publish` creates a `ClinicalEvent` record
2. Enabled `NotificationRule` rows are matched by `eventType`
3. Case stakeholders and explicit `recipientUserIds` are resolved
4. Notifications, recipients, and delivery logs are created per rule and delivery mode
5. In-app deliveries emit realtime notification events
6. All publish, delivery, and read actions are audit logged

## Tests

- `scripts/sprint66-enterprise-notification-engine.test.ts`
- `scripts/sprint66-enterprise-notification-engine.integration.ts`
- `tests/unit/server/enterprise-notification-engine/engine.test.ts`

## Version

`sprint66-v1`
