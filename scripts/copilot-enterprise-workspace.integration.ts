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
  await prisma.copilotAttachment.deleteMany({ where: { OR: [{ userId: { in: userIds } }, { conversationId: { in: conversationIds } }] } });
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

function assertAutoTitle(title: string, expectedPrefix: string) {
  assert(title.length <= 60, `Auto title exceeds 60 characters: ${title}`);
  assert(title.split(/\s+/).filter(Boolean).length <= 6, `Auto title exceeds 6 words: ${title}`);
  assert(title.startsWith(expectedPrefix), `Unexpected auto title: ${title}`);
}

async function main() {
  const prefix = `copilot-simple-${Date.now()}`;
  await cleanup("copilot-simple-");

  const [user, otherUser] = await Promise.all([
    prisma.user.create({
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
    }),
    prisma.user.create({
      data: {
        avatarInitials: "OU",
        email: `${prefix}+other@ecg.test`,
        emailVerified: true,
        isActive: true,
        name: "Other Copilot Doctor",
        passwordHash: await hashPassword("StrongPass123!"),
        role: "DOCTOR",
        subscription: { create: { status: "ACTIVE", tier: "PROFESSIONAL" } },
      },
    }),
  ]);

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

  async function uploadAttachment(kind: "ecg" | "file" | "image", fileName: string, mimeType: string, content: string, token: string) {
    const formData = new FormData();
    formData.append("kind", kind);
    formData.append("contextType", "global");
    formData.append("file", new Blob([content], { type: mimeType }), fileName);
    const response = await fetch(`${baseUrl}/copilot/attachments`, {
      body: formData,
      headers: { authorization: `Bearer ${token}` },
      method: "POST",
    });
    const body = await response.json() as {
      attachment: {
        analysisSummary?: string;
        confidence?: number;
        documentType?: string;
        extractedText?: string;
        id: string;
        kind: string;
        medicalAnalysis?: { findings?: string[] };
        recommendations?: string[];
        warnings?: string[];
      };
    };
    return { body, status: response.status };
  }

  try {
    const login = await request<{ accessToken: string }>("/auth/login", {
      body: { email: user.email, password: "StrongPass123!", rememberMe: true },
      method: "POST",
    });
    assert(login.status === 200 && Boolean(login.body.accessToken), "Doctor login must issue an access token.");
    const token = login.body.accessToken;

    const otherLogin = await request<{ accessToken: string }>("/auth/login", {
      body: { email: otherUser.email, password: "StrongPass123!", rememberMe: true },
      method: "POST",
    });
    assert(otherLogin.status === 200 && Boolean(otherLogin.body.accessToken), "Second doctor login must issue an access token.");

    const emptyConversation = await request<{ conversation: { id: string; title: string } }>("/copilot/conversations", {
      body: { contextType: "global", tag: "ECG Interpretation" },
      method: "POST",
      token,
    });
    assert(emptyConversation.status === 201, "New Chat placeholder conversation must be creatable.");
    assert(emptyConversation.body.conversation.title === "New Clinical Conversation", "Empty new chat must use default title.");

    const ecgUpload = await uploadAttachment("ecg", "resting-ecg-upload.pdf", "application/pdf", "ECG rhythm strip PR interval QRS QTc ST depression", token);
    const medicalImage = await uploadAttachment("image", "chest-xray-image.png", "image/png", "chest x-ray opacity radiograph follow up", token);
    const clinicalFile = await uploadAttachment("file", "lab-report.txt", "text/plain", "Troponin: 0.42 Creatinine: 1.4 Potassium: 5.7 ECG irregular rhythm", token);
    for (const upload of [ecgUpload, medicalImage, clinicalFile]) {
      assert(upload.status === 201 && Boolean(upload.body.attachment.id), "Medical attachment upload must persist.");
      assert(Boolean(upload.body.attachment.documentType), "Upload must detect document type.");
      assert(Boolean(upload.body.attachment.originalName), "Upload must return the original filename.");
      assert((upload.body.attachment.sizeBytes ?? 0) > 0, "Upload must return file size.");
      assert(!("analysisSummary" in upload.body.attachment), "Upload API must not expose internal analysis metadata.");
      assert(!("confidence" in upload.body.attachment), "Upload API must not expose confidence metadata.");
    }

    const firstQuestion = "Interpret this ECG showing irregular rhythm and AF";
    const firstStream = await fetch(`${baseUrl}/copilot/chat/stream`, {
      body: JSON.stringify({
        attachmentIds: [ecgUpload.body.attachment.id, medicalImage.body.attachment.id, clinicalFile.body.attachment.id],
        contextType: "global",
        question: firstQuestion,
        tag: "ECG Interpretation",
      }),
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      method: "POST",
    });
    const firstEvents = sseEvents(await firstStream.text());
    assert(firstStream.status === 201, "First message must create and stream a new conversation.");
    assert(firstEvents.some((event) => event.event === "token"), "First stream must emit token events.");
    const firstConversation = firstEvents.find((event) => event.event === "conversation")?.data.conversation as { id: string; title: string } | undefined;
    assert(firstConversation?.id, "First stream must return the created conversation.");
    assertAutoTitle(firstConversation.title, "Interpret this ECG");

    const secondQuestion = "Summarize occupational fitness after abnormal ECG";
    const secondStream = await fetch(`${baseUrl}/copilot/chat/stream`, {
      body: JSON.stringify({ contextType: "global", question: secondQuestion, tag: "Occupational Fitness" }),
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      method: "POST",
    });
    const secondEvents = sseEvents(await secondStream.text());
    const secondConversation = secondEvents.find((event) => event.event === "conversation")?.data.conversation as { id: string; title: string } | undefined;
    assert(secondStream.status === 201 && secondConversation?.id, "Second chat must create a separate conversation.");
    assertAutoTitle(secondConversation.title, "Summarize occupational");

    const continued = await fetch(`${baseUrl}/copilot/chat/stream`, {
      body: JSON.stringify({ contextType: "global", conversationId: firstConversation.id, question: "Continue with key anticoagulation considerations.", tag: "Follow-up" }),
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      method: "POST",
    });
    const continuedEvents = sseEvents(await continued.text());
    assert(continued.status === 201, "Sending another message to an existing chat must succeed.");
    assert(continuedEvents.some((event) => event.event === "done"), "Continuation stream must finish before restore assertions.");

    const restoredFirst = await request<{ conversation: { id: string; title: string }; messages: Array<{ attachments?: Array<{ documentType?: string; kind: string; originalName?: string }>; content: string; role: string }> }>(`/copilot/conversations/${firstConversation.id}`, { token });
    assert(restoredFirst.status === 200 && restoredFirst.body.conversation.id === firstConversation.id, "Refresh/deep-link restore must return the first conversation.");
    assert(restoredFirst.body.conversation.title === firstConversation.title, "Existing chat title must remain stable after later messages.");
    assert(restoredFirst.body.messages.filter((message) => message.role === "user").length === 2, "First conversation history must restore all user messages.");
    assert(restoredFirst.body.messages.some((message) => message.content.includes("anticoagulation")), "First conversation must restore later history.");
    const restoredAttachments = restoredFirst.body.messages.flatMap((message) => message.attachments ?? []);
    assert(restoredAttachments.some((attachment) => attachment.kind === "ecg" && attachment.documentType), "ECG upload must restore with document type.");
    assert(restoredAttachments.some((attachment) => attachment.kind === "image" && attachment.originalName), "Medical image upload must restore attachment metadata.");
    assert(restoredAttachments.some((attachment) => attachment.kind === "file" && attachment.originalName), "Clinical file upload must restore attachment metadata.");

    const restoredSecond = await request<{ conversation: { id: string; title: string }; messages: Array<{ content: string; role: string }> }>(`/copilot/conversations/${secondConversation.id}`, { token });
    assert(restoredSecond.status === 200 && restoredSecond.body.conversation.id === secondConversation.id, "Switching to second chat must restore its history.");
    assert(restoredSecond.body.messages.some((message) => message.content === secondQuestion), "Second conversation history must be isolated.");

    const forbiddenSwitch = await request<{ code: string }>(`/copilot/conversations/${firstConversation.id}`, { token: otherLogin.body.accessToken });
    assert(forbiddenSwitch.status === 404, "Other doctors must not be able to restore another doctor's chat.");

    const listed = await request<{ conversations: Array<{ id: string; lastMessagePreview?: string; title: string; updatedAt: string }> }>("/copilot/conversations", { token });
    assert(listed.status === 200, "Conversation list must load.");
    assert(listed.body.conversations.some((conversation) => conversation.id === firstConversation.id && Boolean(conversation.lastMessagePreview)), "Conversation list must include a latest message preview.");
    assert(listed.body.conversations.some((conversation) => conversation.id === secondConversation.id && conversation.title === secondConversation.title), "Conversation list must include second chat for switching.");
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await cleanup("copilot-simple-");
    await prisma.$disconnect();
  }
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
