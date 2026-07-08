import type { EcgAlertCode, EcgAlertSeverity } from "@prisma/client";
import type { AlertDetectionContext, DetectedClinicalAlert } from "./types";

type AlertRule = {
  alertCode: EcgAlertCode;
  alertType: DetectedClinicalAlert["alertType"];
  detect: (ctx: AlertDetectionContext) => DetectedClinicalAlert | null;
};

function buildAlert(
  rule: Pick<AlertRule, "alertCode" | "alertType">,
  severity: EcgAlertSeverity,
  confidence: number,
  message: string,
  supportingFindings: string[],
  evidence: DetectedClinicalAlert["evidence"],
): DetectedClinicalAlert {
  return {
    alertCode: rule.alertCode,
    alertSeverity: severity,
    alertType: rule.alertType,
    confidence: Number(confidence.toFixed(3)),
    evidence,
    message,
    supportingFindings,
  };
}

function intelligenceHasCode(ctx: AlertDetectionContext, codes: string[]) {
  return ctx.intelligence?.findings.some((finding) => codes.includes(finding.code)) ?? false;
}

function rhythmText(ctx: AlertDetectionContext) {
  return `${ctx.analysisRhythm ?? ""} ${ctx.caseRhythm ?? ""} ${ctx.measurement.rhythm}`.toLowerCase();
}

const ALERT_RULES: AlertRule[] = [
  {
    alertCode: "CRITICAL_QT_PROLONGATION",
    alertType: "EXTREME_BRADYCARDIA",
    detect(ctx) {
      const qtc = ctx.measurement.intervals.qtcBazettMs;
      if (qtc <= 0) return null;
      const female = ctx.patientGender === "FEMALE";
      const criticalThreshold = female ? 480 : 470;
      if (qtc <= criticalThreshold) return null;
      const severity: EcgAlertSeverity = qtc >= 500 ? "CRITICAL" : "HIGH";
      return buildAlert(
        { alertCode: "CRITICAL_QT_PROLONGATION", alertType: "EXTREME_BRADYCARDIA" },
        severity,
        Math.min(0.98, 0.7 + (qtc - criticalThreshold) / 200),
        severity === "CRITICAL"
          ? `Critical QT prolongation: QTc ${qtc} ms exceeds emergency threshold.`
          : `Prolonged QT interval: QTc ${qtc} ms requires clinical correlation.`,
        [`QTc Bazett = ${qtc} ms`, `QT = ${ctx.measurement.intervals.qtIntervalMs} ms`],
        [{ feature: "qtcBazettMs", threshold: `>${criticalThreshold}`, value: String(qtc) }],
      );
    },
  },
  {
    alertCode: "BRADYCARDIA",
    alertType: "EXTREME_BRADYCARDIA",
    detect(ctx) {
      const hr = ctx.measurement.heartRate;
      if (hr <= 0 || hr >= 60) return null;
      const severity: EcgAlertSeverity = hr < 40 ? "CRITICAL" : hr < 50 ? "HIGH" : "MODERATE";
      return buildAlert(
        { alertCode: "BRADYCARDIA", alertType: "EXTREME_BRADYCARDIA" },
        severity,
        0.82,
        `Bradycardia detected: heart rate ${hr} bpm.`,
        [`Heart rate = ${hr} bpm`, `Rhythm = ${ctx.measurement.rhythm}`],
        [{ feature: "heartRate", threshold: "<60", value: String(hr) }],
      );
    },
  },
  {
    alertCode: "TACHYCARDIA",
    alertType: "VENTRICULAR_TACHYCARDIA",
    detect(ctx) {
      const hr = ctx.measurement.heartRate;
      if (hr <= 100) return null;
      const severity: EcgAlertSeverity = hr >= 150 ? "CRITICAL" : hr >= 120 ? "HIGH" : "MODERATE";
      return buildAlert(
        { alertCode: "TACHYCARDIA", alertType: "VENTRICULAR_TACHYCARDIA" },
        severity,
        0.8,
        `Tachycardia detected: heart rate ${hr} bpm.`,
        [`Heart rate = ${hr} bpm`],
        [{ feature: "heartRate", threshold: ">100", value: String(hr) }],
      );
    },
  },
  {
    alertCode: "ATRIAL_FIBRILLATION",
    alertType: "AF_RVR",
    detect(ctx) {
      const text = rhythmText(ctx);
      const afFinding = intelligenceHasCode(ctx, ["AF"]);
      const irregular = ctx.measurement.rhythm === "irregular" || text.includes("fibrillation") || text.includes("af");
      if (!afFinding && !irregular) return null;
      const hr = ctx.measurement.heartRate;
      const severity: EcgAlertSeverity = hr > 130 ? "CRITICAL" : hr > 110 ? "HIGH" : "MODERATE";
      return buildAlert(
        { alertCode: "ATRIAL_FIBRILLATION", alertType: "AF_RVR" },
        severity,
        afFinding ? 0.9 : 0.72,
        hr > 130
          ? `Atrial fibrillation with rapid ventricular response (${hr} bpm).`
          : "Atrial fibrillation pattern detected.",
        [`Rhythm irregularity`, ...(afFinding ? ["Rule engine AF finding"] : [])],
        [{ feature: "rhythm", value: ctx.measurement.rhythm }, { feature: "heartRate", value: String(hr) }],
      );
    },
  },
  {
    alertCode: "ATRIAL_FLUTTER",
    alertType: "AF_RVR",
    detect(ctx) {
      const flutter = intelligenceHasCode(ctx, ["AFL"]) || rhythmText(ctx).includes("flutter");
      if (!flutter) return null;
      return buildAlert(
        { alertCode: "ATRIAL_FLUTTER", alertType: "AF_RVR" },
        "HIGH",
        0.84,
        "Atrial flutter pattern detected.",
        ["Sawtooth/flutter morphology or rule-engine AFL finding"],
        [{ feature: "rhythm", value: ctx.measurement.rhythm }],
      );
    },
  },
  {
    alertCode: "ST_ELEVATION",
    alertType: "STEMI",
    detect(ctx) {
      const st = ctx.measurement.amplitudes.stDeviationMm;
      const stemi = intelligenceHasCode(ctx, ["STEMI"]);
      if (st <= 1 && !stemi) return null;
      const severity: EcgAlertSeverity = st >= 2 || stemi ? "CRITICAL" : "HIGH";
      return buildAlert(
        { alertCode: "ST_ELEVATION", alertType: "STEMI" },
        severity,
        stemi ? 0.92 : 0.78,
        `ST elevation detected: ${st} mm.`,
        [`ST deviation = ${st} mm`, ...(stemi ? ["STEMI rule triggered"] : [])],
        [{ feature: "stDeviationMm", threshold: ">1", value: String(st) }],
      );
    },
  },
  {
    alertCode: "ST_DEPRESSION",
    alertType: "STEMI",
    detect(ctx) {
      const st = ctx.measurement.amplitudes.stDeviationMm;
      const ischemia = intelligenceHasCode(ctx, ["ISCHEMIA", "NSTEMI"]);
      if (st >= -0.5 && !ischemia) return null;
      const severity: EcgAlertSeverity = st <= -2 || ischemia ? "HIGH" : "MODERATE";
      return buildAlert(
        { alertCode: "ST_DEPRESSION", alertType: "STEMI" },
        severity,
        ischemia ? 0.86 : 0.74,
        `ST depression detected: ${st} mm — possible ischemia.`,
        [`ST deviation = ${st} mm`],
        [{ feature: "stDeviationMm", threshold: "<-0.5", value: String(st) }],
      );
    },
  },
  {
    alertCode: "WIDE_QRS",
    alertType: "COMPLETE_HEART_BLOCK",
    detect(ctx) {
      const qrs = ctx.measurement.intervals.qrsDurationMs;
      if (qrs <= 120) return null;
      const severity: EcgAlertSeverity = qrs >= 160 ? "HIGH" : "MODERATE";
      return buildAlert(
        { alertCode: "WIDE_QRS", alertType: "COMPLETE_HEART_BLOCK" },
        severity,
        0.83,
        `Wide QRS complex: ${qrs} ms.`,
        [`QRS duration = ${qrs} ms`],
        [{ feature: "qrsDurationMs", threshold: ">120", value: String(qrs) }],
      );
    },
  },
  {
    alertCode: "EXTREME_AXIS",
    alertType: "COMPLETE_HEART_BLOCK",
    detect(ctx) {
      const axis = ctx.measurement.axis.meanQrsAxisDeg;
      if (axis >= -90 && axis <= 90) return null;
      const severity: EcgAlertSeverity = axis < -120 || axis > 150 ? "HIGH" : "MODERATE";
      return buildAlert(
        { alertCode: "EXTREME_AXIS", alertType: "COMPLETE_HEART_BLOCK" },
        severity,
        0.76,
        `Extreme QRS axis deviation: ${axis}°.`,
        [`Mean QRS axis = ${axis}°`],
        [{ feature: "meanQrsAxisDeg", threshold: "outside -90 to 90", value: String(axis) }],
      );
    },
  },
  {
    alertCode: "HIGH_PVC_BURDEN",
    alertType: "VENTRICULAR_TACHYCARDIA",
    detect(ctx) {
      const pvc = intelligenceHasCode(ctx, ["PVC", "VT", "BIGEM"]) ||
        ctx.measurement.morphology.includes("wide_qrs") && ctx.measurement.rhythm === "irregular";
      if (!pvc) return null;
      return buildAlert(
        { alertCode: "HIGH_PVC_BURDEN", alertType: "VENTRICULAR_TACHYCARDIA" },
        "HIGH",
        0.71,
        "Frequent ventricular ectopy or high PVC burden pattern detected.",
        ["Ventricular ectopy pattern on rhythm/morphology analysis"],
        [{ feature: "morphology", value: ctx.measurement.morphology.join(", ") || "ectopy" }],
      );
    },
  },
  {
    alertCode: "POSSIBLE_AV_BLOCK",
    alertType: "COMPLETE_HEART_BLOCK",
    detect(ctx) {
      const pr = ctx.measurement.intervals.prIntervalMs;
      const avBlock = intelligenceHasCode(ctx, ["AVB1", "AVB2", "AVB3", "AVB"]);
      if (pr <= 200 && !avBlock) return null;
      const hr = ctx.measurement.heartRate;
      const severity: EcgAlertSeverity =
        (pr > 240 && hr < 50) || intelligenceHasCode(ctx, ["AVB3", "AVB2"]) ? "CRITICAL" : pr > 220 ? "HIGH" : "MODERATE";
      return buildAlert(
        { alertCode: "POSSIBLE_AV_BLOCK", alertType: "COMPLETE_HEART_BLOCK" },
        severity,
        avBlock ? 0.88 : 0.75,
        severity === "CRITICAL"
          ? `High-grade AV block risk: PR ${pr} ms with bradycardia (${hr} bpm).`
          : `Possible AV conduction delay: PR ${pr} ms.`,
        [`PR interval = ${pr} ms`, `Heart rate = ${hr} bpm`],
        [{ feature: "prIntervalMs", threshold: ">200", value: String(pr) }],
      );
    },
  },
  {
    alertCode: "BUNDLE_BRANCH_BLOCK",
    alertType: "COMPLETE_HEART_BLOCK",
    detect(ctx) {
      const qrs = ctx.measurement.intervals.qrsDurationMs;
      const bbb = intelligenceHasCode(ctx, ["LBBB", "RBBB", "BBB"]) || ctx.measurement.morphology.includes("wide_qrs");
      if (qrs <= 120 && !bbb) return null;
      return buildAlert(
        { alertCode: "BUNDLE_BRANCH_BLOCK", alertType: "COMPLETE_HEART_BLOCK" },
        qrs >= 140 ? "HIGH" : "MODERATE",
        bbb ? 0.87 : 0.78,
        `Bundle branch block / intraventricular conduction delay (QRS ${qrs} ms).`,
        [`QRS duration = ${qrs} ms`, ...(bbb ? ["BBB rule finding"] : [])],
        [{ feature: "qrsDurationMs", threshold: ">120", value: String(qrs) }],
      );
    },
  },
  {
    alertCode: "POSSIBLE_ACUTE_MI",
    alertType: "STEMI",
    detect(ctx) {
      const mi = intelligenceHasCode(ctx, ["STEMI", "NSTEMI", "ISCHEMIA"]);
      const stElev = ctx.measurement.amplitudes.stDeviationMm > 1;
      const pathQ = ctx.measurement.morphology.includes("pathological_q_waves");
      if (!mi && !stElev && !pathQ) return null;
      const severity: EcgAlertSeverity = intelligenceHasCode(ctx, ["STEMI"]) || stElev ? "CRITICAL" : "HIGH";
      return buildAlert(
        { alertCode: "POSSIBLE_ACUTE_MI", alertType: "STEMI" },
        severity,
        mi ? 0.9 : 0.76,
        "Possible acute myocardial infarction pattern detected.",
        [
          ...(stElev ? [`ST elevation ${ctx.measurement.amplitudes.stDeviationMm} mm`] : []),
          ...(pathQ ? ["Pathological Q waves"] : []),
          ...(mi ? ["Ischemia rule engine finding"] : []),
        ],
        [{ feature: "acute_mi_pattern", value: "positive" }],
      );
    },
  },
  {
    alertCode: "POSSIBLE_HYPERKALEMIA",
    alertType: "COMPLETE_HEART_BLOCK",
    detect(ctx) {
      const qrs = ctx.measurement.intervals.qrsDurationMs;
      const tWave = ctx.measurement.amplitudes.tWaveAmplitudeMv;
      const peakedT = tWave >= 0.55;
      const wideQrs = qrs >= 120;
      const brady = ctx.measurement.heartRate > 0 && ctx.measurement.heartRate < 55;
      const hyperK = intelligenceHasCode(ctx, ["HYPERK"]);
      if (!hyperK && !(peakedT && (wideQrs || brady))) return null;
      return buildAlert(
        { alertCode: "POSSIBLE_HYPERKALEMIA", alertType: "COMPLETE_HEART_BLOCK" },
        wideQrs && brady ? "CRITICAL" : "HIGH",
        hyperK ? 0.9 : 0.73,
        "Possible hyperkalemia pattern: peaked T waves and/or conduction widening.",
        [`T wave amplitude = ${tWave} mV`, `QRS = ${qrs} ms`, `Heart rate = ${ctx.measurement.heartRate} bpm`],
        [{ feature: "tWaveAmplitudeMv", value: String(tWave) }, { feature: "qrsDurationMs", value: String(qrs) }],
      );
    },
  },
  {
    alertCode: "POSSIBLE_HYPOKALEMIA",
    alertType: "EXTREME_BRADYCARDIA",
    detect(ctx) {
      const qtc = ctx.measurement.intervals.qtcBazettMs;
      const tWave = ctx.measurement.amplitudes.tWaveAmplitudeMv;
      const hypok = intelligenceHasCode(ctx, ["HYPOK"]);
      const pattern = qtc >= 440 && tWave > 0 && tWave < 0.15;
      if (!hypok && !pattern) return null;
      return buildAlert(
        { alertCode: "POSSIBLE_HYPOKALEMIA", alertType: "EXTREME_BRADYCARDIA" },
        "MODERATE",
        hypok ? 0.85 : 0.68,
        "Possible hypokalemia pattern: prolonged repolarization with flattened T waves.",
        [`QTc = ${qtc} ms`, `T wave amplitude = ${tWave} mV`],
        [{ feature: "qtcBazettMs", value: String(qtc) }, { feature: "tWaveAmplitudeMv", value: String(tWave) }],
      );
    },
  },
];

export function detectClinicalAlerts(ctx: AlertDetectionContext): DetectedClinicalAlert[] {
  const alerts = ALERT_RULES.map((rule) => rule.detect(ctx)).filter((alert): alert is DetectedClinicalAlert => Boolean(alert));
  const byCode = new Map<EcgAlertCode, DetectedClinicalAlert>();
  for (const alert of alerts) {
    const existing = byCode.get(alert.alertCode);
    if (!existing || alert.confidence > existing.confidence) {
      byCode.set(alert.alertCode, alert);
    }
  }
  return [...byCode.values()].sort((a, b) => b.confidence - a.confidence);
}

export function listAlertRuleCodes(): EcgAlertCode[] {
  return ALERT_RULES.map((rule) => rule.alertCode);
}
