import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth";
import { validateBody, validateQuery } from "../../middleware/validate";
import { assertResourceAccess, canAccessCase } from "../../utils/resource-access";
import {
  bootstrapSystemRules,
  createRule,
  deleteRule,
  getRule,
  getRuleVersionHistory,
  getRulesHistory,
  listRules,
  testRules,
  updateRule,
} from "./enterprise-rules.service";
import {
  createClinicalRuleSchema,
  historyQuerySchema,
  rulesQuerySchema,
  testRulesSchema,
  updateClinicalRuleSchema,
} from "./schemas";
import { ENTERPRISE_RULES_ENGINE_VERSION } from "./types";

export const enterpriseRulesEngineRouter = Router();

enterpriseRulesEngineRouter.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "enterprise-rules-engine",
    version: ENTERPRISE_RULES_ENGINE_VERSION,
  });
});

enterpriseRulesEngineRouter.use(requireAuth);

enterpriseRulesEngineRouter.get("/rules", validateQuery(rulesQuerySchema), async (req, res, next) => {
  try {
    const query = rulesQuerySchema.parse(req.query);
    const rules = await listRules({
      category: query.category,
      enabled: query.enabled === undefined ? undefined : query.enabled === "true",
    });
    res.json({ count: rules.length, rules });
  } catch (error) {
    next(error);
  }
});

enterpriseRulesEngineRouter.get("/rules/history", validateQuery(historyQuerySchema), async (req, res, next) => {
  try {
    const query = historyQuerySchema.parse(req.query);
    if (query.caseId) {
      assertResourceAccess(await canAccessCase(query.caseId, req.auth!));
    }
    const events = await getRulesHistory({
      caseId: query.caseId,
      limit: query.limit,
      ruleId: query.ruleId,
    });
    res.json({ count: events.length, events });
  } catch (error) {
    next(error);
  }
});

enterpriseRulesEngineRouter.get("/rules/:id", async (req, res, next) => {
  try {
    const rule = await getRule(String(req.params.id));
    res.json({ rule });
  } catch (error) {
    next(error);
  }
});

enterpriseRulesEngineRouter.get("/rules/:id/versions", async (req, res, next) => {
  try {
    const versions = await getRuleVersionHistory(String(req.params.id));
    res.json({ count: versions.length, versions });
  } catch (error) {
    next(error);
  }
});

enterpriseRulesEngineRouter.post(
  "/rules",
  requireRole("ADMIN", "SUPER_ADMIN"),
  validateBody(createClinicalRuleSchema),
  async (req, res, next) => {
    try {
      const rule = await createRule(req.body, req.auth!.id);
      res.status(201).json({ rule });
    } catch (error) {
      next(error);
    }
  },
);

enterpriseRulesEngineRouter.put(
  "/rules/:id",
  requireRole("ADMIN", "SUPER_ADMIN"),
  validateBody(updateClinicalRuleSchema),
  async (req, res, next) => {
    try {
      const rule = await updateRule(String(req.params.id), req.body, req.auth!.id);
      res.json({ rule });
    } catch (error) {
      next(error);
    }
  },
);

enterpriseRulesEngineRouter.delete(
  "/rules/:id",
  requireRole("ADMIN", "SUPER_ADMIN"),
  async (req, res, next) => {
    try {
      const rule = await deleteRule(String(req.params.id));
      res.json({ rule });
    } catch (error) {
      next(error);
    }
  },
);

enterpriseRulesEngineRouter.post("/rules/test", validateBody(testRulesSchema), async (req, res, next) => {
  try {
    if (req.body.caseId) {
      assertResourceAccess(await canAccessCase(req.body.caseId, req.auth!));
    }
    const result = await testRules({
      caseId: req.body.caseId,
      context: req.body.context,
      executedById: req.auth!.id,
      persist: req.body.persist,
      ruleIds: req.body.ruleIds,
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
});

enterpriseRulesEngineRouter.post("/rules/bootstrap", requireRole("SUPER_ADMIN"), async (req, res, next) => {
  try {
    const result = await bootstrapSystemRules(req.auth!.id);
    const rules = await listRules();
    res.status(201).json({ ...result, count: rules.length });
  } catch (error) {
    next(error);
  }
});
