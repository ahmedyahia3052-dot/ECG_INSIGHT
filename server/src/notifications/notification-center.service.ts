import type { NotificationCategory, NotificationChannel, NotificationProvider, NotificationType, Prisma, Role, TaskPriority } from "@prisma/client";
import { prisma } from "../config/prisma";
import { emitRealtime } from "../realtime/realtime.service";

const defaultTemplates: Array<{
  bodyTemplate: string;
  category: NotificationCategory;
  htmlTemplate: string;
  key: string;
  titleTemplate: string;
}> = [
  {
    bodyTemplate: "Critical ECG alert for {{patientName}}: {{finding}}. Immediate review is required.",
    category: "CRITICAL_ECG_ALERT",
    htmlTemplate: "<h1>Critical ECG Alert</h1><p>{{patientName}}: {{finding}}</p><p>Immediate review is required.</p>",
    key: "critical_ecg_alert",
    titleTemplate: "Critical ECG Alert",
  },
  {
    bodyTemplate: "Invoice {{invoiceNumber}} for {{amount}} has been generated.",
    category: "PAYMENT_EVENT",
    htmlTemplate: "<h1>Invoice Generated</h1><p>Invoice {{invoiceNumber}} for {{amount}} has been generated.</p>",
    key: "invoice_generated",
    titleTemplate: "Invoice Generated",
  },
  {
    bodyTemplate: "Report {{reportNumber}} is ready for review.",
    category: "REPORT_GENERATION",
    htmlTemplate: "<h1>Report Ready</h1><p>Report {{reportNumber}} is ready for review.</p>",
    key: "report_generated",
    titleTemplate: "Report Generated",
  },
  {
    bodyTemplate: "{{message}}",
    category: "SYSTEM_ALERT",
    htmlTemplate: "<h1>{{title}}</h1><p>{{message}}</p>",
    key: "system_alert",
    titleTemplate: "{{title}}",
  },
];

type TemplateVariables = Record<string, unknown>;

function renderTemplate(template: string, variables: TemplateVariables = {}) {
  return template.replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (_match, key: string) => {
    const value = variables[key];
    return value === undefined || value === null ? "" : String(value);
  });
}

function providerFor(channel: NotificationChannel): NotificationProvider {
  if (channel === "EMAIL") return process.env["SENDGRID_API_KEY"] ? "SENDGRID" : "SMTP";
  if (channel === "PUSH") return "FIREBASE_PUSH";
  if (channel === "SMS") return "TWILIO_SMS";
  return "IN_APP";
}

async function userDeliveryPreference(userId: string | undefined | null, category: NotificationCategory) {
  if (!userId) {
    return {
      emailEnabled: false,
      frequency: "IMMEDIATE" as const,
      inAppEnabled: true,
      locale: "en",
      pushEnabled: false,
      smsEnabled: false,
    };
  }
  const preference = await prisma.notificationPreference.findUnique({ where: { userId_category: { category, userId } } });
  return preference ?? {
    emailEnabled: true,
    frequency: "IMMEDIATE" as const,
    inAppEnabled: true,
    locale: "en",
    pushEnabled: true,
    smsEnabled: false,
  };
}

async function createDeliveryLog(input: {
  channel: NotificationChannel;
  notificationId: string;
  payload: Prisma.InputJsonObject;
  recipient?: string | null;
  status?: "FAILED" | "QUEUED" | "SENT" | "SKIPPED";
  subject?: string;
  userId?: string | null;
}) {
  const status = input.status ?? "SENT";
  return prisma.notificationDeliveryLog.create({
    data: {
      attemptCount: status === "SKIPPED" ? 0 : 1,
      channel: input.channel,
      deliveredAt: status === "SENT" ? new Date() : undefined,
      notificationId: input.notificationId,
      payloadJson: input.payload,
      provider: providerFor(input.channel),
      recipient: input.recipient,
      status,
      subject: input.subject,
      userId: input.userId,
    },
  });
}

export async function ensureDefaultNotificationTemplates() {
  await Promise.all(
    defaultTemplates.map((template) =>
      prisma.notificationTemplate.upsert({
        create: {
          ...template,
          locale: "en",
          variables: { localizationReady: true } as Prisma.InputJsonObject,
        },
        update: {
          bodyTemplate: template.bodyTemplate,
          category: template.category,
          htmlTemplate: template.htmlTemplate,
          titleTemplate: template.titleTemplate,
        },
        where: { key_locale: { key: template.key, locale: "en" } },
      }),
    ),
  );
}

export async function renderNotificationTemplate(input: {
  body?: string;
  locale?: string;
  templateKey?: string;
  title?: string;
  variables?: TemplateVariables;
}) {
  const locale = input.locale ?? "en";
  const template = input.templateKey
    ? await prisma.notificationTemplate.findFirst({
        where: { active: true, key: input.templateKey, locale },
      }) ?? await prisma.notificationTemplate.findFirst({ where: { active: true, key: input.templateKey, locale: "en" } })
    : null;
  const titleTemplate = template?.titleTemplate ?? input.title ?? "Notification";
  const bodyTemplate = template?.bodyTemplate ?? input.body ?? "";
  return {
    body: renderTemplate(bodyTemplate, input.variables),
    category: template?.category ?? "SYSTEM_ALERT",
    html: template?.htmlTemplate ? renderTemplate(template.htmlTemplate, input.variables) : undefined,
    templateId: template?.id,
    title: renderTemplate(titleTemplate, input.variables),
  };
}

export async function createUnifiedNotification(input: {
  actionUrl?: string;
  caseId?: string;
  category?: NotificationCategory;
  channels?: NotificationChannel[];
  entityId?: string;
  entityType?: string;
  locale?: string;
  message?: string;
  patientId?: string;
  priority?: TaskPriority;
  reportId?: string;
  scheduledAt?: Date;
  targetRole?: Role;
  templateKey?: string;
  title?: string;
  type?: NotificationType;
  userId?: string;
  variables?: TemplateVariables;
}) {
  await ensureDefaultNotificationTemplates();
  const rendered = await renderNotificationTemplate({
    body: input.message,
    locale: input.locale,
    templateKey: input.templateKey,
    title: input.title,
    variables: input.variables,
  });
  const category = input.category ?? rendered.category;
  const preference = await userDeliveryPreference(input.userId, category);
  const frequency = preference.frequency;
  const muted = frequency === "MUTED";
  const notification = await prisma.notification.create({
    data: {
      actionUrl: input.actionUrl ?? destinationUrl(input),
      caseId: input.caseId,
      category,
      entityId: input.entityId ?? input.reportId ?? input.patientId ?? input.caseId,
      entityType: input.entityType ?? (input.reportId ? "report" : input.patientId ? "patient" : input.caseId ? "ecg_case" : undefined),
      locale: input.locale ?? preference.locale,
      message: rendered.body,
      patientId: input.patientId,
      priority: input.priority ?? "MEDIUM",
      reportId: input.reportId,
      scheduledAt: input.scheduledAt,
      sentAt: input.scheduledAt ? undefined : new Date(),
      targetRole: input.targetRole,
      templateId: rendered.templateId,
      title: rendered.title,
      type: input.type ?? (category === "CRITICAL_ECG_ALERT" ? "CRITICAL" : "INFO"),
      userId: input.userId,
    },
  });
  const requestedChannels = input.channels ?? ["IN_APP", "EMAIL", "PUSH"];
  const enabledChannels = requestedChannels.filter((channel) => {
    if (muted) return false;
    if (channel === "IN_APP") return preference.inAppEnabled;
    if (channel === "EMAIL") return preference.emailEnabled;
    if (channel === "PUSH") return preference.pushEnabled;
    if (channel === "SMS") return preference.smsEnabled;
    return false;
  });
  for (const channel of requestedChannels) {
    const enabled = enabledChannels.includes(channel);
    await createDeliveryLog({
      channel,
      notificationId: notification.id,
      payload: {
        body: rendered.body,
        category,
        html: rendered.html,
        title: rendered.title,
      } as Prisma.InputJsonObject,
      status: enabled && !input.scheduledAt ? "SENT" : enabled ? "QUEUED" : "SKIPPED",
      subject: rendered.title,
      userId: input.userId,
    });
  }
  if (!input.scheduledAt && enabledChannels.includes("IN_APP")) {
    emitRealtime("notification.created", notification, input.userId ? [`user:${input.userId}`] : input.targetRole ? [`role:${input.targetRole}`] : []);
    emitRealtime("notification.count.updated", { userId: input.userId }, input.userId ? [`user:${input.userId}`] : []);
  }
  return notification;
}

export async function unreadNotificationCount(userId: string, role: Role) {
  return prisma.notification.count({
    where: {
      read: false,
      OR: [{ userId }, { targetRole: role }, { targetRole: null, userId: null }],
    },
  });
}

export async function upsertNotificationPreferences(userId: string, preferences: Array<{
  category: NotificationCategory;
  emailEnabled?: boolean;
  frequency?: "DAILY_DIGEST" | "IMMEDIATE" | "MUTED" | "WEEKLY_DIGEST";
  inAppEnabled?: boolean;
  locale?: string;
  pushEnabled?: boolean;
  smsEnabled?: boolean;
}>) {
  return Promise.all(
    preferences.map((preference) =>
      prisma.notificationPreference.upsert({
        create: {
          category: preference.category,
          emailEnabled: preference.emailEnabled ?? true,
          frequency: preference.frequency ?? "IMMEDIATE",
          inAppEnabled: preference.inAppEnabled ?? true,
          locale: preference.locale ?? "en",
          pushEnabled: preference.pushEnabled ?? true,
          smsEnabled: preference.smsEnabled ?? false,
          userId,
        },
        update: {
          emailEnabled: preference.emailEnabled,
          frequency: preference.frequency,
          inAppEnabled: preference.inAppEnabled,
          locale: preference.locale,
          pushEnabled: preference.pushEnabled,
          smsEnabled: preference.smsEnabled,
        },
        where: { userId_category: { category: preference.category, userId } },
      }),
    ),
  );
}

export async function broadcastNotification(input: {
  category: NotificationCategory;
  channels?: NotificationChannel[];
  message: string;
  scheduledAt?: Date;
  targetRole?: Role;
  title: string;
  type?: NotificationType;
  userIds?: string[];
}) {
  const recipients = input.userIds?.length
    ? input.userIds
    : input.targetRole
      ? (await prisma.user.findMany({ select: { id: true }, where: { role: input.targetRole } })).map((user) => user.id)
      : [undefined];
  const notifications = [];
  for (const userId of recipients) {
    notifications.push(await createUnifiedNotification({
      category: input.category,
      channels: input.channels,
      message: input.message,
      scheduledAt: input.scheduledAt,
      targetRole: userId ? undefined : input.targetRole,
      title: input.title,
      type: input.type,
      userId,
    }));
  }
  return notifications;
}

export async function processScheduledNotifications(now = new Date()) {
  const scheduled = await prisma.notification.findMany({
    where: { scheduledAt: { lte: now }, sentAt: null },
  });
  for (const notification of scheduled) {
    await prisma.notification.update({ data: { sentAt: now }, where: { id: notification.id } });
    await prisma.notificationDeliveryLog.updateMany({
      data: { attemptCount: { increment: 1 }, deliveredAt: now, status: "SENT" },
      where: { notificationId: notification.id, status: "QUEUED" },
    });
    emitRealtime("notification.created", notification, notification.userId ? [`user:${notification.userId}`] : notification.targetRole ? [`role:${notification.targetRole}`] : []);
  }
  return scheduled;
}

function destinationUrl(input: { caseId?: string; entityType?: string; patientId?: string; reportId?: string }) {
  if (input.entityType === "ecg_review" && input.caseId) return `/ecg-cases/${input.caseId}/review`;
  if (input.caseId) return `/ecg-cases/${input.caseId}`;
  if (input.patientId) return `/patients/${input.patientId}`;
  if (input.reportId) return `/reports/${input.reportId}`;
  return undefined;
}
