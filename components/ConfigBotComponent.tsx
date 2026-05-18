"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useChatCache } from "./cacheOldChatsBotComponent";
import EnviarResumoBotComponent from "./EnviarResumoBotComponent";

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [documentFileInputRef, setDocumentFileInputRef] = useState<React.MutableRefObject<HTMLInputElement | null> | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [pdfUploadLoading, setPdfUploadLoading] = useState<boolean>(false);
  const [pdfFileName, setPdfFileName] = useState<string>("");
  const [pdfUploaded, setPdfUploaded] = useState<boolean>(false);
  const [currentChatId, setCurrentChatId] = useState<string>(`chat_${Date.now()}`);

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
  const showUploadButton = currentStep >= 4 && userChoice;

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
      // Route B: Show steps 1-4 (Language, Company, Options, Brainstorming)
      // Dynamically add step 5 and 6 as the conversation progresses
      const routeB = [
        ...baseSteps,
        { label: isEnglishFlow ? "Brainstorming" : "Brainstorming" },
      ];
      // Add step 5 when bot asks for logistics/finance
      if (currentStep >= 5) {
        routeB.push(steps[4]); // "Logistics & Finance" / "Logística e Finanças"
        // Also add step 6 as a preview so user knows it's coming next
        routeB.push(steps[5]); // "Contact" / "Contacto"
      }
      return routeB;
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
      const { messages, chatId } = event.detail;
      setMessages(messages);
      setInput("");
      setChatSaved(true); // Mark as saved initially
      setSavedMessageCount(messages.length); // Track the message count of the loaded chat
      
      // Set the chat ID so future saves update this chat, not create a new one
      if (chatId) {
        setCurrentChatId(chatId);
      }

      // Calculate the correct step based on the loaded conversation
      const lastAssistantMessage = messages
        .slice()
        .reverse()
        .find((m: Message) => m.role === "assistant");
      
      const userCount = messages.filter((m: Message) => m.role === "user").length;
      
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

  const handleDocumentAnalyzed = async (analysis: string, fileName: string): Promise<void> => {
    // Add the document analysis as a user message
    const userMsg: Message = { 
      role: "user", 
      content: `[PDF: ${fileName}]\n\n${analysis}` 
    };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setPdfUploadLoading(false);
    setPdfFileName("");
    setPdfUploaded(true);

    setLoading(true);
    try {
      // Send to bot for response, with context that a document was just analyzed
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
        // Fallback heuristics
        const userCount = updated.filter((m) => m.role === "user").length;
        setStepIfHigher(getStepFromAssistantReply(assistantReply, userCount));
      }
    } catch (err) {
      console.error("Document analysis response error:", err);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, something went wrong processing your document." },
      ]);
    } finally {
      setLoading(false);
    }
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
  const handleSaveChat = async (isAutoSave: boolean = false) => {
    if (messages.length === 0 || isSaving) return;
    
    setIsSaving(true);
    try {
      const title = await generateChatTitle(messages);
      saveChat(messages, title, currentChatId);
      setChatSaved(true);
      setSavedMessageCount(messages.length); // Track message count at save time
      
      // Only dispatch event for manual saves, not auto-save
      if (!isAutoSave && typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("chat-saved-success"));
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Auto-save chat when step exceeds 3 (after user chooses option A or B)
  useEffect(() => {
    const autoSaveChat = async () => {
      if (currentStep > 3 && messages.length > 0 && !chatSaved && !isSaving) {
        await handleSaveChat(true); // Pass true to indicate auto-save
      }
    };

    void autoSaveChat();
  }, [currentStep, messages.length, chatSaved, isSaving]);

  // Helper to check if message is a PDF upload and extract filename
  const getPdfFileName = (content: string): string | null => {
    const match = content.match(/^\[PDF: (.+?)\]/);
    return match ? match[1] : null;
  };

  return (
    <div className="flex h-full min-h-0 w-full flex-col font-sans">
      <div className="chat-scroll flex-1 min-h-0 overflow-y-auto pr-1">
        {messages.map((m, i) => {
          const pdfFileName = m.role === "user" ? getPdfFileName(m.content) : null;
          
          return (
          <div key={i} className={`mb-4 sm:mb-5 flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            {m.role === "user" ? (
              <div className="max-w-[85%] sm:max-w-[78%] rounded-3xl rounded-tr-md bg-slate-900 px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base leading-6 sm:leading-7 text-white shadow-sm">
                {pdfFileName ? (
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 3.414l4 4v10.586A2 2 0 0114 20H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H7a1 1 0 01-1-1v-6z" clipRule="evenodd" />
                    </svg>
                    <span className="truncate">{pdfFileName}</span>
                  </div>
                ) : (
                  m.content
                )}
              </div>
            ) : (
              <div className="max-w-[85%] sm:max-w-[78%] rounded-3xl rounded-tl-md border border-slate-200 bg-white px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base leading-6 sm:leading-7 text-slate-900 shadow-sm">
                {renderAssistantContent(m.content)}
              </div>
            )}
          </div>
        );
        })}
        {loading && (
          <div className="mb-4 sm:mb-5 flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "-0.3s" }} />
            <div className="h-2 w-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "-0.15s" }} />
            <div className="h-2 w-2 rounded-full bg-slate-400 animate-bounce" />
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="flex flex-col gap-3 border-t border-slate-200 pt-4 sm:pt-4 pb-3">
        {showLanguageOptions && (
          <div className="flex flex-wrap gap-2 sm:gap-3 px-1">
            <button
              onClick={() => void sendMessageWithContent("Português")}
              className="rounded-full border border-slate-300 bg-white px-3 sm:px-5 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-slate-900 transition hover:border-slate-900"
            >
              Português
            </button>
            <button
              onClick={() => void sendMessageWithContent("English")}
              className="rounded-full border border-slate-300 bg-white px-3 sm:px-5 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-slate-900 transition hover:border-slate-900"
            >
              English
            </button>
          </div>
        )}

        {showChoiceOptions && (
          <div className="flex flex-wrap gap-2 sm:gap-3 px-1">
            <button
              onClick={() => void sendMessageWithContent("A")}
              className="rounded-full border border-slate-300 bg-white px-3 sm:px-5 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-slate-700 transition hover:border-slate-900 hover:text-slate-900"
            >
              {isPortugueseFlow ? "A) Conhecer os nossos serviços" : "A) Learn about our services"}
            </button>
            <button
              onClick={() => void sendMessageWithContent("B")}
              className="rounded-full border border-slate-300 bg-white px-3 sm:px-5 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-slate-700 transition hover:border-slate-900 hover:text-slate-900"
            >
              {isPortugueseFlow ? "B) Explorar uma ideia que tem" : "B) Explore an idea you have"}
            </button>
          </div>
        )}

        <div className="px-1">
          <EnviarResumoBotComponent
            currentStep={currentStep}
            userChoice={userChoice}
            isEnglishFlow={isEnglishFlow}
            isPortugueseFlow={isPortugueseFlow}
            onDocumentAnalyzed={handleDocumentAnalyzed}
            isLoading={loading}
            onFileInputRef={setDocumentFileInputRef}
            onUploadLoadingChange={setPdfUploadLoading}
            pdfUploaded={pdfUploaded}
          />
        </div>
      </div>

      {pdfUploadLoading && (
        <div className="flex flex-col gap-3 px-1 py-4 sm:py-6 border-t border-slate-100 mb-3">
          <div className="text-sm sm:text-base text-slate-600 font-medium">
            {isPortugueseFlow ? "Processando PDF..." : "Processing PDF..."}
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
            <div 
              className="bg-indigo-600 h-full rounded-full animate-pulse"
              style={{width: '60%'}}
            ></div>
          </div>
        </div>
      )}

      {showInput && (
        <div className="flex items-center gap-2 sm:gap-3 border-b border-slate-300 px-1 pb-2 sm:pb-2 mt-4">
          {showUploadButton && (
            <button
              onClick={() => documentFileInputRef?.current?.click()}
              title={isPortugueseFlow ? "Enviar PDF" : "Upload PDF"}
              className="text-slate-400 transition hover:text-slate-600 shrink-0 flex items-center justify-center"
            >
              <img src="/clip-svgrepo-com.svg" alt="Clip" className="w-5 h-5" style={{filter: 'brightness(0.5)'}} />
            </button>
          )}
          <input
            value={input}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInput(e.target.value)}
            onKeyDown={(e: React.KeyboardEvent) => e.key === "Enter" && sendMessage()}
            placeholder="Write a reply..."
            className="flex-1 bg-transparent px-0 py-1 sm:py-1.5 text-xs sm:text-base text-slate-900 outline-none placeholder:text-slate-400"
          />
          <button
            onClick={sendMessage}
            className="text-slate-900 transition hover:text-slate-600 shrink-0"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </button>
        </div>
      )}

      <ol className="flex w-full items-stretch gap-2 sm:gap-4 overflow-hidden px-1 py-5 sm:py-8 border-t border-slate-200">
        {displayedSteps.map((step, index) => {
          const stepNumber = index + 1;
          const isActive = currentStep === stepNumber;
          const isComplete = currentStep > stepNumber;
          const lineColor = isComplete || isActive ? "border-indigo-600" : "border-slate-200";
          const labelColor = isComplete || isActive ? "text-indigo-600" : "text-slate-400";
          const titleColor = isActive || isComplete ? "text-slate-900" : "text-slate-500";
          
          const shouldAnimate = userChoice && stepNumber > 3;
          const animationClass = shouldAnimate ? "animate-in fade-in zoom-in-95 duration-700" : "";

          return (
            <li key={step.label} className={`flex flex-1 items-stretch ${animationClass}`}>
              <div className={`flex min-h-14 sm:min-h-24 w-full flex-col border-t-2 pt-3 sm:pt-4 px-1 sm:px-1 ${lineColor}`}>
                <span className={`text-sm sm:text-base font-semibold leading-4 sm:leading-5 ${labelColor}`}>
                  {isEnglishFlow ? `S${stepNumber}` : `P${stepNumber}`}
                </span>
                <h4 className={`hidden sm:block text-sm sm:text-lg font-semibold leading-5 sm:leading-6 ${titleColor} mt-3`}>
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
