# Medical Intelligence API Specification

**Base URL:** `/api/medical-intelligence`  
**Authentication:** Bearer JWT required on all endpoints  
**Content-Type:** `application/json`

---

## Endpoints

### Health Check

```
GET /health
```

**Auth:** Any authenticated user

**Response 200:**
```json
{
  "ok": true,
  "service": "medical-intelligence-engine",
  "version": "1.0.0",
  "knowledgeBaseEntries": 37,
  "ruleCount": 37
}
```

---

### List / Search Knowledge Base

```
GET /knowledge?query={term}&category={category}&code={code}
```

**Auth:** Any authenticated user

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| query | string | Free-text search across labels, codes, notes |
| category | enum | rhythm, conduction, ischemia, electrolyte, hypertrophy, channelopathy, other |
| code | string | Exact diagnosis code (e.g., STEMI) |

**Response 200:**
```json
{
  "entries": [KnowledgeBaseEntry],
  "stats": {
    "totalEntries": 37,
    "categories": { "rhythm": 12, "conduction": 9, ... }
  }
}
```

---

### Get Knowledge Entry

```
GET /knowledge/:code
```

**Auth:** Any authenticated user

**Response 200:** `{ "entry": KnowledgeBaseEntry }`  
**Response 404:** Diagnosis not found

---

### List Rule Definitions

```
GET /rules
```

**Auth:** Any authenticated user

**Response 200:**
```json
{
  "rules": [
    { "ruleId": "RHY-001", "category": "rhythm", "description": "Normal sinus rhythm criteria" }
  ]
}
```

---

### Analyze Measurements

```
POST /analyze
```

**Auth:** DOCTOR, ADMIN, SUPER_ADMIN

**Request Body:**
```json
{
  "measurement": {
    "heartRate": 75,
    "rhythm": "sinus_rhythm",
    "confidence": 0.85,
    "intervals": {
      "prIntervalMs": 160,
      "qrsDurationMs": 90,
      "qtIntervalMs": 380,
      "qtcBazettMs": 410,
      "qtcFridericiaMs": 400,
      "rrIntervalMs": 800,
      "pWaveDurationMs": 90
    },
    "axis": {
      "meanQrsAxisDeg": 45,
      "frontalPlaneAxisDeg": 45,
      "electricalAxisDeg": 45
    },
    "amplitudes": {
      "stDeviationMm": 0,
      "tWaveAmplitudeMv": 0.4,
      "qrsAmplitudeMv": 1.2,
      "pWaveAmplitudeMv": 0.15,
      "rWaveProgression": "normal"
    },
    "morphology": [],
    "stDeviation": 0
  },
  "clinicalContext": {
    "symptoms": ["chest pain"],
    "medications": ["metoprolol"],
    "age": 65,
    "sex": "male"
  },
  "caseId": "optional-case-id",
  "patientId": "optional-patient-id"
}
```

**Response 201:**
```json
{
  "report": MedicalIntelligenceReport,
  "reportId": "cuid-or-null"
}
```

---

### Analyze Case (Full Pipeline)

```
POST /cases/:caseId/analyze
```

**Auth:** DOCTOR

Runs: digitization → measurement → medical intelligence → persistence

**Response 201:**
```json
{
  "report": MedicalIntelligenceReport,
  "reportId": "cuid"
}
```

**Response 404:** No ECG image found for case

---

### List Case Reports

```
GET /cases/:caseId/reports
```

**Auth:** Case access required

**Response 200:**
```json
{
  "reports": [MedicalIntelligenceReport with findings]
}
```

---

### Get Report by ID

```
GET /reports/:reportId
```

**Auth:** Case access required (if report linked to case)

**Response 200:** `{ "report": MedicalIntelligenceReport }`  
**Response 404:** Report not found

---

### Seed Knowledge Base

```
POST /knowledge/seed
```

**Auth:** SUPER_ADMIN

Seeds in-memory knowledge base entries to PostgreSQL.

**Response 200:**
```json
{ "seeded": 37, "total": 37 }
```

---

## Report Schema

```typescript
interface MedicalIntelligenceReport {
  version: "1.0.0";
  generatedAt: string;          // ISO 8601
  engineId: "ecg-medical-intelligence-engine";
  measurements: Record<string, number | string>;
  findings: Array<{
    code: string;
    label: string;
    category: string;
    severity: "normal" | "minor" | "abnormal" | "urgent" | "critical";
    urgency: "routine" | "urgent" | "emergent" | "critical";
    confidence: {
      level: "high" | "medium" | "low" | "unknown";
      score: number;
      explanation: string;
      factors: Array<{ factor: string; impact: string; weight: number }>;
    };
    explainability: {
      diagnosisCode: string;
      diagnosisLabel: string;
      rationale: string;
      supportingEvidence: string[];
      conflictingEvidence: string[];
      missingEvidence: string[];
      possibleAlternatives: Array<{ code: string; label: string; reason: string }>;
    };
    differentialDiagnosis: Array<{
      rank: number;
      code: string;
      label: string;
      likelihood: number;
      distinguishingFeatures: string[];
      explanation: string;
    }>;
  }>;
  primaryDiagnosis: { code: string | null; label: string; confidence: ConfidenceAssessment };
  recommendations: Array<{
    type: "repeat_ecg" | "serial_troponin" | "echo" | "electrolytes" | "cardiology_consult" | "emergency_referral" | "observation" | "no_immediate_action" | ...;
    priority: "immediate" | "urgent" | "routine" | "optional";
    action: string;
    rationale: string;
    timeframe?: string;
  }>;
  warnings: string[];
  criticalFindings: string[];
  overallSeverity: ClinicalSeverity;
  overallUrgency: ClinicalUrgency;
  overallConfidence: ConfidenceAssessment;
  explainabilitySummary: string;
}
```

---

## Error Responses

| Status | Code | Description |
|--------|------|-------------|
| 401 | AUTH_REQUIRED | Missing or invalid token |
| 403 | FORBIDDEN | Insufficient role |
| 404 | NOT_FOUND | Resource not found |
| 422 | VALIDATION_ERROR | Invalid request body (Zod) |

---

## Rate Limits

Subject to global API rate limiting configured in `server/src/middleware/api-security.ts`.
