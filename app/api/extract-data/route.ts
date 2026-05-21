import { Anthropic } from "@anthropic-ai/sdk";
import { Message } from "@/utils/types";

const client = new Anthropic();

interface ExtractedData {
  servico: string;
  contexto: string;
  prazoSolicitado: string;
  requisitoEspecificos: string;
  equipa: string;
  financiamento: string;
  empresa: string;
  contacto: string;
}

export async function POST(request: Request) {
  try {
    const { messages, isPortugueseFlow, routeBProceedToTechlab } = (await request.json()) as {
      messages: Message[];
      isPortugueseFlow: boolean;
      routeBProceedToTechlab?: boolean;
    };
    const routeBIsActive = Boolean(routeBProceedToTechlab);

    // Build conversation text for analysis
    const conversationText = messages
      .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
      .join("\n");
    const routeBInstruction = routeBIsActive
      ? isPortugueseFlow
        ? "\n\nA conversa está na Rota B e o utilizador já concordou explicitamente em prosseguir com a PCI-TechLab."
        : "\n\nThe conversation is on Route B and the user has explicitly agreed to proceed with PCI-TechLab."
      : "";

    const extractionPrompt = isPortugueseFlow
      ? `Analisa a seguinte conversa com um cliente e extrai as informações estruturadas solicitadas.

Conversa:
${conversationText}

Extrai e sintetiza as seguintes informações da conversa. Para cada campo, fornece a informação mais completa e relevante, combinando informações de múltiplas mensagens se necessário. Não faças citações diretas dos utilizadores - sintetiza as informações de forma natural e profissional.${routeBInstruction}

Para o campo "servico", não uses a rota da conversa como rótulo.
Escolhe o serviço ou categoria da PCI-TechLab que melhor corresponde à necessidade real da empresa/projeto, com base no problema, objetivo, contexto e materiais discutidos.
Se a necessidade não for clara, usa a categoria mais próxima possível e evita "Brainstorming/Ideacao" salvo se a conversa for efetivamente apenas exploração de ideia sem necessidade definida.

Retorna um JSON válido (apenas JSON, sem markdown) com a seguinte estrutura:
{
  "empresa": "nome da empresa/cliente do utilizador",
  "servico": "tipo de serviço (Consultoria/Assessoria ou Brainstorming/Ideacao)",
  "contexto": "síntese do contexto, background, situação atual e desafios (não uma citação, mas uma análise)",
  "prazoSolicitado": "prazo/deadline/timing solicitado (sintetizado)",
  "requisitoEspecificos": "requisitos específicos, constraints e necessidades (não uma citação)",
  "equipa": "informações sobre equipa, recursos humanos, pessoas envolvidas",
  "financiamento": "orçamento, investimento, custo, recursos financeiros",
  "contacto": "informações de contacto (email, telefone, nome, etc)"
}

Importantes:
- Se uma informação não foi fornecida explicitamente, deixa o campo vazio
- Sintetiza e combina informações relacionadas de diferentes partes da conversa
- Evita citações diretas - parafraseia e sintetiza
- Se o utilizador respondeu com pouco detalhe a uma pergunta, reconhece essa limitação mas oferece o melhor resumo possível`
      : `Analyze the following conversation with a client and extract the requested structured information.

Conversation:
${conversationText}

Extract and synthesize the following information from the conversation. For each field, provide the most complete and relevant information, combining information from multiple messages if necessary. Do not make direct quotes from the user - synthesize the information in a natural and professional way.${routeBInstruction}

For the "servico" field, do not use the conversation route as a label.
Choose the PCI-TechLab service or category that best matches the company's real need, based on the problem, goal, context, and materials discussed.
If the need is unclear, use the closest possible category and avoid "Brainstorming/Ideacao" unless the conversation is genuinely only idea exploration with no defined need.

Return valid JSON (only JSON, no markdown) with the following structure:
{
  "empresa": "name of the client's company/organization",
  "servico": "type of service (Consultoria/Assessoria or Brainstorming/Ideacao)",
  "contexto": "synthesis of context, background, current situation and challenges (not a quote, but an analysis)",
  "prazoSolicitado": "requested timeline/deadline/timing (synthesized)",
  "requisitoEspecificos": "specific requirements, constraints and needs (not a quote)",
  "equipa": "information about team, human resources, people involved",
  "financiamento": "budget, investment, cost, financial resources",
  "contacto": "contact information (email, phone, name, etc)"
}

Important:
- If information was not explicitly provided, leave the field empty
- Synthesize and combine related information from different parts of the conversation
- Avoid direct quotes - paraphrase and synthesize
- If the user answered with little detail to a question, acknowledge that limitation but offer the best possible summary`;

    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: extractionPrompt,
        },
      ],
    });

    const responseText =
      response.content[0].type === "text" ? response.content[0].text : "";

    console.log("Claude response:", responseText);

    // Parse JSON response - handle potential markdown formatting
    let jsonText = responseText;
    
    // Remove markdown code blocks if present
    if (jsonText.includes("```json")) {
      jsonText = jsonText.replace(/```json\n?/, "").replace(/```\n?$/, "");
    } else if (jsonText.includes("```")) {
      jsonText = jsonText.replace(/```\n?/, "").replace(/```\n?$/, "");
    }

    const extractedData: ExtractedData = JSON.parse(jsonText.trim());

    return Response.json({ data: extractedData });
  } catch (error) {
    console.error("Error extracting data:", error);
    console.error("Stack:", error instanceof Error ? error.stack : "");
    return Response.json(
      {
        error: "Failed to extract data from conversation",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
