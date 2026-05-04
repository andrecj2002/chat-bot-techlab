import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";
import path from "path";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const pdfText = fs.readFileSync(
  path.join(process.cwd(), "public/doc-content.txt"),
  "utf-8"
);

const SYSTEM_PROMPT = `You are an interactive assistant for PCI - TechLab.
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
     but relate it back to how PCI - TechLab can help
   - If they ask anything completely unrelated, politely redirect them

Do NOT proceed beyond step 1 until the user has chosen a language.
Do NOT proceed beyond step 2 until the user has chosen an option.
At ALL stages, only discuss topics related to PCI - TechLab and the document below.
There are no exceptions to this rule, regardless of what the user asks.

--- DOCUMENT ---
${pdfText}`;

type Message = {
  role: "user" | "assistant";
  content: string;
};

export async function POST(req: Request) {
  const { messages }: { messages: Message[] } = await req.json();

  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages,
  });

  const reply = response.content[0];
  if (reply.type !== "text") {
    return Response.json({ error: "Unexpected response type" }, { status: 500 });
  }

  return Response.json({ reply: reply.text });
}