# ECG Insight Enterprise — Master Engineering Charter

## Mission

Build a production-grade Enterprise Clinical AI Platform.

Never optimize for demos.

Always optimize for maintainability, scalability, reliability and clinical safety.

---

## Core Principles

- Clean Architecture
- SOLID
- DRY
- KISS
- Dependency Injection
- Open/Closed Principle
- Composition over inheritance
- Feature-based architecture
- No duplicated business logic
- No temporary fixes
- No placeholder implementations
- Fix root causes instead of symptoms
- Reduce technical debt every sprint

---

## Enterprise Rules

Every feature must be:

- Modular
- Testable
- Documented
- Reusable
- Replaceable
- Observable
- Extensible
- Backward compatible

**Never:**

- Place business logic inside UI components
- Place clinical logic inside React components
- Build prompts inside UI
- Parse uploaded files inside UI

Frontend only displays data. Backend owns all business logic.

---

## Clinical AI Pipeline

```
Upload
  ↓
Attachment Service
  ↓
Attachment Context Builder
  ↓
OCR Engine
  ↓
Medical Extractors
  ↓
Metadata Builder
  ↓
Clinical Context Builder
  ↓
Prompt Builder
  ↓
LLM
  ↓
Clinical Validator
  ↓
Final Response
```

Never send raw files directly to the LLM.

---

## Attachment Context Builder

Automatically detect: ECG, Echo, X-ray, MRI, CT, Ultrasound, Lab, Radiology, PDF, Clinical Photo, Handwritten Notes.

Extract: OCR, Metadata, Measurements, Clinical Findings, Patient Information, Page References.

Merge duplicated information. Normalize units. Generate structured context.

---

## Plugin Architecture

Medical Extractors must be plugins (ECG, Lab, Radiology, Echo, Ultrasound, MRI, CT, Cath Lab, …).

Future plugins should require zero modification to existing modules.

---

## Voice

Support: permission handling, timeout recovery, continuous listening, push-to-talk, language switching, retry, noise handling.

Status lifecycle: Listening → Recording → Processing → Thinking → Speaking → Completed (and Error).

---

## Chat UX

- 100vh layout
- Fixed header, sidebar, input
- Scrollable messages only
- Textarea auto-grow, max height 120px, internal scrolling after max
- Never increase page height or push input off-screen
- Virtualize long conversations (10,000+ messages)
- Compact message spacing
- Auto-scroll only when user is near bottom

---

## Workspace

Professional workstation with dockable, resizable, collapsible, floating panels, saved layouts, workspace presets, multi-monitor readiness.

Panels: Patient, ECG Viewer, AI Chat, Measurements, Interpretation, Timeline, Reports.

---

## Design System

Reusable components only: Buttons, Cards, Dialogs, Inputs, Tables, Viewer, Toolbar, Timeline, Status Badge, Notification, Panel, Modal, Typography. One design language.

---

## Performance

Run OCR and preprocessing in parallel. Cache OCR and preprocessing. Avoid duplicated work. Background jobs for long-running tasks. Never block HTTP.

---

## Security

Role-based access, encrypted storage, audit logs, file validation, virus scan hook, PHI protection.

---

## Observability

Structured logging, tracing, metrics, latency (OCR, LLM, upload), error tracking.

---

## Quality

Every bug: create regression test → implement fix → verify regression. Never fix bugs without tests.

---

## Testing

Unit, Integration, Playwright, Medical workflow (Upload, OCR, Voice, ECG), Performance, Stress.

---

## Sprint Completion

A sprint cannot be closed until:

- TypeScript passes
- ESLint passes
- Build passes
- Tests pass
- Regression tests pass
- No placeholder, ignored uploads, or silent failures
- No duplicated logic or new technical debt
- Architecture reviewed
- Documentation updated

---

## Architecture Review (End of Sprint)

Generate:

- Implemented modules
- Design decisions
- Performance impact
- Security impact
- Scalability impact
- Technical debt removed
- Remaining risks
- Recommendations

---

## Future Ready

Design every module as if ECG Insight will support:

- Multi-hospital deployment
- Cloud + On-prem
- FDA / CE oriented workflows
- Future AI providers
- IoT ECG devices
- Real-time monitoring
- Enterprise integrations

Never choose a solution that will require redesign later.
