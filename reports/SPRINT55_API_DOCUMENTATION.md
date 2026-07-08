# Sprint 55 — API Documentation

Base path: `/api/organization-platform`  
Authentication: Bearer JWT (`Authorization: Bearer <token>`)

---

## Bootstrap

### `POST /bootstrap`
Seeds 14 system enterprise roles. Requires `SUPER_ADMIN` or `OWNER`.

**Response:** `{ ok: true, permissions: string[] }`

---

## Permissions Catalog

### `GET /permissions/catalog`
Returns all 21 enterprise permission keys.

---

## Organizations

### `POST /`
Create organization with subscription + branding defaults.

**Body:**
```json
{
  "name": "Cairo Heart Hospital",
  "type": "HOSPITAL",
  "country": "EG",
  "city": "Cairo",
  "email": "admin@hospital.eg",
  "subscriptionTier": "ENTERPRISE",
  "brandColor": "#0F766E"
}
```

### `GET /`
Paginated list. Platform admins see all; org users see own org.

**Query:** `page`, `pageSize`, `search`

### `GET /:organizationId`
Full org detail with branches, departments, members, roles, subscription, branding.

### `PATCH /:organizationId`
Update org fields. Requires `organization.manage`.

### `DELETE /:organizationId`
Soft delete. Requires `SUPER_ADMIN` or `OWNER`.

---

## Departments

### `POST /:organizationId/departments`
**Body:** `{ "name": "Cardiology", "category": "CARDIOLOGY", "description": "..." }`

---

## Branches

### `POST /:organizationId/branches`
**Body:**
```json
{
  "name": "Main Campus",
  "address": "123 Nile St",
  "gpsLatitude": 30.0444,
  "gpsLongitude": 31.2357,
  "managerUserId": "<userId>"
}
```

---

## Members

### `POST /:organizationId/members`
Invite user to organization.

**Body:** `{ "userId": "<id>", "enterpriseRoleId": "<roleId>", "departmentId": "<deptId>" }`

---

## Custom Roles

### `POST /:organizationId/roles`
**Body:** `{ "name": "ECG Technician Lead", "slug": "ecg_tech_lead", "permissions": ["ecg.upload", "ecg.analyze"] }`

---

## Subscription

### `PATCH /:organizationId/subscription`
**Body:** `{ "tier": "PROFESSIONAL" }`

Tiers: `FREE`, `BASIC`, `PROFESSIONAL`, `ENTERPRISE`, `LIFETIME`, `CLINIC`, `HOSPITAL`, `UNLIMITED`

---

## Branding

### `PATCH /:organizationId/branding`
**Body:** `{ "primaryColor": "#0F766E", "logoUrl": "...", "reportHeader": "...", "reportFooter": "..." }`

---

## Audit

### `GET /:organizationId/audit?page=1&pageSize=50`
Org-scoped audit log with pagination.

---

## Notifications

### `GET /:organizationId/notifications?unread=1`
### `POST /:organizationId/notifications`
**Body:** `{ "category": "SECURITY", "title": "...", "body": "..." }`

Categories: `SYSTEM`, `SECURITY`, `CLINICAL`, `AI`, `BILLING`, `LICENSE`, `MAINTENANCE`
