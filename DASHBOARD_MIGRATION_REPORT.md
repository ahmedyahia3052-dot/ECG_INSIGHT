# Dashboard Migration Report — Sprint P1.4

## Summary

Migrated the Dashboard UI from Bolt (`ecg-insight-main/src/pages/private/dashboard.tsx`) into ECG_INSIGHT as a pixel-aligned React Native presentation layer. Backend hooks, services, auth, and routing outside the dashboard remain unchanged. Data flows through extended `DashboardScreenContract` fields and `bolt-ui.adapter` / `dashboard-chart.adapter` only.

## Files imported (new)

| File | Purpose |
|------|---------|
| `presentation/bolt/DashboardBoltPresentation.tsx` | Bolt dashboard layout (welcome, stats, charts, cases, activity, upload CTA) |
| `presentation/bolt/index.ts` | Barrel export |
| `presentation/bolt/charts/DashboardAreaChart.tsx` | Monthly cases area chart (SVG) |
| `presentation/bolt/charts/DashboardPieChart.tsx` | Diagnosis distribution donut chart (SVG) |
| `presentation/bolt/charts/chart-colors.ts` | Chart color token resolver |
| `adapters/bolt/dashboard-chart.adapter.ts` | Chart/activity/case-row derivations + placeholder fallbacks |

## Files modified

| File | Change |
|------|--------|
| `types/screens/dashboard.ts` | Extended contract with Bolt stats, charts, activity, case rows, actions |
| `adapters/bolt/bolt-ui.adapter.ts` | Maps hook data to new contract fields |
| `containers/DashboardContainer.tsx` | Swapped legacy presentation → `DashboardBoltPresentation`; added case navigation actions |

## Unchanged (by design)

- `hooks/domain/useDashboardData.ts`
- `app/(protected)/dashboard.tsx`
- `legacy-ui/screens/DashboardLegacyPresentation.tsx` (retained, unused)
- Auth, backend, API, medical engine, shell (P1.3)

## Validation

| Check | Result |
|-------|--------|
| `npm run lint` | PASS |
| `npm run typecheck` | PASS |
| `npm run build` | PASS |

## Responsive / theme

- Uses `useBreakpoint` for 2/4 stat grid, chart row stacking, and CTA layout
- Uses `useDesignTokens` / design-system components exclusively (no duplicated tokens)
