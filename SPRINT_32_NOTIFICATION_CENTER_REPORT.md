# Sprint 32 Enterprise Communication & Notification Center Report

## Executive Summary

Sprint 32 adds a unified enterprise communication and notification platform to ECG Insight. The platform now supports categorized in-app, email, push, and SMS-ready notifications with user preferences, templates, delivery logs, realtime event emission, unread counters, notification history, and an admin broadcast/scheduling console.

## Unified Notification Center

Supported channels:

- In-app notifications
- Email notification abstraction
- Push notification abstraction
- SMS abstraction

The existing notification list/read/delete APIs remain compatible while adding categories, delivery logs, unread counters, and history.

## Notification Entities

Added:

- `NotificationTemplate`
- `NotificationPreference`
- `NotificationDeliveryLog`

Extended:

- `Notification` with category, template, locale, scheduled timestamp, sent timestamp, and updated timestamp.

## Notification Categories

Implemented first-class categories:

- Critical ECG alerts
- Subscription events
- Payment events
- Report generation
- User invitations
- Occupational clearance decisions
- System alerts

## User Preferences

Users can configure per-category:

- In-app on/off
- Email on/off
- Push on/off
- SMS on/off
- Frequency: immediate, daily digest, weekly digest, muted
- Locale readiness

Frontend:

- `artifacts/ecg-insight/app/(tabs)/notification-preferences.tsx`

## Real-Time Notifications

Server realtime event support now includes:

- `notification.created`
- `notification.updated`
- `notification.count.updated`
- User rooms
- Role rooms

Frontend:

- `LiveNotificationBell` displays unread counters and refreshes notification state.

## Template Engine

Implemented:

- Dynamic `{{placeholder}}` rendering.
- HTML email template storage.
- SMS and push template fields.
- Localization-ready `key + locale` templates.
- Default templates for critical ECG, invoice generation, report generation, and system alerts.

## Delivery Provider Abstraction

Prepared provider mapping:

- In-app
- SMTP
- SendGrid
- Firebase Push
- Twilio SMS

Delivery attempts are logged through `NotificationDeliveryLog` with channel, provider, status, payload, recipient, and delivery timestamp.

## Frontend

Added:

- Live notification bell with unread counter.
- Notification preferences and delivery history page.
- Admin notification console.
- Sidebar navigation entries for notification preferences and notification console.

Existing notification center continues to support search, read/unread filters, type filters, pagination, swipe actions, unread counters, and critical alert classification.

## Admin Notification Console

Implemented:

- Broadcast notifications.
- Scheduled announcements.
- System maintenance alerts.
- Template listing and template creation/update.
- Channel selection.
- Category selection.

Frontend:

- `artifacts/ecg-insight/app/(tabs)/notification-console.tsx`

## APIs

Added or extended:

- `GET /api/v1/notifications/unread-count`
- `GET /api/v1/notifications/history`
- `GET /api/v1/notifications/preferences`
- `PUT /api/v1/notifications/preferences`
- `GET /api/v1/notifications/templates`
- `POST /api/v1/notifications/templates`
- `POST /api/v1/notifications/admin/broadcast`
- `POST /api/v1/notifications/admin/process-scheduled`

## Tests

Added:

- `scripts/sprint32-notification-center.integration.ts`

Coverage:

- Default templates
- User preferences
- Multi-channel notification creation
- Delivery logs
- Unread counters
- Scheduled broadcasts
- Scheduled processing
- Mark-as-read flow

Sprint 32 is included in `npm run test`.

## Validation Commands

Required validation:

```bash
npm run build
npm run lint
npm run test
```

## Key Files

- `prisma/schema.prisma`
- `prisma/migrations/20260626161000_sprint32_notification_center/migration.sql`
- `server/src/notifications/notification-center.service.ts`
- `server/src/notifications/notifications.routes.ts`
- `server/src/utils/notifications.ts`
- `server/src/realtime/realtime.service.ts`
- `artifacts/ecg-insight/components/notifications/LiveNotificationBell.tsx`
- `artifacts/ecg-insight/app/(tabs)/notification-preferences.tsx`
- `artifacts/ecg-insight/app/(tabs)/notification-console.tsx`
- `artifacts/ecg-insight/services/collaboration.ts`
- `scripts/sprint32-notification-center.integration.ts`
