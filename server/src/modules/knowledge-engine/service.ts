import type { KnowledgeHit } from "../copilot/copilot-types";
import type { KnowledgeRoute, KnowledgeSource } from "../copilot/engine/types";
import { KnowledgeRegistry } from "./registry";
import { getEcgEducationStep, searchMedicalKnowledge } from "./search";
import { ECG_EDUCATION_TREE, ECG_FOUNDATION_STEP_LABELS } from "./knowledge/cardiology/ecg-education-tree";
import type { EcgEducationNode, KnowledgeSearchRequest, KnowledgeSearchResult, MedicalTopic } from "./types";

export const KnowledgeService = {
  ECG_EDUCATION_TREE,
  ECG_FOUNDATION_STEP_LABELS,

  getEcgEducationPath(): EcgEducationNode[] {
    return ECG_EDUCATION_TREE;
  },

  getEcgEducationStep(step: number) {
    return getEcgEducationStep(step);
  },

  getTopic(slug: string): MedicalTopic | null {
    return KnowledgeRegistry.bySlug(slug);
  },

  listTopics() {
    return KnowledgeRegistry.all();
  },

  async search(request: KnowledgeSearchRequest): Promise<KnowledgeSearchResult> {
    return searchMedicalKnowledge(request);
  },

  async searchRouted(route: KnowledgeRoute, contextTerms: string[] = []): Promise<KnowledgeHit[]> {
    const result = await searchMedicalKnowledge({
      query: `${route.query} ${contextTerms.join(" ")}`.trim(),
      limit: 10,
    });
    if (!route.sources.length) return result.hits;
    return filterHitsBySources(result.hits, route.sources);
  },

  formatForLlmContext(result: KnowledgeSearchResult): string {
    if (!result.hits.length && !result.ecgEducationStep) return "";

    const blocks: string[] = ["Retrieved medical knowledge (synthesize naturally — never paste verbatim or use textbook headers):"];

    if (result.ecgEducationStep) {
      blocks.push(`ECG education focus: ${result.ecgEducationStep.title} — ${result.ecgEducationStep.teachingFocus}`);
    }

    for (const hit of result.hits.slice(0, 5)) {
      blocks.push(`[${hit.topic}] ${hit.content.slice(0, 900)} (Source: ${hit.sourceName})`);
    }

    return blocks.join("\n\n");
  },

  toToolPayload(result: KnowledgeSearchResult) {
    return {
      hits: result.hits.slice(0, 6).map((hit) => ({
        content: hit.content.slice(0, 600),
        source: hit.sourceName,
        topic: hit.topic,
      })),
      query: result.query,
      structuredTopics: result.structuredTopics.map((topic) => ({ domain: topic.domain, slug: topic.slug, title: topic.title })),
    };
  },
};

const SOURCE_HINTS: Partial<Record<KnowledgeSource, RegExp>> = {
  cardiology_kb: /cardio|heart|arrhythmia|hypertension|failure|acs/i,
  drug_database: /drug|medication|beta|statin|anticoag/i,
  ecg_database: /ecg|ekg|rhythm|qrs|qt|st segment/i,
  esc_guidelines: /esc|european|guideline/i,
  aha_guidelines: /aha|acc|guideline/i,
  internal_knowledge_base: /internal|diabetes|medicine/i,
  laboratory_database: /lab|troponin|potassium|electrolyte/i,
  occupational_medicine: /occupational|fitness|work/i,
};

function filterHitsBySources(hits: KnowledgeHit[], sources: KnowledgeSource[]) {
  const filtered = hits.filter((hit) => {
    const haystack = `${hit.topic} ${hit.content} ${hit.sourceName} ${hit.tags.join(" ")}`;
    return sources.some((source) => SOURCE_HINTS[source]?.test(haystack));
  });
  return filtered.length ? filtered : hits.slice(0, 6);
}

export { KNOWLEDGE_ENGINE_VERSION } from "./types";
