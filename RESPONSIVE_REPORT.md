# Responsive Report — Sprint 33.5

## Target Resolutions

| Resolution | ECG Width Share | Result |
|------------|-----------------|--------|
| 1920×1080 | ~84% | Pass |
| 1600×900 | ~82% | Pass |
| 1366×768 | ~78% | Pass |

## Adaptive Behaviors

- Toolbar wraps icons with 2px gap — no horizontal scroll clip
- Workflow ribbon scrolls horizontally with auto-center on active step
- Right tabs use flexGrow with min margins — no label overlap
- Floating palette auto-hides on idle to maximize canvas
- Panels collapsible via floating palette toggles

## Layout Persistence

`ecg-insight:ecg-monitor-panel-layout-v8`

## Playwright Validation

Workspace shell loads at 1280×720 CI viewport without hidden controls or overlap errors.
