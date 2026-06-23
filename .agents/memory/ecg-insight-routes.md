---
name: ECG Insight Route Typing
description: Expo Router typed routes and the admin route workaround
---

## Problem

Expo Router generates typed routes from the file system at typecheck time. Routes in `app/admin/` are not included in the generated union type, causing TS2345 errors when passing `/admin/` or `/admin/users` to `router.push/replace`.

## Solution

Cast admin paths with `as any`:
```tsx
router.push("/admin/" as any)
router.push("/admin/users" as any)
router.replace("/(tabs)/" as any)
```

**Why:** The expo-router type generation runs separately from tsc and may not pick up all nested route groups at check time. Casting is the standard workaround for dynamic/programmatic routes.

**How to apply:** Any `router.push` or `router.replace` that targets `/admin/*` must use `as any`.
