import type { KnowledgeCategoryName, Prisma } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/prisma";
import { requireAuth, requireRole } from "../../middleware/auth";
import { validateBody } from "../../middleware/validate";

const categoryTitles: Record<KnowledgeCategoryName, string> = {
  ANTICOAGULATION: "Anticoagulation",
  ARRHYTHMIAS: "Arrhythmias",
  CABG: "CABG",
  CONGENITAL_DISEASE: "Congenital Disease",
  HEART_FAILURE: "Heart Failure",
  HYPERTENSION: "Hypertension",
  ICD: "ICD",
  ISCHEMIC_HEART_DISEASE: "Ischemic Heart Disease",
  OCCUPATIONAL_FITNESS: "Occupational Fitness",
  PACEMAKERS: "Pacemakers",
  PCI: "PCI",
  VALVULAR_DISEASE: "Valvular Disease",
};

const articleSchema = z.object({
  attachments: z.array(z.string().trim().max(500)).default([]),
  body: z.string().trim().min(1),
  category: z.enum([
    "hypertension",
    "ischemic_heart_disease",
    "heart_failure",
    "arrhythmias",
    "valvular_disease",
    "congenital_disease",
    "cabg",
    "pci",
    "pacemakers",
    "icd",
    "anticoagulation",
    "occupational_fitness",
  ]),
  references: z.array(z.string().trim().max(500)).default([]),
  tags: z.array(z.string().trim().max(80)).default([]),
  title: z.string().trim().min(1).max(220),
  version: z.number().int().positive().default(1),
});

export const knowledgeRouter = Router();

knowledgeRouter.use(requireAuth);

function toCategoryName(value: string): KnowledgeCategoryName {
  return value.toUpperCase() as KnowledgeCategoryName;
}

async function ensureCategory(name: KnowledgeCategoryName) {
  return prisma.knowledgeCategory.upsert({
    create: { name, title: categoryTitles[name] },
    update: { title: categoryTitles[name] },
    where: { name },
  });
}

knowledgeRouter.get("/categories", async (_req, res, next) => {
  try {
    await Promise.all((Object.keys(categoryTitles) as KnowledgeCategoryName[]).map(ensureCategory));
    const categories = await prisma.knowledgeCategory.findMany({ orderBy: { title: "asc" } });
    res.json({ categories });
  } catch (error) {
    next(error);
  }
});

knowledgeRouter.get("/articles", async (req, res, next) => {
  try {
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const category = typeof req.query.category === "string" ? toCategoryName(req.query.category) : undefined;
    const where: Prisma.KnowledgeArticleWhereInput = {
      ...(category ? { category: { name: category } } : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { body: { contains: q, mode: "insensitive" } },
              { tags: { has: q } },
            ],
          }
        : {}),
    };
    const articles = await prisma.knowledgeArticle.findMany({
      include: { category: true },
      orderBy: { updatedAt: "desc" },
      where,
    });
    res.json({ articles });
  } catch (error) {
    next(error);
  }
});

knowledgeRouter.post("/articles", requireRole("DOCTOR"), validateBody(articleSchema), async (req, res, next) => {
  try {
    const category = await ensureCategory(toCategoryName(req.body.category));
    const article = await prisma.knowledgeArticle.create({
      data: {
        attachments: req.body.attachments,
        authorId: req.auth!.id,
        body: req.body.body,
        categoryId: category.id,
        references: req.body.references,
        tags: req.body.tags,
        title: req.body.title,
        version: req.body.version,
      },
      include: { category: true },
    });
    await prisma.auditLog.create({
      data: {
        action: "KNOWLEDGE_ARTICLE_CREATED",
        actorId: req.auth!.id,
        message: `Knowledge article ${article.title} created.`,
        metadata: { articleId: article.id, category: category.name },
      },
    });
    res.status(201).json({ article });
  } catch (error) {
    next(error);
  }
});
