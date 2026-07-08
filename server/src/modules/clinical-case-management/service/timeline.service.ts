import type { SerializedTimelineEntry } from "../domain/types";
import { historyRepository } from "../repository/history.repository";

export class TimelineService {
  async getUnifiedTimeline(caseId: string, limit: number, offset: number) {
    const [events, audit] = await Promise.all([
      historyRepository.listHistory(caseId, limit, offset),
      historyRepository.listAudit(caseId, limit, offset),
    ]);

    const timeline: SerializedTimelineEntry[] = [
      ...events.history.map((entry) => ({ ...entry, source: "history" as const })),
      ...audit.audit.map((entry) => ({
        action: entry.action,
        actorId: entry.actorId,
        createdAt: entry.createdAt,
        id: entry.id,
        message: entry.message,
        metadata: entry.metadata,
        source: "audit" as const,
      })),
    ].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

    return {
      events: events.history,
      audit: audit.audit,
      offset,
      timeline: timeline.slice(0, limit),
      total: events.total + audit.total,
    };
  }

  async getCaseEvents(caseId: string, limit: number, offset: number) {
    return historyRepository.listHistory(caseId, limit, offset);
  }

  async getAuditHistory(caseId: string, limit: number, offset: number) {
    return historyRepository.listAudit(caseId, limit, offset);
  }

  async getStatusHistory(caseId: string, limit: number, offset: number) {
    return historyRepository.listStatusHistory(caseId, limit, offset);
  }
}

export const timelineService = new TimelineService();
