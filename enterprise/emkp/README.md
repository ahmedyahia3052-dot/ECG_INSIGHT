# ECG Medical Knowledge Platform (EMKP)

**Isolated enterprise module — not integrated with production.**

## Quick Start

```bash
# Validate platform integrity
npx tsx scripts/emkp-validation.test.ts

# Import in TypeScript (no runtime side effects)
import { buildEmkpPlatform, validateEmkpPlatform } from "./enterprise/emkp/src";
```

## Contents

- 47 structured ECG disease entries
- 47 clinical rules with required/supporting/exclusion findings
- 6 differential diagnosis trees
- 12-lead clinical knowledge
- 43+ terminology dictionary entries
- 10 guideline references (ESC, AHA, ACC, UDMI, IEC)
- Normalized PostgreSQL schema (`emkp.*` namespace)
- OpenAPI 3.1 specification (design only)

## Documentation

See repository root:
- `ECG_KNOWLEDGE_ARCHITECTURE.md`
- `MEDICAL_REFERENCE_INDEX.md`

## Isolation

This module does NOT modify production code, UI, routing, or existing APIs.
