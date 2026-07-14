import { useState } from "react";
import { motion } from "framer-motion";
import { Bot, Send, Check, RotateCcw, Sparkles } from "lucide-react";
import { sendAdminChatMessage } from "../../services/api";

const initialMessages = [
  { from: "admin", text: "Make module 2 easier for beginners" },
  { from: "ai", text: "I updated module 2 with simpler explanations." },
];

export default function AdminChatbotPage() {
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSend() {
    if (!input.trim()) return;
    const text = input.trim();
    setMessages((m) => [...m, { from: "admin", text }]);
    setInput("");
    setLoading(true);
    const res = await sendAdminChatMessage(text);
    setMessages((m) => [...m, { from: "ai", text: res.reply }]);
    setLoading(false);
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-8rem)] max-w-2xl flex-col rounded-xl3 bg-surface shadow-card">
      <div className="flex items-center gap-2 border-b border-black/5 px-6 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary text-white">
          <Bot size={18} />
        </div>
        <div>
          <p className="font-bold">AI Assistant</p>
          <p className="text-xs text-ink/40">Ask it to tweak any generated course</p>
        </div>
        <Sparkles size={16} className="ml-auto text-primary/60" />
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-6">
        {messages.map((m, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex ${m.from === "admin" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm ${
                m.from === "admin" ? "bg-primary text-white rounded-br-sm" : "bg-primary-50 text-ink rounded-bl-sm"
              }`}
            >
              {m.text}
            </div>
          </motion.div>
        ))}
        {loading && <div className="text-sm text-ink/40">AI is thinking…</div>}
        {!loading && messages.length > 2 && (
          <div className="flex gap-2">
            <button className="flex items-center gap-1 rounded-xl bg-success/10 px-3 py-1.5 text-xs font-bold text-success">
              <Check size={14} /> Apply Changes
            </button>
            <button className="flex items-center gap-1 rounded-xl bg-black/5 px-3 py-1.5 text-xs font-bold text-ink/60">
              <RotateCcw size={14} /> Regenerate
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 border-t border-black/5 p-4">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="e.g. Add a section on prompt safety"
          className="flex-1 rounded-xl bg-black/5 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary"
        />
        <button onClick={handleSend} className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white hover:bg-primary-dark" aria-label="Send">
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
