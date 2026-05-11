"use client";
import { useState, useEffect, useRef, useCallback } from "react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

export default function ConfigBotComponent() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentStep, setCurrentStep] = useState<number>(1);
  const setStepIfHigher = (step: number) => setCurrentStep((prev) => Math.max(prev, step));
  const [input, setInput] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  const userOnlyMessages = messages.filter((m) => m.role === "user");
  const showLanguageOptions = messages.length === 1 && messages[0]?.role === "assistant";
  
  const showChoiceOptions = !loading && currentStep === 3;
  const firstUserLanguage = userOnlyMessages[0]?.content?.trim().toLowerCase() ?? "";
  const isEnglishFlow = firstUserLanguage.includes("english") || firstUserLanguage === "en";
  const isPortugueseFlow = !isEnglishFlow;
  const detectAssistantWantsDetails = (text: string) => {
    return /\?|gostaria de esclarecer|gostaria de saber|poderia detalh|poderia esclarecer|pode esclarecer|pode detalh|poderia indicar|pode indicar|poderia dizer|pode dizer|por exemplo|poderia fornecer|pode fornecer|poderia clarificar|pode clarificar|mais detalhe|mais detalhes|poderia especificar/i.test(
      text,
    );
  };

  const detectAssistantProvidedOptions = (text: string) => {
    if (!text) return false;
    const hasLetterOptions = /(^|\n)\s*[A-DF]\)/i.test(text) || /\b[A-D]\b\s*(?:ou|\/|-)\s*\b[B-D]?\b/i.test(text);
    const hasBulletLines = /(^|\n)\s*[-•*]\s+/m.test(text);
    const mentionsOptions = /opções|escolha|escolher|escolha\s+entre|digite\s+(?:A|B|1|2)|responda\s+(?:A|B|1|2)|A\)|B\)/i.test(text);
    return hasLetterOptions || (hasBulletLines && mentionsOptions) || mentionsOptions;
  };

  const detectAssistantRequestsLogistics = (text: string) => {
    return /deadline|prazo|prazos|financ|orçamento|budget|equipa interna|internal team|timing|timeframe|schedule/i.test(text);
  };

  const detectAssistantRequestsContact = (text: string) => {
    return /contacto|contato|contact|contact details|follow-up|email|telefone|telemóvel|phone/i.test(text);
  };

  const getStepFromAssistantReply = (reply: string, fallbackUserCount: number) => {
    if (detectAssistantRequestsContact(reply)) return 6;
    if (detectAssistantRequestsLogistics(reply)) return 5;
    if (detectAssistantProvidedOptions(reply)) return 3;
    if (detectAssistantWantsDetails(reply)) return 2;

    if (fallbackUserCount >= 5) return 6;
    if (fallbackUserCount >= 4) return 5;
    if (fallbackUserCount >= 3) return 4;
    return 1;
  };

  const showInput = !(currentStep === 1 || currentStep === 3);

  const steps = isEnglishFlow
    ? [
        { label: "Language" },
        { label: "Company" },
        { label: "Options" },
        { label: "Request" },
        { label: "Logistics & Finance" },
        { label: "Contact" },
      ]
    : [
        { label: "Língua" },
        { label: "Empresa" },
        { label: "Opções" },
        { label: "Pedido" },
        { label: "Logística e Finanças" },
        { label: "Contacto" },
      ];

  const renderInlineBold = (text: string) => {
    const segments = text.split(/(\*\*[^*]+\*\*)/g);

    return segments.map((segment, index) => {
      if (segment.startsWith("**") && segment.endsWith("**")) {
        return (
          <strong key={index} className="font-semibold text-slate-900">
            {segment.slice(2, -2)}
          </strong>
        );
      }

      return <span key={index}>{segment}</span>;
    });
  };

  const renderAssistantContent = (content: string) => {
    const normalized = content
      .replace(/\r/g, "")
      .replace(/\s-\s(?=\*\*)/g, "\n- ")
      .replace(/\s•\s/g, "\n• ")
      .trim();

    const lines = normalized.split("\n").map((line) => line.trim()).filter(Boolean);
    const bulletLines = lines.filter((line) => /^[-•*]\s+/.test(line));

    if (bulletLines.length > 0) {
      return (
        <div className="space-y-2">
          {lines.map((line, index) => {
            const isBullet = /^[-•*]\s+/.test(line);
            const cleaned = line.replace(/^[-•*]\s+/, "");

            if (isBullet) {
              return (
                <div key={index} className="flex items-start gap-3 text-base leading-7 text-slate-900">
                  <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-slate-900" />
                  <span>{renderInlineBold(cleaned)}</span>
                </div>
              );
            }

            return (
              <p key={index} className="text-base leading-7 text-slate-900">
                {renderInlineBold(line)}
              </p>
            );
          })}
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {normalized
          .split(/(?<=[.!?])\s+(?=[A-ZÀ-ÿ0-9])/)
          .map((sentence, index) => (
            <p key={index} className="text-base leading-7 text-slate-900">
              {renderInlineBold(sentence)}
            </p>
          ))}
      </div>
    );
  };

  const startConversation = useCallback(async (): Promise<void> => {
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [{ role: "user", content: "Hello" }] }),
      });
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const data = await res.json();
      const assistantReply = data.reply ?? "";
      const marker: string | null = data.marker ?? null;
      setMessages([{ role: "assistant", content: assistantReply }]);
      // initial assistant message should keep the flow at step 1 (language selection)
      setCurrentStep(1);
      // If model unexpectedly requests company details immediately, honor marker
      if (marker === "[COMPANY_DETAILS_REQUEST]") setStepIfHigher(2);
    } catch (err) {
      console.error("startConversation error:", err);
      setMessages([{ role: "assistant", content: "Sorry, something went wrong." }]);
    } finally {
      setLoading(false);
    }
  }, []);
  const sendMessageWithContent = async (content: string): Promise<void> => {
    if (!content.trim()) return;

    const userMsg: Message = { role: "user", content };
    const updated = [...messages, userMsg];
    setMessages(updated);
    // clear input if it came from the typed field
    if (content === input) {
      setInput("");
    }

    // immediate step transitions on user actions
    const lc = content.trim().toLowerCase();
    if (/^portugu(es|ês)?$|^pt$|^english$|^en$/i.test(lc)) {
      setStepIfHigher(2);
      // Notify outer page about language choice so static intro can update
      try {
        if (typeof window !== "undefined") {
          if (/^portugu(es|ês)?$|^pt$/i.test(lc)) {
            window.dispatchEvent(new CustomEvent("language-changed", { detail: { lang: "pt" } }));
          } else if (/^english$|^en$/i.test(lc)) {
            window.dispatchEvent(new CustomEvent("language-changed", { detail: { lang: "en" } }));
          }
        }
      } catch {
        // ignore
      }
    }
    if (/^[a-d]$/i.test(content.trim())) {
      setStepIfHigher(4);
    }

    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updated }),
      });
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const data = await res.json();
      const assistantReply = data.reply ?? "";
      const marker: string | null = data.marker ?? null;
      setMessages([...updated, { role: "assistant", content: assistantReply }]);

      // Prefer deterministic marker if provided by server/model
      if (marker === "[COMPANY_DETAILS_REQUEST]") {
        setStepIfHigher(2);
      } else if (marker === "[OPTIONS_REQUEST]") {
        setStepIfHigher(3);
      } else if (marker === "[AWAITING_REQUEST]") {
        setStepIfHigher(4);
      } else if (marker === "[LOGISTICS_FINANCE_REQUEST]") {
        setStepIfHigher(5);
      } else if (marker === "[CONTACT_REQUEST]") {
        setStepIfHigher(6);
      } else {
        // Fallback heuristics (best-effort)
        const userCount = updated.filter((m) => m.role === "user").length;
        setStepIfHigher(getStepFromAssistantReply(assistantReply, userCount));
      }
    } catch (err) {
      console.error("sendMessage error:", err);
      setMessages((prev) => [...prev, { role: "assistant", content: "Sorry, something went wrong." }]);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (): Promise<void> => {
    await sendMessageWithContent(input);
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const id = setTimeout(() => {
      void startConversation();
    }, 0);

    return () => clearTimeout(id);
  }, [startConversation]);

  return (
    <div className="flex h-full min-h-0 w-full flex-col font-sans">
      <div className="chat-scroll flex-1 min-h-0 overflow-y-auto pr-1">
        {messages.map((m, i) => (
          <div key={i} className={`mb-5 flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            {m.role === "user" ? (
              <div className="max-w-[78%] rounded-3xl rounded-tr-md bg-slate-900 px-4 py-3 text-base leading-7 text-white shadow-sm">
                {m.content}
              </div>
            ) : (
              <div className="max-w-[78%] rounded-3xl rounded-tl-md border border-slate-200 bg-white px-4 py-3 text-base leading-7 text-slate-900 shadow-sm">
                {renderAssistantContent(m.content)}
              </div>
            )}
          </div>
        ))}
        {loading && (
          <p className="text-sm italic text-slate-400">Typing...</p>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="mt-8 mb-10 flex flex-wrap gap-3">
        {showLanguageOptions && (
          <>
            <button
              onClick={() => void sendMessageWithContent("Português")}
              className="rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-900 transition hover:border-slate-900"
            >
              Português
            </button>
            <button
              onClick={() => void sendMessageWithContent("English")}
              className="rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-900 transition hover:border-slate-900"
            >
              English
            </button>
          </>
        )}

        {showChoiceOptions && (
          <>
            <button
              onClick={() => void sendMessageWithContent("A")}
              className="rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-900 hover:text-slate-900"
            >
              {isPortugueseFlow ? "A) Conhecer os nossos serviços" : "A) Learn about our services"}
            </button>
            <button
              onClick={() => void sendMessageWithContent("B")}
              className="rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-900 hover:text-slate-900"
            >
              {isPortugueseFlow ? "B) Explorar uma ideia que tem" : "B) Explore an idea you have"}
            </button>
          </>
        )}
      </div>

      {showInput && (
        <div className="flex items-end gap-4 border-b border-slate-300 pb-3">
          <input
            value={input}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInput(e.target.value)}
            onKeyDown={(e: React.KeyboardEvent) => e.key === "Enter" && sendMessage()}
            placeholder="Write a reply..."
            className="flex-1 bg-transparent px-0 py-2 text-base text-slate-900 outline-none placeholder:text-slate-400"
          />
          <button
            onClick={sendMessage}
            className="text-2xl leading-none text-slate-900 transition hover:text-slate-600"
          >
            →
          </button>
        </div>
      )}

      <ol className="mt-10 flex w-full items-stretch gap-6 overflow-hidden px-0 py-0">
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isActive = currentStep === stepNumber;
          const isComplete = currentStep > stepNumber;
          const lineColor = isComplete || isActive ? "border-indigo-600" : "border-slate-200";
          const labelColor = isComplete || isActive ? "text-indigo-600" : "text-slate-400";
          const titleColor = isActive || isComplete ? "text-slate-900" : "text-slate-500";

          return (
            <li key={step.label} className="flex flex-1 items-stretch">
              <div className={`flex min-h-25 w-full flex-col border-t-2 pt-4 ${lineColor}`}>
                <span className={`text-sm font-medium leading-5 sm:text-base ${labelColor}`}>
                  {isEnglishFlow ? `Step ${stepNumber}` : `Passo ${stepNumber}`}
                </span>
                <h4 className={`text-base font-medium leading-6 sm:text-lg ${titleColor}`}>
                  {step.label}
                </h4>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
