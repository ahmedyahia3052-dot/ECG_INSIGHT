import { KNOWLEDGE_BASE } from "./diagnosis-factory";
import type { KnowledgeBaseEntry, MedicalDiagnosisCode } from "../types";

export { KNOWLEDGE_BASE } from "./diagnosis-factory";

const byCode = new Map<MedicalDiagnosisCode, KnowledgeBaseEntry>(
  KNOWLEDGE_BASE.map((entry) => [entry.code, entry]),
);

export function getKnowledgeEntry(code: MedicalDiagnosisCode): KnowledgeBaseEntry | undefined {
  return byCode.get(code);
}

export function getKnowledgeByCategory(category: KnowledgeBaseEntry["category"]): KnowledgeBaseEntry[] {
  return KNOWLEDGE_BASE.filter((entry) => entry.category === category);
}

export function searchKnowledge(query: string): KnowledgeBaseEntry[] {
  const normalized = query.toLowerCase().trim();
  if (!normalized) return KNOWLEDGE_BASE;
  return KNOWLEDGE_BASE.filter(
    (entry) =>
      entry.label.toLowerCase().includes(normalized) ||
      entry.code.toLowerCase().includes(normalized) ||
      entry.clinicalNotes.some((note) => note.toLowerCase().includes(normalized)) ||
      entry.ecgCharacteristics.some((char) => char.toLowerCase().includes(normalized)),
  );
}

export function listAllDiagnosisCodes(): MedicalDiagnosisCode[] {
  return KNOWLEDGE_BASE.map((entry) => entry.code);
}

export function getKnowledgeBaseStats() {
  const categories = new Map<string, number>();
  for (const entry of KNOWLEDGE_BASE) {
    categories.set(entry.category, (categories.get(entry.category) ?? 0) + 1);
  }
  return {
    totalEntries: KNOWLEDGE_BASE.length,
    categories: Object.fromEntries(categories),
  };
}
