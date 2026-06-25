import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { Badge, Card, EmptyState, medicalTheme, PageSection, PrimaryButton, SectionHeader } from "@/components/enterprise/EnterpriseUI";
import { useAuth } from "@/context/AuthContext";

export default function TeamManagementScreen() {
  const { activateUser, canAccess, deactivateUser, managedUsers } = useAuth();
  if (!canAccess(["admin", "super_admin"])) {
    return <EmptyState title="Admin access required" message="Only administrators can manage team members." />;
  }
  return (
    <PageSection>
      <Card style={styles.panel}>
        <SectionHeader title="Team Management" subtitle="Manage users, roles, activation status, and clinical workspace access." />
        {!managedUsers.length ? <EmptyState title="No managed users loaded" message="Admin users will appear here after session refresh." /> : null}
        {managedUsers.map((user) => (
          <View key={user.id} style={styles.row}>
            <View style={styles.main}>
              <Text style={styles.title}>{user.name}</Text>
              <Text style={styles.meta}>{user.email} • {user.role}</Text>
            </View>
            <Badge label={user.isActive ? "Active" : "Inactive"} tone={user.isActive ? "success" : "warning"} />
            <PrimaryButton label={user.isActive ? "Deactivate" : "Activate"} onPress={() => void (user.isActive ? deactivateUser(user.id) : activateUser(user.id))} variant="outline" />
          </View>
        ))}
      </Card>
    </PageSection>
  );
}

const styles = StyleSheet.create({
  main: { flex: 1, minWidth: 220 },
  meta: { color: medicalTheme.muted, fontSize: 12, lineHeight: 18 },
  panel: { gap: 10 },
  row: { alignItems: "center", borderBottomColor: medicalTheme.border, borderBottomWidth: 1, flexDirection: "row", flexWrap: "wrap", gap: 12, paddingVertical: 12 },
  title: { color: medicalTheme.text, fontSize: 15, fontWeight: "900" },
});
