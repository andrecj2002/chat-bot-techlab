"use client";
import { useState, useEffect } from "react";

export type CachedChat = {
  id: string;
  timestamp: number;
  title: string;
  messages: {
    role: "user" | "assistant";
    content: string;
  }[];
};

interface CacheOldChatsBotComponentProps {
  onLoadChat: (messages: CachedChat["messages"]) => void;
}

export default function CacheOldChatsBotComponent({ onLoadChat }: CacheOldChatsBotComponentProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [cachedChats, setCachedChats] = useState<CachedChat[]>([]);
  const [loading, setLoading] = useState(false);
  const [language, setLanguage] = useState<"pt" | "en">("pt");

  // Load cached chats from localStorage
  const loadCachedChats = () => {
    setLoading(true);
    try {
      const stored = localStorage.getItem("chatbot_cache");
      if (stored) {
        const allChats: CachedChat[] = JSON.parse(stored);
        const now = Date.now();
        const fortyEightHoursAgo = now - 48 * 60 * 60 * 1000;

        // Filter chats from last 48 hours
        const recentChats = allChats.filter((chat) => chat.timestamp >= fortyEightHoursAgo);

        // Sort by timestamp descending (newest first)
        recentChats.sort((a, b) => b.timestamp - a.timestamp);

        setCachedChats(recentChats);
      }
    } catch (error) {
      console.error("Error loading cached chats:", error);
    } finally {
      setLoading(false);
    }
  };

  // Load chats when modal opens
  useEffect(() => {
    if (isOpen) {
      loadCachedChats();
    }
  }, [isOpen]);

  // Listen for language changes
  useEffect(() => {
    const handleLanguageChange = (event: any) => {
      setLanguage(event.detail?.lang || "pt");
    };

    window.addEventListener("language-changed", handleLanguageChange);
    return () => window.removeEventListener("language-changed", handleLanguageChange);
  }, []);

  const handleLoadChat = (chat: CachedChat) => {
    // Dispatch custom event for ConfigBotComponent to listen to
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("load-cached-chat", {
          detail: { messages: chat.messages },
        })
      );
    }
    setIsOpen(false);
  };

  const clearHistory = () => {
    const confirmMessage = language === "pt" 
      ? "Tem certeza que deseja deletar todas as conversas? Esta ação não pode ser desfeita."
      : "Are you sure you want to delete all chats? This cannot be undone.";
    
    if (confirm(confirmMessage)) {
      try {
        localStorage.removeItem("chatbot_cache");
        setCachedChats([]);
      } catch (error) {
        console.error("Error clearing cache:", error);
      }
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
      return date.toLocaleDateString("pt-BR");
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
        className="flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 transition hover:border-slate-900 hover:bg-slate-50"
        title={language === "pt" ? "Ver conversas dos últimos 48 horas" : "View chats from last 48 hours"}
      >
        {language === "pt" ? "Últimas Conversas" : "Latest Chats"}
      </button>

      {/* Modal overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
          onClick={() => setIsOpen(false)}
        >
          <div 
            className="h-[60vh] w-full max-w-4xl rounded-lg bg-white shadow-lg flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-slate-900">
                {language === "pt" ? "Últimas Conversas" : "Latest Chats"}
              </h2>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-full p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
              >
                <svg
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Modal content */}
            <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-sm text-slate-500">{language === "pt" ? "Carregando conversas..." : "Loading chats..."}</p>
                </div>
              ) : cachedChats.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-sm text-slate-500">
                    {language === "pt" ? "Nenhuma conversa nos últimos 48 horas" : "No chats from the last 48 hours"}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {cachedChats.map((chat) => (
                    <button
                      key={chat.id}
                      onClick={() => handleLoadChat(chat)}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 p-3 text-left transition hover:bg-slate-100 hover:border-slate-300"
                    >
                      <div className="text-sm font-medium text-slate-900 truncate">
                        {chat.title}
                      </div>
                      <div className="text-xs text-slate-500 mt-1 flex justify-between">
                        <span>{getMessageCount(chat.messages)} {language === "pt" ? "mensagens" : "messages"}</span>
                        <span>{formatDate(chat.timestamp)}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Modal footer */}
            {cachedChats.length > 0 && (
              <div className="border-t border-slate-200 px-6 py-3 flex justify-end">
                <button
                  onClick={clearHistory}
                  className="text-sm text-red-600 hover:text-red-700 hover:underline transition font-medium"
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
  const saveChat = (messages: CachedChat["messages"], title: string) => {
    try {
      const stored = localStorage.getItem("chatbot_cache") || "[]";
      const allChats: CachedChat[] = JSON.parse(stored);

      const newChat: CachedChat = {
        id: `chat_${Date.now()}`,
        timestamp: Date.now(),
        title,
        messages,
      };

      allChats.push(newChat);

      const now = Date.now();
      const fortyEightHoursAgo = now - 48 * 60 * 60 * 1000;
      const filtered = allChats.filter((chat) => chat.timestamp >= fortyEightHoursAgo);

      localStorage.setItem("chatbot_cache", JSON.stringify(filtered));
    } catch (error) {
      console.error("Error saving chat to cache:", error);
    }
  };

  return { saveChat };
}