import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { z } from "zod";

import { Card, Field, medicalTheme, PageSection, PrimaryButton, SectionHeader } from "@/components/enterprise/EnterpriseUI";
import { useAuth } from "@/context/AuthContext";
import { createSupportTicket } from "@/services/support";

const supportSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  message: z.string().trim().min(10, "Message must be at least 10 characters."),
  name: z.string().trim().min(2, "Name is required."),
  subject: z.string().trim().min(3, "Subject is required."),
});

export default function SupportScreen() {
  const { user } = useAuth();
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setError("");
    setNotice("");
    const parsed = supportSchema.safeParse({ email, message, name, subject });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Support request is incomplete.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await createSupportTicket(parsed.data);
      setNotice(`Support ticket ${result.ticket.id} was created for administrator review.`);
      setSubject("");
      setMessage("");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to create support ticket.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageSection>
      <Card style={styles.panel}>
        <SectionHeader title="Support" subtitle="Create a persistent support ticket for operational, billing, or clinical workflow issues." />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {notice ? <Text style={styles.success}>{notice}</Text> : null}
        <View style={styles.grid}>
          <Field label="Name" onChangeText={setName} placeholder="Your name" value={name} />
          <Field autoCapitalize="none" keyboardType="email-address" label="Email" onChangeText={setEmail} placeholder="name@organization.com" value={email} />
        </View>
        <Field label="Subject" onChangeText={setSubject} placeholder="How can we help?" value={subject} />
        <Field label="Message" multiline onChangeText={setMessage} placeholder="Describe the issue, affected workflow, expected behavior, and urgency." value={message} />
        <PrimaryButton disabled={submitting} icon="send" label={submitting ? "Submitting..." : "Submit Ticket"} onPress={submit} />
      </Card>
    </PageSection>
  );
}

const styles = StyleSheet.create({
  error: { color: medicalTheme.critical, fontSize: 13, fontWeight: "900" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  panel: { gap: 14 },
  success: { color: medicalTheme.success, fontSize: 13, fontWeight: "900" },
});
