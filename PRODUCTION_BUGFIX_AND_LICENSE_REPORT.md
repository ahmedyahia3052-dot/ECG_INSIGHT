# ECG Insight Production Bugfix And Owner License Report

## Scope
- Fixed database-backed notifications, topbar notification drawer, unread counts, read/read-all/delete actions, and destination navigation.
- Improved patient creation validation and gender selection with `Male`, `Female`, `Child Male`, `Child Female`, `Other`, and `Unknown`.
- Restored report creation with a report wizard supporting ECG case, patient, and manual report flows.
- Added hidden owner-only `/owner/licenses` management for protected Developer Super Admin accounts.
- Added database migration for notification destination metadata, new gender values, and license lifecycle states.

## Backend Changes
- Added required notification APIs:
  - `GET /notifications`
  - `PATCH /notifications/:id/read`
  - `DELETE /notifications/:id`
  - `PATCH /notifications/read-all`
- Notifications now persist destination metadata (`caseId`, `patientId`, `reportId`, `entityType`, `entityId`, `actionUrl`) for reliable module navigation.
- Added `POST /reports` for report wizard creation from ECG case, patient, or manual source. Patient/manual reports create a database-backed ECG case shell before generating a clinical report.
- Added owner-only license APIs:
  - `POST /subscriptions/licenses`
  - `GET /subscriptions/licenses`
  - `PATCH /subscriptions/licenses/:licenseId`
  - Legacy revoke endpoint retained for compatibility.
- Owner license operations update `License`, `Subscription`, `User.isLifetime`, billing events, and lifecycle state.

## Frontend Changes
- Notification bell now opens a dropdown drawer with unread badge, outside-close behavior, read/delete/open actions, and notification center link.
- Notification Center now supports Open, Read, Dismiss, and Mark All Read actions.
- Patient Create form now defaults gender to `Unknown`, uses explicit selector buttons, only requires first name, last name, and gender, and still redirects to the patient profile after creation.
- Reports page now opens a report wizard and supports creating reports from ECG case, patient, or manual input.
- Added hidden `/owner/licenses` screen with dashboard cards, user selection, grant controls, and activate/suspend/revoke/extend actions.
- Sidebar shows `License Management` only when the logged-in user is the protected owner account.
- Fixed stale legacy redirects from `/(auth)/login` to `/login`.

## Database Migration
- `20260625203000_production_bugfix_license_notifications`
  - Adds `CHILD_MALE` and `CHILD_FEMALE` to `Gender`.
  - Adds `SUSPENDED` and `EXPIRED` to `LicenseStatus`.
  - Adds notification destination fields and indexes.
  - Backfills existing ECG-case notifications with action URLs.

## Validation Results
- `npx prisma migrate deploy`: Passed.
- `npm run build`: Passed.
- `npm run lint`: Passed.
- `npm run test`: Passed.
- Edited-file IDE diagnostics: No linter errors found.

## Manual Workflow Coverage
- Create patient: form validation and backend persistence path verified by build/test coverage.
- Search/open patient profile: registry invalidation and profile redirect preserved.
- Create report: wizard now calls `POST /reports` and persists real clinical reports.
- Open notifications: bell drawer and notification center both backed by `GET /notifications`.
- Read/dismiss/open destination: drawer and notification center call read/delete endpoints and route to persisted destinations.
- Create lifetime license: hidden owner page calls owner-only license grant endpoint.
- Owner-only access: route rendering and sidebar visibility require `isOwner` or `protectedOwner`; backend also enforces protected-owner access.

## Notes
- No mock-only workflow was introduced. New records are persisted through Prisma/PostgreSQL.
- Existing legacy notification `POST /notifications/:id/read` compatibility remains while the required PATCH endpoint is now supported.
