import { ApiError } from "@/services/api";
import { useIsFetching, useQueryClient } from "@tanstack/react-query";
import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useToast } from "@/components/interaction/PremiumInteraction";

function messageFor(error: unknown) {
  if (error instanceof ApiError) return `${error.message} (${error.status})`;
  if (error instanceof Error) return error.message;
  return "A network request failed.";
}

export function GlobalQueryStatus() {
  const queryClient = useQueryClient();
  const isFetching = useIsFetching();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const toast = useToast();

  useEffect(() => {
    return queryClient.getQueryCache().subscribe((event) => {
      if (event.type !== "updated") return;
      const error = event.query.state.error;
      if (error) {
        const message = messageFor(error);
        setErrorMessage(message);
        toast.error("Clinical data request failed", message);
      }
      if (!error && event.query.state.status === "success") setErrorMessage(null);
    });
  }, [queryClient, toast]);

  if (!errorMessage && isFetching === 0) return null;

  return (
    <View style={[styles.banner, errorMessage ? styles.error : styles.loading]} pointerEvents="none">
      <Text style={styles.text}>{errorMessage ?? "Loading latest clinical data..."}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    alignSelf: "center",
    borderRadius: 999,
    bottom: 24,
    maxWidth: "92%",
    paddingHorizontal: 14,
    paddingVertical: 8,
    position: "absolute",
    zIndex: 1000,
  },
  error: {
    backgroundColor: "#991B1B",
  },
  loading: {
    backgroundColor: "#1E3A8A",
  },
  text: {
    color: "#FFFFFF",
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
  },
});
