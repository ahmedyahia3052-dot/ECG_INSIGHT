# Sprint 27 Enterprise Organization, Contractor & Occupational Cardiology Platform Report

## Executive Summary

Sprint 27 extends ECG Insight into a multi-tenant occupational cardiology platform. The implementation adds a first-class company layer beneath organizations, links companies to contractors, departments, employees, patients, and ECG cases through the patient record, expands employee occupational metadata, adds explicit job risk profiles, strengthens the fitness decision engine, renders occupational decisions in ECG reports, and adds automated regression coverage.

## Enterprise Hierarchy

Implemented hierarchy:

- Organization.
- Company.
- Contractor.
- Department.
- Employee/Patient.
- ECG Cases.

The new `Company` model is linked to `Organization`, `ContractorCompany`, `Department`, `Employee`, and `Patient`. Existing records remain compatible because `companyId` links are nullable.

## Prisma Schema Coverage

Implemented or extended:

- `Organization`.
- `Company`.
- `ContractorCompany`.
- `Department`.
- `Employee`.
- `Patient`.
- `ECGCase`.
- `OccupationalRiskProfile`.
- `FitnessAssessment`.
- `WorkRestriction`.
- `ReturnToWorkDecision`.

Employee and patient occupational fields now include:

- Employee ID.
- National ID.
- Job title.
- Work location.
- Hiring date.
- Risk category.
- Fitness status through `medicalFitnessStatus` and patient `fitnessStatus`.
- Medical restrictions.

## Occupational Cardiology Module

The decision engine supports:

- Fit for duty.
- Fit with restrictions.
- Temporarily unfit.
- Permanently unfit.
- Specialist review required for high-risk ambiguous cases.

The engine uses ECG findings, measurements, cardiac history, medications, job exposure, safety-critical duties, and risk scores to generate occupational recommendations.

## Occupational Risk Profiles

Added explicit risk profile types:

- Driver.
- Crane operator.
- Heavy equipment operator.
- Work at heights.
- Confined spaces.
- Office worker.
- Food handler.
- Custom risk profile.

Risk profile type now contributes to risk scoring and restrictions. For example, crane/heavy equipment work contributes safety-sensitive exposure and can generate heavy equipment restrictions.

## Backend APIs

Implemented and extended:

- `/api/v1/companies` CRUD with search/filter and audit logs.
- `/api/v1/organizations` existing organization CRUD and analytics.
- `/api/v1/contractors` company-aware contractor CRUD.
- `/api/v1/departments` company-aware department CRUD.
- `/api/v1/employees` company-aware employee CRUD, search/filter, patient linkage, and clinical folders.
- `/api/v1/occupational-risk` explicit risk profile types and analytics.
- `/api/v1/fitness-assessments` occupational decision engine and generated restrictions.
- `/api/v1/work-restrictions` active clinical restrictions.

RBAC and resource access checks remain enforced through existing auth middleware and employee access utilities.

## Frontend

Updated the workforce dashboard to support:

- Organizations.
- Companies.
- Departments.
- Contractors.
- Employees.
- Employee company assignment.
- Contractor assignment.
- Work location.
- Risk category.
- Medical restrictions.

Updated frontend service contracts for companies, employee occupational fields, and occupational risk profile types.

## ECG Report Integration

ECG medical reports now visibly render occupational cardiology output:

- Fitness decision.
- Job risk profile.
- Review date.
- Physician justification.
- Work restrictions.

Reports retain the clinical disclaimer requiring physician review for diagnosis, occupational fitness decisions, and emergency activation.

## Automated Validation

Added:

- `scripts/sprint27-occupational-cardiology.integration.ts`

Coverage verifies:

- Organization creation.
- Company creation and hierarchy linkage.
- Department and contractor company linkage.
- Employee demographics and occupational metadata.
- Employee-to-patient linkage.
- Occupational risk profile type persistence.
- Fitness assessment decision generation.
- Work restrictions in assessment output.
- ECG report occupational section integration.
- Audit logs.

Validation completed:

- `npm run build` passed.
- `npx prisma migrate deploy` applied the Sprint 27 migration.
- `npx tsx scripts/sprint27-occupational-cardiology.integration.ts` passed.
- `npm run lint` passed.
- `npm run test` passed.

## Clinical Safety Note

Occupational cardiology recommendations in ECG Insight are clinical decision support. Final duty status, restrictions, return-to-work decisions, and permanent unfitness decisions require physician sign-off, original ECG review, clinical history review, job hazard context, symptoms, vitals, and local occupational medicine regulations.
