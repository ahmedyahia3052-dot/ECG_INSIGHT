# UI Layout Report — Sprint 25

**Date:** 2026-07-06  
**Status:** PASS

## Layout Structure

```
┌─────────────────────────────────────────────────────────┐
│ Title + View Mode Switcher                              │
├─────────────────────────────────────────────────────────┤
│ Command Ribbon (FILE | VIEW | DIGITIZE | MONITOR | …)   │
├──────────┬──────────────────────────────┬───────────────┤
│ Left Nav │                              │ Clinical      │
│ + Cards  │     ECG Viewer (~70%)        │ Decision      │
│ + Flow   │                              │ Panel         │
├──────────┴──────────────────────────────┴───────────────┤
│ Playback Timeline + Hospital Status Bar                 │
└─────────────────────────────────────────────────────────┘
```

## Docking

| Region | Default | Resizable | Collapsible | Persisted |
|--------|---------|-----------|-------------|-----------|
| Left | 260px | Drag handle | Yes | localStorage v2 |
| Center | 1fr (~70%) | Expands on collapse | — | — |
| Right | 280px | Drag handle | Yes | localStorage v2 |
| Bottom | auto | — | — | — |

## Grid Test ID

`sprint25-workstation-dock`

## Responsive Viewports Validated

1366×768, 1440×900, 1536×864, 1920×1080, 2560×1440
