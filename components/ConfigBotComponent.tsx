"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useChatCache } from "./cacheOldChatsBotComponent";

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
  const { saveChat } = useChatCache();
  const [chatSaved, setChatSaved] = useState<boolean>(false);
  const [savedMessageCount, setSavedMessageCount] = useState<number>(0);
  const [userChoice, setUserChoice] = useState<"A" | "B" | null>(null);

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

  // DURANTE AS OPÇÕES E PEDIDO, ESCONDER INPUT PARA FORÇAR CLIQUE (EVITA RESPOSTAS LIVRES NESSA FASE)
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

  // Get the steps that should be displayed based on user choice
  const getDisplayedSteps = () => {
    const baseSteps = steps.slice(0, 3);
    if (!userChoice) return baseSteps;
    if (userChoice === "A") return steps;
    if (userChoice === "B") {
      return [
        ...baseSteps,
        { label: isEnglishFlow ? "Brainstorming" : "Brainstorming" },
      ];
    }
    return baseSteps;
  };

  const displayedSteps = getDisplayedSteps();

      // FORMATAÇÃO DE TEXTO DO BOT
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

  // RENDERIZAÇÃO DO TEXTO DO BOT PARA BOLD E LISTAS
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
      setChatSaved(false); // Allow saving new conversations
      setSavedMessageCount(0); // Reset saved message count
      // If model unexpectedly requests company details immediately, honor marker
      if (marker === "[COMPANY_DETAILS_REQUEST]") setStepIfHigher(2);
    } catch (err) {
      console.error("startConversation error:", err);
      setMessages([{ role: "assistant", content: "Sorry, something went wrong." }]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Listen for cached chat load events
  useEffect(() => {
    const handleLoadCachedChat = (event: any) => {
      const { messages } = event.detail;
      setMessages(messages);
      setInput("");
      setChatSaved(true); // Mark as saved initially
      setSavedMessageCount(messages.length); // Track the message count of the loaded chat

      // Calculate the correct step based on the loaded conversation
      const lastAssistantMessage = messages
        .slice()
        .reverse()
        .find((m) => m.role === "assistant");
      
      const userCount = messages.filter((m) => m.role === "user").length;
      
      if (lastAssistantMessage) {
        const calculatedStep = getStepFromAssistantReply(lastAssistantMessage.content, userCount);
        setCurrentStep(calculatedStep);
      } else {
        setCurrentStep(4); // Default to step 4 if no assistant message
      }
    };

    window.addEventListener("load-cached-chat", handleLoadCachedChat);
    return () => window.removeEventListener("load-cached-chat", handleLoadCachedChat);
  }, []);

  // Reset chatSaved when messages change (allows re-saving after saving)
  useEffect(() => {
    if (chatSaved && messages.length > savedMessageCount) {
      // New messages have been added after saving, allow re-saving
      setChatSaved(false);
    }
  }, [messages.length, chatSaved, savedMessageCount]);

  // Notify parent about chat state changes
  useEffect(() => {
    const hasMessages = messages.length > 1;
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("chat-state-changed", {
          detail: {
            hasMessages,
            isSaved: chatSaved,
            savedMessageCount,
          },
        })
      );
    }
  }, [messages.length, chatSaved, savedMessageCount]);

  // Warn user before leaving page if there are unsaved messages
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const hasUnsavedMessages = messages.length > 1 && !chatSaved;
      if (hasUnsavedMessages) {
        e.preventDefault();
        e.returnValue = "";
        return "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [messages.length, chatSaved]);

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
      const choice = content.trim().toUpperCase() as "A" | "B";
      setUserChoice(choice);
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

  // Generate title from chat content
  const generateChatTitle = async (chatMessages: Message[]): Promise<string> => {
    try {
      const userMessages = chatMessages.filter((m) => m.role === "user");
      if (userMessages.length === 0) return "New Chat";

      // Use the first user message as a basis for the title
      const firstUserMessage = userMessages[0].content;
      const firstWords = firstUserMessage.split(" ").slice(0, 5).join(" ");
      
      // Try to get AI to generate a better title
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [
              {
                role: "user",
                content: `Generate a short, concise title (3-6 words) for a chat that starts with: "${firstUserMessage}". Only respond with the title, nothing else.`,
              },
            ],
          }),
        });
        if (res.ok) {
          const data = await res.json();
          const title = data.reply?.trim() || firstWords;
          return title.substring(0, 50); // Limit to 50 chars
        }
      } catch {
        // Fallback to first message words
      }

      return firstWords.substring(0, 50);
    } catch {
      return "New Chat";
    }
  };

  // Manual save function
  const handleSaveChat = async () => {
    if (messages.length === 0) return;
    
    const title = await generateChatTitle(messages);
    saveChat(messages, title);
    setChatSaved(true);
    setSavedMessageCount(messages.length); // Track message count at save time
    
    // Dispatch event to show notification
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("chat-saved-success"));
    }
  };

  // Listen for save chat event from header
  useEffect(() => {
    const handleSaveEvent = () => {
      void handleSaveChat();
    };

    window.addEventListener("save-current-chat", handleSaveEvent);
    return () => window.removeEventListener("save-current-chat", handleSaveEvent);
  }, [messages]);

  // Auto-save chat when step exceeds 3
  useEffect(() => {
    const autoSaveChat = async () => {
      if (currentStep > 3 && messages.length > 0 && !chatSaved) {
        await handleSaveChat();
      }
    };

    void autoSaveChat();
  }, [currentStep, messages.length, chatSaved, handleSaveChat]);

  return (
    <div className="flex h-full min-h-0 w-full flex-col font-sans">
      <div className="chat-scroll flex-1 min-h-0 overflow-y-auto pr-1">
        {messages.map((m, i) => (
          <div key={i} className={`mb-2 sm:mb-4 flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            {m.role === "user" ? (
              <div className="max-w-[85%] sm:max-w-[78%] rounded-3xl rounded-tr-md bg-slate-900 px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base leading-6 sm:leading-7 text-white shadow-sm">
                {m.content}
              </div>
            ) : (
              <div className="max-w-[85%] sm:max-w-[78%] rounded-3xl rounded-tl-md border border-slate-200 bg-white px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base leading-6 sm:leading-7 text-slate-900 shadow-sm">
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

      <div className="mt-3 sm:mt-8 mb-6 sm:mb-10 flex flex-wrap gap-2 sm:gap-3">
        {showLanguageOptions && (
          <>
            <button
              onClick={() => void sendMessageWithContent("Português")}
              className="rounded-full border border-slate-300 bg-white px-2 sm:px-5 py-1.5 sm:py-2.5 text-xs sm:text-sm font-medium text-slate-900 transition hover:border-slate-900"
            >
              Português
            </button>
            <button
              onClick={() => void sendMessageWithContent("English")}
              className="rounded-full border border-slate-300 bg-white px-2 sm:px-5 py-1.5 sm:py-2.5 text-xs sm:text-sm font-medium text-slate-900 transition hover:border-slate-900"
            >
              English
            </button>
          </>
        )}

        {showChoiceOptions && (
          <>
            <button
              onClick={() => void sendMessageWithContent("A")}
              className="rounded-full border border-slate-300 bg-white px-2 sm:px-5 py-1.5 sm:py-2.5 text-xs sm:text-sm font-medium text-slate-700 transition hover:border-slate-900 hover:text-slate-900"
            >
              {isPortugueseFlow ? "A) Conhecer os nossos serviços" : "A) Learn about our services"}
            </button>
            <button
              onClick={() => void sendMessageWithContent("B")}
              className="rounded-full border border-slate-300 bg-white px-2 sm:px-5 py-1.5 sm:py-2.5 text-xs sm:text-sm font-medium text-slate-700 transition hover:border-slate-900 hover:text-slate-900"
            >
              {isPortugueseFlow ? "B) Explorar uma ideia que tem" : "B) Explore an idea you have"}
            </button>
          </>
        )}
      </div>

      {showInput && (
        <div className="flex items-end gap-2 sm:gap-4 border-b border-slate-300 pb-2 sm:pb-3">
          <input
            value={input}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInput(e.target.value)}
            onKeyDown={(e: React.KeyboardEvent) => e.key === "Enter" && sendMessage()}
            placeholder="Write a reply..."
            className="flex-1 bg-transparent px-0 py-1 sm:py-2 text-xs sm:text-base text-slate-900 outline-none placeholder:text-slate-400"
          />
          <button
            onClick={sendMessage}
            className="text-lg sm:text-2xl leading-none text-slate-900 transition hover:text-slate-600 pb-0.5 sm:pb-1"
          >
            →
          </button>
        </div>
      )}

      <ol className="mt-3 sm:mt-10 flex w-full items-stretch gap-1.5 sm:gap-6 overflow-hidden px-0 py-0">
        {displayedSteps.map((step, index) => {
          const stepNumber = index + 1;
          const isActive = currentStep === stepNumber;
          const isComplete = currentStep > stepNumber;
          const lineColor = isComplete || isActive ? "border-indigo-600" : "border-slate-200";
          const labelColor = isComplete || isActive ? "text-indigo-600" : "text-slate-400";
          const titleColor = isActive || isComplete ? "text-slate-900" : "text-slate-500";
          
          // Add animation for steps that appear after choice
          const shouldAnimate = userChoice && stepNumber > 3;
          const animationClass = shouldAnimate ? "animate-in fade-in zoom-in-95 duration-700" : "";

          return (
            <li key={step.label} className={`flex flex-1 items-stretch ${animationClass}`}>
              <div className={`flex min-h-12 sm:min-h-25 w-full flex-col border-t-2 pt-1 sm:pt-4 px-0.5 sm:px-0 ${lineColor}`}>
                <span className={`text-xs sm:text-sm font-medium leading-3 sm:leading-5 ${labelColor}`}>
                  {isEnglishFlow ? `S${stepNumber}` : `P${stepNumber}`}
                </span>
                <h4 className={`hidden sm:block text-sm sm:text-base md:text-lg font-medium leading-5 sm:leading-6 ${titleColor}`}>
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
