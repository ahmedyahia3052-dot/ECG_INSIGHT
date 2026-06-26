import { Link } from "expo-router";
import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { z } from "zod";

import { AuthCard, AuthMessage, AuthPrimaryButton, AuthTextField, premiumAuthTheme, PremiumAuthShell } from "@/components/auth/PremiumAuth";
import { createSupportTicket } from "@/services/support";

const supportSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  message: z.string().trim().min(10, "Message must be at least 10 characters."),
  name: z.string().trim().min(2, "Name is required."),
  subject: z.string().trim().min(3, "Subject is required."),
});

export default function ContactSupportScreen() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
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
      setNotice(`Support ticket ${result.ticket.id} was created.`);
      setName("");
      setEmail("");
      setSubject("");
      setMessage("");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to create support ticket.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PremiumAuthShell subtitle="Create a support ticket for the ECG Insight team." title="Contact Support">
      <AuthCard>
        <View style={styles.header}>
          <Text style={styles.title}>Contact support</Text>
          <Text style={styles.subtitle}>Your message is stored as a support ticket for administrator review.</Text>
        </View>
        <AuthTextField icon="user" label="Name" onChangeText={setName} placeholder="Your name" value={name} />
        <AuthTextField autoCapitalize="none" icon="mail" keyboardType="email-address" label="Email" onChangeText={setEmail} placeholder="name@organization.com" value={email} />
        <AuthTextField icon="file-text" label="Subject" onChangeText={setSubject} placeholder="How can we help?" value={subject} />
        <AuthTextField icon="message-square" label="Message" multiline onChangeText={setMessage} placeholder="Describe your issue or request" value={message} />
        {error ? <AuthMessage message={error} tone="error" /> : null}
        {notice ? <AuthMessage message={notice} tone="success" /> : null}
        <AuthPrimaryButton disabled={submitting} icon="send" label={submitting ? "Submitting..." : "Submit Ticket"} onPress={submit} />
        <Link href="/login" style={styles.link}>Back to login</Link>
      </AuthCard>
    </PremiumAuthShell>
  );
}

const styles = StyleSheet.create({
  header: { gap: 6 },
  link: { color: premiumAuthTheme.cyan, fontSize: 13, fontWeight: "900", textAlign: "center" },
  subtitle: { color: premiumAuthTheme.muted, fontSize: 14, fontWeight: "700", lineHeight: 20 },
  title: { color: premiumAuthTheme.text, fontSize: 28, fontWeight: "900", letterSpacing: -0.7 },
});
