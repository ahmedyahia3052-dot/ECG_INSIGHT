# Performance Report — Sprint 30

## Target: 60 FPS ECG Rendering

Sprint 30 is **additive UI orchestration** — no changes to rendering pipeline.

| Layer | Engine | Status |
|-------|--------|--------|
| Waveform | Sprint 28 Clinical Visualization Canvas | Unchanged |
| Rendering | Sprint 27 SVG/Canvas2D/WebGL | Preserved |
| Monitor | EcgLiveMonitorView | Unchanged |

## Sprint 30 Performance Characteristics

- Workflow ribbon: horizontal ScrollView, no heavy re-renders
- `useClinicalWorkflowEngine`: memoized steps/alerts/timeline
- Right panel tabs: lazy content by active tab
- Auto-save: 1.2s debounce prevents save storms
- Alerts banner: computed from context, memoized in hook

## Measured (E2E Session)

- Workflow ribbon render: < 100ms after workspace load
- Tab switch (patient → measurements → AI): instant (< 16ms perceived)
- Report preview iframe: async load, non-blocking

## Optimizations Applied

- `memo()` on all new panel components
- Workflow context object memoized in hook
- No additional API polling beyond existing queries

## Memory

- No new intervals or listeners beyond existing shortcut handler
- Notes panel local state only; persisted via existing auto-save path
