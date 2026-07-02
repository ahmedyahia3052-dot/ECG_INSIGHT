import type { MedicalTopic, MedicalTopicSections, ReferenceMetadata } from "../types";

export function defineTopic(input: {
  domain: MedicalTopic["domain"];
  references: ReferenceMetadata[];
  searchTags: string[];
  sections: MedicalTopicSections;
  slug: string;
  title: string;
}): MedicalTopic {
  return input;
}

export function topicSearchText(topic: MedicalTopic): string {
  const sectionText = Object.values(topic.sections).flatMap((value) => (Array.isArray(value) ? value : [value])).join(" ");
  return `${topic.title} ${topic.slug} ${topic.domain} ${topic.searchTags.join(" ")} ${sectionText}`;
}

export function topicToPlainContent(topic: MedicalTopic): string {
  const s = topic.sections;
  return [
    s.definition,
    s.pathophysiology,
    s.classification,
    s.clinicalFeatures,
    s.diagnosis,
    s.differentialDiagnosis,
    s.investigations,
    s.management,
    s.complications,
    s.redFlags.join("; "),
    s.keyPoints.join("; "),
    s.patientExplanation,
    s.teachingNotes,
    s.clinicalPearls.join("; "),
  ].filter(Boolean).join(" ");
}
