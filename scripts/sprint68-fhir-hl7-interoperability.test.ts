import { validateFhirBundle, validateFhirResource, isValidInteropId } from "../server/src/modules/fhir-hl7-interoperability-engine/fhir/validators";
import { buildAckMessage, parseHl7Message, validateHl7Message, buildOruMessage } from "../server/src/modules/fhir-hl7-interoperability-engine/hl7/engine";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

assert(isValidInteropId("550e8400-e29b-41d4-a716-446655440000"), "Expected valid UUID.");
assert(isValidInteropId("cmrbhimpm000580vc26ri90u8"), "Expected valid internal id.");

const patientResource = {
  resourceType: "Patient",
  id: "patient-1",
  identifier: [{ system: "urn:ecg-insight:mrn", value: "MRN-001" }],
  name: [{ family: "Test", given: ["Patient"] }],
};

const patientValidation = validateFhirResource(patientResource);
assert(patientValidation.valid, `Patient resource should validate: ${JSON.stringify(patientValidation.issues)}`);

const invalidObservation = { resourceType: "Observation", id: "obs-1" };
const observationValidation = validateFhirResource(invalidObservation);
assert(!observationValidation.valid, "Observation missing required fields should fail.");

const bundle = {
  resourceType: "Bundle",
  type: "document",
  entry: [
    { fullUrl: "Patient/patient-1", resource: patientResource },
    {
      fullUrl: "Observation/obs-1",
      resource: {
        resourceType: "Observation",
        id: "obs-1",
        status: "final",
        code: { coding: [{ system: "http://loinc.org", code: "8867-4", display: "Heart rate" }] },
        subject: { reference: "Patient/patient-1" },
        valueQuantity: { value: 72, unit: "/min" },
      },
    },
  ],
};

const bundleValidation = validateFhirBundle(bundle);
assert(bundleValidation.valid, `Bundle should validate: ${JSON.stringify(bundleValidation.issues)}`);

const hl7 = buildOruMessage({
  acquisitionDate: new Date("2025-01-15T10:00:00.000Z"),
  caseId: "CASE-001",
  diagnosis: "Normal sinus rhythm",
  heartRate: 72,
  patientMrn: "MRN-001",
  patientName: "Test Patient",
  prInterval: 160,
  qrsDuration: 90,
  qtInterval: 380,
  qtcInterval: 410,
  rhythm: "Sinus rhythm",
});

const hl7Validation = validateHl7Message(hl7);
assert(hl7Validation.valid, `HL7 ORU should validate: ${JSON.stringify(hl7Validation.issues)}`);
assert(hl7Validation.messageType === "ORU", "Expected ORU message type.");

const parsed = parseHl7Message(hl7);
assert(parsed.segments.some((segment) => segment.name === "OBX"), "Expected OBX segments.");

const ack = buildAckMessage(hl7);
assert(ack.includes("MSA|AA|"), "Expected AA acknowledgement.");

console.log("Sprint 68 FHIR/HL7 interoperability unit tests: PASS");
