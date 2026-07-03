export function classifyDocumentType(input: {
  kind: string;
  mimeType: string;
  originalName: string;
  text: string;
}) {
  const haystack = `${input.kind} ${input.mimeType} ${input.originalName} ${input.text}`.toLowerCase();
  if (input.kind === "ecg") return input.mimeType === "application/pdf" ? "12_LEAD_ECG_PDF" : "12_LEAD_ECG";
  if (/holter|24.?hour|ambulatory ecg/.test(haystack)) return "HOLTER";
  if (/stress|exercise ecg|treadmill/.test(haystack)) return "STRESS_ECG";
  if (/rhythm strip|single lead rhythm/.test(haystack)) return "RHYTHM_STRIP";
  if (/ecg|ekg|qrs|qtc|pr interval|st elevation|st depression|rhythm/.test(haystack)) return "12_LEAD_ECG";
  if (/dicom|\bdcm\b|modality/.test(haystack)) return "DICOM_ECG";
  if (/echo|echocardiography|ejection fraction|\bef\b|valvular|ventricle/.test(haystack)) return "ECHO_REPORT";
  if (/troponin|hba1c|creatinine|hemoglobin|lipid|laboratory|lab|cbc|potassium|sodium/.test(haystack)) return "LABORATORY_REPORT";
  if (/cardiology report|cardiology consult|cardiac consult/.test(haystack)) return "CARDIOLOGY_REPORT";
  if (/cath|angiography|coronary stenosis/.test(haystack)) return "CATH_REPORT";
  if (/x[\s-]?ray|radiograph|chest xray|cxr|\bct\b|mri|radiology/.test(haystack)) return "RADIOLOGY_REPORT";
  if (/ultrasound|sonograph/.test(haystack)) return "ULTRASOUND_REPORT";
  if (/pathology|biopsy|histology/.test(haystack)) return "PATHOLOGY_REPORT";
  if (/medication|tablet|capsule|dose|prescription|drug|pharmacy/.test(haystack)) return "PRESCRIPTION";
  if (/handwritten|note/.test(haystack)) return "HANDWRITTEN_NOTE";
  if (input.mimeType.startsWith("image/")) return input.kind === "camera" ? "CAMERA_IMAGE" : "MEDICAL_IMAGE";
  if (input.mimeType === "application/pdf") return "CLINICAL_PDF";
  return "UNKNOWN";
}
