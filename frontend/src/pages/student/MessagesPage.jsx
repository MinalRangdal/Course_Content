import { useEffect, useState, useRef } from "react";
import { Send, Image as ImageIcon, Mic, Smile, MoreVertical, MessageSquare } from "lucide-react";
import { getConversations, getMessages, sendMessage } from "../../services/api";
import { useAuth } from "../../hooks/useAuth";

export default function MessagesPage() {
  const [conversations, setConversations] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const scrollRef = useRef(null);
  const { user } = useAuth();

  useEffect(() => {
    getConversations().then(setConversations);
  }, []);

  useEffect(() => {
    if (activeChat) {
      getMessages(activeChat.friend.id).then(setMessages);
    }
  }, [activeChat]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  async function handleSend(e) {
    e.preventDefault();
    if (!text.trim() || !activeChat) return;
    const msg = text;
    setText("");
    await sendMessage(activeChat.friend.id, { text: msg, type: "text" });
    const freshMessages = await getMessages(activeChat.friend.id);
    setMessages(freshMessages);
  }

  function handleMockAction(action) {
    alert(`Mock UI Action: ${action}`);
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] rounded-xl4 bg-surface shadow-card overflow-hidden border border-border">
      {/* Sidebar */}
      <div className="w-80 border-r border-border bg-canvas/30 flex flex-col">
        <div className="p-4 border-b border-border bg-surface">
          <h2 className="font-bold text-lg">Messages</h2>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {conversations.length === 0 ? (
            <p className="p-4 text-center text-sm text-ink/50">Add friends to start chatting.</p>
          ) : (
            conversations.map(conv => (
              <button
                key={conv.friend.id}
                onClick={() => setActiveChat(conv)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors text-left ${activeChat?.friend.id === conv.friend.id ? "bg-primary text-white" : "hover:bg-canvas"}`}
              >
                <div className="w-10 h-10 rounded-full bg-surface/20 flex flex-shrink-0 items-center justify-center text-lg">{conv.friend.avatar?.startsWith("data:image") ? <img src={conv.friend.avatar} alt="Avatar" className="w-full h-full object-cover rounded-full" /> : conv.friend.avatar}</div>
                <div className="overflow-hidden flex-1">
                  <p className={`font-bold truncate ${activeChat?.friend.id === conv.friend.id ? "text-white" : "text-ink"}`}>{conv.friend.name}</p>
                  <p className={`text-xs truncate ${activeChat?.friend.id === conv.friend.id ? "text-white/70" : "text-ink/50"}`}>
                    {conv.lastMessage?.text || "Say hi!"}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-surface">
        {activeChat ? (
          <>
            <div className="p-4 border-b border-border flex justify-between items-center bg-canvas/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-canvas rounded-full flex items-center justify-center text-lg">{activeChat.friend.avatar?.startsWith("data:image") ? <img src={activeChat.friend.avatar} alt="Avatar" className="w-full h-full object-cover rounded-full" /> : activeChat.friend.avatar}</div>
                <div>
                  <p className="font-bold">{activeChat.friend.name}</p>
                  <p className="text-xs text-ink/50">Level {activeChat.friend.level}</p>
                </div>
              </div>
              <button className="p-2 text-ink/40 hover:text-ink"><MoreVertical size={20}/></button>
            </div>
            
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.length === 0 ? (
                <div className="flex h-full items-center justify-center">
                  <p className="text-sm text-ink/40">Start of conversation with {activeChat.friend.name}</p>
                </div>
              ) : (
                messages.map(msg => {
                  const isMe = msg.sender === user?.id;
                  return (
                    <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-[15px] shadow-sm ${isMe ? "bg-primary text-white rounded-br-none" : "bg-canvas text-ink rounded-bl-none"}`}>
                        {msg.text}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="p-4 border-t border-border bg-canvas/30">
              <form onSubmit={handleSend} className="flex items-end gap-2 bg-surface p-2 rounded-xl3 shadow-sm border border-border">
                <button type="button" onClick={() => handleMockAction("Emoji Picker")} className="p-2.5 text-ink/40 hover:text-ink transition-colors"><Smile size={20}/></button>
                <button type="button" onClick={() => handleMockAction("Upload Image")} className="p-2.5 text-ink/40 hover:text-ink transition-colors"><ImageIcon size={20}/></button>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Message..."
                  className="flex-1 resize-none bg-transparent py-2.5 outline-none max-h-32 min-h-[44px]"
                  rows={1}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend(e);
                    }
                  }}
                />
                <button type="button" onClick={() => handleMockAction("Record Voice")} className="p-2.5 text-ink/40 hover:text-ink transition-colors"><Mic size={20}/></button>
                <button type="submit" disabled={!text.trim()} className="p-2.5 bg-primary text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-opacity">
                  <Send size={18} />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-ink/40">
            <MessageSquare size={48} className="mb-4 opacity-20" />
            <p className="font-bold">Select a conversation</p>
            <p className="text-sm">Choose a friend from the left sidebar to start chatting.</p>
          </div>
        )}
      </div>
    </div>
  );
}
