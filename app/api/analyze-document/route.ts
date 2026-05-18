import Anthropic from "@anthropic-ai/sdk";

if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error("ANTHROPIC_API_KEY environment variable is not set");
}

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

type AnalyzeDocumentRequest = {
  documentBase64: string;
  fileName: string;
  userChoice: "A" | "B";
  language: "en" | "pt";
};

function getAnalysisPrompt(userChoice: "A" | "B", language: "en" | "pt"): string {
  if (language === "pt") {
    const basePrompt = `Analise este documento em 2-3 frases apenas:
1. **Resumo**: O que é?
2. **Objetivo principal**: Qual é o objetivo?`;

    if (userChoice === "A") {
      return basePrompt + `

Que serviços da PCI-TechLab se alinham com isto?`;
    } else {
      return basePrompt + `

Como poderia ser melhorado?`;
    }
  } else {
    const basePrompt = `Analyze this document in 2-3 sentences only:
1. **Summary**: What is it?
2. **Main Objective**: What's the goal?`;

    if (userChoice === "A") {
      return basePrompt + `

Which PCI-TechLab services align with this?`;
    } else {
      return basePrompt + `

How could it be improved?`;
    }
  }
}

export async function POST(req: Request) {
  try {
    const {
      documentBase64,
      fileName,
      userChoice,
      language,
    }: AnalyzeDocumentRequest = await req.json();

    if (!documentBase64 || !userChoice || !language) {
      return Response.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Generate analysis prompt
    const analysisPrompt = getAnalysisPrompt(userChoice, language);

    // Call Claude with PDF as document
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 300,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "document",
              source: {
                type: "base64",
                media_type: "application/pdf",
                data: documentBase64,
              },
            },
            {
              type: "text",
              text: analysisPrompt,
            },
          ],
        },
      ],
    });

    const analysisMessage = response.content[0];
    if (analysisMessage.type !== "text") {
      return Response.json(
        { error: "Unexpected response type" },
        { status: 500 }
      );
    }

    const analysis = analysisMessage.text;

    return Response.json({ analysis });
  } catch (err) {
    console.error("Document analysis API error:", err);
    const message = err instanceof Error ? err.message : String(err);
    return Response.json(
      { error: "Failed to analyze document", details: message },
      { status: 500 }
    );
  }
}
