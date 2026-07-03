import type { APIRequestContext, APIResponse } from "@playwright/test";
import { API_URL, authHeaders, type ApiSession } from "./qa";

export async function uploadClinicalEcgImage(
  request: APIRequestContext,
  session: ApiSession,
  input: { caseId: string; fileName: string; image: Buffer; patientId: string; source: string },
): Promise<APIResponse> {
  return request.post(`${API_URL}/ecg/files/upload`, {
    headers: authHeaders(session.token, session.csrfToken),
    multipart: {
      caseId: input.caseId,
      file: { buffer: input.image, mimeType: "image/png", name: input.fileName },
      patientId: input.patientId,
      source: input.source,
    },
  });
}
