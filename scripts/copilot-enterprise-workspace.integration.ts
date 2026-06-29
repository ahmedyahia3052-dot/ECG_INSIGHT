import { createServer } from "node:http";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { createApp } from "../server/src/app";
import { hashPassword } from "../server/src/utils/crypto";

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env["DATABASE_URL"] ?? "postgresql://postgres:postgres@localhost:5432/ecg_insight",
  }),
});

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function cleanup(prefix: string) {
  const users = await prisma.user.findMany({
    select: { id: true },
    where: { email: { contains: prefix } },
  });
  const userIds = users.map((user) => user.id);
  const conversations = await prisma.copilotConversation.findMany({
    select: { id: true },
    where: { userId: { in: userIds } },
  });
  const conversationIds = conversations.map((conversation) => conversation.id);
  await prisma.copilotUsageEvent.deleteMany({ where: { OR: [{ userId: { in: userIds } }, { conversationId: { in: conversationIds } }] } });
  await prisma.copilotMessage.deleteMany({ where: { conversationId: { in: conversationIds } } });
  await prisma.copilotConversation.deleteMany({ where: { id: { in: conversationIds } } });
  await prisma.userSession.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.session.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.subscription.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.auditLog.deleteMany({ where: { OR: [{ actorId: { in: userIds } }, { entityId: { in: userIds } }] } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
}

function sseEvents(payload: string) {
  return payload
    .split("\n\n")
    .map((block) => {
      const event = block.split("\n").find((line) => line.startsWith("event:"))?.replace("event:", "").trim();
      const data = block.split("\n").find((line) => line.startsWith("data:"))?.replace("data:", "").trim();
      return event && data ? { event, data: JSON.parse(data) as Record<string, unknown> } : null;
    })
    .filter((event): event is { data: Record<string, unknown>; event: string } => Boolean(event));
}

async function main() {
  const prefix = `copilot-enterprise-${Date.now()}`;
  await cleanup("copilot-enterprise-");

  const user = await prisma.user.create({
    data: {
      avatarInitials: "CW",
      email: `${prefix}@ecg.test`,
      emailVerified: true,
      isActive: true,
      name: "Copilot Workspace Doctor",
      passwordHash: await hashPassword("StrongPass123!"),
      role: "DOCTOR",
      subscription: { create: { status: "ACTIVE", tier: "PROFESSIONAL" } },
    },
  });

  const server = createServer(createApp());
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  assert(address && typeof address === "object", "Server did not start.");
  const baseUrl = `http://127.0.0.1:${address.port}/api`;

  async function request<T>(path: string, options: { body?: unknown; method?: string; token?: string } = {}) {
    const headers = new Headers();
    if (options.body !== undefined) headers.set("content-type", "application/json");
    if (options.token) headers.set("authorization", `Bearer ${options.token}`);
    const response = await fetch(`${baseUrl}${path}`, {
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      headers,
      method: options.method ?? "GET",
    });
    const text = await response.text();
    const body = text ? JSON.parse(text) : null;
    return { body: body as T, response, status: response.status };
  }

  try {
    const login = await request<{ accessToken: string }>("/auth/login", {
      body: { email: user.email, password: "StrongPass123!", rememberMe: true },
      method: "POST",
    });
    assert(login.status === 200 && Boolean(login.body.accessToken), "Doctor login must issue an access token.");
    const token = login.body.accessToken;

    const created = await request<{ conversation: { id: string; title: string } }>("/copilot/conversations", {
      body: { contextType: "global", tag: "ECG Interpretation", title: "Enterprise workspace chat" },
      method: "POST",
      token,
    });
    assert(created.status === 201, "Create chat must succeed.");
    const conversationId = created.body.conversation.id;

    const renamed = await request<{ conversation: { isFavorite: boolean; isPinned: boolean; title: string } }>(`/copilot/conversations/${conversationId}`, {
      body: { isFavorite: true, isPinned: true, title: "Renamed pinned favorite chat" },
      method: "PATCH",
      token,
    });
    assert(renamed.status === 200, "Rename/pin/favorite must persist.");
    assert(renamed.body.conversation.title === "Renamed pinned favorite chat", "Rename did not persist.");
    assert(renamed.body.conversation.isPinned && renamed.body.conversation.isFavorite, "Pin/favorite did not persist.");

    const listed = await request<{ conversations: Array<{ id: string; isFavorite: boolean; isPinned: boolean; title: string }> }>("/copilot/conversations?q=Renamed", { token });
    assert(listed.status === 200 && listed.body.conversations.some((item) => item.id === conversationId && item.isPinned && item.isFavorite), "Search/list must restore persisted conversation state.");

    const stream = await fetch(`${baseUrl}/copilot/chat/stream`, {
      body: JSON.stringify({ contextType: "global", conversationId, question: "Interpret this ECG and provide follow-up recommendations.", tag: "ECG Interpretation" }),
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      method: "POST",
    });
    const streamText = await stream.text();
    assert(stream.status === 201, "Streaming response must succeed.");
    const events = sseEvents(streamText);
    assert(events.some((event) => event.event === "token"), "Streaming response must emit token events.");
    assert(events.some((event) => event.event === "done"), "Streaming response must emit done event.");

    const restored = await request<{ conversation: { id: string; lastOpenedAt?: string }; messages: Array<{ content: string; role: string }> }>(`/copilot/conversations/${conversationId}`, { token });
    assert(restored.status === 200 && restored.body.conversation.id === conversationId, "Deep-linked conversation restore must succeed.");
    assert(Boolean(restored.body.conversation.lastOpenedAt), "Restore must update lastOpenedAt for refresh/back-forward persistence.");
    assert(restored.body.messages.some((message) => message.role === "user") && restored.body.messages.some((message) => message.role === "assistant"), "Message persistence must include user and assistant messages.");

    const archived = await request<{ conversation: { archivedAt?: string } }>(`/copilot/conversations/${conversationId}/archive`, { method: "POST", token });
    assert(archived.status === 200 && Boolean(archived.body.conversation.archivedAt), "Archive chat must persist.");

    const restoredArchive = await request<{ conversation: { archivedAt?: string } }>(`/copilot/conversations/${conversationId}/restore`, { method: "POST", token });
    assert(restoredArchive.status === 200 && !restoredArchive.body.conversation.archivedAt, "Restore archived chat must persist.");

    const duplicated = await request<{ conversation: { id: string } }>(`/copilot/conversations/${conversationId}/duplicate`, { method: "POST", token });
    assert(duplicated.status === 201 && duplicated.body.conversation.id !== conversationId, "Duplicate chat must create a new persisted conversation.");

    const deleted = await request<void>(`/copilot/conversations/${conversationId}`, { method: "DELETE", token });
    assert(deleted.status === 204, "Delete chat must succeed.");
    const missing = await request<{ code: string }>(`/copilot/conversations/${conversationId}`, { token });
    assert(missing.status === 404, "Deleted chat must no longer restore by deep link.");
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await cleanup("copilot-enterprise-");
    await prisma.$disconnect();
  }
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
