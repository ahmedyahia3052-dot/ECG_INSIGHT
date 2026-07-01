import { prisma } from "../../../config/prisma";
import type { ClinicalContext, KnowledgeHit } from "../copilot-types";
import { semanticSearchKnowledge } from "../medical-knowledge";
import type { KnowledgeRoute, KnowledgeSource } from "./types";

const SOURCE_HINTS: Record<KnowledgeSource, RegExp> = {
  aha_guidelines: /aha|acc|american heart/i,
  cardiology_kb: /cardio|heart|arrhythmia|ischemia|stemi|af|qt|hypertension/i,
  clinical_calculator: /score|calculator|chads|has-bled|grace/i,
  drug_database: /drug|medication|dose|amiodarone|warfarin|statin|interaction/i,
  ecg_database: /ecg|ekg|rhythm|qrs|qtc|st elevation|interpretation/i,
  esc_guidelines: /esc|european/i,
  internal_knowledge_base: /clinical|guideline|management|diagnosis/i,
  laboratory_database: /lab|troponin|potassium|creatinine|electrolyte/i,
  occupational_medicine: /occupational|fitness|work|duty|offshore/i,
  patient_database: /patient|record|chart|history/i,
  risk_scores: /risk|score|stratification|chads|has-bled/i,
  uploaded_documents: /upload|document|pdf|report|attachment/i,
  uploaded_ecg: /ecg|ekg|tracing|strip/i,
  uploaded_images: /image|photo|scan|x-ray|radiograph/i,
};

const RETRIEVABLE_SOURCES: KnowledgeSource[] = [
  "aha_guidelines",
  "cardiology_kb",
  "clinical_calculator",
  "drug_database",
  "ecg_database",
  "esc_guidelines",
  "internal_knowledge_base",
  "laboratory_database",
  "occupational_medicine",
  "risk_scores",
];

function clinicalTerms(text: string) {
  const aliases: Record<string, string[]> = {
    af: ["af", "atrial", "fibrillation"],
    flutter: ["flutter"],
    hyperkalemia: ["hyperkalemia", "potassium"],
    hypokalemia: ["hypokalemia", "potassium"],
    ischemia: ["ischemia", "st", "depression", "elevation"],
    lbbb: ["lbbb", "bundle", "branch"],
    lvh: ["lvh", "hypertrophy"],
    nstemi: ["nstemi", "troponin", "ischemia"],
    pac: ["pac", "premature", "atrial"],
    pericarditis: ["pericarditis"],
    pvc: ["pvc", "premature", "ventricular"],
    qt: ["qt", "qtc", "torsades"],
    rbbb: ["rbbb", "bundle", "branch"],
    rvh: ["rvh", "hypertrophy"],
    stemi: ["stemi", "st", "elevation"],
    hypertension: ["hypertension", "blood", "pressure"],
  };
  const raw = text.split(/\W+/).filter((word) => word.length > 1);
  const expanded = raw.flatMap((word) => aliases[word] ?? [word]);
  return Array.from(new Set(expanded)).slice(0, 24);
}

function matchesSource(hit: KnowledgeHit, source: KnowledgeSource) {
  const haystack = `${hit.topic} ${hit.content} ${hit.sourceName} ${hit.tags.join(" ")}`.toLowerCase();
  return SOURCE_HINTS[source].test(haystack);
}

function filterHitsByRoute(hits: KnowledgeHit[], sources: KnowledgeSource[]) {
  if (!sources.length) return [];
  const filtered = hits.filter((hit) => sources.some((source) => RETRIEVABLE_SOURCES.includes(source) && matchesSource(hit, source)));
  return filtered.length ? filtered : hits.slice(0, 4);
}

function rankHitsForQuery(hits: KnowledgeHit[], query: string) {
  const queryTerms = clinicalTerms(query.toLowerCase());
  if (!queryTerms.length) return hits;
  const scored = hits.map((hit) => {
    const haystack = `${hit.topic} ${hit.content} ${hit.tags.join(" ")}`.toLowerCase();
    const score = queryTerms.reduce((sum, term) => sum + (haystack.includes(term) ? 1 : 0), 0);
    return { hit, score };
  });
  const matched = scored.filter((entry) => entry.score > 0).sort((left, right) => right.score - left.score || right.hit.relevanceScore - left.hit.relevanceScore);
  return matched.length ? matched.map((entry) => entry.hit) : hits;
}

export async function retrieveRoutedKnowledge(route: KnowledgeRoute, context: ClinicalContext): Promise<KnowledgeHit[]> {
  const activeSources = route.sources.filter((source) => RETRIEVABLE_SOURCES.includes(source));
  if (!activeSources.length) return [];

  const haystack = [
    route.query,
    context.currentCase?.diagnosis,
    context.currentCase?.doctorDiagnosis,
    context.currentCase?.rhythm,
    context.currentCase?.severity,
    ...context.previousEcgs,
    ...context.reports,
    ...context.criticalAlerts,
  ].filter(Boolean).join(" ").toLowerCase();
  const terms = clinicalTerms(haystack);

  const enterpriseHits = await semanticSearchKnowledge(route.query, { contextTerms: terms, take: 8 });
  const legacyHits = await prisma.eCGKnowledgeEntry.findMany({
    orderBy: { updatedAt: "desc" },
    take: 8,
    where: {
      OR: [
        { tags: { hasSome: terms } },
        ...terms.slice(0, 8).flatMap((term) => [
          { topic: { contains: term, mode: "insensitive" as const } },
          { content: { contains: term, mode: "insensitive" as const } },
        ]),
      ],
    },
  });

  const selected: KnowledgeHit[] = enterpriseHits
    .map((entry) => ({
      category: String(entry.domain),
      content: entry.content,
      id: entry.id,
      references: entry.references,
      relevanceScore: entry.relevanceScore,
      sourceName: entry.sourceName,
      sourceUrl: entry.sourceUrl,
      tags: entry.tags,
      topic: entry.title,
    }))
    .concat(
      legacyHits.map((entry) => ({
        category: entry.category,
        content: entry.content,
        id: entry.id,
        references: entry.references,
        relevanceScore: 0.45,
        sourceName: "Clinical knowledge index",
        sourceUrl: undefined,
        tags: entry.tags,
        topic: entry.topic,
      })),
    )
    .sort((left, right) => right.relevanceScore - left.relevanceScore);

  return rankHitsForQuery(filterHitsByRoute(selected, activeSources), route.query).slice(0, 10);
}
