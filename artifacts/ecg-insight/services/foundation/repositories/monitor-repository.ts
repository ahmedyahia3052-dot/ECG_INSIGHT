import { getDigitalECG } from "@/services/ecgProcessing";

import { BaseRepository } from "./base-repository";

export class MonitorRepository extends BaseRepository {
  getDigitalEcg(caseId: string) {
    return this.withAuth((accessToken) => getDigitalECG(accessToken, caseId));
  }
}

export const monitorRepository = new MonitorRepository();
