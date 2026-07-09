# Post-Migration Validation — Phase 1 / Sprint P1.1

Complete checklist to run **after each migration stage** and **before production release**.

---

## 1. Automated Gates (every stage)

```bash
npm run lint
npm run typecheck
npm run build
npm run build:frontend
```

- [ ] All four commands exit 0
- [ ] No new TypeScript errors in `artifacts/ecg-insight/`
- [ ] No new ESLint errors in scoped paths
- [ ] Prisma generate succeeds

---

## 2. Test Suites

- [ ] `npm test` full suite exit 0
- [ ] Sprint 94–97 digitization/viewer tests PASS
- [ ] Bolt adapter contract tests PASS (when adapters merged)
- [ ] Playwright smoke: **15/15** minimum
- [ ] Dashboard production lockdown integration PASS
- [ ] Copilot integration tests PASS (if copilot untouched)

---

## 3. Route Validation (per swapped page)

For each migrated route, verify:

- [ ] Route loads without white screen
- [ ] Deep link resolves (direct URL navigation)
- [ ] Browser back/forward works (web export)
- [ ] Mobile viewport layout acceptable
- [ ] Full-bleed routes hide sidebar correctly
- [ ] RBAC: unauthorized roles redirected to `/unauthorized` or login
- [ ] Loading state displays during fetch
- [ ] Error state displays on API failure
- [ ] Empty state displays when no data

---

## 4. Page-Specific Functional Checks

### Dashboard
- [ ] KPI cards show live data (not mock)
- [ ] Quick actions navigate correctly
- [ ] Notifications widget functional
- [ ] Subscription badge accurate

### ECG Cases / History
- [ ] List pagination/filter works
- [ ] Case row navigates to detail
- [ ] Critical/abnormal badges correct severity

### Upload
- [ ] File picker works (web + mobile)
- [ ] Upload pipeline completes
- [ ] AI analysis triggers
- [ ] Save to clinical record succeeds

### Viewer / Workspace / Monitor
- [ ] Waveform renders
- [ ] Zoom/pan functional
- [ ] Measurements (Sprint 96) accurate
- [ ] Caliper tools work
- [ ] AI overlay toggles
- [ ] Export/download works
- [ ] Live monitor realtime updates (if applicable)

### Auth
- [ ] Login/logout cycle
- [ ] Token refresh
- [ ] OAuth providers (if enabled)
- [ ] Register validation (zod)

### Profile / Billing
- [ ] Profile fields save
- [ ] Subscription plan displays
- [ ] Quota indicators accurate

### Reports / Patients
- [ ] CRUD operations
- [ ] Tab navigation on patient detail
- [ ] Report sign/export/email

---

## 5. Visual & UX Parity

- [ ] Bolt design tokens applied consistently
- [ ] Dark theme readable (clinical contrast)
- [ ] Light theme readable
- [ ] Icons render (no missing glyph boxes)
- [ ] Typography scale consistent
- [ ] 48px touch targets on mobile
- [ ] No horizontal scroll overflow on dashboard
- [ ] Sidebar collapse/expand works
- [ ] Active nav state correct

---

## 6. Performance

- [ ] Entry bundle size ≤ baseline + 10% (baseline: 4.75 MB)
- [ ] Route navigation < 300ms perceived (no blocking spinner > 2s)
- [ ] Viewer open heap stable (no memory leak after 5 open/close cycles)
- [ ] Lighthouse LCP < 2.5s on `/dashboard` (when measured)
- [ ] CLS < 0.1 on shell navigation

---

## 7. Security & Compliance

- [ ] No API keys in client bundle
- [ ] Auth token not logged to console
- [ ] RBAC enforced on admin routes
- [ ] Audit log still records UI actions (backend)
- [ ] PHI not exposed in client error messages

---

## 8. Regression — Must Not Break

- [ ] `server/` unchanged (git diff clean)
- [ ] `prisma/` unchanged
- [ ] `services/*` unchanged (except adapter wiring imports)
- [ ] ECG canvas rendering identical to pre-migration screenshot diff
- [ ] Copilot streaming works (if kept Cursor)
- [ ] WebSocket/hospital monitor connections stable

---

## 9. Feature Flag Validation

- [ ] `EXPO_PUBLIC_UI_MODE=bolt` — Bolt UI active
- [ ] `EXPO_PUBLIC_UI_MODE=cursor` (or unset) — legacy UI active
- [ ] Flag toggle requires only rebuild, not code change
- [ ] Per-route flag override works (if implemented)

---

## 10. Deletion Verification (post-swap cleanup)

Before deleting any path from `DELETE_AFTER_MIGRATION.md`:

- [ ] `grep -r` shows zero imports of deleted module
- [ ] Build passes after deletion
- [ ] Playwright smoke passes after deletion
- [ ] Stakeholder sign-off on deleted surface

---

## 11. Production Release Checklist

- [ ] All PRE_MIGRATION_CHECKLIST blockers resolved
- [ ] All pages in PAGE_REPLACEMENT_MATRIX marked complete or explicitly deferred
- [ ] PERFORMANCE_BASELINE.md updated with post-migration metrics
- [ ] Rollback procedure documented and tested
- [ ] Release notes list migrated routes
- [ ] Monitoring/alerts unchanged (backend)

---

## 12. Sign-off Template

| Stage | Routes included | Lint | Typecheck | Build | Tests | Playwright | Signed off |
|-------|-----------------|------|-----------|-------|-------|------------|------------|
| P1 Shell | — | | | | | | |
| P2 Dashboard/Cases | | | | | | | |
| P3 Auth/Upload | | | | | | | |
| P4 Clinical chrome | | | | | | | |
| P5 Platform | | | | | | | |
| Production | All | | | | | | |

---

## Failure Response

If any check fails post-migration:

1. Set `EXPO_PUBLIC_UI_MODE=cursor`
2. Revert migration commit
3. Document failure in sprint report
4. **Do not** patch application code in documentation sprints — fix in dedicated migration sprint
