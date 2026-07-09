# App Shell Migration Report — Phase 1 / Sprint P1.3

**Branch:** `feature/phase1-sprint-p1.3-app-shell-migration`  
**Base:** `feature/phase1-sprint-p1.2-design-system-import`  
**Version:** `104.2.0-p1.3`  
**Scope:** Global application shell only — **no page migration**

---

## Objective

Replace the global application shell with Bolt Enterprise UI using the Sprint P1.2 design system. All existing routes and page content remain unchanged; pages render inside the new shell wrapper.

---

## Changed Files

| File | Change |
|------|--------|
| `design-system/shell/BoltAppShell.tsx` | **NEW** — Root shell layout, full-bleed handling, DesignSystemProvider wrap |
| `design-system/shell/BoltSidebar.tsx` | **NEW** — Collapsible sidebar, nav groups, mobile drawer, user card |
| `design-system/shell/BoltHeader.tsx` | **NEW** — Breadcrumb, search panel, theme toggle, notifications trigger |
| `design-system/shell/BoltNotificationPanel.tsx` | **NEW** — Notification drawer UI (DS components) |
| `design-system/shell/shell-utils.ts` | **NEW** — Shared shell helpers |
| `design-system/shell/types.ts` | **NEW** — Shell prop contracts |
| `design-system/shell/index.ts` | **NEW** — Barrel exports |
| `design-system/index.ts` | Export shell module; version bump |
| `components/enterprise/EnterpriseUI.tsx` | `EnterpriseShell` renders `BoltAppShell`; shell JSX removed; page primitives preserved |

### Unchanged (verified)

- All files under `app/` (routes)
- All page implementations (dashboard, cases, upload, viewer, etc.)
- `services/`, `hooks/`, `context/`, stores, auth, backend, Prisma

---

## Architecture

```
ProtectedRoute (auth gate — unchanged)
  └── EnterpriseShell (data/orchestration — unchanged logic)
        └── BoltAppShell (NEW — Bolt visual shell)
              ├── BoltSidebar / BoltMobileDrawer
              ├── BoltHeader (search, theme, notifications)
              ├── Page content (existing Slot children — unchanged)
              └── BoltNotificationPanel
```

**Orchestration pattern:** EnterpriseShell retains React Query, mutations, dashboard store, and navigation logic. BoltAppShell is presentation-only and receives props/callbacks.

---

## Shell Features Migrated

| Feature | Status |
|---------|--------|
| App shell layout | ✅ BoltAppShell |
| Collapsible sidebar | ✅ Desktop collapse (82px / 306px) |
| Navigation groups (CLINICAL / WORKSPACE / DEVELOPER) | ✅ From `APP_NAV_ITEMS` |
| Mobile drawer | ✅ BoltMobileDrawer overlay |
| Top navigation / header | ✅ BoltHeader |
| Breadcrumb + page title | ✅ From `resolvePageMeta` |
| Global search UI | ✅ Preserved behavior |
| Notification panel | ✅ BoltNotificationPanel |
| Theme toggle (dark/light) | ✅ via `useThemeEngine` |
| User menu / avatar | ✅ Sidebar user card |
| Full-bleed workspaces (copilot, viewer, monitor) | ✅ No topbar; hidden sidebar on monitor |
| Page container + scroll | ✅ DS tokens spacing |

---

## Conflict Report

| Conflict | Resolution |
|----------|------------|
| `EnterpriseUI` monolith vs Bolt shell | Shell JSX removed; page primitives (`Card`, `PrimaryButton`, etc.) **kept** for existing pages |
| `DesignSystemProvider` vs `ThemeEngineProvider` | DS provider wraps inside BoltAppShell only; root `_layout.tsx` unchanged |
| `PremiumInteraction` toast vs DS toast | App toast unchanged; DS toast not mounted |
| Duplicate notification helpers | Moved to `shell-utils.ts`; minimal filter helper kept in EnterpriseUI |
| Nav icon registry vs Feather nav icons | Shell uses Feather directly from `APP_NAV_ITEMS` (same as before) |

**No route conflicts.** No duplicate routes created.

---

## Screenshots

Screenshots should be captured from a running dev session:

```bash
npm run dev:frontend
```

| Viewport | Width | Capture |
|----------|-------|---------|
| Desktop shell | ≥1200px | Sidebar expanded, header with search |
| Tablet shell | 860–1199px | Sidebar visible, responsive header |
| Mobile shell | <860px | Hamburger menu, drawer open |

**Screenshot paths (to be added after manual capture):**

- `docs/shell-screenshots/p1.3-desktop-shell.png`
- `docs/shell-screenshots/p1.3-tablet-shell.png`
- `docs/shell-screenshots/p1.3-mobile-shell.png`

---

## Validation Report

| Gate | Result |
|------|--------|
| `npm install` | **PASS** |
| `npm run lint` | **PASS** |
| `npm run typecheck` | **PASS** |
| `npm run build` | **PASS** |

### Manual verification checklist

- [ ] Sidebar navigation opens all routes
- [ ] Sidebar collapse/expand works on desktop
- [ ] Mobile drawer opens/closes
- [ ] Global search (Ctrl+K) focuses input
- [ ] Notification panel opens/closes
- [ ] Theme toggle switches dark/light
- [ ] Full-bleed routes (copilot, ecg-viewer) render without broken layout
- [ ] Dashboard page content unchanged (only shell chrome differs)

---

## Stop Condition

App shell migration complete. **Do not proceed to Dashboard migration (P1.4)** until approved.

---

## Rollback

Revert `EnterpriseShell` to pre-P1.3 inline JSX or set feature flag if introduced in future sprint. No database or API rollback required.
