# Performance Report — Sprint 38 AI Cardiologist

**Date:** 2026-07-07

## Runtime Characteristics

| Operation | Strategy |
|-----------|----------|
| Medical report fetch | React Query with 5 min stale time; cached reports preferred |
| Model build | `useMemo` on measurement + report inputs |
| Lead highlight | O(n) annotation selection, no canvas rebuild |
| Section render | Collapsible cards; expanded by default for QA visibility |

## API Efficiency

- `fetchOrAnalyzeMedicalIntelligence` reads cached Prisma reports before POST analyze  
- Analyze uses stored digitized leads (`measureCaseFromStoredLeads`) — no re-digitization  

## UI Performance

- ScrollView for right panel; no nested heavy lists  
- Finding rows are lightweight Pressable components  
- No additional RAF loops beyond existing viewer canvas  

## QA Commands

```bash
npm run typecheck
npm run lint
npm run build
npx playwright test --grep @sprint38
npx tsx scripts/sprint38-ai-cardiologist-workspace.integration.ts
```

All passed at sprint closure.
