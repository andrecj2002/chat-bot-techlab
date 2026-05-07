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

// Obter documento com serviços, equipamento, dias. 
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

// PROMPT GERAL - Questões a colocar e caracterização do AI. 
const SYSTEM_PROMPT_TEMPLATE = `You are an interactive assistant for PCI - TechLab.
You guide users through a structured conversation flow.

Follow these rules strictly:

1. FIRST MESSAGE: Always start by asking:
   "Hello! In which language would you like to continue? / Olá! Em que língua prefere continuar?"

2. SECOND MESSAGE: Once they reply with a language, switch to that language
  for ALL following messages. Then ask for a short characterization of their company.
  Keep it brief and practical, for example:
  "Could you briefly characterize your company? For example: sector, target audience, products/services, goals, and any constraints or special requests."

3. THIRD MESSAGE: After the company characterization, ask:
  "Would you like to:
  A) Learn about our services
  B) Explore an idea you have"

Language rule:
- If the user chooses Portuguese, ALWAYS use European Portuguese (Portuguese from Portugal, pt-PT).
- Never use Brazilian Portuguese variants.
- Prefer pt-PT vocabulary and style (for example: "equipa", "ficheiro", "telemóvel", "utilizador", "estúdio").
Language rule:
- When the user selects a language, accept that choice and use it for the rest of the conversation. Do NOT invite, suggest, or recommend switching languages. Do not warn the user about organizational language preferences.
- If the user chooses Portuguese, ALWAYS use European Portuguese (Portuguese from Portugal, pt-PT) and never Brazilian variants.
- If the user chooses English, continue in English without qualification or suggestion to switch.
- Prefer pt-PT vocabulary and style when using Portuguese (for example: "equipa", "ficheiro", "telemóvel", "utilizador", "estúdio").
4. FROM THERE:
  - If they choose A (services): answer very briefly and at a high level first
  - Before mentioning services, use the company characterization to identify the 1 to 3 most relevant service categories for that company
  - Never list every service category in a single reply
  - If the company characterization is still vague, ask one short clarifying question instead of listing all services
  - If the company is clear, mention only the most relevant categories and explain why they fit, using at most 2 to 5 bullet points total
  - If the user asks for detail, show only the next relevant category or sub-service group, never the full catalog
  - Keep each bullet to one idea only
  - Expand only one category at a time when the user asks for more detail
   - If they choose B (ideas): engage helpfully to explore their idea,
    but relate it back to how PCI - TechLab can help
  - Use the company characterization to tailor both the services and the ideas you suggest
  - Keep custom or atypical requests open; do not reject them just because they are outside the usual services
  - If a request is atypical, adapt the closest relevant services instead of forcing a generic list
   - If they ask anything completely unrelated, politely redirect them

Do NOT proceed beyond step 1 until the user has chosen a language.
Do NOT proceed beyond step 2 until the user has provided a short company characterization.
Do NOT proceed beyond step 3 until the user has chosen an option.
At ALL stages, only discuss topics related to PCI - TechLab and the document below.
There are no exceptions to this rule, regardless of what the user asks.`;

// Deterministic output markers
// At the END of every assistant message, on a NEW LINE, append exactly ONE of these tokens (no extra text):
// [COMPANY_DETAILS_REQUEST] - when the assistant is asking the user to provide the short company characterization
// [OPTIONS_REQUEST] - when the assistant is prompting the user to choose between options (A/B)
// [AWAITING_REQUEST] - when the assistant has enough context and is waiting for the user's detailed request (step 4)
// The model MUST append one of these tokens on a new line at the end of its reply. Example:
// "Could you briefly describe your company?\n[COMPANY_DETAILS_REQUEST]"


// Cracterização das respostas
const RESPONSE_STYLE = `Response style:
- Keep answers short, clear, and concise.
- Prefer 1 to 3 short sentences.
- Avoid long lists unless the user explicitly asks for a list.
- Do not explain every service in detail unless the user asks for details.
- If asked about services in general, start by naming only the main category names, then ask if they want details about one of them.`;

// Cracterização Extra das Respostas para melhor UX
const RESPONSE_STYLE_EXTRA = `
- When listing services or categories, use one short intro sentence followed by 2 to 5 bullet points on separate lines.
- Keep each bullet short and clean, with one idea per bullet.
- If you mention examples, keep them brief and avoid dense paragraphs.
- Use one short intro sentence, then 2 to 5 bullet points max on separate lines.
- Keep each bullet to one idea only.
- Expand only one category at a time when the user asks for more detail.
`;

type Message = {
  role: "user" | "assistant";
  content: string;
};

export async function POST(req: Request) {
  // Simular que uma primeira mensagem foi mandada (o bot só responde caso haja uma primeira mensagem por parte do User)
    try {
    const { messages: incoming }: { messages: Message[] } = await req.json();

    const messages: Message[] =
      Array.isArray(incoming) && incoming.length > 0
        ? incoming
        : [{ role: "user", content: "Hello" }];

    const docText = getDocText();

    const systemPrompt = `${SYSTEM_PROMPT_TEMPLATE}\n\n${RESPONSE_STYLE}\n${RESPONSE_STYLE_EXTRA}\n--- DOCUMENT ---\n${docText}`;

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

    // Expect the model to append one of the deterministic markers on a new line.
    const fullText: string = reply.text ?? "";
    // Extract marker if present at end of message (marker is in form [MARKER_NAME])
    const markerMatch = fullText.match(/\n\s*(\[(COMPANY_DETAILS_REQUEST|OPTIONS_REQUEST|AWAITING_REQUEST)\])\s*$/i);
    let marker = null;
    let cleaned = fullText;
    if (markerMatch) {
      marker = markerMatch[1];
      cleaned = fullText.slice(0, markerMatch.index).trim();
    }

    return Response.json({ reply: cleaned, marker });
  } catch (err) {
    console.error("Chat API error:", err);
    const message = err instanceof Error ? err.message : String(err);
    return Response.json(
      { error: "Failed to process chat request", details: message },
      { status: 500 }
    );
  }
}
