import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";

interface RecommendationCardProps {
  text: string;
  index: number;
  isUrgent?: boolean;
}

export function RecommendationCard({
  text,
  index,
  isUrgent,
}: RecommendationCardProps) {
  const colors = useColors();

  const urgent = isUrgent || text.toLowerCase().startsWith("immediate") || text.toLowerCase().startsWith("urgent");

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: urgent
            ? colors.destructive + "08"
            : colors.primary + "06",
          borderColor: urgent ? colors.destructive + "30" : colors.border,
        },
      ]}
    >
      <View
        style={[
          styles.icon,
          {
            backgroundColor: urgent
              ? colors.destructive + "18"
              : colors.success + "18",
          },
        ]}
      >
        <Feather
          name={urgent ? "alert-circle" : "check-circle"}
          size={14}
          color={urgent ? colors.destructive : colors.success}
        />
      </View>
      <Text
        style={[
          styles.text,
          { color: urgent ? colors.destructive : colors.foreground },
        ]}
      >
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  icon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
    flexShrink: 0,
  },
  text: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 19,
  },
});
