"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import "iconify-icon";
import { useChatCache } from "./cacheOldChatsBotComponent";
import GerarResumoBotComponent from "./GerarResumoBotComponent";
import EnviarResumoBotComponent from "./EnviarResumoBotComponent";
import AttachmentDisplay from "./AttachmentDisplay";
import { FileAttachment } from "@/utils/attachments";

type Message = {
  role: "user" | "assistant";
  content: string;
  attachments?: FileAttachment[];
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
  const [fileUploadLoading, setFileUploadLoading] = useState<boolean>(false);
  const [fileUploaded, setFileUploaded] = useState<boolean>(false);
  const [currentChatId, setCurrentChatId] = useState<string>(`chat_${Date.now()}`);
  const [pendingAttachments, setPendingAttachments] = useState<FileAttachment[]>([]);
  const [menuOpen, setMenuOpen] = useState<boolean>(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [contactAsked, setContactAsked] = useState<boolean>(false);

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

  // DISPLAY DOS PASSOS DE ACORDO COM A ESCOLHA DO UTILIZADOR
  const getDisplayedSteps = () => {
    const baseSteps = steps.slice(0, 3);
    if (!userChoice) return baseSteps;
    if (userChoice === "A") return steps;
    if (userChoice === "B") {
      // SE FOR A ROTA B, MOSTRAR APENAS 2 RESULTADOS
      // SE O UTILIZADOR QUISER PROSSEGUIR COM A IDEIA PARA O TECHLAB, ADICIONAR ESTES 2
      const routeB = [
        ...baseSteps,
        { label: isEnglishFlow ? "Brainstorming" : "Brainstorming" },
      ];
      if (currentStep >= 5) {
        routeB.push(steps[4]); // "Logistics & Finance" / "Logística e Finanças"
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

  // INICIO DAS CONVERSAS: MANDAR MENSAGEM (NÃO MOSTRADA) DO UTILIZADOR PARA INICIAR O FLUXO DO BOT
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
      setCurrentStep(1);
      setChatSaved(false); 
      setSavedMessageCount(0); 
      if (marker === "[COMPANY_DETAILS_REQUEST]") setStepIfHigher(2);
    } catch (err) {
      console.error("startConversation error:", err);
      setMessages([{ role: "assistant", content: "Sorry, something went wrong." }]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const handleLoadCachedChat = (event: any) => {
      const { messages, chatId } = event.detail;
      setMessages(messages);
      setInput("");
      setChatSaved(true); 
      setSavedMessageCount(messages.length); 
      
      // VERIFICAÇÃO DO ID DO CHAT PARA NÃO SEREM CONSTANTEMENTE GERADAS NOVAS ENTRIES NO MODAL
      if (chatId) {
        setCurrentChatId(chatId);
      }

      const userMessages = messages.filter((m: Message) => m.role === "user");
      let detectedChoice: "A" | "B" | null = null;
      
      // DETECTAR SE O UTILIZADOR JÁ ESCOLHEU A ROTA A OU B NA CONVERSA SELECIONADA (CACHED) PARA AJUSTAR O STEP E AS OPÇÕES MOSTRADAS
      for (const msg of userMessages) {
        const content = msg.content.trim().toUpperCase();
        if (content === "A" || content === "B") {
          detectedChoice = content as "A" | "B";
          setUserChoice(content);
          break;
        }
      }

      // CALCULAR O PASSO CONSOANTE A MENSAGME
      const lastAssistantMessage = messages
        .slice()
        .reverse()
        .find((m: Message) => m.role === "assistant");
      
      const userCount = userMessages.length;
      
      // FALLBACK PARA DETECTAR O PASSO COM BASE NA ÚLTIMA MENSAGEM DO BOT E NO NÚMERO DE MENSAGENS DO UTILIZADOR, CASO NÃO SEJA POSSÍVEL DETECTAR A ESCOLHA DA ROTA (A OU B) DE FORMA DIRETA
      let calculatedStep = 1;
      if (detectedChoice) {
        if (lastAssistantMessage) {
          const detectsContact = /contacto|contato|contact|contact details|follow-up|email|telefone|telemóvel|phone/i.test(lastAssistantMessage.content);
          const detectsLogistics = /deadline|prazo|prazos|financ|orçamento|budget|equipa interna|internal team|timing|timeframe|schedule/i.test(lastAssistantMessage.content);
          
          if (detectsContact) {
            calculatedStep = 6;
          } else if (detectsLogistics) {
            calculatedStep = 5;
          } else {
            calculatedStep = 4;
          }
        } else {
          calculatedStep = 4;
        }
      } else {
        if (lastAssistantMessage) {
          calculatedStep = getStepFromAssistantReply(lastAssistantMessage.content, userCount);
        } else {
          calculatedStep = 1;
        }
      }

      setCurrentStep(calculatedStep);
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

  // Auto-save chat when step exceeds 3 (after user chooses option A or B)
  useEffect(() => {
    const autoSaveChat = async () => {
      if (currentStep > 3 && messages.length > 0 && !chatSaved && !isSaving) {
        await handleSaveChat(true); // Pass true to indicate auto-save
      }
    };

    void autoSaveChat();
  }, [currentStep, messages.length, chatSaved, isSaving]);

  const sendMessageWithContent = async (content: string, attachmentsToSend?: FileAttachment[]): Promise<void> => {
    if (!content.trim() && (!attachmentsToSend || attachmentsToSend.length === 0)) return;

    const attachments = attachmentsToSend || pendingAttachments;
    const userMsg: Message = { 
      role: "user", 
      content: content.trim() || (attachments.length > 0 ? "See attachments" : ""),
      attachments: attachments.length > 0 ? attachments : undefined,
    };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setPendingAttachments([]);
    setFileUploaded(false);
    
    // clear input if it came from the typed field
    if (content === input) {
      setInput("");
    }

    // Don't call API at step 6 - let the UI handle contact info and PDF generation
    if (currentStep === 6) {
      // First, check if we've already asked for contact info
      if (!contactAsked) {
        // Ask for contact information
        const askingContactMessage: Message = {
          role: "assistant",
          content: isPortugueseFlow 
            ? "Perfeito! Para finalizarmos, poderia fornecer os seus dados de contacto (nome, email, telefone)?"
            : "Perfect! To finalize, could you please provide your contact details (name, email, phone)?",
        };
        setMessages((prev) => [...prev, askingContactMessage]);
        setContactAsked(true);
        return; // Don't call API, wait for user to provide contact info
      }
      
      // After contact info is provided, ask for PDF generation
      if (!messages[messages.length - 1]?.content?.includes("Should I proceed") && !messages[messages.length - 1]?.content?.includes("Devo prosseguir")) {
        const askingMessage: Message = {
          role: "assistant",
          content: isPortugueseFlow 
            ? "Obrigado pelas informações de contacto! Tenho agora todos os detalhes da sua solicitação. Posso gerar um documento resumo com as informações da conversa. Devo prosseguir com a geração do documento?"
            : "Thank you for providing your contact information! I now have all the details about your request. I can generate a summary document with the information from our conversation. Should I proceed with generating the document?",
        };
        setMessages((prev) => [...prev, askingMessage]);
        return; // Don't call API
      }
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
    await sendMessageWithContent(input, pendingAttachments.length > 0 ? pendingAttachments : undefined);
  };

  const handleDocumentsAttached = async (attachments: FileAttachment[]): Promise<void> => {
    // Add attachments to pending attachments (don't send message yet)
    setPendingAttachments(attachments);
    setFileUploaded(true);
    setFileUploadLoading(false);
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
  const generateChatTitle = (chatMessages: Message[]): string => {
    try {
      const userMessages = chatMessages.filter((m) => m.role === "user");
      if (userMessages.length === 0) return "New Chat";

      // Check if user selected A or B
      let serviceType = "";
      for (const msg of userMessages) {
        const content = msg.content.trim().toUpperCase();
        if (content === "A") {
          serviceType = "Consultoria";
          break;
        } else if (content === "B") {
          serviceType = "Ideacao";
          break;
        }
      }

      // Find substantial user message - skip trivial ones
      // Filter out: single words, language selections, short generic responses
      const trivialPatterns = /^(a|b|sim|não|yes|no|english|portuguese|português|pt|en|ok|ok\.|obrigado|thanks|thank you|graças|please|por favor)$/i;
      const substantiveMessages = userMessages.filter(
        (m) => {
          const trimmed = m.content.trim();
          // Skip if too short or matches trivial pattern
          if (trimmed.length < 15 || trivialPatterns.test(trimmed)) {
            return false;
          }
          // Skip if it's mostly a question from the bot (contains mainly common question words)
          if (/^(what|como|qual|quais|pode|poderia|would|could|can you|pode|o que)/i.test(trimmed)) {
            return false;
          }
          return true;
        }
      );

      // If no substantial message found, try to use any non-trivial message
      let titleMessage = substantiveMessages[0]?.content || 
                        userMessages.find(m => {
                          const trimmed = m.content.trim();
                          return trimmed.length > 5 && !trivialPatterns.test(trimmed);
                        })?.content ||
                        "";

      if (!titleMessage) {
        return serviceType || "New Chat";
      }

      // Extract first sentence or first 50 characters
      let titleBase = titleMessage.split(/[.!?]/)[0].trim();
      
      // If still too long or empty, truncate to first words
      if (!titleBase || titleBase.length > 45) {
        const words = titleMessage.split(" ");
        titleBase = words.slice(0, 8).join(" ");
      }

      // Limit to 45 chars and add ellipsis if truncated
      if (titleBase.length > 45) {
        titleBase = titleBase.substring(0, 42) + "...";
      }

      // Combine with service type if available
      if (serviceType && titleBase.length > 0) {
        const combined = `${serviceType} - ${titleBase}`;
        if (combined.length > 55) {
          return `${serviceType} - ...`;
        }
        return combined;
      }

      return titleBase || serviceType || "New Chat";
    } catch {
      return "New Chat";
    }
  };

  // Manual save function
  const handleSaveChat = async (isAutoSave: boolean = false) => {
    if (messages.length === 0 || isSaving) return;
    
    setIsSaving(true);
    try {
      const title = generateChatTitle(messages);
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

  // Reset chat function
  const handleResetChat = async () => {
    setMenuOpen(false);
    
    // Save current chat if it has content
    if (messages.length > 1) {
      await handleSaveChat(false);
    }

    // Reset state
    setMessages([]);
    setCurrentStep(1);
    setInput("");
    setUserChoice(null);
    setPendingAttachments([]);
    setFileUploaded(false);
    setChatSaved(false);
    setSavedMessageCount(0);
    setCurrentChatId(`chat_${Date.now()}`);
    setContactAsked(false);

    // Start new conversation
    void startConversation();
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  return (
    <div className="flex h-full min-h-0 w-full flex-col font-sans">
      <div className="chat-scroll flex-1 min-h-0 overflow-y-auto pr-1">
        {messages.map((m, i) => {
          return (
          <div key={i} className={`mb-4 sm:mb-5 flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            {m.role === "user" ? (
              <div className="max-w-[85%] sm:max-w-[78%] flex flex-col gap-2">
                {m.attachments && m.attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 justify-end">
                    {m.attachments.map((att) => (
                      <div key={att.id} className="bg-white rounded-lg border border-slate-200 overflow-hidden max-w-[200px]">
                        {att.type === "image" ? (
                          <img
                            src={`data:${att.mimeType};base64,${att.base64Data}`}
                            alt={att.fileName}
                            className="max-w-full max-h-[200px] object-cover rounded-lg"
                          />
                        ) : (
                          <div className="flex items-center gap-2 px-3 py-2 text-sm">
                            <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 3.414l4 4v10.586A2 2 0 0114 20H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H7a1 1 0 01-1-1v-6z" clipRule="evenodd" />
                            </svg>
                            <span className="truncate text-slate-900 font-medium">{att.fileName}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {m.content && m.content !== "See attachments" && (
                  <div className="rounded-3xl rounded-tr-md bg-slate-900 px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base leading-6 sm:leading-7 text-white shadow-sm">
                    {m.content}
                  </div>
                )}
              </div>
            ) : (
              <div className="max-w-[85%] sm:max-w-[78%]">
                {m.content.includes("[SUMMARY_PDF]") ? (
                  <div className="rounded-3xl rounded-tl-md border border-slate-200 bg-white px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base leading-6 sm:leading-7 text-slate-900 shadow-sm flex flex-col gap-2">
                    <p>{m.content.replace("[SUMMARY_PDF]", "").trim()}</p>
                    <GerarResumoBotComponent 
                      messages={messages} 
                      isPortugueseFlow={isPortugueseFlow}
                    />
                  </div>
                ) : (m.content.includes("Should I proceed with generating") || m.content.includes("Devo prosseguir com a gera")) ? (
                  <div className="rounded-3xl rounded-tl-md border border-slate-200 bg-white px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base leading-6 sm:leading-7 text-slate-900 shadow-sm flex flex-col gap-2">
                    <p>{m.content}</p>
                    <GerarResumoBotComponent 
                      messages={messages} 
                      isPortugueseFlow={isPortugueseFlow}
                      showConfirmation={true}
                      onAddMessage={(msg: Message) => setMessages((prev) => [...prev, msg])}
                    />
                  </div>
                ) : (
                  <div className="rounded-3xl rounded-tl-md border border-slate-200 bg-white px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base leading-6 sm:leading-7 text-slate-900 shadow-sm">
                    {renderAssistantContent(m.content)}
                  </div>
                )}
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
            onDocumentsAnalyzed={handleDocumentsAttached}
            isLoading={loading}
            onFileInputRef={setDocumentFileInputRef}
            onUploadLoadingChange={setFileUploadLoading}
            fileUploaded={fileUploaded}
            userMessageCount={messages.filter((m) => m.role === "user").length}
          />
        </div>
      </div>

      {fileUploadLoading && (
        <div className="flex flex-col gap-3 px-1 py-4 sm:py-6 border-t border-slate-100 mb-3">
          <div className="text-sm sm:text-base text-slate-600 font-medium">
            {isPortugueseFlow ? "A processar ficheiro..." : "Processing file..."}
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
        <div className="flex flex-col gap-0 border-t border-slate-300 mt-4">
          <AttachmentDisplay
            attachments={pendingAttachments}
            onRemove={(id) => setPendingAttachments(pendingAttachments.filter((a) => a.id !== id))}
            isDisabled={loading || fileUploadLoading}
          />
          <div className="flex items-center gap-2 sm:gap-3 px-1 py-2 sm:py-2">
            {showUploadButton && (
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  title={isPortugueseFlow ? "Opções" : "Options"}
                  className="text-slate-400 transition hover:text-slate-600 shrink-0 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed w-6 h-6 rounded hover:bg-slate-100"
                  disabled={loading || fileUploadLoading}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>

                {/* Menu dropdown */}
                {menuOpen && (
                  <div className="absolute bottom-full mb-2 left-0 bg-white border border-slate-200 rounded-lg shadow-lg z-50 min-w-max">
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        documentFileInputRef?.current?.click();
                      }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-900 hover:bg-slate-100 rounded-t-lg transition"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      {isPortugueseFlow ? "Enviar ficheiro ou imagem" : "Send file or image"}
                    </button>
                    <button
                      onClick={handleResetChat}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-b-lg transition border-t border-slate-100"
                      disabled={loading}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      {isPortugueseFlow ? "Resetar conversa" : "Reset chat"}
                    </button>
                  </div>
                )}
              </div>
            )}
            <input
              value={input}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInput(e.target.value)}
              onKeyDown={(e: React.KeyboardEvent) => e.key === "Enter" && sendMessage()}
              placeholder={pendingAttachments.length > 0 ? "Add a message (optional)..." : "Write a reply..."}
              className="flex-1 bg-transparent px-0 py-1 sm:py-1.5 text-xs sm:text-base text-slate-900 outline-none placeholder:text-slate-400"
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() && pendingAttachments.length === 0}
              className="text-slate-900 transition hover:text-slate-600 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </button>
          </div>
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
