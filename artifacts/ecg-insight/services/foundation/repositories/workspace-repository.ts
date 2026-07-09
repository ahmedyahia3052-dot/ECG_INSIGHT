import { getDigitalECG } from "@/services/ecgProcessing";
import { getCase } from "@/services/clinical";

import { BaseRepository } from "./base-repository";

export class WorkspaceRepository extends BaseRepository {
  getCase(caseId: string) {
    return this.withAuth((accessToken) => getCase(accessToken, caseId));
  }

  getDigitalEcg(caseId: string) {
    return this.withAuth((accessToken) => getDigitalECG(accessToken, caseId));
  }
}

export const workspaceRepository = new WorkspaceRepository();
