import { expect, type APIRequestContext } from "@playwright/test";
import { API_URL, apiLogin, authHeaders, createPatient, type ClinicalFixture } from "./qa";
import { createSyntheticEcgPngBuffer } from "./ecg-fixture-image";
import { uploadClinicalEcgImage } from "./clinical-upload";

export async function createPipelineFixture(request: APIRequestContext): Promise<ClinicalFixture & { csrfToken?: string; token: string }> {
  const session = await apiLogin(request, "doctor");
  const suffix = Date.now().toString();
  const patient = await createPatient(request, session, suffix);
  const caseResponse = await request.post(`${API_URL}/cases`, {
    data: { ecgType: "12-lead Enterprise QA", patientId: patient.id, priority: "medium", status: "uploaded" },
    headers: authHeaders(session.token, session.csrfToken),
  });
  expect(caseResponse.ok()).toBeTruthy();
  const ecgCase = (await caseResponse.json()).case as { caseNumber?: string; id: string };

  const ecgImage = await createSyntheticEcgPngBuffer();
  const uploadResponse = await uploadClinicalEcgImage(request, session, {
    caseId: ecgCase.id,
    fileName: `enterprise-qa-${suffix}-50mm-20mm-ecg.png`,
    image: ecgImage,
    patientId: patient.id,
    source: "enterprise-e2e",
  });
  expect(uploadResponse.ok(), await uploadResponse.text()).toBeTruthy();
  const file = (await uploadResponse.json()).file as { id: string };

  return {
    caseId: ecgCase.id,
    caseNumber: ecgCase.caseNumber,
    ecgFileId: file.id,
    patientId: patient.id,
    patientName: `${patient.firstName} ${patient.lastName}`,
    csrfToken: session.csrfToken,
    medicalRecordNumber: patient.medicalRecordNumber,
    token: session.token,
  };
}

export async function validateEcgPipeline(request: APIRequestContext, fixture: ClinicalFixture & { csrfToken?: string; token: string }) {
  const headers = authHeaders(fixture.token, fixture.csrfToken);
  const apiTimeout = 120_000;

  const digitize = await request.post(`${API_URL}/ecg/digitize`, {
    data: { caseId: fixture.caseId, ecgFileId: fixture.ecgFileId },
    headers,
    timeout: apiTimeout,
  });
  expect(digitize.status(), `digitize: ${await digitize.text()}`).toBe(202);
  const digitized = await digitize.json() as { digitalEcg?: { fallbackReason?: string; leads?: unknown[]; quality?: { score?: number }; status?: string } };
  expect(
    (digitized.digitalEcg?.leads?.length ?? 0) > 0,
    `digitization must produce leads (status=${digitized.digitalEcg?.status}, reason=${digitized.digitalEcg?.fallbackReason ?? "none"})`,
  ).toBeTruthy();

  const quality = await request.get(`${API_URL}/ecg/${fixture.caseId}/digitization-quality`, { headers });
  expect(quality.ok()).toBeTruthy();

  const measure = await request.post(`${API_URL}/ecg/measure/${fixture.caseId}`, { headers, timeout: apiTimeout });
  expect(measure.status()).toBe(202);
  const measured = await measure.json() as { clinicalMeasurements?: { heartRate?: number } };
  expect(typeof measured.clinicalMeasurements?.heartRate === "number").toBeTruthy();

  const interpret = await request.post(`${API_URL}/ecg/interpret/${fixture.caseId}`, { headers, timeout: apiTimeout });
  expect(interpret.status()).toBe(202);
  const interpreted = await interpret.json() as { clinicalInterpretation?: { primaryDiagnosis?: string } };
  expect(typeof interpreted.clinicalInterpretation?.primaryDiagnosis === "string").toBeTruthy();

  const diagnose = await request.post(`${API_URL}/ecg/diagnose/${fixture.caseId}`, { headers, timeout: apiTimeout });
  expect(diagnose.status()).toBe(202);
  const diagnosed = await diagnose.json() as { aiDiagnosis?: { primaryDiagnosis?: string; topDiagnoses?: unknown[] } };
  expect(typeof diagnosed.aiDiagnosis?.primaryDiagnosis === "string").toBeTruthy();
  expect((diagnosed.aiDiagnosis?.topDiagnoses?.length ?? 0) >= 1).toBeTruthy();

  const digital = await request.get(`${API_URL}/ecg/digital/${fixture.caseId}`, { headers });
  expect(digital.ok()).toBeTruthy();
  const digitalBody = await digital.json() as { digitalEcg?: { measurementEngine?: unknown; interpretationEngine?: unknown; aiDiagnosis?: unknown } };
  expect(digitalBody.digitalEcg?.measurementEngine).toBeTruthy();
  expect(digitalBody.digitalEcg?.interpretationEngine).toBeTruthy();
  expect(digitalBody.digitalEcg?.aiDiagnosis).toBeTruthy();

  return { digitized, measured, interpreted, diagnosed };
}

export async function validatePdfParse(request: APIRequestContext, token: string, caseId: string, patientId: string, csrfToken?: string) {
  const upload = await request.post(`${API_URL}/ecg/files/upload`, {
    headers: authHeaders(token, csrfToken),
    multipart: {
      caseId,
      file: { buffer: Buffer.from("%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF"), mimeType: "application/pdf", name: "enterprise-qa.pdf" },
      patientId,
      source: "enterprise-e2e-pdf",
    },
  });
  expect(upload.ok(), await upload.text()).toBeTruthy();
  const fileId = ((await upload.json()) as { file: { id: string } }).file.id;
  const parse = await request.post(`${API_URL}/ecg/files/parse`, {
    data: { ecgFileId: fileId },
    headers: authHeaders(token, csrfToken),
  });
  expect(parse.ok(), await parse.text()).toBeTruthy();
  return parse.json();
}

export async function validateCopilotStream(request: APIRequestContext, token: string, csrfToken?: string) {
  const create = await request.post(`${API_URL}/copilot/chat/stream`, {
    data: { question: "Can you interpret this ECG tracing?" },
    headers: authHeaders(token, csrfToken),
  });
  expect(create.status(), await create.text()).toBe(201);
  const body = await create.text();
  expect(body.length).toBeGreaterThan(10);
  expect(body.toLowerCase()).toMatch(/rate|rhythm|ecg|clinical|heart|token|done/);
}
