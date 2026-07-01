export const COPILOT_V3_TOOLS = [
  {
    function: {
      description: "Search curated medical knowledge (cardiology, internal medicine, ECG, drugs, guidelines). Returns JSON hits only.",
      name: "medical_knowledge_search",
      parameters: {
        properties: {
          query: { description: "Clinical search query", type: "string" },
        },
        required: ["query"],
        type: "object",
      },
    },
    type: "function" as const,
  },
  {
    function: {
      description: "Retrieve structured patient and case record data from the EHR. Returns JSON only.",
      name: "patient_record_retrieval",
      parameters: {
        properties: {
          caseId: { type: "string" },
          patientId: { type: "string" },
        },
        type: "object",
      },
    },
    type: "function" as const,
  },
  {
    function: {
      description: "Structured ECG analysis from uploaded tracing or case context. Returns JSON measurements and findings only.",
      name: "ecg_analyzer",
      parameters: {
        properties: {
          attachmentId: { type: "string" },
          focus: { description: "rhythm | ischemia | conduction | qt | general", type: "string" },
        },
        type: "object",
      },
    },
    type: "function" as const,
  },
  {
    function: {
      description: "Structured laboratory report analysis. Returns JSON abnormal values and parsed analytes only.",
      name: "laboratory_analyzer",
      parameters: {
        properties: {
          attachmentId: { type: "string" },
        },
        type: "object",
      },
    },
    type: "function" as const,
  },
  {
    function: {
      description: "Structured radiology/imaging report analysis. Returns JSON findings and impression only.",
      name: "radiology_reader",
      parameters: {
        properties: {
          attachmentId: { type: "string" },
        },
        type: "object",
      },
    },
    type: "function" as const,
  },
  {
    function: {
      description: "OCR and document text extraction for medical documents. Returns JSON text and document type only.",
      name: "medical_ocr",
      parameters: {
        properties: {
          attachmentId: { type: "string" },
        },
        type: "object",
      },
    },
    type: "function" as const,
  },
  {
    function: {
      description: "Search clinical guidelines (ESC, AHA, ACC). Returns JSON excerpts only.",
      name: "clinical_guidelines",
      parameters: {
        properties: {
          query: { type: "string" },
        },
        required: ["query"],
        type: "object",
      },
    },
    type: "function" as const,
  },
  {
    function: {
      description: "Drug information and interaction lookup. Returns JSON monograph excerpts only.",
      name: "drug_database",
      parameters: {
        properties: {
          query: { type: "string" },
        },
        required: ["query"],
        type: "object",
      },
    },
    type: "function" as const,
  },
  {
    function: {
      description: "Clinical risk calculators and scores. Returns JSON inputs/outputs only.",
      name: "clinical_calculator",
      parameters: {
        properties: {
          calculator: { description: "chads_vasc | has_bled | grace | qtc", type: "string" },
          inputs: { type: "object" },
        },
        required: ["calculator"],
        type: "object",
      },
    },
    type: "function" as const,
  },
  {
    function: {
      description: "Search indexed medical content. Returns JSON snippets only.",
      name: "medical_search",
      parameters: {
        properties: {
          query: { type: "string" },
        },
        required: ["query"],
        type: "object",
      },
    },
    type: "function" as const,
  },
];
