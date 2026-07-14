import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bot, X, Send, Sparkles, RotateCcw, Check } from "lucide-react";
import { sendAdminChatMessage } from "../services/api";

const initialMessages = [
  { from: "admin", text: "Make module 2 easier for beginners" },
  { from: "ai", text: "I updated module 2 with simpler explanations." },
];

export default function Chatbot() {
  const [open, setOpen] = useState(false);
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
    <>
      <motion.button
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.94 }}
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-pop"
        aria-label="Open AI Assistant"
      >
        {open ? <X size={24} /> : <Bot size={24} />}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ type: "spring", damping: 24, stiffness: 280 }}
            className="fixed bottom-24 right-6 z-40 flex h-[28rem] w-[22rem] max-w-[90vw] flex-col overflow-hidden rounded-xl3 bg-surface shadow-pop"
          >
            <div className="flex items-center gap-2 bg-primary px-5 py-4 text-white">
              <Bot size={20} />
              <span className="font-display font-bold">AI Assistant</span>
              <Sparkles size={16} className="ml-auto opacity-80" />
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto p-4 scrollbar-hide">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.from === "admin" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                      m.from === "admin" ? "bg-primary text-white rounded-br-sm" : "bg-primary-50 text-ink rounded-bl-sm"
                    }`}
                  >
                    {m.text}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="rounded-2xl rounded-bl-sm bg-primary-50 px-4 py-2.5 text-sm text-ink/40">Thinking…</div>
                </div>
              )}
              {!loading && messages.length > 2 && (
                <div className="flex gap-2 pt-1">
                  <button className="flex items-center gap-1 rounded-xl bg-success/10 px-3 py-1.5 text-xs font-bold text-success">
                    <Check size={14} /> Apply Changes
                  </button>
                  <button className="flex items-center gap-1 rounded-xl bg-black/5 px-3 py-1.5 text-xs font-bold text-ink/60">
                    <RotateCcw size={14} /> Regenerate
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 border-t border-black/5 p-3">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Ask the AI assistant…"
                className="flex-1 rounded-xl bg-black/5 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                onClick={handleSend}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white hover:bg-primary-dark"
                aria-label="Send"
              >
                <Send size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
