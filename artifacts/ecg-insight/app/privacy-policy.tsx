import { Link } from "expo-router";
import React from "react";
import { ScrollView, StyleSheet, Text } from "react-native";

import { AuthCard, premiumAuthTheme, PremiumAuthShell } from "@/components/auth/PremiumAuth";

export default function PrivacyPolicyScreen() {
  return (
    <PremiumAuthShell subtitle="How ECG Insight protects account, ECG, and patient data." title="Privacy Policy">
      <AuthCard>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>Privacy Policy</Text>
          <Text style={styles.paragraph}>
            ECG Insight is a healthcare SaaS platform for ECG analysis, clinical workflow, occupational cardiology, and medical AI decision support. We collect user account information, authentication activity, ECG uploads, patient metadata, clinical reports, and operational logs needed to provide secure medical services.
          </Text>
          <Text style={styles.heading}>User Accounts</Text>
          <Text style={styles.paragraph}>
            Account data includes name, email address, role, specialization, institution, authentication sessions, and security settings. This data is used for identity, access control, auditability, support, and regulatory compliance.
          </Text>
          <Text style={styles.heading}>ECG Uploads And Patient Information</Text>
          <Text style={styles.paragraph}>
            ECG files, derived signals, reports, case history, and patient information are processed only to deliver clinical and occupational cardiology workflows. Access is controlled by role-based permissions and audit trails.
          </Text>
          <Text style={styles.heading}>Encryption And Security</Text>
          <Text style={styles.paragraph}>
            ECG Insight uses encrypted transport, protected sessions, password hashing, audit logging, MFA-capable security controls, and database-level protections. Sensitive healthcare data is handled under least-privilege access principles.
          </Text>
          <Text style={styles.heading}>Data Retention</Text>
          <Text style={styles.paragraph}>
            Clinical and audit records are retained according to customer agreements, legal obligations, and healthcare retention requirements. Authorized administrators may request export or deletion where permitted by applicable law.
          </Text>
          <Text style={styles.heading}>HIPAA And GDPR</Text>
          <Text style={styles.paragraph}>
            ECG Insight is designed to support HIPAA and GDPR readiness, including confidentiality, auditability, data minimization, access controls, and patient data rights workflows.
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
