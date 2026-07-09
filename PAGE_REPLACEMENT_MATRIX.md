# Page Replacement Matrix — Phase 1 / Sprint P1.1

**Difficulty:** 1 (trivial) – 5 (critical clinical)  
**Strategy:** Replace | Adapter | Keep Cursor | Merge | Defer

---

## Public Pages (12)

| Current Page | Route | Bolt Page | Strategy | Dependencies | Conflicts | Difficulty |
|--------------|-------|-----------|----------|--------------|-----------|------------|
| Index redirect | `/` | `landing.tsx` | Merge | AuthContext redirect logic | Cursor auto-redirects authenticated users | 2 |
| Login | `/login` | `login.tsx` | Replace | oauth, AuthContext | OAuth providers vs Bolt form-only | 2 |
| Register | `/register` | `register.tsx` | Replace | oauth, zod | Institution field mapping | 2 |
| Forgot Password | `/forgot-password` | `forgot-password.tsx` | Replace | auth service | — | 1 |
| Verify Email | `/verify-email` | — | Keep Cursor | auth | No Bolt page | 2 |
| Privacy Policy | `/privacy-policy` | — | Keep Cursor | — | Legal content | 1 |
| Terms of Service | `/terms-of-service` | — | Keep Cursor | — | Legal content | 1 |
| Contact Support | `/contact-support` | — | Adapter | support service | Overlaps `/support` | 2 |
| System Status | `/system-status` | — | Adapter | systemStatus | Public health page — build in Bolt | 2 |
| Onboarding | `/onboarding` | — | Defer | AsyncStorage | Orphan route (not in Stack) | 2 |
| Unauthorized | `/unauthorized` | — | Keep Cursor | — | Orphan route | 1 |
| Not Found | `+not-found` | Navigate fallback | Replace | — | Bolt uses `Navigate to /` | 1 |

---

## Protected — Core Clinical (14)

| Current Page | Route | Bolt Page | Strategy | Dependencies | Conflicts | Difficulty |
|--------------|-------|-----------|----------|--------------|-----------|------------|
| Dashboard | `/dashboard` | `dashboard.tsx` | Adapter | useDashboardData, boltUiAdapter (s104) | Main lacks container; on sprint104 branch | 2 |
| ECG Cases | `/ecg-cases` | `ecg-history.tsx` | Adapter | useEcgCasesPage, boltUiAdapter | Route name mismatch (`history` vs `ecg-cases`) | 2 |
| ECG Case Detail | `/ecg-cases/:id` | `case-details.tsx` | Adapter | clinical, EcgProViewer embed | Bolt mock data vs live API | 4 |
| ECG Case New | `/ecg-cases/new` | — | Keep Cursor | clinical mutation | No Bolt page | 3 |
| ECG Case Review | `/ecg-cases/:id/review` | — | Keep Cursor | ai, reports | Doctor workflow | 4 |
| Upload ECG | `/upload-ecg` | `upload-ecg.tsx` | Replace | uploadPipeline, ai, ecgFiles | `/upload` vs `/upload-ecg` URL | 3 |
| ECG Pro Viewer | `/ecg-viewer` | — | Keep Cursor + Bolt chrome | ecgViewerApi, measurements | Full-bleed; canvas must not break | **5** |
| ECG Workspace | `/ecg-workspace` | — | Keep Cursor + Bolt chrome | ecgViewerWorkspace | Overlaps monitor route | **5** |
| ECG Monitor | `/ecg-monitor/:caseId` | — | Merge | workspace resolver | Duplicate of workspace | 4 |
| Live Monitor gate | `/ecg-live-monitor` | — | Keep Cursor + Bolt chrome | hospital, examination gate | No Bolt equivalent | **5** |
| Live Monitor direct | `/ecg-live-monitor/:caseId` | — | Keep Cursor | — | Deep link variant | 4 |
| Clinical Workspace | `/clinical-workspace/:caseId` | Partial `case-details.tsx` | Merge | ai, ecgProcessing | Split-screen vs Bolt single column | 4 |
| ECG Analysis | `/ecg-analysis` | — | Adapter | ai, clinical, reports | No Bolt page | 3 |
| ECG Benchmark | `/ecg-benchmark` | — | Defer | ecgBenchmark | Internal QA only | 2 |

---

## Protected — Patients & Reports (7)

| Current Page | Route | Bolt Page | Strategy | Dependencies | Conflicts | Difficulty |
|--------------|-------|-----------|----------|--------------|-----------|------------|
| Patients List | `/patients` | — | Adapter (new) | clinical, usePatientsPage | No Bolt page | 3 |
| Patient Create | `/patients/create` | — | Adapter (new) | clinical, zod | — | 3 |
| Patient New (alias) | `/patients/new` | — | Merge | re-exports create | **Delete after migration** | 1 |
| Patient Detail | `/patients/:id` | — | Adapter (new) | 7 tabs, documents | Complex tabs | 4 |
| Patient Edit | `/patients/:id/edit` | — | Adapter (new) | clinical | — | 3 |
| Reports List | `/reports` | — | Adapter (new) | reports | No Bolt page | 3 |
| Report Detail | `/reports/:id` | — | Adapter (new) | reportsDomain | Sign/export workflow | 4 |

---

## Protected — Platform & Admin (14)

| Current Page | Route | Bolt Page | Strategy | Dependencies | Conflicts | Difficulty |
|--------------|-------|-----------|----------|--------------|-----------|------------|
| Copilot | `/copilot` | — | **Keep Cursor** | copilot, copilotUpload | No Bolt equivalent | 4 |
| Copilot Thread | `/copilot/:conversationId` | — | **Keep Cursor** | copilot | Alias route | 3 |
| Analytics | `/analytics` | Partial admin charts | Adapter | ai, clinical | — | 3 |
| Notifications | `/notifications` | — | Replace | collaboration | No Bolt page | 2 |
| Settings | `/settings` | Sidebar placeholder | Replace | preferences | Bolt sidebar stub only | 2 |
| Profile | `/profile` | `profile.tsx` | Replace | AuthContext | — | 2 |
| Team Management | `/team-management` | Partial `/admin/users` | Adapter | managedUsers | Duplicate nav entries | 3 |
| Support (auth) | `/support` | — | Merge | support | vs `/contact-support` | 2 |
| Admin Dashboard | `/admin-dashboard` | `admin-dashboard.tsx` | Replace | collaboration, subscriptions | `/admin` vs `/admin-dashboard` | 3 |
| Audit Log | `/audit-log` | — | Defer | enterpriseClinical | Admin-only | 3 |
| Billing / Subscription | `/billing-subscription` | — | Adapter (new) | subscriptions | No Bolt subscription page in ref | 3 |
| Owner Licenses | `/owner/licenses` | — | Defer | subscriptions | super_admin only | 3 |
| Release Candidate | `/release-candidate` | — | Defer | releaseCandidate | Internal | 2 |

---

## Bolt Reference Pages NOT in Cursor

| Bolt Page | Bolt Route | Cursor Action |
|-----------|------------|---------------|
| Landing | `/` | Optional marketing page; Cursor redirects |
| Admin Users | `/admin/users` | Map to `/team-management` |

---

## Summary

| Strategy | Count |
|----------|-------|
| Replace | 8 |
| Adapter | 14 |
| Keep Cursor | 10 |
| Keep Cursor + Bolt chrome | 4 |
| Merge | 5 |
| Defer | 4 |

| Difficulty | Count |
|------------|-------|
| 1–2 (Low) | 18 |
| 3 (Medium) | 17 |
| 4 (High) | 7 |
| 5 (Critical) | 3 |

**Recommended first swaps:** Login, Register, Profile, Dashboard, ECG Cases, Upload (after sprint104 merge).

---

## URL Preservation Rule

All existing Cursor URLs must continue to resolve after migration. Bolt internal paths (`/history`, `/upload`, `/cases/:id`) are **reference only** — Expo routes stay canonical.
