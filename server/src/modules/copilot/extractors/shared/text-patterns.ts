export function parseIntervals(text: string) {
  const intervals: Record<string, number> = {};
  const hr = text.match(/(?:heart rate|hr|\brate\b)\s*[:=]?\s*(\d{2,3})/i);
  if (hr) intervals.heartRateBpm = Number(hr[1]);
  const pr = text.match(/\bpr\s*[:=]?\s*(\d{2,3})\s*ms/i);
  if (pr) intervals.prMs = Number(pr[1]);
  const qrs = text.match(/\bqrs\s*[:=]?\s*(\d{2,3})\s*ms/i);
  if (qrs) intervals.qrsMs = Number(qrs[1]);
  const qt = text.match(/\bqt[c]?\s*[:=]?\s*(\d{2,3})\s*ms/i);
  if (qt) intervals.qtcMs = Number(qt[1]);
  return intervals;
}

export function parseLabValues(text: string) {
  const abnormalValues: string[] = [];
  for (const match of text.matchAll(/(troponin|creatinine|potassium|sodium|hemoglobin|hba1c|wbc|platelet)[^.\n]{0,40}/gi)) {
    abnormalValues.push(match[0].trim());
  }
  return abnormalValues.slice(0, 8);
}

export function parseImpression(text: string) {
  return text.match(/(?:impression|conclusion|summary)\s*[:-]\s*([^\n]{20,400})/i)?.[1]?.trim();
}

export function parseDates(text: string) {
  const dates = new Set<string>();
  for (const match of text.matchAll(/(?:report date|study date|date)\s*[:-]\s*([0-9]{1,2}[/-][0-9]{1,2}[/-][0-9{2,4}]+)/gi)) {
    dates.add(match[1].trim());
  }
  return Array.from(dates);
}

export function parsePatientIdentifiers(text: string, structured?: { patientId?: string; patientName?: string }) {
  const ids = new Set<string>();
  if (structured?.patientId) ids.add(structured.patientId);
  if (structured?.patientName) ids.add(structured.patientName);
  const mrn = text.match(/(?:mrn|medical record|patient id|id)\s*[:-]\s*([A-Za-z0-9-]{3,40})/i)?.[1];
  if (mrn) ids.add(mrn.trim());
  return Array.from(ids);
}

export function keywordFindings(text: string, rules: Array<{ finding: string; pattern: RegExp; warning?: string }>) {
  const findings = new Set<string>();
  const warnings = new Set<string>();
  for (const rule of rules) {
    if (rule.pattern.test(text)) {
      findings.add(rule.finding);
      if (rule.warning) warnings.add(rule.warning);
    }
  }
  return { findings: Array.from(findings), warnings: Array.from(warnings) };
}
