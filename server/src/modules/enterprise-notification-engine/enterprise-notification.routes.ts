import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth";
import {
  listClinicalEventHistory,
  publishClinicalEvent,
} from "./notification-engine.service";
import { eventHistoryQuerySchema, publishClinicalEventSchema } from "./schemas";

export const enterpriseEventsRouter = Router();

enterpriseEventsRouter.use(requireAuth);

enterpriseEventsRouter.post("/publish", requireRole("DOCTOR"), async (req, res, next) => {
  try {
    const body = publishClinicalEventSchema.parse(req.body ?? {});
    const result = await publishClinicalEvent({
      ...body,
      actorId: req.auth!.id,
    });
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

enterpriseEventsRouter.get("/history", async (req, res, next) => {
  try {
    const query = eventHistoryQuerySchema.parse(req.query);
    const events = await listClinicalEventHistory(query);
    res.json({
      engineVersion: "sprint66-v1",
      events: events.map((event) => ({
        actorId: event.actorId ?? undefined,
        caseId: event.caseId ?? undefined,
        createdAt: event.createdAt.toISOString(),
        engineVersion: event.engineVersion,
        eventType: event.eventType,
        id: event.id,
        message: event.message,
        patientId: event.patientId ?? undefined,
        payload: event.payloadJson ?? undefined,
        title: event.title,
      })),
      total: events.length,
    });
  } catch (error) {
    next(error);
  }
});
