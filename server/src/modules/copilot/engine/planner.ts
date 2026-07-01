import type { CommunicationIntent, ResponsePlan } from "./types";

export const Planner = {
  buildResponsePlan(intent: CommunicationIntent, isFollowUp: boolean): ResponsePlan {
    if (intent === "Greeting" || intent === "SmallTalk" || intent === "SystemQuestion") {
      return { allowBullets: false, maxParagraphs: 3, style: "supportive", suggestFollowUps: false };
    }
    if (intent === "Education") {
      return { allowBullets: true, maxParagraphs: 6, style: "supportive", suggestFollowUps: false };
    }
    return { allowBullets: false, maxParagraphs: 4, style: "conversational", suggestFollowUps: !isFollowUp };
  },
};
