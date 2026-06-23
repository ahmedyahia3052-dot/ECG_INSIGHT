---
name: ECG Insight Color Tokens
description: Color token naming conventions and radius shape in constants/colors.ts
---

## Current token shape

Both `light` and `dark` palettes contain ALL of these keys:
- **New style**: `text`, `textSecondary`, `surface`, `primaryLight`, `accent`
- **Old style (kept for backward compat)**: `foreground`, `mutedForeground`, `card`, `muted`
- Both point to the same values (`text === foreground`, `textSecondary === mutedForeground`, `surface === card`)

## radius

Changed from a plain number to an object:
```ts
radius: { sm: 8, md: 12, lg: 16, xl: 24, full: 9999 }
```

New files use `colors.radius.lg`, old components use hardcoded values.

**Why:** Sprint 1 added many new components that needed consistent spacing. Old components use hardcoded `borderRadius: 12` etc. — do not change those.

**How to apply:** New components always use `colors.radius.{sm|md|lg|xl}`. Never use `colors.radius` as a plain number.
