---
name: ECG Insight Auth Architecture
description: Sprint 1 JWT-ready mock auth design in AuthContext
---

## Mock accounts (all password: "password")

| Email | Role |
|---|---|
| super@ecginsight.com | super_admin |
| admin@ecginsight.com | admin |
| doctor@ecginsight.com | doctor |
| student@ecginsight.com | student |

## Key design decisions

- `effectiveUser = impersonatedUser ?? user` — all UI reads `user` from context which returns the impersonated user when active
- `canAccess(role)` uses `ROLE_HIERARCHY` map: super_admin=4, admin=3, doctor=2, student=1 — checks `>=` so higher roles pass lower thresholds
- `authToken` is a mock JWT string (`eyJhbGciOiJIUzI1NiJ9.mock_${role}_${userId}_${ts}`); ready to swap for real JWT
- `rememberMe=true` persists auth to AsyncStorage; `false` only stores token, not user data
- Forgot password flow: `forgotPassword(email)` → `verifyResetCode(email, "123456")` → `resetPassword(...)` (all mock, always succeed for valid emails)

## Admin features (super_admin only)

- `impersonateUser(userId)` — sets impersonatedUser in state + AsyncStorage
- `stopImpersonation()` — clears impersonation
- `createInternalAccount(name, email, role)` — adds to managedUsers state (not persisted across sessions)
- `activateUser/deactivateUser` — updates managedUsers state
