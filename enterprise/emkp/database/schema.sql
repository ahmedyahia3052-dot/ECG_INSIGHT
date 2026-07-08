-- ECG Medical Knowledge Platform (EMKP) — Isolated Database Schema
-- NOT applied to production. Future integration sprint only.
-- PostgreSQL normalized schema v1.0.0

CREATE SCHEMA IF NOT EXISTS emkp;

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE emkp.knowledge_category AS ENUM (
  'normal', 'rhythm', 'conduction', 'ischemia', 'electrolyte',
  'hypertrophy', 'channelopathy', 'structural', 'device', 'other'
);

CREATE TYPE emkp.evidence_level AS ENUM ('A', 'B', 'C', 'D', 'expert_consensus');
CREATE TYPE emkp.clinical_confidence AS ENUM ('definitive', 'high', 'moderate', 'low', 'indeterminate');
CREATE TYPE emkp.risk_category AS ENUM ('critical', 'high', 'intermediate', 'low', 'benign');
CREATE TYPE emkp.recommendation_level AS ENUM ('immediate', 'urgent', 'routine', 'optional', 'none');
CREATE TYPE emkp.severity_level AS ENUM ('normal', 'minor', 'abnormal', 'urgent', 'critical');
CREATE TYPE emkp.urgency_level AS ENUM ('routine', 'urgent', 'emergent', 'critical');

-- ============================================================
-- GUIDELINES
-- ============================================================

CREATE TABLE emkp.guidelines (
  id              TEXT PRIMARY KEY,
  organization    TEXT NOT NULL,
  document_id     TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  section         TEXT,
  year            INTEGER,
  url             TEXT,
  evidence_level  emkp.evidence_level,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_emkp_guidelines_org ON emkp.guidelines(organization);

-- ============================================================
-- DISEASES / KNOWLEDGE ENTRIES
-- ============================================================

CREATE TABLE emkp.diseases (
  id                   TEXT PRIMARY KEY,
  code                 TEXT NOT NULL UNIQUE,
  name                 TEXT NOT NULL,
  category             emkp.knowledge_category NOT NULL,
  definition           TEXT NOT NULL,
  severity             emkp.severity_level NOT NULL,
  urgency              emkp.urgency_level NOT NULL,
  risk_category        emkp.risk_category NOT NULL,
  recommendation_level emkp.recommendation_level NOT NULL DEFAULT 'routine',
  evidence_level       emkp.evidence_level NOT NULL DEFAULT 'B',
  confidence           emkp.clinical_confidence NOT NULL DEFAULT 'high',
  icd10                TEXT,
  snomed               TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_emkp_diseases_category ON emkp.diseases(category);
CREATE INDEX idx_emkp_diseases_code ON emkp.diseases(code);

CREATE TABLE emkp.disease_criteria (
  id          TEXT PRIMARY KEY,
  disease_id  TEXT NOT NULL REFERENCES emkp.diseases(id) ON DELETE CASCADE,
  kind        TEXT NOT NULL CHECK (kind IN ('diagnostic', 'ecg_characteristic', 'measurement', 'pitfall', 'clinical_note', 'differential')),
  content     TEXT NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_emkp_disease_criteria_disease ON emkp.disease_criteria(disease_id);

CREATE TABLE emkp.disease_guidelines (
  disease_id    TEXT NOT NULL REFERENCES emkp.diseases(id) ON DELETE CASCADE,
  guideline_id  TEXT NOT NULL REFERENCES emkp.guidelines(id) ON DELETE CASCADE,
  PRIMARY KEY (disease_id, guideline_id)
);

-- ============================================================
-- CLINICAL RULES
-- ============================================================

CREATE TABLE emkp.clinical_rules (
  id                    TEXT PRIMARY KEY,
  rule_id               TEXT NOT NULL UNIQUE,
  disease_id            TEXT NOT NULL REFERENCES emkp.diseases(id) ON DELETE CASCADE,
  definition            TEXT NOT NULL,
  clinical_significance TEXT NOT NULL,
  severity              emkp.severity_level NOT NULL,
  risk_level            emkp.risk_category NOT NULL,
  urgency               emkp.urgency_level NOT NULL,
  evidence_level        emkp.evidence_level NOT NULL,
  confidence            emkp.clinical_confidence NOT NULL,
  enabled               BOOLEAN NOT NULL DEFAULT TRUE,
  version               TEXT NOT NULL DEFAULT '1.0.0',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_emkp_rules_disease ON emkp.clinical_rules(disease_id);
CREATE INDEX idx_emkp_rules_enabled ON emkp.clinical_rules(enabled);

CREATE TABLE emkp.rule_findings (
  id        TEXT PRIMARY KEY,
  rule_id   TEXT NOT NULL REFERENCES emkp.clinical_rules(id) ON DELETE CASCADE,
  kind      TEXT NOT NULL CHECK (kind IN ('required', 'supporting', 'exclusion')),
  content   TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE emkp.rule_criteria (
  id        TEXT PRIMARY KEY,
  rule_id   TEXT NOT NULL REFERENCES emkp.clinical_rules(id) ON DELETE CASCADE,
  content   TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE emkp.recommendations (
  id        TEXT PRIMARY KEY,
  rule_id   TEXT NOT NULL REFERENCES emkp.clinical_rules(id) ON DELETE CASCADE,
  action    TEXT NOT NULL,
  priority  emkp.recommendation_level NOT NULL DEFAULT 'routine',
  sort_order INTEGER NOT NULL DEFAULT 0
);

-- ============================================================
-- DIFFERENTIAL DIAGNOSIS TREES
-- ============================================================

CREATE TABLE emkp.differential_nodes (
  id                      TEXT PRIMARY KEY,
  parent_id               TEXT REFERENCES emkp.differential_nodes(id) ON DELETE CASCADE,
  node_id                 TEXT NOT NULL UNIQUE,
  label                   TEXT NOT NULL,
  disease_id              TEXT REFERENCES emkp.diseases(id) ON DELETE SET NULL,
  distinguishing_features TEXT[],
  sort_order              INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_emkp_diff_parent ON emkp.differential_nodes(parent_id);

-- ============================================================
-- LEAD KNOWLEDGE
-- ============================================================

CREATE TABLE emkp.lead_knowledge (
  id                   TEXT PRIMARY KEY,
  lead                 TEXT NOT NULL UNIQUE,
  territory            TEXT NOT NULL,
  clinical_importance  TEXT NOT NULL,
  view_vector          TEXT NOT NULL,
  common_findings      TEXT[] NOT NULL DEFAULT '{}',
  associated_diseases  TEXT[] NOT NULL DEFAULT '{}'
);

-- ============================================================
-- TERMINOLOGY
-- ============================================================

CREATE TABLE emkp.terminology (
  id            TEXT PRIMARY KEY,
  term          TEXT NOT NULL UNIQUE,
  category      TEXT NOT NULL,
  definition    TEXT NOT NULL,
  synonyms      TEXT[] NOT NULL DEFAULT '{}',
  abbreviations TEXT[] NOT NULL DEFAULT '{}',
  related_terms TEXT[] NOT NULL DEFAULT '{}'
);

CREATE INDEX idx_emkp_terminology_category ON emkp.terminology(category);

CREATE TABLE emkp.terminology_synonyms (
  id              TEXT PRIMARY KEY,
  terminology_id  TEXT NOT NULL REFERENCES emkp.terminology(id) ON DELETE CASCADE,
  synonym         TEXT NOT NULL
);

CREATE INDEX idx_emkp_term_synonym ON emkp.terminology_synonyms(synonym);

-- ============================================================
-- EVIDENCE (extensible)
-- ============================================================

CREATE TABLE emkp.evidence (
  id              TEXT PRIMARY KEY,
  disease_id      TEXT REFERENCES emkp.diseases(id) ON DELETE CASCADE,
  rule_id         TEXT REFERENCES emkp.clinical_rules(id) ON DELETE CASCADE,
  description     TEXT NOT NULL,
  evidence_level  emkp.evidence_level NOT NULL,
  source          TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_emkp_evidence_disease ON emkp.evidence(disease_id);
