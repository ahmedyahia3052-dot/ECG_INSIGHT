import React, { memo, useEffect, useRef } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { ECG_COCKPIT_COLORS } from "./ecgCockpitColors";
import { ECG_SPACING } from "./ecgSpacingTokens";
import { EcgWorkstationTooltip } from "./EcgWorkstationTooltip";
import type { ClinicalWorkflowStep, ClinicalWorkflowStepId } from "./clinical-workflow";

/** Sprint 33.5 — compact clinical workflow ribbon with auto-scroll to active step. */
export const EcgClinicalWorkflowRibbon = memo(function EcgClinicalWorkflowRibbon({
  onStepPress,
  progress,
  steps,
  unsavedChanges = false,
}: {
  onStepPress?: (id: ClinicalWorkflowStepId) => void;
  progress: number;
  steps: ClinicalWorkflowStep[];
  unsavedChanges?: boolean;
}) {
  const scrollRef = useRef<ScrollView>(null);
  const currentIndex = steps.findIndex((step) => step.status === "current");

  useEffect(() => {
    if (currentIndex < 0) return;
    if (Platform.OS === "web" && typeof document !== "undefined") {
      const node = document.getElementById(`workflow-step-${steps[currentIndex]?.id}`);
      node?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
  }, [currentIndex, steps]);

  return (
    <View nativeID="sprint30-clinical-workflow-ribbon" style={styles.root} testID="sprint30-clinical-workflow-ribbon">
      <View style={styles.header}>
        <Text style={styles.title}>Workflow</Text>
        <View style={styles.meta}>
          {unsavedChanges ? <Text style={styles.unsaved} testID="sprint30-unsaved-indicator">●</Text> : null}
          <Text style={styles.progress} testID="sprint30-workflow-progress">{progress}%</Text>
        </View>
      </View>
      <ScrollView horizontal ref={scrollRef} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {steps.map((step, index) => (
          <EcgWorkstationTooltip description={`Step ${index + 1} of ${steps.length}`} key={step.id} label={step.label}>
            <Pressable
              accessibilityLabel={step.label}
              accessibilityRole="button"
              accessibilityState={{ disabled: step.disabled, selected: step.status === "current" }}
              disabled={step.disabled && step.status !== "complete"}
              nativeID={`workflow-step-${step.id}`}
              onPress={() => onStepPress?.(step.id)}
              style={({ pressed }) => [
                styles.step,
                step.status === "complete" && styles.stepComplete,
                step.status === "current" && styles.stepCurrent,
                (step.status === "disabled" || step.status === "pending") && styles.stepFuture,
                pressed && !step.disabled && styles.stepPressed,
              ]}
              testID={`sprint30-workflow-step-${step.id}`}
            >
              <Text style={styles.stepIndex}>{index + 1}</Text>
              <Text numberOfLines={1} style={[styles.stepLabel, step.status === "complete" && styles.stepLabelComplete, step.status === "current" && styles.stepLabelCurrent]}>
                {step.label}
              </Text>
            </Pressable>
          </EcgWorkstationTooltip>
        ))}
      </ScrollView>
    </View>
  );
});

const styles = StyleSheet.create({
  header: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", paddingHorizontal: ECG_SPACING.sm },
  meta: { alignItems: "center", flexDirection: "row", gap: ECG_SPACING.sm },
  progress: { color: ECG_COCKPIT_COLORS.textMuted, fontSize: 9, fontWeight: "900" },
  root: {
    backgroundColor: ECG_COCKPIT_COLORS.bgPanel,
    borderColor: ECG_COCKPIT_COLORS.border,
    borderRadius: 3,
    borderWidth: 1,
    flexShrink: 0,
    gap: ECG_SPACING.xs,
    paddingVertical: ECG_SPACING.xs,
  },
  row: { alignItems: "center", flexDirection: "row", gap: ECG_SPACING.xs, paddingHorizontal: ECG_SPACING.sm },
  step: {
    alignItems: "center",
    backgroundColor: ECG_COCKPIT_COLORS.surface,
    borderColor: ECG_COCKPIT_COLORS.border,
    borderRadius: 3,
    borderWidth: 1,
    flexDirection: "row",
    flexShrink: 0,
    gap: ECG_SPACING.xs,
    paddingHorizontal: ECG_SPACING.sm,
    paddingVertical: 2,
  },
  stepComplete: { backgroundColor: "rgba(74,222,128,0.08)", borderColor: ECG_COCKPIT_COLORS.success },
  stepCurrent: { backgroundColor: ECG_COCKPIT_COLORS.accent, borderColor: ECG_COCKPIT_COLORS.accent },
  stepFuture: { backgroundColor: "rgba(16,24,32,0.65)", borderColor: ECG_COCKPIT_COLORS.border, opacity: 0.72 },
  stepIndex: { color: ECG_COCKPIT_COLORS.textMuted, fontSize: 8, fontWeight: "900", width: 10 },
  stepLabel: { color: ECG_COCKPIT_COLORS.textMuted, fontSize: 8, fontWeight: "800", maxWidth: 72 },
  stepLabelComplete: { color: ECG_COCKPIT_COLORS.success },
  stepLabelCurrent: { color: ECG_COCKPIT_COLORS.bgDeep },
  stepPressed: { opacity: 0.86 },
  title: { color: ECG_COCKPIT_COLORS.text, fontSize: 9, fontWeight: "900" },
  unsaved: { color: ECG_COCKPIT_COLORS.warning, fontSize: 8, fontWeight: "900" },
});
