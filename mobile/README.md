# ECG Insight Mobile Foundation

This folder contains shared mobile architecture for the Expo/React Native companion app.

- `src/api`: shared API client contracts.
- `src/auth`: mobile auth/session abstractions.
- `src/offline`: encrypted offline cache and sync queue interfaces.
- `src/dto`: shared DTOs for tasks, alerts, notifications, and sync.

The current web app remains unchanged; these modules are framework-neutral TypeScript foundations for future native screens.
