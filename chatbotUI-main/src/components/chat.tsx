import { useState, useRef, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Button } from "./ui/button";
import { motion } from "framer-motion";
import { Bot, User, Loader2, Stethoscope } from "lucide-react";
import axios from "axios"
("use client");

interface Message {
  sender: "user" | "bot";
  text: string;
}

export default function ChatPage() {
  const params = useParams();
  const chatId = params.chatId as string;

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const proxyUrl = "https://cors-anywhere.herokuapp.com/"
  const API_URL = import.meta.env.VITE_API_URL

  // useEffect(() => {
  //   if (typeof window !== "undefined") {
  //     const stored = JSON.parse(localStorage.getItem("chatMessages") || "{}");
  //     if (chatId && stored[chatId]) {
  //       setMessages(stored[chatId]);
  //     }
  //   }
  // }, [chatId]);

  // useEffect(() => {
  //   if (!chatId || typeof window === "undefined") return;
  //   const allChats = JSON.parse(localStorage.getItem("chatMessages") || "{}");
  //   allChats[chatId] = messages;
  //   localStorage.setItem("chatMessages", JSON.stringify(allChats));
  // }, [messages, chatId]);
  useEffect(() => {
    if (typeof window !== "undefined" && chatId) {
      // Fetch messages for the specific chatId
      const storedMessages = JSON.parse(
        localStorage.getItem(`chatMessages_${chatId}`) || "[]"
      );
      setMessages(storedMessages);
    }
  }, [chatId]);

  useEffect(() => {
    if (!chatId || typeof window === "undefined") return;

    // Save messages for the specific chatId
    localStorage.setItem(`chatMessages_${chatId}`, JSON.stringify(messages));
  }, [messages, chatId]);

  const handleSend = async () => {
    if (!input.trim() || !chatId) return;

    const userMessage: Message = { sender: "user", text: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    if (messages.length === 0 && typeof window !== "undefined") {
      const chats = JSON.parse(localStorage.getItem("chats") || "[]");
      const index = chats.findIndex((c: any) => c.id === chatId);
      if (index !== -1) {
        chats[index].title = userMessage.text.slice(0, 30);
        localStorage.setItem("chats", JSON.stringify(chats));
      }
    }

    try {
      const response = await axios.post(proxyUrl+API_URL, {
        question: userMessage.text,
      });
    
      console.log("userMessage:", userMessage);
    
      const botMessage: Message = {
        sender: "bot",
        text: response.data.response || "No response received.",
      };
    
      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      console.error("Chat API error:", error);
      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: "⚠️ Sorry, I'm having trouble connecting to the server. Please try again later.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  return (
    <div className="flex flex-col h-screen bg-gradient-to-b from-gray-900 to-gray-950 text-gray-100">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto p-4 flex items-center gap-3">
          <Stethoscope className="text-blue-400" />
          <h1 className="font-semibold text-blue-400">MediChat</h1>
          <div className="ml-auto text-xs text-gray-400">
            {new Date().toLocaleDateString()}
          </div>
        </div>
      </header>

      {/* Messages container */}
      <div className="flex-1 overflow-y-auto px-4 pt-6 pb-2">
        <div className="space-y-4 max-w-3xl mx-auto w-full">
          {messages.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="text-center py-12"
            >
              <div className="mx-auto w-16 h-16 bg-blue-900/30 rounded-full flex items-center justify-center mb-4">
                <Stethoscope size={28} className="text-blue-400" />
              </div>
              <h2 className="text-xl font-medium text-gray-200 mb-2">
                Medical Assistance Chat
              </h2>
              <p className="text-gray-400 max-w-md mx-auto">
                Ask me about symptoms, medications, or general health advice.
                I'll do my best to provide helpful information.
              </p>
            </motion.div>
          )}

          {messages.map((msg, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className={`flex ${
                msg.sender === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`flex max-w-[85%] gap-2 ${
                  msg.sender === "user" ? "flex-row-reverse" : ""
                }`}
              >
                <div
                  className={`mt-1.5 flex-shrink-0 ${
                    msg.sender === "user"
                      ? "bg-blue-500 text-white"
                      : "bg-gray-700 text-gray-200"
                  } w-8 h-8 rounded-full flex items-center justify-center`}
                >
                  {msg.sender === "user" ? (
                    <User size={16} />
                  ) : (
                    <Bot size={16} />
                  )}
                </div>
                <div
                  className={`px-4 py-3 rounded-2xl ${
                    msg.sender === "user"
                      ? "bg-blue-600 rounded-tr-none"
                      : "bg-gray-800 rounded-tl-none"
                  } w-fit max-w-full break-words`}
                >
                  <div className="whitespace-pre-wrap break-words text-sm">
                    {msg.text}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}

          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-start"
            >
              <div className="flex max-w-[85%] gap-2">
                <div className="mt-1.5 flex-shrink-0 bg-gray-700 text-gray-200 w-8 h-8 rounded-full flex items-center justify-center">
                  <Bot size={16} />
                </div>
                <div className="px-4 py-3 rounded-2xl bg-gray-800 rounded-tl-none w-fit max-w-full">
                  <Loader2 className="animate-spin text-gray-400" size={18} />
                </div>
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input area */}
      <div className="p-4 border-t border-gray-800 bg-gray-900/50 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto w-full">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <textarea
                className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 pr-12 resize-none h-16 focus:outline-none focus:ring-2 focus:ring-blue-500/50 border border-gray-700"
                placeholder="Describe your symptoms or ask a medical question..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                disabled={loading}
              />
              <button
                onClick={() => setInput("")}
                className="absolute right-3 top-3 text-gray-400 hover:text-gray-200 transition-colors"
                disabled={!input}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <Button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="self-stretch bg-blue-600 hover:bg-blue-700 text-white"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                "Send"
              )}
            </Button>
          </div>
          <p className="text-xs text-gray-500 mt-2 text-center">
            Your health information is kept private and secure.
          </p>
        </div>
      </div>
    </div>
  );
}
