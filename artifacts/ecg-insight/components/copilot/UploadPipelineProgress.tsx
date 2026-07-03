import { Feather } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { medicalTheme } from "@/components/enterprise/EnterpriseUI";

import type { UploadPipelineJob } from "./types";

const STAGE_ORDER = ["upload", "detect", "ocr", "metadata", "context", "validation", "completed"] as const;

function stageIndex(stage: UploadPipelineJob["stage"]) {
  const index = STAGE_ORDER.indexOf(stage as typeof STAGE_ORDER[number]);
  return index >= 0 ? index : 0;
}

function PipelineJobRow({ job }: { job: UploadPipelineJob }) {
  const activeIndex = stageIndex(job.stage);
  return (
    <View accessibilityLabel={`Upload pipeline for ${job.fileName}`} style={styles.jobRow}>
      <View style={styles.jobHeader}>
        <Feather color={job.stage === "failed" ? medicalTheme.critical : medicalTheme.primary} name={job.stage === "failed" ? "alert-circle" : job.stage === "completed" ? "check-circle" : "loader"} size={14} />
        <Text numberOfLines={1} style={styles.fileName}>{job.fileName}</Text>
        <Text style={styles.progress}>{Math.round(job.progress)}%</Text>
      </View>
      <View style={styles.stageTrack}>
        {STAGE_ORDER.slice(0, -1).map((stage, index) => (
          <View key={stage} style={[styles.stageDot, index <= activeIndex && styles.stageDotActive]} />
        ))}
      </View>
      <Text style={styles.stageLabel}>{job.stageLabel}</Text>
      {job.error ? <Text style={styles.errorText}>{job.error}</Text> : null}
      <View style={styles.actions}>
        {job.retry ? (
          <Pressable accessibilityRole="button" onPress={job.retry} style={styles.actionButton}>
            <Text style={styles.actionText}>Retry</Text>
          </Pressable>
        ) : null}
        {job.cancel && job.stage !== "completed" && job.stage !== "failed" && job.stage !== "cancelled" ? (
          <Pressable accessibilityRole="button" onPress={job.cancel} style={styles.actionButton}>
            <Text style={styles.actionText}>Cancel</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

export function UploadPipelineProgress({ jobs }: { jobs: UploadPipelineJob[] }) {
  if (!jobs.length) return null;
  return (
    <View style={styles.panel}>
      {jobs.map((job) => <PipelineJobRow job={job} key={`${job.fileName}-${job.attachmentId ?? "pending"}`} />)}
    </View>
  );
}

const styles = StyleSheet.create({
  actionButton: { backgroundColor: "rgba(15,33,53,0.72)", borderColor: "rgba(148,163,184,0.22)", borderRadius: 999, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 5 },
  actionText: { color: medicalTheme.text, fontSize: 11, fontWeight: "900" },
  actions: { flexDirection: "row", gap: 8, marginTop: 6 },
  errorText: { color: medicalTheme.critical, fontSize: 11, fontWeight: "800", marginTop: 4 },
  fileName: { color: medicalTheme.text, flex: 1, fontSize: 12, fontWeight: "900" },
  jobHeader: { alignItems: "center", flexDirection: "row", gap: 8 },
  jobRow: { gap: 6 },
  panel: { backgroundColor: "rgba(2,6,23,0.55)", borderColor: "rgba(148,163,184,0.18)", borderRadius: 14, borderWidth: 1, gap: 10, padding: 10 },
  progress: { color: medicalTheme.primary, fontSize: 11, fontWeight: "900" },
  stageDot: { backgroundColor: "rgba(148,163,184,0.25)", borderRadius: 999, flex: 1, height: 4 },
  stageDotActive: { backgroundColor: medicalTheme.primary },
  stageLabel: { color: medicalTheme.muted, fontSize: 11, fontWeight: "800" },
  stageTrack: { flexDirection: "row", gap: 4 },
});
