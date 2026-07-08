import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { AppError } from "../middleware/error";
import {
  executeAiInference,
  getAiFoundationHealth,
  getAiFoundationStatus,
  listProviderDescriptors,
  promptManager,
} from "./foundation.service";
import {
  foundationInferenceBodySchema,
  foundationPromptRenderBodySchema,
} from "./foundation.schemas";
import type { AiInferenceRequest } from "./types";

export const aiFoundationRouter = Router();

aiFoundationRouter.get("/health", async (_req, res) => {
  const health = await getAiFoundationHealth();
  res.json(health);
});

aiFoundationRouter.get("/status", requireAuth, (_req, res) => {
  res.json(getAiFoundationStatus());
});

aiFoundationRouter.get("/providers", requireAuth, async (_req, res) => {
  const providers = await listProviderDescriptors();
  res.json({ providers });
});

aiFoundationRouter.get("/prompts", requireAuth, (_req, res) => {
  res.json({ prompts: promptManager.list() });
});

aiFoundationRouter.post(
  "/prompts/render",
  requireAuth,
  validateBody(foundationPromptRenderBodySchema),
  (req, res) => {
    const rendered = promptManager.render(req.body.promptId, { variables: req.body.variables });
    res.json({ rendered });
  },
);

aiFoundationRouter.post(
  "/inference",
  requireAuth,
  validateBody(foundationInferenceBodySchema),
  async (req, res, next) => {
    try {
      const body = req.body;
      const request: AiInferenceRequest = {
        actor: {
          actorId: req.auth!.id,
          caseId: body.caseId,
          patientId: body.patientId,
        },
        cacheKey: body.cacheKey,
        kind: body.kind,
        llmInput: body.kind === "llm_chat" ? { messages: [{ content: "ping", role: "user" }] } : undefined,
        promptId: body.promptId,
        promptVariables: body.promptVariables,
        skipCache: body.skipCache,
      };

      if (body.kind === "llm_chat" && !body.promptId) {
        throw new AppError(400, "LLM inference via foundation requires promptId.", "AI_INCOMPLETE_REQUEST");
      }

      const result = await executeAiInference(request);
      res.json({ result });
    } catch (error) {
      next(error);
    }
  },
);
