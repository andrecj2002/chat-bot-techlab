"use client";
import { useState, useEffect } from "react";
import "iconify-icon";

export type CachedChat = {
  id: string;
  timestamp: number;
  title: string;
  messages: {
    role: "user" | "assistant";
    content: string;
    attachments?: {
      id: string;
      type: "pdf" | "image";
      fileName: string;
      base64Data: string;
      mimeType: string;
      size: number;
    }[];
  }[];
  isPermanent?: boolean;
  hasPDF?: boolean;
  extractedData?: {
    empresa: string;
    servico: string;
    contexto: string;
    prazoSolicitado: string;
    requisitoEspecificos: string;
    equipa: string;
    financiamento: string;
    contacto: string;
  };
};

interface CacheOldChatsBotComponentProps {
  onLoadChat: (messages: CachedChat["messages"]) => void;
}

export default function CacheOldChatsBotComponent({ onLoadChat }: CacheOldChatsBotComponentProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [cachedChats, setCachedChats] = useState<CachedChat[]>([]);
  const [loading, setLoading] = useState(false);
  const [language, setLanguage] = useState<"pt" | "en">("pt");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // FILTRO E ORDENAÇÃO DE CONVERSAS GUARDADAS
  const getFilteredAndSortedChats = (allChats: CachedChat[]): CachedChat[] => {
    const now = Date.now();
    const fortyEightHoursAgo = now - 48 * 60 * 60 * 1000;

    // Filter: keep chats from last 48 hours OR permanently saved chats
    const filteredChats = allChats.filter((chat) => chat.timestamp >= fortyEightHoursAgo || chat.isPermanent);

    // Sort: pinned chats first (descending), then by timestamp descending (newest first)
    filteredChats.sort((a, b) => {
      if (a.isPermanent && !b.isPermanent) return -1;
      if (!a.isPermanent && b.isPermanent) return 1;
      return b.timestamp - a.timestamp;
    });

    return filteredChats;
  };

  // CARREGAMENTO DE CONVERSAS GUARDADAS
  const loadCachedChats = () => {
    setLoading(true);
    try {
      const stored = localStorage.getItem("chatbot_cache");
      if (stored) {
        const allChats: CachedChat[] = JSON.parse(stored);
        const filteredChats = getFilteredAndSortedChats(allChats);
        setCachedChats(filteredChats);
      }
    } catch (error) {
      console.error("Error loading cached chats:", error);
    } finally {
      setLoading(false);
    }
  };

  // CARREGAMENTO DE CONVERSAS AO ABRIR MODAL
  useEffect(() => {
    if (isOpen) {
      loadCachedChats();
    }
  }, [isOpen]);

  // DETECÇÃO DE ALTERAÇÕES DE IDIOMA
  useEffect(() => {
    const handleLanguageChange = (event: any) => {
      setLanguage(event.detail?.lang || "pt");
    };

    window.addEventListener("language-changed", handleLanguageChange);
    return () => window.removeEventListener("language-changed", handleLanguageChange);
  }, []);

  // MANIPULADOR DE CARREGAMENTO DE CONVERSA
  const handleLoadChat = (chat: CachedChat) => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("load-cached-chat", {
          detail: { messages: chat.messages, chatId: chat.id, extractedData: chat.extractedData },
        })
      );
    }
    setIsOpen(false);
  };

  // LIMPEZA DO HISTÓRICO DE CONVERSAS
  const clearHistory = () => {
    const confirmMessage = language === "pt" 
      ? "Tem a certeza de que deseja eliminar todas as conversas (exceto as guardadas permanentemente)? Esta ação não pode ser desfeita."
      : "Are you sure you want to delete all chats except permanently saved ones? This cannot be undone.";
    
    if (confirm(confirmMessage)) {
      try {
        const stored = localStorage.getItem("chatbot_cache") || "[]";
        let allChats: CachedChat[] = JSON.parse(stored);
        // Keep only permanently saved chats
        allChats = allChats.filter((chat) => chat.isPermanent);
        localStorage.setItem("chatbot_cache", JSON.stringify(allChats));
        const filteredChats = getFilteredAndSortedChats(allChats);
        setCachedChats(filteredChats);
      } catch (error) {
        console.error("Error clearing cache:", error);
      }
    }
  };

  // ALTERNÂNCIA DE ESTADO PERMANENTE DE CONVERSA
  const togglePermanent = (chatId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    try {
      const stored = localStorage.getItem("chatbot_cache") || "[]";
      const allChats: CachedChat[] = JSON.parse(stored);
      const chatIndex = allChats.findIndex((c) => c.id === chatId);
      
      if (chatIndex !== -1) {
        allChats[chatIndex].isPermanent = !allChats[chatIndex].isPermanent;
        localStorage.setItem("chatbot_cache", JSON.stringify(allChats));
        const filteredChats = getFilteredAndSortedChats(allChats);
        setCachedChats(filteredChats);
        setOpenMenuId(null);
      }
    } catch (error) {
      console.error("Error toggling permanent status:", error);
    }
  };

  // ELIMINAÇÃO DE CONVERSA
  const deleteChat = (chatId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    const confirmMessage = language === "pt" 
      ? "Tem a certeza de que deseja eliminar esta conversa?"
      : "Are you sure you want to delete this chat?";
    
    if (confirm(confirmMessage)) {
      try {
        const stored = localStorage.getItem("chatbot_cache") || "[]";
        let allChats: CachedChat[] = JSON.parse(stored);
        allChats = allChats.filter((c) => c.id !== chatId);
        localStorage.setItem("chatbot_cache", JSON.stringify(allChats));
        const filteredChats = getFilteredAndSortedChats(allChats);
        setCachedChats(filteredChats);
        setOpenMenuId(null);
      } catch (error) {
        console.error("Error deleting chat:", error);
      }
    }
  };

  // DOWNLOAD DE PDF DE CONVERSA GUARDADA
  const downloadPDF = async (chat: CachedChat, event: React.MouseEvent) => {
    event.stopPropagation();
    try {
      // DADOS EXTRAÍDOS GUARDADOS OU FALLBACK
      let extractedData = chat.extractedData;

      if (!extractedData) {
        extractedData = {
          empresa: chat.title || "Document",
          servico: "Não especificado",
          contexto: "Não especificado",
          prazoSolicitado: "Não especificado",
          requisitoEspecificos: "Não especificado",
          equipa: "Não especificado",
          financiamento: "Não especificado",
          contacto: "Não especificado",
        };
      }

      // GERAÇÃO DO PDF
      const jsPDF = (await import("jspdf")).jsPDF;
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      // DEFINIÇÃO DE FONTES
      pdf.setFont("Helvetica", "bold");
      pdf.setFontSize(16);
      pdf.text("pci · creative science park tech lab", 105, 20, { align: "center" });

      pdf.setFont("Helvetica", "bold");
      pdf.setFontSize(14);
      pdf.text(language === "pt" ? "Resumo Gerado pelo Chatbot" : "Summary Generated by Chat-bot", 105, 30, { align: "center" });

      pdf.setFont("Helvetica", "normal");
      pdf.setFontSize(12);
      pdf.text(
        `${language === "pt" ? "Pedido de" : "Request from"} ${extractedData.empresa}`,
        105,
        38,
        { align: "center" }
      );

      // DADOS DA TABELA
      const rows = [
        {
          categoria: language === "pt" ? "Serviço" : "Service",
          descricao: extractedData.servico || (language === "pt" ? "Não especificado" : "Not specified"),
        },
        {
          categoria: language === "pt" ? "Contexto" : "Context",
          descricao: extractedData.contexto || (language === "pt" ? "Não especificado" : "Not specified"),
        },
        {
          categoria: language === "pt" ? "Prazo Solicitado" : "Requested Timeline",
          descricao: extractedData.prazoSolicitado || (language === "pt" ? "Não especificado" : "Not specified"),
        },
        {
          categoria: language === "pt" ? "Requisitos Específicos" : "Specific Requirements",
          descricao: extractedData.requisitoEspecificos || (language === "pt" ? "Não especificado" : "Not specified"),
        },
        {
          categoria: language === "pt" ? "Equipa" : "Team",
          descricao: extractedData.equipa || (language === "pt" ? "Não especificado" : "Not specified"),
        },
        {
          categoria: language === "pt" ? "Financiamento" : "Financing",
          descricao: extractedData.financiamento || (language === "pt" ? "Não especificado" : "Not specified"),
        },
        {
          categoria: language === "pt" ? "Contacto" : "Contact",
          descricao: extractedData.contacto || (language === "pt" ? "Não especificado" : "Not specified"),
        },
      ];

      // FORMATAÇÃO DA TABELA
      let currentY = 50;

      // CABÉALHO
      pdf.setFont("Helvetica", "bold");
      pdf.setFontSize(10);
      pdf.text(language === "pt" ? "Categoria" : "Category", 15, currentY + 8);
      pdf.text(language === "pt" ? "Descrição" : "Description", 70, currentY + 8);
      pdf.line(15, currentY + 12, 200, currentY + 12);
      currentY += 20;

      // LINHAS
      pdf.setFont("Helvetica", "normal");
      pdf.setFontSize(9);
      rows.forEach((row) => {
        if (currentY > 270) {
          pdf.addPage();
          currentY = 20;
        }

        pdf.text(row.categoria, 15, currentY);
        const descriptionLines = pdf.splitTextToSize(row.descricao, 130);
        pdf.text(descriptionLines, 70, currentY);

        const cellHeight = Math.max(10, descriptionLines.length * 6);
        currentY += cellHeight + 5;

        pdf.line(15, currentY - 5, 200, currentY - 5);
      });

      pdf.save(`resumo_${extractedData.empresa}.pdf`);
      setOpenMenuId(null);
    } catch (error) {
      console.error("Error downloading PDF:", error);
      alert(language === "pt" ? "Erro ao gerar PDF" : "Error generating PDF");
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (language === "pt") {
      if (diffMins < 1) return "agora";
      if (diffMins < 60) return `${diffMins}m atrás`;
      if (diffHours < 24) return `${diffHours}h atrás`;
      if (diffDays === 1) return "ontem";
      return date.toLocaleDateString("pt-PT");
    } else {
      if (diffMins < 1) return "just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays === 1) return "yesterday";
      return date.toLocaleDateString("en-US");
    }
  };

  const getChatPreview = (messages: CachedChat["messages"]) => {
    const userMessages = messages.filter((m) => m.role === "user");
    if (userMessages.length === 0) return "No messages";
    const lastUserMessage = userMessages[userMessages.length - 1];
    return lastUserMessage.content.substring(0, 50) + (lastUserMessage.content.length > 50 ? "..." : "");
  };

  const getMessageCount = (messages: CachedChat["messages"]) => {
    return messages.length;
  };

  return (
    <>
      {/* Button to open modal */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1 sm:gap-2 rounded-full border border-slate-300 bg-white px-2 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-slate-900 transition hover:border-slate-900 hover:bg-slate-50"
        title={language === "pt" ? "Ver últimas conversas (últimas 48 horas)" : "View chats from last 48 hours"}
      >
        <svg className="h-3 sm:h-5 w-3 sm:w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7m18 0a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1m18 0-7.72 6.433a2 2 0 0 1-2.56 0L3 7"/></svg>
        {language === "pt" ? "Últimas Conversas" : "Latest Chats"}
      </button>

      {/* Modal overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-2 sm:p-4"
          onClick={() => setIsOpen(false)}
        >
          <div 
            className="h-[70vh] sm:h-[60vh] w-full max-w-4xl rounded-lg bg-white shadow-lg flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between border-b border-slate-200 px-3 sm:px-6 py-2 sm:py-4">
              <h2 className="text-sm sm:text-lg font-semibold text-slate-900">
                {language === "pt" ? "Últimas Conversas" : "Latest Chats"}
              </h2>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-full p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
              >
                {/* @ts-expect-error - Web component type not recognized */}
                <iconify-icon
                  icon="mdi:close"
                  width="24"
                  height="24"
                  style={{ display: 'inline-block' }}
                />
              </button>
            </div>

            {/* Modal content */}
            <div className="flex-1 min-h-0 overflow-y-auto px-3 sm:px-6 py-2 sm:py-4">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-sm text-slate-500">{language === "pt" ? "A carregar conversas..." : "Loading chats..."}</p>
                </div>
              ) : cachedChats.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-sm text-slate-500">
                    {language === "pt" ? "Nenhuma conversa nos últimos 48 horas" : "No chats from the last 48 hours"}
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5 sm:space-y-3">
                  {cachedChats.map((chat) => (
                    <div key={chat.id} className="relative">
                      <div
                        onClick={() => handleLoadChat(chat)}
                        className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 sm:p-3 text-left transition hover:bg-slate-100 hover:border-slate-300 cursor-pointer flex items-start justify-between gap-2"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="text-xs sm:text-sm font-medium text-slate-900 truncate flex items-center gap-1.5">
                            {chat.title}
                            {chat.isPermanent && (
                              <>
                                {/* @ts-expect-error - Web component type not recognized */}
                                <iconify-icon
                                  icon="mdi:pin"
                                  width="16"
                                  height="16"
                                  title={language === "pt" ? "Guardado permanentemente" : "Permanently saved"}
                                  style={{ display: 'inline-block', flexShrink: 0 }}
                                />
                              </>
                            )}
                            {chat.hasPDF && (
                              <>
                                {/* @ts-expect-error - Web component type not recognized */}
                                <iconify-icon
                                  icon="mdi:file-pdf"
                                  width="16"
                                  height="16"
                                  title={language === "pt" ? "PDF gerado" : "PDF generated"}
                                  style={{ display: 'inline-block', flexShrink: 0 }}
                                />
                              </>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5 sm:mt-1 flex justify-between">
                            <span>{getMessageCount(chat.messages)} {language === "pt" ? "mensagens" : "messages"}</span>
                            <span>{formatDate(chat.timestamp)}</span>
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId(openMenuId === chat.id ? null : chat.id);
                          }}
                          className="flex-shrink-0 p-2 rounded-lg hover:bg-slate-300 transition text-slate-600 hover:text-slate-900"
                          title={language === "pt" ? "Opções" : "Options"}
                        >
                          {/* @ts-expect-error - Web component type not recognized */}
                          <iconify-icon
                            icon="mdi:dots-vertical"
                            width="20"
                            height="20"
                            style={{ display: 'inline-block' }}
                          />
                        </button>
                      </div>

                      {/* Dropdown menu */}
                      {openMenuId === chat.id && (
                        <div className="absolute right-1 sm:right-2 top-full mt-2 bg-white border border-slate-300 rounded-lg shadow-xl z-50 min-w-48">
                          <button
                            onClick={(e) => togglePermanent(chat.id, e)}
                            className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-100 transition rounded-t-lg flex items-center gap-3"
                          >
                            {/* @ts-expect-error - Web component type not recognized */}
                            <iconify-icon
                              icon="mdi:pin"
                              width="18"
                              height="18"
                              style={{ display: 'inline-block', flexShrink: 0 }}
                            />
                            {chat.isPermanent 
                              ? (language === "pt" ? "Remover de guardados" : "Remove from saved")
                              : (language === "pt" ? "Guardar permanentemente" : "Save permanently")}
                          </button>
                          {chat.hasPDF && (
                            <>
                              <div className="border-t border-slate-100"></div>
                              <button
                                onClick={(e) => downloadPDF(chat, e)}
                                className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-100 transition flex items-center gap-3"
                              >
                                {/* @ts-expect-error - Web component type not recognized */}
                                <iconify-icon
                                  icon="mdi:file-pdf"
                                  width="18"
                                  height="18"
                                  style={{ display: 'inline-block', flexShrink: 0 }}
                                />
                                  {language === "pt" ? "Descarregar PDF" : "Download PDF"}
                              </button>
                            </>
                          )}
                          <div className="border-t border-slate-100"></div>
                          <button
                            onClick={(e) => deleteChat(chat.id, e)}
                            className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition last:rounded-b-lg flex items-center gap-3"
                          >
                            {/* @ts-expect-error - Web component type not recognized */}
                            <iconify-icon
                              icon="mdi:delete"
                              width="18"
                              height="18"
                              style={{ display: 'inline-block', flexShrink: 0 }}
                            />
                            {language === "pt" ? "Eliminar" : "Delete"}
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal footer */}
            {cachedChats.length > 0 && (
              <div className="border-t border-slate-200 px-3 sm:px-6 py-2 sm:py-3 flex justify-end">
                <button
                  onClick={clearHistory}
                  className="text-xs sm:text-sm text-red-600 hover:text-red-700 hover:underline transition font-medium"
                >
                  {language === "pt" ? "Limpar Histórico" : "Clear History"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Export saveChat function for use in parent component */}
      {/* We'll use a custom hook or context for this */}
    </>
  );
}

// Hook to use cache functionality
export function useChatCache() {
  const saveChat = (messages: CachedChat["messages"], title: string, chatId?: string, hasPDF?: boolean, extractedData?: CachedChat["extractedData"]) => {
    try {
      const stored = localStorage.getItem("chatbot_cache") || "[]";
      const allChats: CachedChat[] = JSON.parse(stored);

      // If chatId is provided, update existing chat; otherwise create new
      const idToUse = chatId || `chat_${Date.now()}`;
      const existingIndex = allChats.findIndex((chat) => chat.id === idToUse);

      if (existingIndex !== -1) {
        // Update existing chat with new messages and timestamp
        allChats[existingIndex] = {
          ...allChats[existingIndex],
          title,
          messages,
          timestamp: Date.now(),
          hasPDF: hasPDF ?? allChats[existingIndex].hasPDF,
          extractedData: extractedData ?? allChats[existingIndex].extractedData,
        };
      } else {
        // Create new chat
        const newChat: CachedChat = {
          id: idToUse,
          timestamp: Date.now(),
          title,
          messages,
          hasPDF: hasPDF || false,
          extractedData,
        };
        allChats.push(newChat);
      }

      const now = Date.now();
      const fortyEightHoursAgo = now - 48 * 60 * 60 * 1000;
      // Keep chats from last 48 hours OR permanently saved chats
      const filtered = allChats.filter((chat) => chat.timestamp >= fortyEightHoursAgo || chat.isPermanent);

      localStorage.setItem("chatbot_cache", JSON.stringify(filtered));
      
      return idToUse;
    } catch (error) {
      console.error("Error saving chat to cache:", error);
      return chatId || `chat_${Date.now()}`;
    }
  };

  return { saveChat };
}