import { Feather } from "@expo/vector-icons";
import React, { memo } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { medicalTheme } from "@/components/enterprise/EnterpriseUI";

import type { EcgWaveformPlaybackState } from "./useEcgWaveformPlayback";

export const EcgWaveformPlaybackTimeline = memo(function EcgWaveformPlaybackTimeline({
  durationMs,
  playback,
}: {
  durationMs: number;
  playback: EcgWaveformPlaybackState;
}) {
  const progress = durationMs > 0 ? playback.playheadMs / durationMs : 0;

  return (
    <View style={styles.root} testID="sprint18-waveform-timeline">
      <View style={styles.controls}>
        <Pressable accessibilityLabel="Previous beat" onPress={playback.previousBeat} style={styles.iconButton}>
          <Feather color={medicalTheme.primary} name="skip-back" size={16} />
        </Pressable>
        <Pressable accessibilityLabel={playback.isPlaying ? "Pause" : "Play"} onPress={playback.togglePlay} style={[styles.iconButton, styles.playButton]}>
          <Feather color="#03131B" name={playback.isPlaying ? "pause" : "play"} size={16} />
        </Pressable>
        <Pressable accessibilityLabel="Next beat" onPress={playback.nextBeat} style={styles.iconButton}>
          <Feather color={medicalTheme.primary} name="skip-forward" size={16} />
        </Pressable>
        <Pressable accessibilityLabel="Toggle loop" onPress={() => playback.setLoop(!playback.loop)} style={styles.iconButton}>
          <Feather color={playback.loop ? medicalTheme.success : medicalTheme.muted} name="repeat" size={16} />
        </Pressable>
        <Text style={styles.timeLabel}>
          {formatMs(playback.playheadMs)} / {formatMs(durationMs)}
        </Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.progress, { width: `${Math.min(progress * 100, 100)}%` }]} />
        {Platform.OS === "web" ? (
          <input
            aria-label="Timeline scrubber"
            max={Math.max(durationMs, 1)}
            min={0}
            onChange={(event) => playback.jumpToMs(Number(event.target.value))}
            step={10}
            style={{
              appearance: "none",
              background: "transparent",
              cursor: "pointer",
              height: 28,
              left: 0,
              opacity: 0,
              position: "absolute",
              top: 0,
              width: "100%",
            }}
            type="range"
            value={playback.playheadMs}
          />
        ) : null}
      </View>
    </View>
  );
});

function formatMs(ms: number) {
  const seconds = Math.floor(ms / 1000);
  const millis = Math.floor(ms % 1000);
  return `${seconds}.${String(millis).padStart(3, "0")}s`;
}

const styles = StyleSheet.create({
  controls: { alignItems: "center", flexDirection: "row", gap: 8 },
  iconButton: {
    alignItems: "center",
    backgroundColor: medicalTheme.card,
    borderColor: medicalTheme.border,
    borderRadius: 8,
    borderWidth: 1,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  playButton: { backgroundColor: medicalTheme.primary, borderColor: medicalTheme.primary },
  progress: { backgroundColor: medicalTheme.primary, borderRadius: 999, height: "100%" },
  root: {
    backgroundColor: "#040E1A",
    borderColor: medicalTheme.border,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  timeLabel: { color: medicalTheme.muted, fontSize: 11, fontWeight: "800", marginLeft: 4 },
  track: {
    backgroundColor: "rgba(30,58,74,0.55)",
    borderRadius: 999,
    height: 8,
    overflow: "hidden",
    position: "relative",
  },
});
