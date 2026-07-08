# Real Clinical RAG Engine Report

## Architecture

The Medical AI Copilot now uses an explicit Clinical RAG pipeline inside `server/src/modules/copilot/copilot.routes.ts`.

Pipeline stages:

- `retrieveClinicalContext()`
- `retrieveKnowledge()`
- `buildPrompt()`
- `generateClinicalResponse()`

The frontend widget in `MedicalAICopilot.tsx` sends the current route context and displays RAG evidence returned by the backend.

## Context Pipeline

When opened inside a patient profile or ECG case, the backend retrieves:

- Patient demographics: name, age, gender, employee ID, company, department, occupation.
- Clinical history: medical history, medications, allergies, smoking, hypertension, diabetes, family history, and cardiovascular risk factors.
- ECG history: previous ECG cases, diagnoses, rhythm, rate, intervals, severity, and prior reports.
- Current ECG case: AI diagnosis, doctor diagnosis, rhythm, heart rate, PR, QRS, QT, QTc, axis, severity, status, reports, documents, files, and critical alerts.
- Cardiovascular documents: echo, stress ECG, angiography, cath reports, surgery reports, prescriptions, discharge summaries, extraction summaries, and indexed text.

If no patient or case is open, the copilot answers from ECG knowledge only.

## Knowledge Structure

The ECG knowledge repository is persisted in PostgreSQL through `ECGKnowledgeEntry`.

Expanded knowledge entries include:

- Normal ECG
- Sinus Bradycardia
- Sinus Tachycardia
- Atrial Fibrillation
- Atrial Flutter
- PAC
- PVC
- AV Blocks
- Bundle Branch Blocks
- STEMI
- NSTEMI
- Ischemia
- LVH
- RVH
- Hyperkalemia
- Hypokalemia
- QT Abnormalities
- Pericarditis
- Early Repolarization

Each entry stores definition, ECG criteria, differential diagnosis, clinical significance, occupational implications, recommended follow-up, references, and tags.

Migration applied:

- `20260626014500_expand_clinical_rag_knowledge`

## Clinical Response Format

Every copilot answer now includes:

- Clinical Summary
- ECG Interpretation
- Differential Diagnosis
- Risk Stratification
- Occupational Fitness Opinion
- Recommendations
- Follow-up Plan
- Confidence Score
- Sources Used
- Knowledge Tags

The response always includes the safety disclaimer:

> AI assistance only. Final diagnosis and clinical decisions remain the responsibility of the physician.

## Clinical Examples

Example: `Explain this ECG`

- Uses the current ECG case when available.
- Includes rhythm, rate, PR/QRS/QT/QTc, axis, AI findings, physician findings, severity, alerts, and source citations.

Example: `Compare with previous ECG`

- Retrieves prior ECG cases and reports for the same patient.
- Summarizes interval changes and recommends physician confirmation.

Example: `Is this worker fit for offshore duty?`

- Uses occupational context, ECG risk, alerts, symptoms implied by history, and safety-sensitive work logic.
- Returns temporary restriction guidance when high-risk or unresolved findings are present.

## UI Enhancements

The Medical AI Copilot now displays:

- Current context: Patient -> ECG Case -> Reports or global knowledge only.
- Confidence percentage.
- Sources used.
- Knowledge tags.
- Owner analytics including top diagnosis/knowledge topics requested.

## Owner Analytics

Owner analytics now tracks:

- Total conversations.
- Active users.
- Average response time.
- Most common prompts.
- Top diagnoses/knowledge topics requested.

## Validation Evidence

Passed:

- `npx prisma migrate deploy`
- `npm run build`
- `npm run lint`
- `npm run test`
- IDE diagnostics on edited files

Frontend smoke validation:

- `npx expo start --web --port 8083`
- Metro bundled successfully.
- Local HTTP probe returned `HTTP 200`.
- No startup runtime errors.
- No Medical AI Copilot initialization errors.

Known note:

- Expo reported package compatibility suggestions for `@types/react` and `@types/react-dom`; these are version alignment warnings and not related to the RAG implementation.
