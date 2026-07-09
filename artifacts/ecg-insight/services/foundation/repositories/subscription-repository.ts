import { getMySubscription, listLicenses } from "@/services/subscriptions";

import { BaseRepository } from "./base-repository";

export class SubscriptionRepository extends BaseRepository {
  getMySubscription() {
    return this.withAuth((accessToken) => getMySubscription(accessToken));
  }

  listLicenses() {
    return this.withAuth((accessToken) => listLicenses(accessToken));
  }
}

export const subscriptionRepository = new SubscriptionRepository();
