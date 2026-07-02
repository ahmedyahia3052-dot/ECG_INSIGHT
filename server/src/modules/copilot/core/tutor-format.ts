export const TUTOR_RESPONSE_SECTIONS = [
  "Title",
  "Explanation",
  "Clinical Pearl",
  "Key Points",
  "Next Lesson",
] as const;

export const TUTOR_MARKDOWN_SCHEMA = `Use this Markdown structure for tutor responses:

## Title
One clear lesson title.

## Explanation
Teach one concept step-by-step in conversational prose (2–4 short paragraphs).

### Clinical Pearl
One high-yield bedside or exam pearl.

## Key Points
- 3–5 bullet points learners should remember.

## Next Lesson
One sentence preview of the next topic and invite the learner to say "next" or use /teach.`.trim();

export const SLASH_COMMAND_PROMPTS: Record<string, string> = {
  case: `CASE MODE — Present a brief clinical vignette, ask 1–2 focused questions, then guide step-by-step reasoning. Use the same Markdown sections where appropriate.`,
  explain: `EXPLAIN MODE — Give a clear conceptual explanation for the requested topic. Use the tutor Markdown sections.`,
  quiz: `QUIZ MODE — Ask 2–3 short questions to test understanding, then provide feedback with the tutor Markdown sections.`,
  summarize: `SUMMARIZE MODE — Summarize the conversation so far for the learner using the tutor Markdown sections (Title = summary title).`,
  teach: `TEACH MODE — Deliver the current curriculum lesson using the tutor Markdown sections. Teach one step at a time.`,
};
