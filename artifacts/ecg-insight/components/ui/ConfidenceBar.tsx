import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";

interface ConfidenceBarProps {
  value: number;
  label?: string;
  showPercent?: boolean;
}

export function ConfidenceBar({
  value,
  label = "AI Confidence",
  showPercent = true,
}: ConfidenceBarProps) {
  const colors = useColors();
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: value / 100,
      duration: 800,
      useNativeDriver: false,
    }).start();
  }, [value]);

  const barColor =
    value >= 90
      ? colors.success
      : value >= 75
        ? colors.warning
        : colors.destructive;

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={[styles.label, { color: colors.mutedForeground }]}>
          {label}
        </Text>
        {showPercent && (
          <Text style={[styles.percent, { color: barColor }]}>{value}%</Text>
        )}
      </View>
      <View style={[styles.track, { backgroundColor: colors.muted }]}>
        <Animated.View
          style={[
            styles.fill,
            {
              backgroundColor: barColor,
              width: anim.interpolate({
                inputRange: [0, 1],
                outputRange: ["0%", "100%"],
              }),
            },
          ]}
        />
      </View>
      <Text style={[styles.caption, { color: colors.mutedForeground }]}>
        {value >= 90
          ? "High confidence — result is reliable"
          : value >= 75
            ? "Moderate confidence — clinical review advised"
            : "Low confidence — manual review required"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  label: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  percent: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  track: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: 4,
  },
  caption: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
});
