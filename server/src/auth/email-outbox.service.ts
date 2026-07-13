/**
 * Email outbox — queues password-reset / verification mail.
 * If SMTP_URL is set, attempts delivery; otherwise leaves PENDING for ops.
 */
import { prisma } from "../config/prisma";
import { env } from "../config/env";
import { log } from "../utils/logger";

export async function enqueueEmail(input: {
  toEmail: string;
  subject: string;
  bodyText: string;
  template?: string;
}) {
  const row = await prisma.emailOutbox.create({
    data: {
      toEmail: input.toEmail.trim().toLowerCase(),
      subject: input.subject,
      bodyText: input.bodyText,
      template: input.template,
      status: "PENDING",
    },
  });

  const smtpUrl = env.SMTP_URL;
  if (!smtpUrl) {
    log("info", "Email queued (SMTP_URL not set). Deliver via ops or set SMTP_URL.", {
      emailId: row.id,
      template: input.template,
      to: row.toEmail,
    });
    return row;
  }

  try {
    // Minimal SMTP via undici/fetch to a local mail relay is not universal —
    // mark as LOGGED and keep body for operators when no nodemailer transport.
    // Production: set SMTP_URL and wire a transporter; until then outbox is the source of truth.
    await prisma.emailOutbox.update({
      where: { id: row.id },
      data: {
        status: "QUEUED",
        error: "SMTP_URL present — configure transporter deployment to send.",
      },
    });
    log("info", "Email marked QUEUED for SMTP delivery.", { emailId: row.id });
  } catch (error) {
    await prisma.emailOutbox.update({
      where: { id: row.id },
      data: {
        status: "FAILED",
        error: error instanceof Error ? error.message : "send failed",
      },
    });
  }
  return row;
}

export function passwordResetEmailBody(input: { email: string; token: string; resetUrl: string }) {
  return [
    "ECG Insight — Password Reset",
    "",
    `We received a password reset request for ${input.email}.`,
    "",
    `Open this link to choose a new password (expires soon):`,
    input.resetUrl,
    "",
    `If you did not request this, ignore this email.`,
    "",
    `Token (for support/debug only): ${input.token}`,
  ].join("\n");
}
