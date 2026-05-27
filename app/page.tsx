"use client";
import ConfigBotComponent from "@/components/ConfigBotComponent";
import CacheOldChatsBotComponent from "@/components/cacheOldChatsBotComponent";
import IntroTextoBotComponent from "@/components/IntroTextoBotComponent";
import Image from "next/image";
import { useState, useEffect } from "react";

export default function Home() {
  const [, setLanguage] = useState<"pt" | "en">("pt");

  useEffect(() => {
    const handleLanguageChange = (event: Event) => {
      const customEvent = event as CustomEvent<{ lang: "pt" | "en" }>;
      setLanguage(customEvent.detail?.lang || "pt");
    };

    window.addEventListener("language-changed", handleLanguageChange);
    return () => {
      window.removeEventListener("language-changed", handleLanguageChange);
    };
  }, []);

  return (
    <>
      <style>{`
        @media (min-width: 768px) {
          .gradient-bg {
            background: linear-gradient(to right, rgb(253, 252, 255) 0%, white 20%, white 80%, rgb(253, 252, 255) 100%) !important;
          }
        }
        @keyframes slideInDown {
          from {
            opacity: 0;
            transform: translateY(-1rem);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .notification-enter {
          animation: slideInDown 0.4s ease-out forwards;
        }
        @keyframes slideOutUp {
          from {
            opacity: 1;
            transform: translateY(0);
          }
          to {
            opacity: 0;
            transform: translateY(-1rem);
          }
        }
        .notification-exit {
          animation: slideOutUp 0.4s ease-in forwards;
        }
        @keyframes progressBarAnimation {
          from {
            transform: scaleX(1);
          }
          to {
            transform: scaleX(0);
          }
        }
        .progress-bar {
          animation: progressBarAnimation 3s linear forwards;
          transform-origin: left;
        }
      `}</style>
      <div className="h-screen overflow-hidden text-slate-900 bg-white gradient-bg">
      <header className="flex flex-col sm:flex-row items-center justify-between px-3 sm:px-6 py-2 sm:py-4 gap-2 sm:gap-3 lg:hidden">
        <Image src="/pci_logo.svg" alt="PCI TechLab logo" width={112} height={28} className="w-auto" style={{ height: 'auto' }} />
        <div className="flex gap-1.5 sm:gap-3 w-full sm:w-auto">
          <CacheOldChatsBotComponent onLoadChat={() => {}} />
        </div>
      </header>

      <div className="flex h-full lg:h-screen">
        {/* Sidebar - hidden on mobile/tablet, visible on lg+ */}
        <aside className="hidden lg:flex lg:w-96 flex-col border-r border-slate-200 px-8 py-10 bg-white">
          {/* Top section: heading and intro text */}
          <div>
            <h1 className="font-title text-6xl leading-none text-slate-900 mb-4">
              chat.bot
            </h1>
            <IntroTextoBotComponent />
          </div>

          {/* Latest Chats button below intro */}
          <div className="flex gap-3 mt-6 mb-auto">
            <CacheOldChatsBotComponent onLoadChat={() => {}} />
          </div>

          {/* Bottom section: logo aligned with step titles */}
          <div className="mt-56">
            <Image src="/pci_logo.svg" alt="PCI TechLab logo" width={112} height={28} className="w-auto" style={{ height: 'auto' }} />
          </div>
        </aside>

        {/* Main chat area */}
        <main className="flex-1 flex flex-col overflow-hidden lg:h-full">
          <div className="h-[calc(100vh-80px)] sm:h-[calc(100vh-72px)] lg:h-full w-full flex flex-col overflow-hidden px-3 sm:px-6 pt-2 sm:pt-12 pb-2 sm:pb-16 lg:pt-0 lg:px-8 lg:pb-0">
            <div className="w-full overflow-hidden pt-6 sm:pt-10 flex-1 flex flex-col">
              <ConfigBotComponent />
            </div>
          </div>
        </main>
      </div>
    </div>
    </>
  );
}