import { Link } from "expo-router";
import React from "react";
import { ScrollView, StyleSheet, Text } from "react-native";

import { AuthCard, premiumAuthTheme, PremiumAuthShell } from "@/components/auth/PremiumAuth";

export default function TermsOfServiceScreen() {
  return (
    <PremiumAuthShell subtitle="Professional terms for ECG Insight clinical SaaS use." title="Terms of Service">
      <AuthCard>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>Terms of Service</Text>
          <Text style={styles.heading}>User Responsibilities</Text>
          <Text style={styles.paragraph}>
            Users must provide accurate account information, protect credentials, comply with institutional policies, and only upload ECG or patient data they are authorized to process.
          </Text>
          <Text style={styles.heading}>Clinical Disclaimer</Text>
          <Text style={styles.paragraph}>
            ECG Insight supports clinical workflows but does not replace licensed medical judgment. Physicians and authorized clinicians remain responsible for diagnosis, treatment decisions, and patient management.
          </Text>
          <Text style={styles.heading}>AI Limitations</Text>
          <Text style={styles.paragraph}>
            AI-generated ECG interpretations, risk signals, and recommendations may be incomplete or incorrect. Outputs must be reviewed in clinical context and verified before use in patient care.
          </Text>
          <Text style={styles.heading}>Data Ownership</Text>
          <Text style={styles.paragraph}>
            Customers retain ownership of patient, ECG, and clinical data submitted to the platform. ECG Insight processes data to provide contracted services, security, support, and compliance operations.
          </Text>
          <Text style={styles.heading}>Account And Subscription Usage</Text>
          <Text style={styles.paragraph}>
            Accounts are assigned to named users and organizations. Subscription features, usage limits, and billing terms apply according to the selected plan and customer agreement.
          </Text>
          <Link href="/login" style={styles.link}>Back to login</Link>
        </ScrollView>
      </AuthCard>
    </PremiumAuthShell>
  );
}

const styles = StyleSheet.create({
  content: { gap: 12 },
  heading: { color: premiumAuthTheme.text, fontSize: 16, fontWeight: "900", marginTop: 4 },
  link: { color: premiumAuthTheme.cyan, fontSize: 13, fontWeight: "900", marginTop: 8, textAlign: "center" },
  paragraph: { color: premiumAuthTheme.muted, fontSize: 13, fontWeight: "700", lineHeight: 21 },
  title: { color: premiumAuthTheme.text, fontSize: 28, fontWeight: "900", letterSpacing: -0.7 },
});
