# Pixel Alignment Report — Sprint 33.5

## Spacing System

New `ecgSpacingTokens.ts`:
- Grid: 2 / 4 / 6 / 8 / 12px
- Typography: caption 8 / label 9 / body 10 / title 11 / status 11

## Alignment Audit

| Element | Alignment Rule | Status |
|---------|------------------|--------|
| Left info rows | 54px label + dot leader + right value | ✓ |
| Toolbar icons | 22×22 centered, 2px gap | ✓ |
| Floating tools | 24×24 column, 2px gap | ✓ |
| Right tabs | 4px horizontal margin per tab | ✓ |
| Workflow steps | 4px gap, single-line labels | ✓ |
| Status chips | 6px horizontal padding | ✓ |
| Panel borders | 3px radius uniform | ✓ |

## Panel Dimensions

```
Left:   152px expanded / 28px collapsed
Right:  228px expanded / 28px collapsed
Toolbar: 18px
Status:  24px
```

## Border Radius

All clinical chrome uses **3px** (`ECG_WORKSTATION_VISUAL.panelBorderRadius`).

## Icon Sizes

- Toolbar: 11px Feather
- Floating palette: 12px Feather
- Left panel chevrons: 11px
