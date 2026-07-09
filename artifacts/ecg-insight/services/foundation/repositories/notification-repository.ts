import { listNotifications } from "@/services/collaboration";

import { BaseRepository } from "./base-repository";

export class NotificationRepository extends BaseRepository {
  list(params = new URLSearchParams({ pageSize: "20" })) {
    return this.withAuth((accessToken) => listNotifications(accessToken, params));
  }
}

export const notificationRepository = new NotificationRepository();
