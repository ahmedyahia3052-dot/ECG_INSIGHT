import React, { memo, useMemo, useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";

import { PrimaryButton, medicalTheme } from "@/components/enterprise/EnterpriseUI";
import type { ApiECGCase, ApiPatient } from "@/services/clinical";
import type { AIAnalysisResult } from "@/services/ai";
import type { DigitalEcg } from "@/services/ecgProcessing";
import type { MedicalIntelligenceReport } from "@/services/medicalIntelligence";
import type { ClinicalReport } from "@/services/reports";

import type { EcgClinicalMeasurement } from "../measurementTypes";
import { buildEnterpriseReportModel } from "./buildEnterpriseReportModel";
import { EcgEnterpriseClinicalReportView } from "./EcgEnterpriseClinicalReportView";
import { downloadClinicalReportFhir, downloadClinicalReportJson, printClinicalReport } from "./exportClinicalReport";
import type { ClinicalReportOrientation, ClinicalReportPreviewMode, ClinicalReportTheme, ClinicalReportType } from "./types";

export const EcgEnterpriseClinicalReportPanel = memo(function EcgEnterpriseClinicalReportPanel({
  analysis,
  clinicalReport,
  digitalEcg,
  ecgCase,
  imageUrl,
  measurements = [],
  medicalReport,
  patient,
  processedImageUrl,
}: {
  analysis?: AIAnalysisResult | null;
  clinicalReport?: ClinicalReport | null;
  digitalEcg?: DigitalEcg | null;
  ecgCase: ApiECGCase;
  imageUrl?: string;
  measurements?: EcgClinicalMeasurement[];
  medicalReport?: MedicalIntelligenceReport | null;
  patient: ApiPatient;
  processedImageUrl?: string;
}) {
  const [reportType, setReportType] = useState<ClinicalReportType>("clinical");
  const [theme, setTheme] = useState<ClinicalReportTheme>("light");
  const [orientation, setOrientation] = useState<ClinicalReportOrientation>("portrait");
  const [previewMode, setPreviewMode] = useState<ClinicalReportPreviewMode>("print");

  const model = useMemo(
    () =>
      buildEnterpriseReportModel({
        analysis,
        clinicalReport,
        digitalEcg,
        ecgCase,
        imageUrl,
        measurements,
        medicalReport,
        patient,
        processedImageUrl,
        reportType,
      }),
    [analysis, clinicalReport, digitalEcg, ecgCase, imageUrl, measurements, medicalReport, patient, processedImageUrl, reportType],
  );

  return (
    <View style={styles.root} testID="sprint43-clinical-report-panel">
      <View style={styles.toolbar}>
        <PrimaryButton label="Diagnostic" onPress={() => setReportType("diagnostic")} variant={reportType === "diagnostic" ? "primary" : "outline"} />
        <PrimaryButton label="Clinical" onPress={() => setReportType("clinical")} variant={reportType === "clinical" ? "primary" : "outline"} />
        <PrimaryButton label="Printable" onPress={() => setReportType("printable")} variant={reportType === "printable" ? "primary" : "outline"} />
        <PrimaryButton label="Hospital PDF" onPress={() => setReportType("hospital_pdf")} variant={reportType === "hospital_pdf" ? "primary" : "outline"} />
        <PrimaryButton label="Light" onPress={() => setTheme("light")} variant={theme === "light" ? "primary" : "outline"} />
        <PrimaryButton label="Dark" onPress={() => setTheme("dark")} variant={theme === "dark" ? "primary" : "outline"} />
        <PrimaryButton label="Portrait" onPress={() => setOrientation("portrait")} variant={orientation === "portrait" ? "primary" : "outline"} />
        <PrimaryButton label="Landscape" onPress={() => setOrientation("landscape")} variant={orientation === "landscape" ? "primary" : "outline"} />
        <PrimaryButton label="Print Preview" onPress={() => setPreviewMode("print")} variant={previewMode === "print" ? "primary" : "outline"} />
        <PrimaryButton label="Export Preview" onPress={() => setPreviewMode("export")} variant={previewMode === "export" ? "primary" : "outline"} />
        {Platform.OS === "web" ? (
          <>
            <PrimaryButton label="Print" onPress={printClinicalReport} testID="sprint43-report-print" variant="outline" />
            <PrimaryButton label="Export JSON" onPress={() => downloadClinicalReportJson(model)} testID="sprint43-report-export-json" variant="outline" />
            <PrimaryButton label="Export FHIR" onPress={() => downloadClinicalReportFhir(model)} testID="sprint43-report-export-fhir" variant="outline" />
          </>
        ) : null}
      </View>
      <Text style={styles.hint}>
        {previewMode === "print" ? "Print preview mode — A4 layout optimized for hospital PDF." : "Export preview mode — structured sections ready for PDF/PNG/FHIR."}
      </Text>
      <EcgEnterpriseClinicalReportView model={model} orientation={orientation} theme={theme} />
    </View>
  );
});

const styles = StyleSheet.create({
  hint: { color: medicalTheme.muted, fontSize: 11, fontWeight: "700" },
  root: { flex: 1, gap: 8, minHeight: 480 },
  toolbar: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
});
