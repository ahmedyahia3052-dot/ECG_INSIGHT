import type { GeneratedFollowUpDto, GeneratedRecommendationDto } from "./types";
import { intervalDaysForPriority } from "./decision-rules";

function mapPriority(recommendation: GeneratedRecommendationDto): GeneratedFollowUpDto["priority"] {
  if (recommendation.priorityScore >= 95) return "CRITICAL";
  if (recommendation.priorityScore >= 85) return "EMERGENT";
  if (recommendation.priorityScore >= 70) return "URGENT";
  return "ROUTINE";
}

/** Generate follow-up plan and reminder schedule from top recommendation. */
export function generateFollowUpPlan(
  recommendations: GeneratedRecommendationDto[],
  referenceDate = new Date(),
): GeneratedFollowUpDto {
  const top = recommendations[0] ?? {
    action: "Routine follow-up",
    priorityScore: 40,
    reasoning: "No acute findings; schedule routine reassessment.",
    recommendationType: "REPEAT_ECG" as const,
    title: "Repeat ECG",
  };

  const priority = mapPriority(top as GeneratedRecommendationDto);
  const recommendedIntervalDays = intervalDaysForPriority(priority);
  const nextEcgDate = new Date(referenceDate);
  nextEcgDate.setDate(nextEcgDate.getDate() + recommendedIntervalDays);

  const midpoint = new Date(referenceDate);
  midpoint.setDate(midpoint.getDate() + Math.max(1, Math.floor(recommendedIntervalDays / 2)));
  const dayBefore = new Date(nextEcgDate);
  dayBefore.setDate(dayBefore.getDate() - 1);

  return {
    nextEcgDate: nextEcgDate.toISOString(),
    priority,
    reasoning: `Follow-up driven by ${top.title}: ${top.reasoning}`,
    recommendedIntervalDays,
    reminderDates: [midpoint.toISOString(), dayBefore.toISOString()],
    reviewStatus: priority === "ROUTINE" ? "PENDING" : "SCHEDULED",
  };
}
