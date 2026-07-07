# CHANGELOG

## [Sprint 33.5] — 2026-07-07

### Changed
- Portal tooltips with description, shortcut, multi-line wrap (fixes clipping)
- Hero fill target 88% → 90%; panels 160/240 → 152/228px; layout v8
- Toolbar 20px → 18px height; 22px buttons; tooltip descriptions on all icons
- Left clinical summary — two-column dot-leader alignment (`sprint335-clinical-summary-panel`)
- Right panel tab spacing — separated AI Findings from Measurements (`sprint335-clinical-tabs`)
- Compact collapsible lead issues alert (`sprint335-compact-clinical-alerts`)
- Workflow ribbon — green/cyan/gray states, horizontal scroll, auto-center active step
- Status bar — Lead/Speed/Gain/Zoom/Quality only; 11px typography; removed Patient chip
- Floating palette — idle auto-hide, mouse-move reveal, 4px canvas inset, descriptions
- Removed `EcgViewModeSwitcher` from chrome row

### Added
- `ecgSpacingTokens.ts` — 4px spacing grid + typography tokens
- `sprint335-enterprise-viewer-polish.integration.ts` + Playwright spec

---

## [Sprint 33] — 2026-07-07

### Changed
- `heroFitZoom()` — smart initial zoom targeting 88% canvas fill
- `EcgProViewerEngine` — auto hero fit on load; double-click reset + re-fit
- `EcgZeroChromeToolbar` — 20px compact icon command strip (41% height reduction)
- `EcgFloatingToolPalette` — vertical always-visible palette with full tooltips
- `EcgUnifiedClinicalLeftPanel` — Patient Summary expanded; Workflow/Quick Actions collapsed by default; hide empty Quick Actions
- `EcgClinicalRightPanel` — compact tabs and metric alignment (`sprint33-clinical-right-panel`)
- `EcgPaperGrid` — thinner grid lines (0.2/0.55px)
- `EcgViewerCrosshairOverlay` — medical cyan crosshair
- Diagnostic mode — exit-only floating button; no patient header bar
- Panel widths: left 160px, right 240px; layout persistence v7
- Visual tokens: toolbar 20px, status 22px, floating tools 26px

### Removed
- Popover toolbar group dropdowns (replaced by compact strip + floating palette)
- Diagnostic mode patient info header row

---

## [Sprint 32] — 2026-07-07

### Added
- `ecgCockpitColors.ts` — hospital color system (charcoal, medical cyan, success/warning/critical)
- `EcgLeadSelectorGrid` — professional 12-lead grid with hover and active glow
- `EcgMiniNavigator` — draggable viewport navigator with thumbnail; auto-hides when ECG fits
- Doctor vs Developer status bar toggle (`sprint32-dev-mode-toggle`)
- `contain` fit mode for auto-fit and double-click fit-to-screen
- Sprint 32 integration test and Playwright spec (`sprint32-clinical-cockpit`)
- Layout persistence key v6

### Changed
- `EcgUnifiedClinicalLeftPanel` — single Clinical Summary card with collapsible sections
- `EcgClinicalRightPanel` — tab-only content; "AI Findings" tab label; cockpit styling
- `EcgZeroChromeToolbar` — compact popover groups (FILE, VIEW, MEASURE, AI, COMPARE, REPORT, EXPORT)
- `EcgEnterpriseStatusBar` — doctor mode hides FPS/CPU/GPU/Memory/Canvas metrics
- `EcgProViewerEngine` — auto `contain` on load; double-click fit-to-screen
- Panel widths: left 176px, right 256px for ~80–85% ECG hero area
- `EcgFloatingToolPalette` fit action uses `contain`

### Removed
- `EcgClinicalAlertsBanner` from foundation chrome row
- `EcgViewModeSwitcher` from foundation chrome (modes in VIEW toolbar popover)

### Fixed
- Empty mini-navigator rectangle when image fits entirely
- Toolbar occupying excessive vertical attention
- Long right-panel scroll across all tabs simultaneously

---

## [Sprint 31] — 2026-07-07

### Added
- `EcgUnifiedClinicalLeftPanel` — single hospital clinical panel (patient, pipeline, leads)
- `EcgWorkstationTooltip` — 200ms delayed tooltips for toolbar icons
- Diagnostic fullscreen with browser `requestFullscreen` and layout snapshot
- Layout persistence key v5
- Sprint 31 integration test and Playwright spec

### Changed
- Pipeline ribbon chips wrap instead of horizontal scroll
- Toolbar compressed to single 36px strip with all tool groups visible
- Right panel default width 220→300px with card-style metrics
- Status bar metrics throttled to 2 updates/second
- Keyboard shortcuts: Ctrl+R resets view; Space toggles playback in monitor mode
- ECG workspace hides enterprise sidebar for maximum viewer area
- Viewer canvas borderless; zero workspace padding

### Removed
- In-viewer `EcgWorkstationLeftNav` duplicate navigation block
- Left sidebar `EcgClinicalWorkflowTimeline` duplicate (pipeline in ribbon + unified panel)
- Empty waveform placeholder rectangle
- `PageSection` min-height constraints on workspace screen

### Fixed
- Pipeline chip clipping at narrow widths
- Status bar CPU/GPU/FPS flickering
- Mini navigator empty box when image not loaded
- Split fullscreen behavior — unified diagnostic mode hides all chrome
