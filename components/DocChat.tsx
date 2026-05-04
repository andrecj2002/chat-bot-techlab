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

  const sendMessage = async (): Promise<void> => {
    if (!input.trim()) return;

    const userMsg: Message = { role: "user", content: input };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput("");
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
    <div className="max-w-xl mx-auto p-4 font-sans">
      <div className="h-112 overflow-y-auto border border-gray-200 rounded-xl p-4 mb-3 bg-white">
        {messages.map((m, i) => (
          <div key={i} className={`mb-3 flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <span className={`inline-block px-4 py-2 rounded-xl max-w-[80%] text-sm ${
              m.role === "user"
                ? "bg-blue-500 text-white"
                : "bg-gray-100 text-gray-800"
            }`}>
              {m.content}
            </span>
          </div>
        ))}
        {loading && (
          <p className="text-gray-400 text-sm italic">Typing...</p>
        )}
        <div ref={bottomRef} />
      </div>
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInput(e.target.value)}
          onKeyDown={(e: React.KeyboardEvent) => e.key === "Enter" && sendMessage()}
          placeholder="Type your reply..."
          className="flex-1 px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400"
        />
        <button
          onClick={sendMessage}
          className="px-5 py-2 bg-blue-500 text-white rounded-xl text-sm hover:bg-blue-600 transition"
        >
          Send
        </button>
      </div>
    </div>
  );
}