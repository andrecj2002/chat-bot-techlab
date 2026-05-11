"use client";
import ConfigBotComponent from "@/components/ConfigBotComponent";
import CacheOldChatsBotComponent from "@/components/cacheOldChatsBotComponent";
import IntroTextoBotComponent from "@/components/IntroTextoBotComponent";
import Image from "next/image";
import { useState, useEffect } from "react";

export default function Home() {
  const [language, setLanguage] = useState<"pt" | "en">("pt");
  const [hasChatMessages, setHasChatMessages] = useState(false);
  const [chatSaved, setChatSaved] = useState(false);
  const [savedMessageCount, setSavedMessageCount] = useState(0);
  const [showSaveNotification, setShowSaveNotification] = useState(false);
  const [showErrorNotification, setShowErrorNotification] = useState(false);

  useEffect(() => {
    const handleLanguageChange = (event: any) => {
      setLanguage(event.detail?.lang || "pt");
    };

    const handleChatStateChange = (event: any) => {
      const newHasMessages = event.detail?.hasMessages || false;
      const newChatSaved = event.detail?.isSaved || false;
      const newSavedMessageCount = event.detail?.savedMessageCount || 0;
      
      setHasChatMessages(newHasMessages);
      setChatSaved(newChatSaved);
      setSavedMessageCount(newSavedMessageCount);
      
      // Clear error notification if conditions now allow saving
      if (newHasMessages && !newChatSaved) {
        setShowErrorNotification(false);
      }
    };

    const handleChatSavedSuccess = () => {
      setShowSaveNotification(true);
      const timer = setTimeout(() => {
        setShowSaveNotification(false);
      }, 3000);
      return () => clearTimeout(timer);
    };

    window.addEventListener("language-changed", handleLanguageChange);
    window.addEventListener("chat-state-changed", handleChatStateChange);
    window.addEventListener("chat-saved-success", handleChatSavedSuccess);
    return () => {
      window.removeEventListener("language-changed", handleLanguageChange);
      window.removeEventListener("chat-state-changed", handleChatStateChange);
      window.removeEventListener("chat-saved-success", handleChatSavedSuccess);
    };
  }, []);

  const handleSaveClick = () => {
    // Check if save is allowed
    if (!hasChatMessages || chatSaved) {
      setShowErrorNotification(true);
      setTimeout(() => {
        setShowErrorNotification(false);
      }, 3000);
      return;
    }
    
    // Save is allowed, dispatch event
    window.dispatchEvent(new CustomEvent("save-current-chat"));
  };

  return (
    <>
      <style>{`
        @media (min-width: 768px) {
          .gradient-bg {
            background: linear-gradient(to right, rgb(253, 252, 255) 0%, white 20%, white 80%, rgb(253, 252, 255) 100%) !important;
          }
        }
      `}</style>
      <div className="h-screen overflow-hidden text-slate-900 bg-white gradient-bg">
      <header className="flex flex-col sm:flex-row items-center justify-between px-3 sm:px-6 py-2 sm:py-4 gap-2 sm:gap-3">
        <Image src="/pci_logo.svg" alt="PCI TechLab logo" width={112} height={28} className="h-5 sm:h-7 w-auto" />
        <div className="flex gap-1.5 sm:gap-3 w-full sm:w-auto">
          <button
            onClick={handleSaveClick}
            className={`rounded-full border px-2 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium transition flex-1 sm:flex-none ${
              !hasChatMessages || chatSaved
                ? "border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed"
                : "border-indigo-600 bg-indigo-600 text-white hover:bg-indigo-700 hover:border-indigo-700 cursor-pointer"
            }`}
          >
            {language === "pt" ? "Guardar Conversa" : "Save Chat"}
          </button>
          <CacheOldChatsBotComponent onLoadChat={() => {}} />
        </div>
      </header>

      {/* Save notification */}
      {showSaveNotification && (
        <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-40 animate-in fade-in slide-in-from-top-2 duration-300 w-full max-w-md px-4">
          <div className="p-4 text-sm text-emerald-700 rounded-lg bg-emerald-50 border border-emerald-200" role="alert">
            <span className="font-medium">
              {language === "pt" ? "A conversa foi guardada!" : "Chat has been saved!"}
            </span>
          </div>
        </div>
      )}

      {/* Error notification */}
      {showErrorNotification && (
        <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-40 animate-in fade-in slide-in-from-top-2 duration-300 w-full max-w-md px-4">
          <div className="p-4 text-sm text-amber-700 rounded-lg bg-amber-50 border border-amber-200" role="alert">
            <span className="font-medium">
              {language === "pt" ? "Nenhum progresso na conversa desde o último guardado" : "No progress in the conversation since the last save"}
            </span>
          </div>
        </div>
      )}

      <main className="mx-auto flex h-[calc(100vh-80px)] sm:h-[calc(100vh-72px)] w-full max-w-5xl flex-col overflow-hidden px-3 sm:px-6 pt-2 sm:pt-12 pb-2 sm:pb-10 lg:px-10">
        <div className="max-w-3xl w-full">
          <h1 className="font-title text-2xl sm:text-5xl leading-tight sm:leading-none text-slate-900 md:text-6xl lg:text-7xl">
            chat.bot
          </h1>
          <IntroTextoBotComponent />
        </div>

        <div className="mt-auto w-full overflow-hidden pt-6 sm:pt-10">
          <ConfigBotComponent />
        </div>
      </main>
    </div>
    </>
  );
}