import { apiRequest } from "./api";

export interface DocumentExtraction {
  aiSummary: string;
  confidenceScore: number;
  createdAt: string;
  diagnosis?: string;
  documentId: string;
  extractedJson: unknown;
  id: string;
  patientId: string;
  rawText: string;
  recommendations: string[];
  reviewStatus: string;
}

export interface KnowledgeArticle {
  body: string;
  categoryId: string;
  createdAt: string;
  id: string;
  tags: string[];
  title: string;
  version: number;
}

export async function listIntelligentDocuments(accessToken: string, params = new URLSearchParams()) {
  const suffix = params.toString() ? `?${params.toString()}` : "";
  return apiRequest<{ documents: unknown[] }>(`/documents/list${suffix}`, { accessToken });
}

export async function extractDocument(accessToken: string, documentId: string) {
  return apiRequest<{ extraction: DocumentExtraction }>("/documents/extract", {
    accessToken,
    body: JSON.stringify({ documentId }),
    method: "POST",
  });
}

export async function getDocumentSummary(accessToken: string, documentId: string) {
  return apiRequest<{ extraction: DocumentExtraction | null }>(`/documents/summary/${documentId}`, { accessToken });
}

export async function searchDocuments(accessToken: string, q: string) {
  return apiRequest<{ results: unknown[] }>(`/documents/search?q=${encodeURIComponent(q)}`, { accessToken });
}

export async function processOcr(accessToken: string, documentId: string) {
  return apiRequest<{ extraction: DocumentExtraction }>("/ocr/process", {
    accessToken,
    body: JSON.stringify({ documentId }),
    method: "POST",
  });
}

export async function listKnowledgeCategories(accessToken: string) {
  return apiRequest<{ categories: Array<{ id: string; name: string; title: string }> }>("/knowledge/categories", {
    accessToken,
  });
}

export async function listKnowledgeArticles(accessToken: string, q = "") {
  const suffix = q ? `?q=${encodeURIComponent(q)}` : "";
  return apiRequest<{ articles: KnowledgeArticle[] }>(`/knowledge/articles${suffix}`, { accessToken });
}

export async function globalSearch(accessToken: string, q: string) {
  return apiRequest<{ articles: unknown[]; documents: unknown[]; employees: unknown[]; patients: unknown[] }>(
    `/search/global?q=${encodeURIComponent(q)}`,
    { accessToken },
  );
}

export async function occupationalSearch(accessToken: string, params = new URLSearchParams()) {
  const suffix = params.toString() ? `?${params.toString()}` : "";
  return apiRequest<{ employees: unknown[] }>(`/search/occupational${suffix}`, { accessToken });
}
