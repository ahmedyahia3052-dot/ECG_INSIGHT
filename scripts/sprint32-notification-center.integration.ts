import { createServer } from "node:http";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { createApp } from "../server/src/app";

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env["DATABASE_URL"] ?? "postgresql://postgres:postgres@localhost:5432/ecg_insight",
  }),
});

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function expectStatus(response: { body: unknown; status: number }, expected: number, label: string) {
  assert(response.status === expected, `${label}: expected ${expected} but got ${response.status}: ${JSON.stringify(response.body).slice(0, 500)}`);
}

async function createUser(input: { email: string; name: string; role: "ADMIN" | "DOCTOR" }) {
  return prisma.user.create({
    data: {
      avatarInitials: input.role === "ADMIN" ? "NA" : "ND",
      email: input.email,
      emailVerified: true,
      isActive: true,
      name: input.name,
      passwordHash: await bcrypt.hash("password", 12),
      role: input.role,
      subscription: { create: { status: "ACTIVE", tier: "ENTERPRISE" } },
    },
  });
}

async function main() {
  const stamp = Date.now();
  const admin = await createUser({ email: `notify-admin-${stamp}@ecginsight.test`, name: "Sprint 32 Admin", role: "ADMIN" });
  const doctor = await createUser({ email: `notify-doctor-${stamp}@ecginsight.test`, name: "Sprint 32 Doctor", role: "DOCTOR" });
  const server = createServer(createApp());
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  assert(address && typeof address === "object", "Server did not expose a port.");
  const baseUrl = `http://127.0.0.1:${address.port}/api/v1`;

  async function request(route: string, options: { body?: unknown; method?: string; token?: string } = {}) {
    const headers = new Headers();
    if (options.token) headers.set("authorization", `Bearer ${options.token}`);
    let body: BodyInit | undefined;
    if (options.body !== undefined) {
      headers.set("content-type", "application/json");
      body = JSON.stringify(options.body);
    }
    const response = await fetch(`${baseUrl}${route}`, { body, headers, method: options.method ?? "GET" });
    const text = await response.text();
    let parsed: unknown = null;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      parsed = text;
    }
    return { body: parsed, status: response.status };
  }

  let response = await request("/auth/login", { body: { email: admin.email, password: "password", rememberMe: true }, method: "POST" });
  expectStatus(response, 200, "admin login");
  const adminToken = (response.body as { accessToken?: string }).accessToken;
  assert(adminToken, "Admin login should return token.");

  response = await request("/auth/login", { body: { email: doctor.email, password: "password", rememberMe: true }, method: "POST" });
  expectStatus(response, 200, "doctor login");
  const doctorToken = (response.body as { accessToken?: string }).accessToken;
  assert(doctorToken, "Doctor login should return token.");

  response = await request("/notifications/templates", { token: adminToken });
  expectStatus(response, 200, "list templates");
  assert(((response.body as { templates?: unknown[] }).templates ?? []).length > 0, "Default notification templates should be available.");

  response = await request("/notifications/preferences", {
    body: {
      preferences: [
        { category: "CRITICAL_ECG_ALERT", emailEnabled: true, frequency: "IMMEDIATE", inAppEnabled: true, pushEnabled: true, smsEnabled: true },
        { category: "PAYMENT_EVENT", emailEnabled: false, frequency: "DAILY_DIGEST", inAppEnabled: true, pushEnabled: false, smsEnabled: false },
      ],
    },
    method: "PUT",
    token: doctorToken,
  });
  expectStatus(response, 200, "update preferences");
  assert((response.body as { preferences: unknown[] }).preferences.length === 2, "Preference update should return configured categories.");

  response = await request("/notifications", {
    body: {
      category: "CRITICAL_ECG_ALERT",
      channels: ["IN_APP", "EMAIL", "PUSH", "SMS"],
      message: "STEMI suspected. Immediate review required.",
      title: "Critical ECG Alert",
      type: "CRITICAL",
      userId: doctor.id,
    },
    method: "POST",
    token: adminToken,
  });
  expectStatus(response, 201, "create critical notification");
  const notification = (response.body as { notification: { id: string } }).notification;
  assert(notification.id, "Notification should have an id.");

  response = await request("/notifications/unread-count", { token: doctorToken });
  expectStatus(response, 200, "unread count");
  assert((response.body as { unreadCount: number }).unreadCount > 0, "Unread count should include the critical alert.");

  response = await request("/notifications/history", { token: doctorToken });
  expectStatus(response, 200, "delivery history");
  assert(((response.body as { logs?: unknown[] }).logs ?? []).length >= 4, "Delivery logs should include in-app/email/push/SMS attempts.");

  response = await request("/notifications/admin/broadcast", {
    body: {
      category: "SYSTEM_ALERT",
      channels: ["IN_APP", "EMAIL"],
      message: "Scheduled maintenance alert.",
      scheduledAt: new Date(Date.now() - 1000).toISOString(),
      targetRole: "DOCTOR",
      title: "Maintenance Window",
      type: "WARNING",
    },
    method: "POST",
    token: adminToken,
  });
  expectStatus(response, 201, "scheduled broadcast");
  assert((response.body as { notifications: unknown[] }).notifications.length >= 1, "Broadcast should create scheduled notifications.");

  response = await request("/notifications/admin/process-scheduled", { method: "POST", token: adminToken });
  expectStatus(response, 200, "process scheduled notifications");
  assert((response.body as { notifications: unknown[] }).notifications.length >= 1, "Scheduled processor should send due announcements.");

  response = await request(`/notifications/${notification.id}/read`, { method: "PATCH", token: doctorToken });
  expectStatus(response, 200, "mark notification read");

  server.close();

  await prisma.notificationDeliveryLog.deleteMany({ where: { userId: { in: [admin.id, doctor.id] } } });
  await prisma.notificationPreference.deleteMany({ where: { userId: { in: [admin.id, doctor.id] } } });
  await prisma.notification.deleteMany({ where: { OR: [{ userId: { in: [admin.id, doctor.id] } }, { targetRole: "DOCTOR" }] } });
  await prisma.auditLog.deleteMany({ where: { OR: [{ actorId: { in: [admin.id, doctor.id] } }, { entityType: "Notification" }] } });
  await prisma.session.deleteMany({ where: { userId: { in: [admin.id, doctor.id] } } });
  await prisma.subscription.deleteMany({ where: { userId: { in: [admin.id, doctor.id] } } });
  await prisma.user.deleteMany({ where: { id: { in: [admin.id, doctor.id] } } });

  console.log("Sprint 32 notification center integration test passed.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
