# Delete After Migration — Sprint 103.5 Pre-Migration Audit

**IMPORTANT:** Do not delete any file until Bolt replacement is verified in production for that surface.  
**Trigger:** `EXPO_PUBLIC_UI_MODE=bolt` stable + Playwright smoke PASS for affected routes.

---

## Legacy Presentations (delete first)

| Path | Replaced By |
|------|-------------|
| `artifacts/ecg-insight/legacy-ui/screens/DashboardLegacyPresentation.tsx` | Bolt Dashboard |
| `artifacts/ecg-insight/legacy-ui/screens/EcgCasesLegacyPresentation.tsx` | Bolt Cases / History |
| `artifacts/ecg-insight/legacy-ui/` (entire tree when empty) | — |

---

## Enterprise Monolith Shell (after Bolt shell ships)

| Path | Condition |
|------|-----------|
| `artifacts/ecg-insight/components/enterprise/EnterpriseUI.tsx` | When Bolt `AppShell` covers sidebar, header, RBAC nav |
| Inline route JSX duplicated across 34 protected routes | After each route uses Container + Bolt presentation |

---

## Premium / Legacy Auth UI

| Path | Replaced By |
|------|-------------|
| `artifacts/ecg-insight/components/premium/PremiumAuth.tsx` | Bolt Auth |
| `artifacts/ecg-insight/components/premium/PremiumInteraction.tsx` | Bolt toast/dialog primitives |
| `artifacts/ecg-insight/components/premium/` (orphaned files) | Audit per-file after Bolt |

---

## Duplicate Token Systems

| Path | When |
|------|------|
| `artifacts/ecg-insight/theme/medicalTheme.ts` (if present) | After Bolt tokens canonical |
| `artifacts/ecg-insight/presentation/tokens/` | Merge then delete |
| Redundant exports in `design-system/index.ts` | After import graph clean |

---

## Duplicate Hooks (consolidate then delete)

| Path | Keep |
|------|------|
| `artifacts/ecg-insight/hooks/domain/*` OR `artifacts/ecg-insight/src/hooks/*` | Single `hooks/` tree — delete duplicate |
| Unused `presentation/lazy.ts` consumers | If Bolt handles code-splitting |

---

## Route Aliases (delete route files)

| Path | Action |
|------|--------|
| `app/(protected)/patients/new.tsx` | Delete; redirect to `/patients/create` |
| `app/(protected)/ecg-monitor/[caseId].tsx` | Merge into Bolt workspace route |
| Duplicate Stack entries for same screen | Remove from `_layout.tsx` |

---

## Orphan / Low-Value UI

| Path | Notes |
|------|-------|
| `app/onboarding.tsx` | Not in Stack — delete or wire to Bolt onboarding |
| Unused lazy wrappers in `presentation/lazy.ts` | If no imports after Bolt |

---

## Do NOT Delete (preserve manifest)

Per `migration/bolt-replacement-manifest.ts` → `BOLT_PRESERVE_MANIFEST`:

- `components/ecg/**` — ECG canvas and rendering
- `EcgProViewer*` — viewer core
- `EcgProViewerMeasurementLayer` — measurements
- `adapters/bolt/**` — adapter seam
- `containers/**` — business logic
- `services/**` — all API layers
- `context/AuthContext.tsx`
- Copilot module UI (`CopilotResizableWorkspace`, etc.)

---

## Deletion Order (recommended)

1. `DashboardLegacyPresentation`, `EcgCasesLegacyPresentation`
2. Per-route inline UI as Bolt screens land (Upload → Viewer → Workspace → Reports → …)
3. `PremiumAuth` / `PremiumInteraction` after auth Bolt complete
4. `EnterpriseUI.tsx` shell (last — highest blast radius)
5. Token duplicates and hook duplicates
6. Route alias files

---

## Verification Before Each Delete

- [ ] Bolt screen at parity (visual + functional)
- [ ] Adapter contract tests pass
- [ ] Playwright smoke includes route
- [ ] No imports remain (`grep` for deleted path)
- [ ] `npm run lint && npm run typecheck && npm run build` PASS
