# ECG Insight Stabilization Sprint Report

## Scope
- Fixed Settings persistence with PostgreSQL-backed per-user preferences.
- Reworked the notification bell panel into a floating enterprise notification center.
- Stabilized report draft creation, list refresh, persistence visibility, and table actions.
- Replaced patient gender entry with an explicit required dropdown-style selector.
- Hardened hidden owner license management to the single developer owner account.

## Settings Persistence
- Added Prisma model `UserPreference` mapped to the PostgreSQL table `user_preferences`.
- Added migration `20260625205500_add_user_preferences`.
- Added authenticated APIs:
  - `GET /preferences`
  - `PATCH /preferences`
- Settings are now saved per authenticated user immediately on toggle:
  - Reduce Motion
  - High Contrast Clinical Mode
  - Compact Dashboard Density
  - Critical Alert Sound
  - Remember Last Patient Filter
  - Require Confirmation For Destructive Actions
- Settings survive refresh, logout/login, and browser restart because they are read from PostgreSQL.

## Notifications
- The topbar bell now opens an independent floating card overlay instead of participating in the page layout.
- Added outside-click close and ESC close on web.
- Added internal scroll, unread badge, read-all, mark-read, dismiss/delete, destination open actions, icons, severity badges, timestamps, and filters:
  - all
  - unread
  - critical
  - system
  - license
  - ai
- The panel uses fixed overlay positioning, max height, rounded card styling, elevation, and no content push.

## Reports
- `POST /reports` now resolves ECG cases by `id`, `caseId`, or `caseNumber`.
- Report list serialization now includes patient and ECG case display fields.
- Reports page now inserts created reports into the active React Query cache and invalidates queries after persistence.
- Added error handling for draft creation failures.
- Clinical Reports rows now display:
  - Report ID
  - Patient
  - ECG Case
  - Status
  - Created By
  - Created Date
  - Actions
- Added actions:
  - View
  - Edit
  - Finalize
  - Sign
  - Print
  - Export PDF
  - Delete
- Added `DELETE /reports/:reportId` for non-signed reports, with audit logging.

## Patients
- Create Patient gender now defaults to `Select Gender`.
- User must explicitly choose one of:
  - Male
  - Female
  - Child
  - Other
  - Unknown
- Added persisted `CHILD` gender enum support in Prisma/backend/frontend.
- Gender remains required before patient creation.

## Owner License Hardening
- Hidden owner license dashboard access is restricted to `ahmedyahia3052@gmail.com`.
- Backend owner license mutations now require the exact developer owner email and protected owner flag.
- Sidebar hides `License Management` for all non-owner users.
- License actions include:
  - Extend
  - Suspend
  - Resume
  - Revoke
- Owner license changes write audit and billing event records.

## Validation
- `npx prisma migrate deploy`: Passed.
- `npm run build`: Passed.
- `npm run lint`: Passed.
- `npm run test`: Passed.
- Edited-file IDE diagnostics: No linter errors found.

## Workflow Coverage
- Settings persistence is database-backed and per-user.
- Notifications are database-backed and can be filtered, read, dismissed, and opened by destination.
- Report creation persists to PostgreSQL and refreshes the visible report list.
- Patient creation requires an explicit gender selection.
- License management is hidden and restricted to the developer owner account only.
