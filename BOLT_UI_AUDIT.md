# Bolt UI Audit

## Scope

Audited the repository for Bolt-originated UI files, dashboard patterns, layout primitives, cards, hero sections, KPI widgets, tables, charts, assets, animations, theme usage, and styling conventions.

## Source Of Truth

The Bolt visual system was originally audited from:

```text
C:\Users\Ahmed\Downloads\ECG_INSIGHT_UI_BOLT\ecg-insight-main
```

The original Bolt source was a Vite React web app using React Router, Tailwind, Radix/shadcn, lucide-react, Recharts, mock Zustand state, and mock data. Those runtime dependencies are intentionally not imported into the Expo app. Instead, the visual language was ported into React Native/Expo-compatible components.

## Primary Bolt Components

### `artifacts/ecg-insight/components/bolt/BoltUI.tsx`

Core Expo-native Bolt visual primitives:

- `BoltScreen`: screen gradient, medical background grid, safe routed content container, page transition wrapper.
- `BoltCard`: matte premium medical surface with soft border/shadow.
- `BoltHero`: branded hero card with ECG line and Bolt brand treatment.
- `BoltButton`: consistent 48px touch target, haptics, loading state, danger/outline/ghost variants.
- `BoltBadge`: semantic tone badges for primary/success/warning/danger/muted.
- `BoltField`: themed input wrapper.
- `BoltEmpty`: medical empty state with ECG illustration and CTA support.
- `BoltSkeleton`: shimmer loading primitive.
- `BoltStat`: compact stat card.
- `BoltNavCard`: premium route card.
- `BoltEcgLine` / `BoltEcgLoader`: ECG visual primitives and loading animation.

### `artifacts/ecg-insight/components/bolt/UltraPremium.tsx`

Advanced dashboard and analytic widgets:

- `LiveEcgWave`: animated ECG waveform.
- `PremiumMetricCard`: animated KPI card with icon, trend badge, value, subtitle, and sparkline.
- `Sparkline`: lightweight SVG sparkline.
- `EcgMonitorWidget`: premium live monitor card.
- `AnalyticsChartCard`: compact chart card.
- `ShimmerBlock`: shimmer block primitive.

### `artifacts/ecg-insight/components/bolt/EnterpriseSidebar.tsx`

Approved premium navigation layer:

- Responsive overlay/push sidebar.
- Grouped clinical/workspace/admin navigation.
- User card, online state, footer actions.
- Active nav glow, ECG pulse, haptics, touch/hover affordances.

### `artifacts/ecg-insight/components/bolt/MobileActionLayer.tsx`

Mobile action surfaces:

- `FloatingEcgActionButton`.
- `FloatingAIAssistant`.
- Mobile-first quick actions and AI entry points.

## Dashboard Files Using Bolt

- `artifacts/ecg-insight/app/(tabs)/index.tsx`: dashboard command center using `BoltScreen`, `BoltCard`, `BoltBadge`, `BoltButton`, `BoltEmpty`, `LiveEcgWave`, and `PremiumMetricCard`.
- `artifacts/ecg-insight/app/index.tsx`: landing screen using `BoltHero`, `BoltStat`, `BoltCard`, and `BoltButton`.
- `artifacts/ecg-insight/app/admin/index.tsx`: admin dashboard using `BoltHero`, `BoltStat`, `BoltNavCard`, and `BoltBadge`.

## Other Screens Using Bolt

- Auth/login/register/reset/forgot-password screens use Bolt loaders/cards/buttons.
- Upload, patients, reports, profile, subscription, settings, notifications, and admin screens use Bolt cards, heroes, empty states, fields, badges, and buttons.

## Assets And Animations

No separate image asset library was found for Bolt. Visual assets are component-generated:

- SVG ECG lines and waveforms.
- Linear gradients.
- Medical grid background.
- Animated shimmer/skeletons.
- Press/hover scaling.
- Page transitions.
- Sidebar pulse/active rail.

## Theme And Styling

Bolt components consume the existing app color layer through `useColors()` and `VisualExperienceContext`.

Primary styling conventions:

- Dark medical matte surfaces.
- Cyan/teal clinical accents.
- Subtle gradients and borders.
- Controlled shadows.
- Native-driver micro animations.
- 48px minimum action targets.
- Responsive flex wrapping instead of horizontal overflow.

## Reports Referencing Bolt

- `BOLT_UI_INTEGRATION_REPORT.md`
- `SPRINT24_ULTRA_PREMIUM_UX_REPORT.md`
- `ENTERPRISE_CLINICAL_DASHBOARD_REPORT.md`
- `PREMIUM_INTERACTION_LAYER_REPORT.md`
- `NAVIGATION_FOUNDATION_FINAL_REPORT.md`

## Migration Recommendation

Use these as the dashboard visual source of truth:

- `BoltScreen` for route surface.
- `BoltCard` for all panels.
- `BoltBadge` for status/severity.
- `BoltButton` for all actions.
- `BoltEmpty` and `SkeletonDashboard` for empty/loading/error states.
- `LiveEcgWave` for hero/monitor ECG visuals.
- `PremiumMetricCard` for KPI cards.
- Existing `EnterpriseSidebar` unchanged.

Do not import the original web-only Bolt dependencies into Expo.

