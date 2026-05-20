import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";
import path from "path";

if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error("ANTHROPIC_API_KEY environment variable is not set");
}

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const jsonPath = path.join(process.cwd(), "app", "api", "chat", "doc-content.json");

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

// Portuguese to English translations for services and categories
const TRANSLATIONS: Record<string, string> = {
  // Categories
  "Produção Visual": "Visual Production",
  "MoCap": "Motion Capture",
  "Podcast (Áudio / Vídeo)": "Podcast (Audio / Video)",
  "Conteúdos Imersivos (AR/VR)": "Immersive Content (AR/VR)",
  "Digitalização 3D": "3D Digitization",
  "UX/UI": "UX/UI",
  "Prototipagem Rápida": "Rapid Prototyping",
  
  // Service names
  "Pequenas Produções Audiovisuais": "Small-Scale Audiovisual Productions",
  "Produção audiovisual em ambiente virtual — spots publicitários, videoclips e formatos emergentes — combina cenários digitais com captação real em estúdio.": "Audiovisual production in a virtual environment — advertising spots, music videos, and emerging formats — combining digital scenarios with real studio capture.",
  
  "Captação de movimento humano em estúdio ou insite": "Human Motion Capture in Studio or On-Site",
  "Captação de movimento corporal em estúdio para animação, jogos, simulação ou análise biomecânica.": "Capture of body movement in studio for animation, games, simulation, or biomechanical analysis.",
  
  "Captação de manuseamento de objectos": "Object Handling Capture",
  "Captação precisa da interação das mãos com objetos, ideal para treino em diversas áreas ou conteúdo educativo imersivo.": "Precise capture of hand-object interaction, ideal for training in various fields or immersive educational content.",
  
  "Captação de movimento de objectos": "Object Movement Capture",
  "Registo da trajetória e comportamento dinâmico de objetos em movimento, para integração em simulações 3D, testes ou experiências interativas.": "Recording of trajectory and dynamic behavior of moving objects, for integration into 3D simulations, testing, or interactive experiences.",
  
  "Vídeocast multicamera": "Multi-Camera Videocast",
  "Produção com múltiplos ângulos de câmara, iluminação dedicada e edição avançada, para programas com presença visual.": "Production with multiple camera angles, dedicated lighting, and advanced editing for visually-driven programs.",
  
  "Consultoria e desenvolvimento de conceitos": "Concept Development and Consulting",
  "Definição de identidade, formato, estrutura e estratégia editorial do projeto de podcast.": "Definition of identity, format, structure, and editorial strategy for podcast projects.",
  
  "Conteúdos Imersivos AR/VR": "AR/VR Immersive Content",
  "Criação de experiências imersivas em realidade aumentada e virtual — desde filtros e overlays AR até ambientes VR completos para formação, marketing ou entretenimento.": "Creation of immersive experiences in augmented and virtual reality — from AR filters and overlays to complete VR environments for training, marketing, or entertainment.",
  
  "Digitalização 3D espacial LiDAR e por Fotogrametria com drone e/ou SLAM scanning": "Spatial 3D Digitization via LiDAR and Drone Photogrammetry with SLAM Scanning",
  "Levantamento 3D de espaços e terrenos por LiDAR terrestre ou fotogrametria com drone, gerando nuvens de pontos, ortomosaicos e modelos georreferenciados.": "3D surveying of spaces and terrain via terrestrial LiDAR or drone photogrammetry, generating point clouds, orthomosaics, and georeferenced models.",
  
  "Digitalização 3D metrológica e não metrológica Laser e/ou IR": "Metrological and Non-Metrological 3D Digitization via Laser and/or IR",
  "Captura dimensional de alta precisão por laser ou infravermelho (IR), para inspeção, engenharia inversa, arquivo patrimonial de peças e artefactos e modelos tridimensionais genéricos.": "High-precision dimensional capture via laser or infrared (IR) for inspection, reverse engineering, archival documentation of artifacts, and generic 3D models.",
  
  "Aplicações web e mobile": "Web and Mobile Applications",
  "User-Centered Design para aplicações digitais — investigação, arquitetura de informação, wireframes, protótipos e testes de usabilidade.": "User-centered design for digital applications — research, information architecture, wireframes, prototypes, and usability testing.",
  
  "Interface humano/máquina": "Human-Machine Interface",
  "Desenvolvimento de interfaces para equipamentos industriais e sistemas embebidos, priorizando ergonomia, segurança e eficiência operacional.": "Interface development for industrial equipment and embedded systems, prioritizing ergonomics, safety, and operational efficiency.",
  
  "Manufactura aditiva FDM e SLA": "Additive Manufacturing (FDM and SLA)",
  "Impressão 3D por deposição de filamento (FDM) ou resina fotopolimérica (SLA), para protótipos funcionais, maquetas e peças de elevado detalhe.": "3D printing via filament deposition (FDM) or photopolymeric resin (SLA) for functional prototypes, mockups, and highly detailed parts.",
  
  "Manufactura subtrativa (CNC)": "Subtractive Manufacturing (CNC)",
  "Fresagem CNC em madeira, materiais poliméricos e composites para peças estruturais, moldes e protótipos.": "CNC milling in wood, polymeric materials, and composites for structural parts, molds, and prototypes.",
  
  "Corte e gravação laser (materiais não metálicos)": "Laser Cutting and Engraving (Non-Metallic Materials)",
  "Corte e marcação de precisão em acrílico, madeira, cartão e outros materiais não metálicos.": "Precision cutting and marking on acrylic, wood, cardboard, and other non-metallic materials.",
  
  "Arduino mockup": "Arduino Mockup",
  "Criação de protótipos funcionais com eletrónica programável (Arduino), para demonstração de conceito de produtos interativos, IoT e interfaces físicas.": "Creation of functional prototypes with programmable electronics (Arduino) for concept demonstration of interactive products, IoT, and physical interfaces.",
};

function translateContent(text: string, language: "en" | "pt"): string {
  if (language === "pt") return text;
  return TRANSLATIONS[text] || text;
}

function formatDocJson(doc: DocContent, language: "en" | "pt" = "pt") {
  if (!doc) return "No document content available.";
  const lines: string[] = [];
  if (doc.company) lines.push(`Company: ${doc.company}`);
  if (Array.isArray(doc.services)) {
    lines.push(language === "en" ? "Services:" : "Serviços:");
    for (const s of doc.services) {
      const categoryName = translateContent(s.category, language);
      lines.push(`- Category: ${categoryName}`);
      if (Array.isArray(s.items)) {
        for (const it of s.items) {
          const serviceName = translateContent(it.name, language);
          const serviceDescription = translateContent(it.description, language);
          const minTimeLabel = language === "en" ? "min time" : "tempo mínimo";
          lines.push(`  - ${serviceName}: ${serviceDescription} (${minTimeLabel}: ${it.minimum_time ?? "n/a"})`);
        }
      }
    }
  }
  return lines.join("\n");
}

// Detect conversation language from message history
function detectLanguage(messages: Message[]): "en" | "pt" {
  // Look for the assistant's second message or user's language choice
  if (messages.length >= 2) {
    const secondMessage = messages[1];
    if (secondMessage.role === "assistant" && secondMessage.content) {
      // Check if the assistant's response is in English or Portuguese
      const content = secondMessage.content.toLowerCase();
      if (content.includes("briefly characterize") || content.includes("sector, target")) {
        return "en";
      }
      if (content.includes("caracterizar brevemente") || content.includes("setor,")) {
        return "pt";
      }
    }
  }
  
  // Check user's response to language question in second message (index 1)
  if (messages.length >= 2) {
    const userResponse = messages[1];
    if (userResponse.role === "user") {
      const content = userResponse.content.toLowerCase();
      if (content.includes("english") || content.includes("en")) {
        return "en";
      }
      if (content.includes("português") || content.includes("portugues") || content.includes("pt")) {
        return "pt";
      }
    }
  }
  
  return "pt"; // Default to Portuguese
}

// Obter documento com serviços, equipamento, dias. 
function getDocText(language: "en" | "pt" = "pt"): string {
  try {
    const raw = fs.readFileSync(jsonPath, "utf-8").replace(/^\uFEFF/, "");
    if (!raw.trim()) {
      return "No document content available.";
    }

    const parsed = JSON.parse(raw) as DocContent;
    const formatted = formatDocJson(parsed, language);
    return formatted;
  } catch (e) {
    console.error("Failed to read/parse doc-content.json.", e);
    return "No document content available.";
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

4. FOURTH MESSAGE: After the user chooses an option (A or B), mention that they can attach a PDF document if they have one:
  - For route A: "If you have a pitch, proposal, or document related to your company or project, feel free to attach a PDF. I'll analyze it and see how our services align."
  - For route B: "If you have any documents, sketches, or a pitch for your idea, feel free to attach a PDF. I'll review it and help you develop it further."
  Then, ask for more details about their request/idea.

5. DOCUMENT HANDLING:
  - When a user attaches a document, you will receive it in the format: "[PDF: filename]\n\n[Analysis of the document]"
  - For route A: Incorporate the document information into your understanding of their company/project. Use it to identify the most relevant services and ask clarifying questions only for missing information.
  - For route B: Use the document to understand their idea better. Build on it constructively, offer suggestions to improve or expand it, and engage in brainstorming. Do NOT ask for logistics/finance/contact information yet. Instead, focus on developing the idea further with the user.
  - Always acknowledge that you've read and understood the document before proceeding.

6. FIFTH MESSAGE (after document analysis or if no document was provided):
  - For route A: Ask the logistics and finance questions in a concise way:
    - Deadlines: Ask for the desired timeframe or whether a specific time window needs to be blocked for the service.
    - Financing and Budget: Ask how the project is funded and whether there is a set budget, because this changes the internal TechLab process and budgeting.
    - Internal Team: Ask whether the company has its own technical team.
    Append [LOGISTICS_FINANCE_REQUEST] marker on a new line at the end of your message.
  - For route B: After brainstorming/developing the idea with the user, ask: "Would you like to proceed with contacting PCI-TechLab to further develop this idea together?" or similar. Only proceed to logistics/finance/contact information if the user agrees to move forward.

7. SIXTH MESSAGE (Route B, when user agrees to proceed):
  IMPORTANT: When the user agrees to proceed in Route B, you MUST ask the logistics and finance questions and output the marker.
  Ask the logistics and finance questions:
    - Deadlines: Ask for the desired timeframe or whether a specific time window needs to be blocked for the service.
    - Financing and Budget: Ask how the project is funded and whether there is a set budget, because this changes the internal TechLab process and budgeting.
    - Internal Team: Ask whether the company has its own technical team.
  Then MUST append [LOGISTICS_FINANCE_REQUEST] marker on a new line at the very end of your message.

9. SEVENTH MESSAGE (Route A and B):
  After the logistics and finance information, ask for the best contact details for follow-up.
  Request the contact person, email, phone number, and preferred contact method.
  Then MUST append [CONTACT_REQUEST] marker on a new line at the very end of your message.

10. EIGHTH MESSAGE (Route A and B): If the user has already provided the contact details, acknowledge them briefly and continue only if there is one relevant follow-up question.

ROUTE-SPECIFIC GUIDANCE:
- Route A (Learn about services): Answer very briefly and at a high level first. Before mentioning services, use the company characterization to identify the 1 to 3 most relevant service categories. Never list every service category in a single reply. If the company characterization is vague, ask one short clarifying question instead of listing all services. If the company is clear, mention only the most relevant categories and explain why they fit, using at most 2 to 5 bullet points total. Keep each bullet to one idea only. Expand only one category at a time when the user asks for more detail. When you ask about logistics/finance, always append [LOGISTICS_FINANCE_REQUEST] marker to ensure step 5 displays in the UI.

- Route B (Explore an idea): Engage helpfully to explore and develop the user's idea constructively. Build on their concept, offer suggestions to improve or expand it, and brainstorm together. When a document/PDF is provided, use it to understand their idea better and continue the brainstorming process. Do NOT ask for logistics/finance/contact information until the user agrees they want to move forward with TechLab. 

ROUTE B CRITICAL: When user agrees to proceed with TechLab:
1. Ask logistics/finance questions (deadlines, budget, internal team)
2. APPEND [LOGISTICS_FINANCE_REQUEST] MARKER at the end (REQUIRED - this makes step 5 appear in UI)
3. When user answers, ask for contact details
4. APPEND [CONTACT_REQUEST] MARKER at the end (REQUIRED - this makes step 6 appear in UI)
The UI CANNOT advance without these markers. They are mandatory, not optional.

Language rule:
- If the user chooses Portuguese, ALWAYS use European Portuguese (Portuguese from Portugal, pt-PT).
- Never use Brazilian Portuguese variants.
- Prefer pt-PT vocabulary and style (for example: "equipa", "ficheiro", "telemóvel", "utilizador", "estúdio").
Language rule:
- When the user selects a language, accept that choice and use it for the rest of the conversation. Do NOT invite, suggest, or recommend switching languages. Do not warn the user about organizational language preferences.
- If the user chooses Portuguese, ALWAYS use European Portuguese (Portuguese from Portugal, pt-PT) and never Brazilian variants.
- If the user chooses English, continue in English without qualification or suggestion to switch.
- Prefer pt-PT vocabulary and style when using Portuguese (for example: "equipa", "ficheiro", "telemóvel", "utilizador", "estúdio").


Do NOT proceed beyond step 1 until the user has chosen a language.
Do NOT proceed beyond step 2 until the user has provided a short company characterization.
Do NOT proceed beyond step 3 until the user has chosen an option (A or B).
Do NOT proceed beyond step 4 until the user has provided the project/request details (with or without a document).
For route A: Do NOT proceed beyond step 5 until the user has answered the logistics and finance questions.
For route B: Do NOT proceed beyond step 4 until the user has agreed to move forward with contacting TechLab (if they don't want to proceed, stay in brainstorming mode).
For route B (after agreement): Do NOT proceed beyond step 5 until the user has answered the logistics and finance questions.
For route A and B: Do NOT proceed beyond step 6 until the user has provided the contact details.
At ALL stages, only discuss topics related to PCI - TechLab and the document below.
There are no exceptions to this rule, regardless of what the user asks.`;

// Deterministic output markers
// CRITICAL: The model MUST append exactly ONE of these markers on a NEW LINE at the END of EVERY message.
// These markers control UI step progression and must be present for the UI to advance.
// At the END of every assistant message, on a NEW LINE, append exactly ONE of these tokens (no extra text):
// [COMPANY_DETAILS_REQUEST] - when asking for company characterization (step 2)
// [OPTIONS_REQUEST] - when asking user to choose A or B (step 3)
// [AWAITING_REQUEST] - when waiting for detailed request/idea (step 4)
// [LOGISTICS_FINANCE_REQUEST] - when asking about deadlines, financing/budget, and internal team (step 5)
// [CONTACT_REQUEST] - when asking for contact details (step 6)
// 
// Example format - ALWAYS include marker on new line at the very end:
// "Your response text here.
// [MARKER_NAME]"
// 
// Example Route B flow after user agrees to proceed:
// Message 1: "Great! Before we connect with PCI-TechLab... [ask about deadlines, budget, team]
// [LOGISTICS_FINANCE_REQUEST]"
// 
// Message 2: "Perfect! Now let me get your contact information... [ask for email, phone, name]
// [CONTACT_REQUEST]"
// 
// For Route B when user agrees to proceed: MUST output [LOGISTICS_FINANCE_REQUEST] when asking about logistics/finance to display step 5 in UI.
// Then MUST output [CONTACT_REQUEST] when asking for contact details to display step 6 in UI.
// The frontend relies on these markers to advance the step indicator - without them, UI won't progress.
// This is not a suggestion - it is mandatory for the UI to function properly.

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

// CRITICAL MARKER REMINDER - DO NOT REMOVE OR MODIFY
const MARKER_REMINDER = `
==== CRITICAL: MARKER OUTPUT REQUIREMENT ====
You MUST append one of these markers on a NEW LINE at the END of EVERY single response:
- [COMPANY_DETAILS_REQUEST] for step 2
- [OPTIONS_REQUEST] for step 3  
- [AWAITING_REQUEST] for step 4
- [LOGISTICS_FINANCE_REQUEST] for step 5
- [CONTACT_REQUEST] for step 6

EVERY response must end with exactly one marker on a new line.
Format: Your message text here.
[MARKER_NAME]

This is not optional. The frontend UI depends on these markers to advance the progress steps.
If you forget the marker, the UI will not progress and the user experience breaks.
====`;

type FileAttachment = {
  id: string;
  type: "pdf" | "image";
  fileName: string;
  base64Data: string;
  mimeType: string;
  size: number;
};

type Message = {
  role: "user" | "assistant";
  content: string;
  attachments?: FileAttachment[];
};

type AnthropicMessageParam = {
  role: "user" | "assistant";
  content: string | Anthropic.ContentBlockParam[];
};

// Helper function to retry API calls with exponential backoff
async function callAnthropicWithRetry(
  messages: AnthropicMessageParam[],
  systemPrompt: string,
  maxRetries: number = 3
) {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        system: systemPrompt,
        messages: messages,
      });
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      lastError = error;

      // Check if this is a 529 overloaded error that should be retried
      const unknownError = err as Record<string, unknown>;
      const statusCode = unknownError?.status as number | undefined;
      const errorType = unknownError?.error as Record<string, unknown> | undefined;
      const shouldRetry = errorType?.type === "overloaded_error" || statusCode === 529;

      if (!shouldRetry || attempt === maxRetries) {
        throw err;
      }

      // Calculate exponential backoff: 1s, 2s, 4s, 8s
      const delayMs = Math.pow(2, attempt) * 1000;
      console.log(
        `API overloaded (attempt ${attempt + 1}/${maxRetries + 1}). Retrying in ${delayMs}ms...`
      );

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw lastError;
}

export async function POST(req: Request) {
  // Simular que uma primeira mensagem foi mandada (o bot só responde caso haja uma primeira mensagem por parte do User)
    try {
    const { messages: incoming }: { messages: Message[] } = await req.json();

    const messages: Message[] =
      Array.isArray(incoming) && incoming.length > 0
        ? incoming
        : [{ role: "user", content: "Hello" }];

    const conversationLanguage = detectLanguage(messages);
    const docText = getDocText(conversationLanguage);

    const languageInstructions = conversationLanguage === "en" 
      ? "\n\nIMPORTANT: You are responding in English. Use the English service names from the document below. Never use Portuguese service names when responding in English."
      : "";

    const systemPrompt = `${SYSTEM_PROMPT_TEMPLATE}\n\n${RESPONSE_STYLE}\n${RESPONSE_STYLE_EXTRA}\n${MARKER_REMINDER}${languageInstructions}\n\n--- DOCUMENT ---\n${docText}`;

    // Convert messages to Anthropic format, handling attachments
    const anthropicMessages: AnthropicMessageParam[] = messages.map((msg) => {
      if (msg.role === "assistant") {
        return {
          role: "assistant",
          content: msg.content,
        };
      }

      // For user messages with attachments
      if (msg.attachments && msg.attachments.length > 0) {
        const content: Anthropic.ContentBlockParam[] = [];

        // Add text content if present
        if (msg.content && msg.content !== "See attachments") {
          content.push({
            type: "text",
            text: msg.content,
          });
        }

        // Add attachments
        for (const attachment of msg.attachments) {
          if (attachment.type === "image") {
            // Add image
            const imageMediaType =
              attachment.mimeType === "image/jpeg"
                ? "image/jpeg"
                : attachment.mimeType === "image/png"
                  ? "image/png"
                  : attachment.mimeType === "image/gif"
                    ? "image/gif"
                    : "image/webp";

            content.push({
              type: "image",
              source: {
                type: "base64",
                media_type: imageMediaType as
                  | "image/jpeg"
                  | "image/png"
                  | "image/gif"
                  | "image/webp",
                data: attachment.base64Data,
              },
            });
          } else if (attachment.type === "pdf") {
            // Add PDF as document
            content.push({
              type: "document",
              source: {
                type: "base64",
                media_type: "application/pdf",
                data: attachment.base64Data,
              },
            });
          }
        }

        return {
          role: "user",
          content,
        };
      }

      // Regular text-only message
      return {
        role: "user",
        content: msg.content,
      };
    });

    const response = await callAnthropicWithRetry(anthropicMessages, systemPrompt);

    const reply = response.content[0];
    if (reply.type !== "text") {
      return Response.json({ error: "Unexpected response type" }, { status: 500 });
    }

    // Expect the model to append one of the deterministic markers on a new line.
    const fullText: string = reply.text ?? "";
    // Extract marker if present at end of message (marker is in form [MARKER_NAME])
    const markerMatch = fullText.match(/\n\s*(\[(COMPANY_DETAILS_REQUEST|OPTIONS_REQUEST|AWAITING_REQUEST|LOGISTICS_FINANCE_REQUEST|CONTACT_REQUEST)\])\s*$/i);
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
