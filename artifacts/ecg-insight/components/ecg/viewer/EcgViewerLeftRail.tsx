import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { formatDate, medicalTheme, PrimaryButton } from "@/components/enterprise/EnterpriseUI";

import { EcgClinicalCard } from "./EcgClinicalCard";
import type { EcgLeadId, EcgViewerPatientContext, EcgViewerPreviousStudy, EcgViewerStudyContext } from "./types";
import { STANDARD_ECG_LEADS } from "./types";

function InfoRow({ label, value }: { label: string; value?: string | number }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value ?? "—"}</Text>
    </View>
  );
}

/** Sprint 25 — left sidebar with collapsible clinical cards. */
export function EcgViewerLeftRail({
  bookmarks = [],
  compareCaseId,
  leadFocusMode = false,
  notes,
  onSelectCompare,
  onSelectLead,
  onSelectPrevious,
  onToggleLeadFocus,
  patient,
  previousStudies,
  selectedLead,
  study,
  vitals,
}: {
  bookmarks?: string[];
  compareCaseId?: string | null;
  leadFocusMode?: boolean;
  notes?: string;
  onSelectCompare?: (caseId: string) => void;
  onSelectLead?: (lead: EcgLeadId) => void;
  onSelectPrevious?: (caseId: string) => void;
  onToggleLeadFocus?: () => void;
  patient?: EcgViewerPatientContext;
  previousStudies: EcgViewerPreviousStudy[];
  selectedLead?: EcgLeadId;
  study?: EcgViewerStudyContext;
  vitals?: { bp?: string; spo2?: string; temp?: string };
}) {
  return (
    <ScrollView contentContainerStyle={styles.scroll} style={styles.fill} testID="sprint25-clinical-left-rail">
      <EcgClinicalCard id="patient-summary" title="Patient Summary">
        <InfoRow label="Patient" value={patient?.name} />
        <InfoRow label="Age" value={patient?.age} />
        <InfoRow label="Gender" value={patient?.gender} />
        <InfoRow label="Heart Rate" value={study?.heartRate ? `${study.heartRate} BPM` : undefined} />
      </EcgClinicalCard>

      <EcgClinicalCard badge={`${previousStudies.length + 1}`} id="recent-cases" title="Recent ECG Cases">
        <InfoRow label="Current" value={study?.caseNumber} />
        {previousStudies.slice(0, 4).map((item) => (
          <View key={item.caseId} style={styles.row}>
            <Text style={styles.rowTitle}>{item.caseNumber ?? item.caseId}</Text>
            <Text style={styles.rowMeta}>{item.studyDate ? formatDate(item.studyDate) : "Date pending"}</Text>
            <PrimaryButton label="Open" onPress={() => onSelectPrevious?.(item.caseId)} variant="outline" />
          </View>
        ))}
      </EcgClinicalCard>

      <EcgClinicalCard id="timeline" title="Timeline">
        <InfoRow label="Study Date" value={study?.studyDate ? formatDate(study.studyDate) : undefined} />
        {previousStudies.map((item) => (
          <Text key={`tl-${item.caseId}`} style={styles.listItem}>
            • {item.caseNumber ?? item.caseId} — {item.studyDate ? formatDate(item.studyDate) : "Pending"}
          </Text>
        ))}
      </EcgClinicalCard>

      <EcgClinicalCard id="attachments" title="Attachments">
        <InfoRow label="File Type" value={study?.fileType} />
        <InfoRow label="Resolution" value={study?.imageWidth && study.imageHeight ? `${study.imageWidth} × ${study.imageHeight}` : undefined} />
      </EcgClinicalCard>

      <EcgClinicalCard id="previous-reports" title="Previous Reports">
        {previousStudies.length ? (
          previousStudies.map((item) => (
            <Text key={`rep-${item.caseId}`} style={styles.listItem}>
              • {item.caseNumber ?? item.caseId}
            </Text>
          ))
        ) : (
          <Text style={styles.placeholder}>No prior reports on file.</Text>
        )}
      </EcgClinicalCard>

      <EcgClinicalCard id="vitals" title="Vital Signs">
        <InfoRow label="Blood Pressure" value={vitals?.bp ?? "Not recorded"} />
        <InfoRow label="SpO₂" value={vitals?.spo2 ?? "Not recorded"} />
        <InfoRow label="Temperature" value={vitals?.temp ?? "Not recorded"} />
      </EcgClinicalCard>

      <EcgClinicalCard id="clinical-history" title="Clinical History">
        <InfoRow label="Hospital" value={study?.hospital} />
        <InfoRow label="Physician" value={study?.physician} />
        <InfoRow label="Device" value={study?.acquisitionDevice} />
      </EcgClinicalCard>

      <EcgClinicalCard id="favorites" title="Favorites">
        <Text style={styles.placeholder}>{bookmarks.length ? bookmarks.join(", ") : "No favorites pinned."}</Text>
      </EcgClinicalCard>

      <EcgClinicalCard id="bookmarks" title="Bookmarks">
        <Text style={styles.placeholder}>{bookmarks.length ? `${bookmarks.length} bookmark(s)` : "No bookmarks yet."}</Text>
      </EcgClinicalCard>

      <EcgClinicalCard id="notes" title="Notes">
        <Text style={styles.notes}>{notes?.trim() || "No clinical notes recorded."}</Text>
      </EcgClinicalCard>

      <EcgClinicalCard id="lead-selector" title="Quick Actions">
        <PrimaryButton
          label={leadFocusMode ? "Lead Focus On" : "Lead Focus Off"}
          onPress={() => onToggleLeadFocus?.()}
          variant={leadFocusMode ? "primary" : "outline"}
        />
        <View style={styles.leadGrid}>
          {STANDARD_ECG_LEADS.map((lead) => (
            <PrimaryButton key={lead} label={lead} onPress={() => onSelectLead?.(lead)} variant={selectedLead === lead ? "primary" : "outline"} />
          ))}
        </View>
      </EcgClinicalCard>

      <EcgClinicalCard defaultCollapsed id="comparison" title="Comparison">
        {previousStudies.length ? (
          previousStudies.map((item) => (
            <View key={`cmp-${item.caseId}`} style={styles.row}>
              <Text style={styles.rowTitle}>{item.caseNumber ?? item.caseId}</Text>
              <View style={styles.rowActions}>
                <PrimaryButton label="Open" onPress={() => onSelectPrevious?.(item.caseId)} variant="outline" />
                <PrimaryButton
                  label={compareCaseId === item.caseId ? "Compare ✓" : "Compare"}
                  onPress={() => onSelectCompare?.(item.caseId)}
                  variant={compareCaseId === item.caseId ? "primary" : "outline"}
                />
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.placeholder}>No prior studies for comparison.</Text>
        )}
      </EcgClinicalCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, minHeight: 0, minWidth: 0 },
  infoLabel: { color: medicalTheme.muted, fontSize: 11, fontWeight: "800" },
  infoRow: { borderBottomColor: medicalTheme.border, borderBottomWidth: 1, gap: 2, paddingVertical: 6 },
  infoValue: { color: medicalTheme.text, fontSize: 13, fontWeight: "800" },
  leadGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  listItem: { color: medicalTheme.text, fontSize: 12, fontWeight: "700", lineHeight: 18 },
  notes: { color: medicalTheme.text, fontSize: 12, fontWeight: "700", lineHeight: 18 },
  placeholder: { color: medicalTheme.muted, fontSize: 12, fontWeight: "700" },
  row: { borderBottomColor: medicalTheme.border, borderBottomWidth: 1, gap: 4, paddingVertical: 8 },
  rowActions: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  rowMeta: { color: medicalTheme.muted, fontSize: 11, fontWeight: "700" },
  rowTitle: { color: medicalTheme.text, fontSize: 13, fontWeight: "900" },
  scroll: { gap: 0, paddingBottom: 12, paddingHorizontal: 4, paddingTop: 4 },
});
