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
    const basePrompt = `Por favor, analise este documento PDF e forneça um resumo estruturado do que compreendeu. A resposta deve ser concisa e incluir:

1. **Resumo da ideia/proposta**: O que é a ideia/proposta apresentada?
2. **Objetivo principal**: Qual é o objetivo principal?
3. **Público-alvo ou contexto**: Para quem ou em que contexto se aplica?
4. **Elementos-chave**: Quais são os pontos-chave mencionados?`;

    if (userChoice === "A") {
      return (
        basePrompt +
        `

Contexto: Este é um pedido em que o utilizador quer conhecer os serviços da PCI - TechLab que se alinham com a sua proposta/ideia.

Termine com uma observação sobre quais os serviços da PCI - TechLab que seriam mais relevantes baseado no documento.`
      );
    } else {
      return (
        basePrompt +
        `

Contexto: Este é um pedido em que o utilizador quer explorar e desenvolver uma ideia que tem, e gostaria de ajuda para a melhorar.

Termine com sugestões de como esta ideia poderia ser expandida ou melhorada.`
      );
    }
  } else {
    const basePrompt = `Please analyze this PDF document and provide a structured summary of what you understand. The response should be concise and include:

1. **Idea/Proposal Summary**: What is the idea or proposal presented?
2. **Main Objective**: What is the main objective?
3. **Target Audience or Context**: Who is it for or in what context does it apply?
4. **Key Elements**: What are the key points mentioned?`;

    if (userChoice === "A") {
      return (
        basePrompt +
        `

Context: This is a request where the user wants to learn about PCI - TechLab services that align with their proposal/idea.

End with an observation about which PCI - TechLab services would be most relevant based on the document.`
      );
    } else {
      return (
        basePrompt +
        `

Context: This is a request where the user wants to explore and develop an idea they have and would like help improving it.

End with suggestions on how this idea could be expanded or improved.`
      );
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
      max_tokens: 1024,
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
