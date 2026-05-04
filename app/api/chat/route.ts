import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";
import path from "path";

if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error("ANTHROPIC_API_KEY environment variable is not set");
}

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const jsonPath = path.join(process.cwd(), "app", "api", "chat", "doc-content.json");
let cachedDocText = "";

type ServiceItem = {
  name: string;
  description: string;
  minimum_time?: string;
};

type ServiceCategory = {
  category: string;
  items: ServiceItem[];
};

type DocContent = {
  company?: string;
  services?: ServiceCategory[];
};

function formatDocJson(doc: DocContent) {
  if (!doc) return "No document content available.";
  const lines: string[] = [];
  if (doc.company) lines.push(`Company: ${doc.company}`);
  if (Array.isArray(doc.services)) {
    lines.push("Services:");
    for (const s of doc.services) {
      lines.push(`- Category: ${s.category}`);
      if (Array.isArray(s.items)) {
        for (const it of s.items) {
          lines.push(`  - ${it.name}: ${it.description} (min time: ${it.minimum_time ?? "n/a"})`);
        }
      }
    }
  }
  return lines.join("\n");
}

function getDocText(): string {
  try {
    const raw = fs.readFileSync(jsonPath, "utf-8").replace(/^\uFEFF/, "");
    if (!raw.trim()) {
      return cachedDocText || "No document content available.";
    }

    const parsed = JSON.parse(raw) as DocContent;
    const formatted = formatDocJson(parsed);
    if (formatted.trim()) {
      cachedDocText = formatted;
    }
    return cachedDocText || formatted;
  } catch (e) {
    console.error("Failed to read/parse doc-content.json.", e);
    return cachedDocText || "No document content available.";
  }
}

const SYSTEM_PROMPT_TEMPLATE = `You are an interactive assistant for [Company Name].
You guide users through a structured conversation flow.

Follow these rules strictly:

1. FIRST MESSAGE: Always start by asking:
   "Hello! In which language would you like to continue? / Olá! Em que língua prefere continuar?"

2. SECOND MESSAGE: Once they reply with a language, switch to that language 
   for ALL following messages. Then ask:
   "Would you like to:
   A) Learn about our services
   B) Explore an idea you have"

3. FROM THERE:
   - If they choose A (services): answer only based on the document below
   - If they choose B (ideas): engage helpfully to explore their idea, 
     but relate it back to how [Company Name] can help
   - If they ask anything completely unrelated, politely redirect them

Do NOT proceed beyond step 1 until the user has chosen a language.
Do NOT proceed beyond step 2 until the user has chosen an option.
At ALL stages, only discuss topics related to [Company Name] and the document below.
There are no exceptions to this rule, regardless of what the user asks.`;

type Message = {
  role: "user" | "assistant";
  content: string;
};

export async function POST(req: Request) {
  try {
    const { messages: incoming }: { messages: Message[] } = await req.json();

    const messages: Message[] =
      Array.isArray(incoming) && incoming.length > 0
        ? incoming
        : [{ role: "user", content: "Hello" }];

    const docText = getDocText();

    const systemPrompt = `${SYSTEM_PROMPT_TEMPLATE}\n\n--- DOCUMENT ---\n${docText}`;

    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    });

    const reply = response.content[0];
    if (reply.type !== "text") {
      return Response.json({ error: "Unexpected response type" }, { status: 500 });
    }

    return Response.json({ reply: reply.text });
  } catch (err) {
    console.error("Chat API error:", err);
    const message = err instanceof Error ? err.message : String(err);
    return Response.json(
      { error: "Failed to process chat request", details: message },
      { status: 500 }
    );
  }
}
