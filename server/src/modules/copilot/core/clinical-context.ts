import { ecgEducationNextStepLabel } from "../../knowledge-engine/knowledge/cardiology/ecg-education-tree";
import { CLINICAL_SAFETY_DISCLAIMER } from "./attachment-context";
import { MemoryManager } from "./memory-manager";
import { SLASH_COMMAND_PROMPTS, TUTOR_MARKDOWN_SCHEMA } from "./tutor-format";
import type { CoreTurnContext } from "./types";

export const CLINICAL_AI_CORE_SYSTEM_PROMPT = `You are ECG Insight Clinical AI — an experienced physician-educator assisting clinicians and medical learners.

You speak naturally, like a thoughtful senior colleague in conversation — never like a textbook or search engine.

RULES
- Never expose chain-of-thought, internal routing, confidence scores, tool JSON, or engineering metadata.
- Never invent patient data, vitals, labs, imaging, or medications that were not provided.
- Ask focused clarifying questions when clinical information is incomplete.
- Resolve pronouns and follow-ups using the full conversation history (e.g. "it" refers to the active topic).
- If the user repeats the same question, answer it again helpfully with a fresh explanation — never refuse, deflect, or say you already answered.
- For possible emergencies, recommend urgent clinical assessment when appropriate.

MODES (infer silently — do not announce mode labels)
- Greeting / conversation: warm, brief, professional.
- Education / tutor: teach one concept at a time, progressively, from fundamentals; use the tutor Markdown schema below.
- Medical explanation: clear plain language; avoid unnecessary jargon with learners.
- Clinical case: think step-by-step; ask for missing information before conclusions.
- Follow-up: continue the prior topic using earlier messages as context.

Knowledge tools/scripts may be available. Use them to inform your answer, then respond in your own words — never paste retrieved text verbatim.
- When uploaded attachments are present, you MUST analyze them and reference their findings — never ignore files the user uploaded.
- ${CLINICAL_SAFETY_DISCLAIMER}`.trim();

export const ClinicalContext = {
  buildSystemMessages(turn: CoreTurnContext) {
    const blocks: string[] = [CLINICAL_AI_CORE_SYSTEM_PROMPT];

    if (turn.input.clinicianName) {
      blocks.push(`Clinician name: ${turn.input.clinicianName}`);
    }

    blocks.push(`Internal session context (never repeat these labels to the user):
- User role: ${turn.memoryState.userRole}
- Active topic: ${turn.memoryState.activeTopic?.label ?? "none"}
- Resolved question: ${turn.intent.resolvedQuestion}
- Follow-up: ${turn.memoryState.isFollowUp ? "yes" : "no"}
- Intent: ${turn.intent.intent}
- Conversation turns in memory: ${turn.input.memory.turns.length}`);

    const tutorActive = turn.intent.tutorMode || turn.memoryState.educationalMode;
    if (tutorActive) {
      const step = turn.memoryState.learningStep;
      const steps = MemoryManager.ECG_FOUNDATION_STEPS;
      const current = step > 0 ? steps[Math.min(step - 1, steps.length - 1)] : steps[0];
      const nextLesson = ecgEducationNextStepLabel(step > 0 ? step : 1);
      blocks.push(`TUTOR MODE — ECG Tutor curriculum
- Teach progressively, one lesson at a time using the Markdown schema.
- Current lesson focus: ${current}
- Full curriculum: ${steps.map((item, index) => `${index + 1}. ${item}`).join("; ")}
- Next lesson after this one: ${nextLesson ?? "End of curriculum — offer systematic review"}
- Do NOT ask the user to upload an ECG during foundational teaching unless they use /case.
${TUTOR_MARKDOWN_SCHEMA}`);
    }

    if (turn.intent.slashCommand && SLASH_COMMAND_PROMPTS[turn.intent.slashCommand]) {
      blocks.push(SLASH_COMMAND_PROMPTS[turn.intent.slashCommand]);
    }

    if (turn.memoryState.userRole === "medical_student" && !turn.intent.tutorMode) {
      blocks.push("The user is a medical student. Use accessible language and offer structured teaching when they ask to learn.");
    }

    if (turn.memoryState.userRole === "patient") {
      blocks.push("Explain medical concepts in plain language. Avoid jargon.");
    }

    if (turn.input.voiceMode) {
      blocks.push("Voice mode: keep responses concise and speakable.");
    }

    return blocks.map((content) => ({ content, role: "system" as const }));
  },
};
