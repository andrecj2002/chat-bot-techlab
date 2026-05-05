"use client";
import { useState, useEffect, useRef } from "react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

export default function DocChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  const userOnlyMessages = messages.filter((m) => m.role === "user");
  const userMessagesCount = userOnlyMessages.length;
  const showLanguageOptions = messages.length === 1 && messages[0]?.role === "assistant";
  const showChoiceOptions = !loading && userMessagesCount === 1;
  const showInput = userMessagesCount > 1;
  const firstUserLanguage = userOnlyMessages[0]?.content?.trim().toLowerCase() ?? "";
  const isPortugueseFlow =
    firstUserLanguage.includes("portugu") || firstUserLanguage.includes("pt");
  const currentStep = userMessagesCount === 0 ? 1 : userMessagesCount === 1 ? 2 : 3;

  const steps = [
    { label: "Idioma", title: "Language" },
    { label: "Escolha", title: "Choose" },
    { label: "Escrever", title: "Write" },
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

  const startConversation = async (): Promise<void> => {
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [{ role: "user", content: "Hello" }] }),
      });
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const data = await res.json();
      setMessages([{ role: "assistant", content: data.reply ?? "" }]);
    } catch (err) {
      console.error("startConversation error:", err);
      setMessages([{ role: "assistant", content: "Sorry, something went wrong." }]);
    } finally {
      setLoading(false);
    }
  };

  const sendMessageWithContent = async (content: string): Promise<void> => {
    if (!content.trim()) return;

    const userMsg: Message = { role: "user", content };
    const updated = [...messages, userMsg];
    setMessages(updated);
    if (content === input) {
      setInput("");
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
      setMessages([...updated, { role: "assistant", content: data.reply ?? "" }]);
    } catch (err) {
      console.error("sendMessage error:", err);
      setMessages(prev => [...prev, { role: "assistant", content: "Sorry, something went wrong." }]);
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
  }, []);

  return (
    <div className="flex h-full min-h-0 w-full flex-col font-sans">
      <div className="flex-1 min-h-0 overflow-y-auto pr-1">
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

      <ol className="mt-10 flex w-full items-center gap-6 overflow-hidden px-0 py-0">
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isActive = currentStep === stepNumber;
          const isComplete = currentStep > stepNumber;
          const lineColor = isComplete || isActive ? "border-indigo-600" : "border-slate-200";
          const labelColor = isComplete || isActive ? "text-indigo-600" : "text-slate-400";
          const titleColor = isActive || isComplete ? "text-slate-900" : "text-slate-500";

          return (
            <li key={step.label} className="flex flex-1 items-start">
              <div className={`flex w-full flex-col border-t-2 pt-4 ${lineColor}`}>
                <span className={`text-sm font-medium sm:text-base ${labelColor}`}>
                  Step {stepNumber}
                </span>
                <h4 className={`text-base font-medium sm:text-lg ${titleColor}`}>
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