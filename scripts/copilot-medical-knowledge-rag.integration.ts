import { enterpriseKnowledgeSeed, ensureEnterpriseKnowledgeSeeded, semanticSearchKnowledge } from "../server/src/modules/copilot/medical-knowledge";
import { prisma } from "../server/src/config/prisma";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function questionVariants(title: string, tags: string[]) {
  const topic = title.toLowerCase();
  const tagText = tags.slice(0, 4).join(" ");
  return [
    `What should I know about ${topic}?`,
    `Explain ECG and clinical risk for ${tagText}.`,
    `What are the warnings and references for ${topic}?`,
    `How should a physician assess ${tagText}?`,
    `Give a grounded medical answer about ${topic} with citations.`,
  ];
}

async function main() {
  await ensureEnterpriseKnowledgeSeeded();
  const documents = await prisma.medicalKnowledgeDocument.findMany();
  assert(documents.length >= enterpriseKnowledgeSeed.length, "Enterprise medical knowledge documents must be persisted in the database.");
  assert(documents.every((document) => Array.isArray(document.references) && document.references.length > 0), "Every knowledge document must include references.");
  assert(documents.every((document) => Array.isArray(document.tags) && document.tags.length > 0), "Every knowledge document must include search tags.");
  assert(documents.every((document) => Array.isArray(document.embedding) && document.embedding.length >= 32), "Every knowledge document must include deterministic vector-equivalent embeddings.");

  const requiredDomains = ["CARDIOLOGY", "DRUGS", "ECG", "EMERGENCY_MEDICINE", "INTERNAL_MEDICINE", "MEDICAL", "SAFETY"];
  for (const domain of requiredDomains) {
    assert(documents.some((document) => document.domain === domain), `Missing medical knowledge domain: ${domain}`);
  }

  const questions = enterpriseKnowledgeSeed.flatMap((document) => questionVariants(document.title, document.tags)).slice(0, 100);
  assert(questions.length === 100, "RAG quality gate must evaluate exactly 100 medical questions.");

  let citationAccurate = 0;
  let domainAccurate = 0;
  let totalTopScore = 0;
  for (const [index, question] of questions.entries()) {
    const expected = enterpriseKnowledgeSeed[Math.floor(index / 5)];
    const hits = await semanticSearchKnowledge(question, { take: 5 });
    assert(hits.length >= 3, `Question ${index + 1} did not retrieve enough medical context.`);
    assert(hits.every((hit) => hit.references.length > 0 && hit.sourceName), `Question ${index + 1} returned a hit without citations.`);
    if (hits.some((hit) => hit.domain === expected.domain)) domainAccurate += 1;
    if (hits.some((hit) => hit.title === expected.title || hit.tags.some((tag) => expected.tags.includes(tag)))) citationAccurate += 1;
    totalTopScore += hits[0]?.relevanceScore ?? 0;
  }

  const domainAccuracy = domainAccurate / questions.length;
  const citationAccuracy = citationAccurate / questions.length;
  const meanTopScore = totalTopScore / questions.length;
  assert(domainAccuracy >= 0.9, `Retrieval domain accuracy too low: ${Math.round(domainAccuracy * 100)}%.`);
  assert(citationAccuracy >= 0.9, `Citation accuracy too low: ${Math.round(citationAccuracy * 100)}%.`);
  assert(meanTopScore > 0.18, `Mean retrieval quality score too low: ${meanTopScore.toFixed(3)}.`);

  const routeSource = await import("node:fs").then((fs) => fs.readFileSync("server/src/modules/copilot/copilot.routes.ts", "utf8"));
  for (const marker of ["classifyMedicalIntent", "uploaded_document_review", "emergency_symptom_triage", "Uploaded Document Review", "OCR Confidence", "Warnings", "References", "Citations", "AI assistance only. Clinical decisions remain the responsibility of the physician.", "medicalGuardrails", "semanticSearchKnowledge"]) {
    assert(routeSource.includes(marker), `Copilot RAG answer/guardrail marker missing: ${marker}`);
  }

  console.log(`Enterprise medical knowledge RAG quality passed: ${questions.length} questions, domain ${Math.round(domainAccuracy * 100)}%, citation ${Math.round(citationAccuracy * 100)}%, mean score ${meanTopScore.toFixed(3)}.`);
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
