import { AppError } from "../../../middleware/error";
import {
  assertLifecycleTransition,
  type ClinicalCaseLifecycle,
  resolveClinicalLifecycle,
} from "../domain/lifecycle";

export function validateLifecycleTransition(input: {
  from: ClinicalCaseLifecycle;
  to: ClinicalCaseLifecycle;
}): void {
  try {
    assertLifecycleTransition(input.from, input.to);
  } catch {
    throw new AppError(
      409,
      `Cannot transition case from ${input.from} to ${input.to}.`,
      "INVALID_LIFECYCLE_TRANSITION",
    );
  }
}

export function resolveCaseLifecycle(ecgCase: {
  managementStatus: Parameters<typeof resolveClinicalLifecycle>[0]["managementStatus"];
  status: Parameters<typeof resolveClinicalLifecycle>[0]["status"];
}): ClinicalCaseLifecycle {
  return resolveClinicalLifecycle({
    managementStatus: ecgCase.managementStatus,
    status: ecgCase.status,
  });
}
