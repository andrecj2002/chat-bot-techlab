"use client";
import ConfigBotComponent from "@/components/ConfigBotComponent";
import CacheOldChatsBotComponent from "@/components/cacheOldChatsBotComponent";
import IntroTextoBotComponent from "@/components/IntroTextoBotComponent";
import Image from "next/image";
import { useState, useEffect } from "react";

export default function Home() {
  const [language, setLanguage] = useState<"pt" | "en">("pt");

  useEffect(() => {
    const handleLanguageChange = (event: any) => {
      setLanguage(event.detail?.lang || "pt");
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
      <header className="flex flex-col sm:flex-row items-center justify-between px-3 sm:px-6 py-2 sm:py-4 gap-2 sm:gap-3">
        <Image src="/pci_logo.svg" alt="PCI TechLab logo" width={112} height={28} className="h-5 sm:h-7 w-auto" />
        <div className="flex gap-1.5 sm:gap-3 w-full sm:w-auto">
          <CacheOldChatsBotComponent onLoadChat={() => {}} />
        </div>
      </header>

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