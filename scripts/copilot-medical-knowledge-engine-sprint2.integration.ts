/**
 * Sprint 2 — Medical Knowledge Engine V1
 */
process.env.COPILOT_LLM_MOCK = "true";

import fs from "node:fs";
import path from "node:path";

import { runClinicalCopilotEngine } from "../server/src/modules/copilot/engine";
import { executeCopilotTool } from "../server/src/modules/copilot/v3/tools/executor";
import { emptyClinicalContext } from "../server/src/modules/copilot/intent-manager";
import {
  KNOWLEDGE_ENGINE_VERSION,
  KnowledgeRegistry,
  KnowledgeService,
} from "../server/src/modules/knowledge-engine";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const engineDeps = { retrieveClinicalContext: async () => emptyClinicalContext() };

async function main() {
  assert(KNOWLEDGE_ENGINE_VERSION === "knowledge-engine-v1", "Knowledge engine version");

  const topics = KnowledgeRegistry.all();
  assert(topics.length >= 10, "Structured topic registry must contain clinical domains");
  for (const topic of topics) {
    for (const field of ["definition", "pathophysiology", "diagnosis", "management", "patientExplanation", "teachingNotes"] as const) {
      assert(topic.sections[field]?.trim().length > 10, `${topic.slug} missing ${field}`);
    }
    assert(topic.references.length > 0, `${topic.slug} must include reference metadata`);
  }

  const tree = KnowledgeService.getEcgEducationPath();
  assert(tree.length === 14, `ECG education tree must have 14 nodes (root + 13 lessons), got ${tree.length}`);
  assert(tree[0]?.title === "ECG", "ECG tree root");
  assert(tree.at(-1)?.title === "Clinical Interpretation", "ECG tree capstone");

  const hypertension = await KnowledgeService.search({ query: "Explain hypertension diagnosis", limit: 5 });
  assert(hypertension.structuredTopics.some((topic) => topic.slug === "hypertension"), "Hypertension structured retrieval");

  const af = await KnowledgeService.search({ query: "atrial fibrillation anticoagulation", limit: 5 });
  assert(af.hits.some((hit) => /atrial fibrillation|af/i.test(hit.topic)), "AF knowledge retrieval");

  const toolJson = await executeCopilotTool("medical_knowledge_search", JSON.stringify({ query: "hypertension" }), {
    attachments: [],
    chatInput: {},
    retrieveClinicalContext: async () => emptyClinicalContext(),
  }) as { hits: unknown[]; query: string };
  assert(Array.isArray(toolJson.hits) && toolJson.hits.length > 0, "Tool must use Knowledge Service");

  const executorSource = fs.readFileSync(path.join("server", "src", "modules", "copilot", "v3", "tools", "executor.ts"), "utf8");
  const retrievalSource = fs.readFileSync(path.join("server", "src", "modules", "copilot", "engine", "knowledge-retrieval.ts"), "utf8");
  assert(executorSource.includes("KnowledgeService"), "Executor must route through Knowledge Service");
  assert(!executorSource.includes("semanticSearchKnowledge"), "Executor must not call enterprise search directly");
  assert(retrievalSource.includes("KnowledgeService"), "Knowledge retrieval must delegate to Knowledge Service");

  const conversationEngineFiles = [
    "server/src/modules/copilot/core/conversation-manager.ts",
    "server/src/modules/copilot/core/intent-understanding.ts",
    "server/src/modules/copilot/core/memory-manager.ts",
  ];
  for (const file of conversationEngineFiles) {
    const source = fs.readFileSync(file, "utf8");
    assert(!source.includes("KnowledgeService"), `${file} must remain conversation-only (no knowledge engine imports)`);
  }

  const htnResult = await runClinicalCopilotEngine(
    { attachments: [], chatInput: {}, conversationId: "s2-htn", memory: { attachments: [], summary: "", turns: [] }, question: "Explain hypertension." },
    engineDeps,
  );
  assert(htnResult.knowledgeHits.length > 0 || htnResult.toolPlan.runKnowledge, "Clinical AI Core must ground hypertension via knowledge engine");
  assert(!/^Definition:/m.test(htnResult.response.content), "Responses remain conversational");

  const tutorResult = await runClinicalCopilotEngine(
    {
      attachments: [],
      chatInput: {},
      conversationId: "s2-tutor",
      memory: {
        attachments: [],
        summary: "",
        turns: [{ role: "user", content: "I want to learn ECG." }, { role: "assistant", content: "Let's begin step by step." }],
      },
      question: "Where should I start?",
    },
    engineDeps,
  );
  assert(/anatomy|conduction|ECG|step|fundamental/i.test(tutorResult.response.content), "Tutor mode uses ECG education tree knowledge");

  console.log("Sprint 2 Medical Knowledge Engine integration passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
