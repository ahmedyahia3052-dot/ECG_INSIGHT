import { normalizeUiError, type UiError } from "../errors/ui-error";
import { toAdapterViewState, type AdapterViewState } from "./adapter-state";
import { isFeatureEnabled, type FeatureFlagKey } from "./feature-flags";

export abstract class BaseAdapter {
  protected feature: FeatureFlagKey;

  constructor(feature: FeatureFlagKey) {
    this.feature = feature;
  }

  protected assertEnabled() {
    if (!isFeatureEnabled(this.feature)) {
      throw normalizeUiError("Feature is disabled for this tenant or environment.");
    }
  }

  protected normalizeError(error: unknown, statusCode?: number): UiError {
    return normalizeUiError(error, statusCode);
  }

  protected viewState<T>(input: {
    data: T | null | undefined;
    emptyWhen?: (data: T | null | undefined) => boolean;
    error: unknown;
    isError: boolean;
    isFetching?: boolean;
    isLoading: boolean;
  }): AdapterViewState<T> {
    return toAdapterViewState(input);
  }
}
