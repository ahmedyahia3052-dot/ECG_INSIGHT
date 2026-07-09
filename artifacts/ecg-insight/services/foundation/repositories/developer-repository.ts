import { listLicenses } from "@/services/subscriptions";
import { getReleaseCandidateDashboard } from "@/services/releaseCandidate";

import { BaseRepository } from "./base-repository";

export class DeveloperRepository extends BaseRepository {
  listLicenses() {
    return this.withAuth((accessToken) => listLicenses(accessToken));
  }

  getReleaseCandidate() {
    return this.withAuth((accessToken) => getReleaseCandidateDashboard(accessToken));
  }
}

export const developerRepository = new DeveloperRepository();
