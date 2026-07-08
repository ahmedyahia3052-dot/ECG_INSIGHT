import { enterpriseLogger } from "../logging/enterprise-logger";

export abstract class BaseService {
  protected abstract readonly scope: string;

  protected logInfo(message: string, meta?: Record<string, unknown>) {
    enterpriseLogger.info(this.scope, message, meta);
  }

  protected logWarn(message: string, meta?: Record<string, unknown>) {
    enterpriseLogger.warn(this.scope, message, meta);
  }

  protected logError(message: string, meta?: Record<string, unknown>) {
    enterpriseLogger.error(this.scope, message, meta);
  }
}
