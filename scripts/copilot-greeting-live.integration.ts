const baseUrl = "http://localhost:3002/api";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function sseEvents(raw: string) {
  const events: Array<{ data: Record<string, unknown>; event: string }> = [];
  for (const block of raw.split("\n\n")) {
    const lines = block.split("\n").filter(Boolean);
    if (!lines.length) continue;
    const event = lines.find((line) => line.startsWith("event:"))?.slice(6).trim() ?? "message";
    const dataLine = lines.find((line) => line.startsWith("data:"))?.slice(5).trim();
    if (!dataLine) continue;
    events.push({ data: JSON.parse(dataLine) as Record<string, unknown>, event });
  }
  return events;
}

function assistantContent(events: ReturnType<typeof sseEvents>) {
  const done = events.find((event) => event.event === "done");
  const message = done?.data.message as { content?: string } | undefined;
  if (message?.content) return message.content;
  return events.filter((event) => event.event === "token").map((event) => String(event.data.token ?? "")).join("");
}

const legacyPattern = /Short Answer|Confidence Score|Citations:|Knowledge Base|References:|QT Abnormalities|I can go deeper if you want|Uploaded Document Review|OCR Confidence/i;

async function chat(token: string, question: string) {
  const response = await fetch(`${baseUrl}/copilot/chat/stream`, {
    body: JSON.stringify({ contextType: "global", question }),
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    method: "POST",
  });
  const raw = await response.text();
  assert(response.status === 201, `${question}: expected 201, got ${response.status}: ${raw.slice(0, 300)}`);
  const events = sseEvents(raw);
  const content = assistantContent(events);
  assert(content.trim().length > 0, `${question}: empty assistant response`);
  assert(!legacyPattern.test(content), `${question}: legacy template leaked:\n${content.slice(0, 400)}`);
  return content;
}

async function main() {
  const login = await fetch(`${baseUrl}/auth/login`, {
    body: JSON.stringify({ email: "doctor@ecginsight.com", password: "password", rememberMe: true }),
    headers: { "content-type": "application/json" },
    method: "POST",
  });
  const loginBody = await login.text();
  assert(login.ok, `Login failed (${login.status}): ${loginBody}`);
  const { accessToken } = JSON.parse(loginBody) as { accessToken: string };

  const cases = [
    { expect: /Hello|Good (morning|afternoon|evening)|How can I help/i, question: "Hi" },
    { expect: /Hello|Good (morning|afternoon|evening)|How can I help/i, question: "Hello" },
    { expect: /Of course|I'm here to help|Tell me what you need/i, question: "I need your help" },
    { expect: /ready when you are|Happy to help|What would you like/i, question: "How are you?" },
  ];

  for (const item of cases) {
    const content = await chat(accessToken, item.question);
    assert(item.expect.test(content), `${item.question}: unexpected response:\n${content}`);
    assert(!/Definition:|ECG criteria:|Differential diagnosis:/i.test(content), `${item.question}: knowledge dump on greeting path:\n${content.slice(0, 400)}`);
    console.log(`PASS ${item.question}: ${content.replace(/\s+/g, " ").slice(0, 120)}...`);
  }

  console.log("Live conversational orchestration checks passed.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
