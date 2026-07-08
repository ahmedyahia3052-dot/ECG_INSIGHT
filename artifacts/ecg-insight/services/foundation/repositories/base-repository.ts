import { requireFoundationAccessToken, withAuthMiddleware } from "../auth/middleware";
import type { RepositoryResult } from "../api/types";

export abstract class BaseRepository {
  protected requireToken(): string {
    return requireFoundationAccessToken();
  }

  protected withAuth<T>(operation: (accessToken: string) => RepositoryResult<T>): RepositoryResult<T> {
    return withAuthMiddleware(operation);
  }
}
