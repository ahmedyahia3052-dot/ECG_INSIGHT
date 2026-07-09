import { getDigitalECG } from "@/services/ecgProcessing";
import { getEcgViewerBundle } from "@/services/ecgViewerApi";

import { BaseRepository } from "./base-repository";

export class ViewerRepository extends BaseRepository {
  getBundle(caseId: string) {
    return this.withAuth((accessToken) => getEcgViewerBundle(accessToken, caseId));
  }

  getDigitalEcg(caseId: string) {
    return this.withAuth((accessToken) => getDigitalECG(accessToken, caseId));
  }
}

export const viewerRepository = new ViewerRepository();
