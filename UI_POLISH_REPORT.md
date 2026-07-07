# UI Polish Report — Sprint 33.5

## ECG Dominance

Hero fit now targets **90% canvas fill** with narrower panels (152px left, 228px right). Canvas uses full flex height with zero min-height dead space.

## Tooltip Fix (Critical)

**Problem:** Tooltips clipped inside toolbar/palette overflow containers.

**Solution:** `EcgWorkstationTooltip` renders via `createPortal` to `document.body` with:
- Fixed positioning from anchor `getBoundingClientRect`
- Min width 160px, max width 280px
- Multi-line word wrap
- z-index 999999
- Title + description + shortcut blocks

## Toolbar Compression

| Metric | Sprint 33 | Sprint 33.5 |
|--------|-----------|-------------|
| Max height | 20px | 18px |
| Button size | 24px | 22px |
| Icon size | 12px | 11px |

Every button includes description text in tooltip.

## Clinical Workflow

Horizontal scroll ribbon with compact 8px labels. Status colors:
- **Complete:** green outline
- **Current:** cyan fill
- **Future/pending:** gray muted

Auto-scrolls active step into view.

## Lead Issues Alert

Replaced full-width banner chips with compact collapsible:
`⚠ Lead Issues (1) ▸` — expands on click only.

## Floating Palette

- Position: 4px from canvas edge
- Background: 82% opacity charcoal
- Auto-hides after 2.4s idle
- Reappears on mouse movement
- 24×24 uniform buttons
