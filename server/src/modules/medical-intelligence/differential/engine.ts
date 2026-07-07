import { KNOWLEDGE_BASE, getKnowledgeEntry } from "../knowledge-base";
import type { DifferentialDiagnosisEntry, MedicalDiagnosisCode, RuleFinding } from "../types";

const SEVERITY_WEIGHT: Record<string, number> = {
  critical: 5,
  urgent: 4,
  abnormal: 3,
  minor: 2,
  normal: 1,
};

export function generateDifferentialDiagnosis(
  finding: RuleFinding,
  allFindings: RuleFinding[],
): DifferentialDiagnosisEntry[] {
  const knowledge = getKnowledgeEntry(finding.code);
  const differentials = knowledge?.differentialDiagnosis ?? [];

  const entries: DifferentialDiagnosisEntry[] = [];

  for (const diffLabel of differentials) {
    const matched = findMatchingDiagnosis(diffLabel, allFindings);
    if (matched && matched.code !== finding.code) {
      entries.push({
        rank: 0,
        code: matched.code,
        label: matched.label,
        likelihood: Number((matched.rawConfidence * 0.8).toFixed(3)),
        distinguishingFeatures: buildDistinguishingFeatures(finding, matched, knowledge),
        explanation: `${matched.label} is a key differential because it shares overlapping ECG features with ${finding.label}.`,
      });
    } else {
      const code = findCodeByLabel(diffLabel);
      entries.push({
        rank: 0,
        code: code ?? finding.code,
        label: diffLabel,
        likelihood: Number((0.3 - entries.length * 0.04).toFixed(3)),
        distinguishingFeatures: [`Compare specific morphology criteria for ${diffLabel} vs ${finding.label}`],
        explanation: `${diffLabel} should be considered and excluded based on distinguishing ECG features and clinical context.`,
      });
    }
  }

  const relatedFindings = allFindings
    .filter((f) => f.code !== finding.code && f.category === finding.category)
    .sort((a, b) => b.rawConfidence - a.rawConfidence);

  for (const related of relatedFindings) {
    if (entries.some((e) => e.code === related.code)) continue;
    entries.push({
      rank: 0,
      code: related.code,
      label: related.label,
      likelihood: related.rawConfidence,
      distinguishingFeatures: buildDistinguishingFeatures(finding, related, knowledge),
      explanation: `Concurrent finding ${related.label} may represent an alternative or coexisting diagnosis.`,
    });
  }

  const ranked = entries
    .sort((a, b) => b.likelihood - a.likelihood)
    .slice(0, 5)
    .map((entry, index) => ({ ...entry, rank: index + 1 }));

  while (ranked.length < 5 && ranked.length < KNOWLEDGE_BASE.length) {
    const filler = KNOWLEDGE_BASE.find(
      (k) => k.category === finding.category && k.code !== finding.code && !ranked.some((r) => r.code === k.code),
    );
    if (!filler) break;
    ranked.push({
      rank: ranked.length + 1,
      code: filler.code,
      label: filler.label,
      likelihood: 0.1,
      distinguishingFeatures: filler.ecgCharacteristics.slice(0, 2),
      explanation: `${filler.label} is in the same category and should be considered in the differential.`,
    });
  }

  return ranked.slice(0, 5);
}

function findMatchingDiagnosis(label: string, findings: RuleFinding[]): RuleFinding | undefined {
  const normalized = label.toLowerCase();
  return findings.find(
    (f) => f.label.toLowerCase().includes(normalized.slice(0, 6)) || normalized.includes(f.label.toLowerCase().slice(0, 6)),
  );
}

function findCodeByLabel(label: string): MedicalDiagnosisCode | undefined {
  const normalized = label.toLowerCase();
  const entry = KNOWLEDGE_BASE.find(
    (k) => k.label.toLowerCase().includes(normalized.slice(0, 8)) || normalized.includes(k.label.toLowerCase().slice(0, 8)),
  );
  return entry?.code;
}

function buildDistinguishingFeatures(
  primary: RuleFinding,
  alternative: RuleFinding,
  knowledge: ReturnType<typeof getKnowledgeEntry>,
): string[] {
  const features: string[] = [];
  if (primary.category !== alternative.category) {
    features.push(`Category: ${primary.category} vs ${alternative.category}`);
  }
  if (SEVERITY_WEIGHT[primary.severity] !== SEVERITY_WEIGHT[alternative.severity]) {
    features.push(`Severity: ${primary.severity} vs ${alternative.severity}`);
  }
  const primaryEvidence = primary.evidence.map((e) => e.feature).join(", ");
  const altEvidence = alternative.evidence.map((e) => e.feature).join(", ");
  if (primaryEvidence !== altEvidence) {
    features.push(`Primary evidence differs: ${primaryEvidence} vs ${altEvidence}`);
  }
  if (knowledge?.pitfalls.length) {
    features.push(knowledge.pitfalls[0]!);
  }
  return features.slice(0, 4);
}
