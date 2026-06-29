import { useColors } from "@/hooks/useColors";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function UnauthorizedScreen() {
  const colors = useColors();
  const router = useRouter();
  const styles = StyleSheet.create({
    button: { backgroundColor: colors.primary, borderRadius: colors.radius.md, marginTop: 18, paddingHorizontal: 18, paddingVertical: 12 },
    buttonText: { color: "#fff", fontWeight: "800" },
    container: { alignItems: "center", backgroundColor: colors.background, flex: 1, justifyContent: "center", padding: 24 },
    message: { color: colors.textSecondary, fontSize: 14, lineHeight: 21, marginTop: 8, textAlign: "center" },
    title: { color: colors.text, fontSize: 24, fontWeight: "900", textAlign: "center" },
  });

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Unauthorized</Text>
      <Text style={styles.message}>You do not have permission to access this protected owner or admin area.</Text>
      <Pressable style={styles.button} onPress={() => router.replace("/dashboard" as never)}>
        <Text style={styles.buttonText}>Return Home</Text>
      </Pressable>
    </SafeAreaView>
  );
}
