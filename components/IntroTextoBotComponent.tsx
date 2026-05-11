"use client";
import { useEffect, useState } from "react";

export default function IntroTextoBotComponent() {
  const [lang, setLang] = useState<"pt" | "en">("pt");

  useEffect(() => {
    const handler = (e: Event) => {
      const d = (e as CustomEvent).detail;
      if (d && d.lang === "en") setLang("en");
      else if (d && d.lang === "pt") setLang("pt");
    };

    window.addEventListener("language-changed", handler as EventListener);
    return () => window.removeEventListener("language-changed", handler as EventListener);
  }, []);

  const texts: Record<string, string> = {
    pt: "Diga-nos um pouco sobre o que precisa, depois escreva a sua resposta ou escolha uma das opções abaixo.",
    en: "Tell us a little about what you need, then either type your reply or choose one of the options below.",
  };

  return (
    <p className="mt-6 max-w-2xl text-base leading-7 text-slate-700 sm:text-lg">
      {texts[lang]}
    </p>
  );
}
