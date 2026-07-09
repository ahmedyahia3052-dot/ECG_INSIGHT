import { analyzeCase, getAIExplainability, getAIResult } from "@/services/ai";

export class AiDomainService {
  analyzeCase(accessToken: string, caseId: string) {
    return analyzeCase(accessToken, caseId);
  }

  getResult(accessToken: string, caseId: string) {
    return getAIResult(accessToken, caseId);
  }

  getExplainability(accessToken: string, caseId: string) {
    return getAIExplainability(accessToken, caseId);
  }
}

export const aiDomainService = new AiDomainService();
