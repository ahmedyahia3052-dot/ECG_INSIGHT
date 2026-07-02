import type { KnowledgeHit } from "../copilot/copilot-types";
import { semanticSearchKnowledge } from "../copilot/medical-knowledge";
import { KnowledgeRegistry } from "./registry";
import { topicSearchText, topicToPlainContent } from "./knowledge/topic-factory";
import type { KnowledgeDomainPath, KnowledgeSearchRequest, KnowledgeSearchResult, MedicalTopic } from "./types";
import { ecgEducationNodeByStep, ecgEducationNodeBySlug } from "./knowledge/cardiology/ecg-education-tree";

function tokenize(text: string) {
  return text.toLowerCase().split(/[^a-z0-9]+/).filter((token) => token.length > 1);
}

function scoreTopic(topic: MedicalTopic, query: string, activeTopic?: string | null) {
  const queryTokens = new Set(tokenize(query));
  const haystack = tokenize(topicSearchText(topic));
  let score = haystack.reduce((sum, token) => sum + (queryTokens.has(token) ? 1 : 0), 0);
  if (activeTopic && (topic.slug === activeTopic || topic.searchTags.includes(activeTopic))) score += 3;
  if (queryTokens.has(topic.slug.replace(/-/g, ""))) score += 2;
  return score;
}

function intentDomains(intent?: string): KnowledgeDomainPath[] | undefined {
  switch (intent) {
    case "drug_question": return ["pharmacology", "cardiology"];
    case "emergency_advice": return ["emergency", "cardiology/acs", "cardiology"];
    case "laboratory_interpretation": return ["laboratory", "internal-medicine"];
    case "radiology_interpretation": return ["radiology"];
    case "ecg_interpretation":
    case "medical_education": return ["cardiology/ecg", "cardiology"];
    default: return undefined;
  }
}

function structuredTopicToHit(topic: MedicalTopic, relevanceScore: number): KnowledgeHit {
  return {
    category: topic.domain,
    content: topicToPlainContent(topic),
    id: `topic:${topic.domain}:${topic.slug}`,
    references: topic.references.map((ref) => ref.label),
    relevanceScore,
    sourceName: topic.references[0]?.source ?? "Medical Knowledge Engine",
    sourceUrl: topic.references[0]?.url,
    tags: topic.searchTags,
    topic: topic.title,
  };
}

export async function searchMedicalKnowledge(request: KnowledgeSearchRequest): Promise<KnowledgeSearchResult> {
  const limit = request.limit ?? 8;
  const domainFilter = request.domains ?? intentDomains(request.intent);
  const candidates = domainFilter
    ? KnowledgeRegistry.all().filter((topic) => domainFilter.some((domain) => topic.domain === domain || topic.domain.startsWith(`${domain}/`)))
    : KnowledgeRegistry.all();

  const structuredTopics = candidates
    .map((topic) => ({ score: scoreTopic(topic, request.query, request.activeTopic), topic }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score || left.topic.title.localeCompare(right.topic.title))
    .slice(0, Math.min(6, limit))
    .map((entry) => entry.topic);

  const structuredHits = structuredTopics.map((topic, index) => structuredTopicToHit(topic, 0.85 - index * 0.03));

  const enterpriseDomains = request.intent === "drug_question"
    ? (["DRUGS", "CARDIOLOGY"] as const)
    : request.intent === "emergency_advice"
      ? (["EMERGENCY_MEDICINE", "CARDIOLOGY"] as const)
      : undefined;

  const enterpriseHits = await semanticSearchKnowledge(request.query, {
    domains: enterpriseDomains ? [...enterpriseDomains] : undefined,
    take: limit,
  });

  const enterpriseAsKnowledgeHits: KnowledgeHit[] = enterpriseHits.map((hit) => ({
    category: hit.domain,
    content: hit.content,
    id: hit.id,
    references: hit.references,
    relevanceScore: hit.relevanceScore,
    sourceName: hit.sourceName,
    sourceUrl: hit.sourceUrl,
    tags: hit.tags,
    topic: hit.title,
  }));

  const merged = [...structuredHits];
  for (const hit of enterpriseAsKnowledgeHits) {
    if (!merged.some((existing) => existing.topic === hit.topic && existing.content.slice(0, 80) === hit.content.slice(0, 80))) {
      merged.push(hit);
    }
  }

  const ecgEducationStep = /ecg|ekg|learn|tutor|where should i start|rhythm|axis|st segment/i.test(request.query)
    ? ecgEducationNodeBySlug(request.activeTopic ?? "") ?? null
    : null;

  return {
    ecgEducationStep,
    hits: merged.slice(0, limit),
    query: request.query,
    structuredTopics,
  };
}

export function getEcgEducationStep(step: number) {
  return ecgEducationNodeByStep(step);
}
