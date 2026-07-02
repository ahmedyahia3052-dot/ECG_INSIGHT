import { cardiologyTopics } from "./knowledge/cardiology";
import { ecgTopics } from "./knowledge/cardiology/ecg";
import { emergencyTopics } from "./knowledge/emergency";
import { guidelineTopics } from "./knowledge/guidelines";
import { internalMedicineTopics } from "./knowledge/internal-medicine";
import { laboratoryTopics } from "./knowledge/laboratory";
import { occupationalTopics } from "./knowledge/occupational";
import { pharmacologyTopics } from "./knowledge/pharmacology";
import { radiologyTopics } from "./knowledge/radiology";
import type { MedicalTopic } from "./types";

export const ALL_STRUCTURED_TOPICS: MedicalTopic[] = [
  ...cardiologyTopics,
  ...ecgTopics,
  ...internalMedicineTopics,
  ...emergencyTopics,
  ...pharmacologyTopics,
  ...laboratoryTopics,
  ...radiologyTopics,
  ...occupationalTopics,
  ...guidelineTopics,
];

const topicBySlug = new Map(ALL_STRUCTURED_TOPICS.map((topic) => [topic.slug, topic]));

export const KnowledgeRegistry = {
  all(): MedicalTopic[] {
    return ALL_STRUCTURED_TOPICS;
  },

  bySlug(slug: string): MedicalTopic | null {
    return topicBySlug.get(slug) ?? null;
  },

  byDomain(domain: MedicalTopic["domain"]): MedicalTopic[] {
    return ALL_STRUCTURED_TOPICS.filter((topic) => topic.domain === domain || topic.domain.startsWith(`${domain}/`));
  },
};
