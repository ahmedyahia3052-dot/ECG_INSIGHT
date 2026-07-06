# UI Layout Report — Sprint 29 Zero-Chrome Clinical Workspace

**Date:** 2026-07-06  
**Overall:** Hospital-grade zero-chrome layout

## Layout Architecture

```
EcgMonitorViewerFoundation
├── EcgViewModeSwitcher (compact single row)
├── EcgZeroChromeToolbar (contextual collapsible groups, ≤48px)
└── EcgViewerResizableWorkspace
    └── EcgEnterpriseLayoutEngine (auto-hide panels)
        └── EcgWorkstationGridShell (CSS grid, ≥80% center)
            ├── Left rail (240px / 60px collapsed)
            ├── Center viewer + EcgFloatingToolPalette
            ├── Right clinical tabs (220px / 48px collapsed)
            └── EcgEnterpriseStatusBar (28px)
```

## Space Optimization

| Element | Before (Sprint 26) | After (Sprint 29) |
|---------|-------------------|-------------------|
| Toolbar height | 44px flat ribbon | 48px contextual groups |
| Workspace padding | 4px | 2px |
| Workspace gap | 4px | 2px |
| Header title row | Always visible | Removed (zero-chrome) |
| Side panels | Manual toggle only | Auto-hide + hover expand |
| Tool visibility | All tools in scroll row | Mode-contextual groups |

## Diagnostic Mode (F11)

- Hides toolbar, mode switcher, left/right panels
- Black background, patient identifier strip only
- Floating tool palette forced visible
- ESC or exit button restores workspace

## Viewer Area Target

Center column uses `minmax(0, 1fr)` — viewer receives all remaining horizontal space after collapsed rails (60px + 48px minimum).
