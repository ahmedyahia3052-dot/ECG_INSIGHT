# Changelog

## Sprint 29 — Zero-Chrome Clinical Workspace (2026-07-06)

### Added
- Zero-chrome contextual toolbar with collapsible smart tool groups
- Floating auto-hide tool palette on viewer
- Enterprise layout engine with auto-hide panels and diagnostic mode (F11)
- Unified enterprise design tokens (`ecgEnterpriseDesignTokens.ts`)

### Changed
- Maximum viewer area: 2px workspace padding/gap, 48px toolbar, removed header title row
- Layout persistence v4 with panel pin/auto-hide preferences
- Resizable panels with double-click reset

### Preserved
- All view modes, clinical panels, command palette, and existing workflows

## Sprint 28 — Clinical Visualization Engine (2026-07-06)

### Added
- Clinical visualization module and enterprise canvas
- Grid presets, waveform glow, crosshair telemetry, timeline, AI overlays
- Enterprise status bar telemetry expansion
- Unit, integration, and Playwright tests

### Changed
- Waveform view uses `EcgClinicalVisualizationCanvas`

### Preserved
- All business logic, view modes, and existing functionality

## Sprint 27 — ECG Rendering Engine (2026-07-06)

### Added
- Production SVG/Canvas2D/WebGL rendering pipeline
