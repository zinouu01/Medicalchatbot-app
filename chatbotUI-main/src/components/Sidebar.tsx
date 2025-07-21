import { useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { Plus, Stethoscope, Clock, Trash2 } from "lucide-react";
import { motion } from "framer-motion";

interface Chat {
  id: string;
  title: string;
}

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [chats, setChats] = useState<Chat[]>([]);

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem("chats") || "[]");
    setChats(saved);
  }, [location]);
  const newChat = () => {
    const id = crypto.randomUUID();
    const newChat: Chat = { id, title: "New Consultation" };
    const updated = [newChat, ...chats];

    // Save updated chats list
    localStorage.setItem("chats", JSON.stringify(updated));

    // ALSO create an empty conversation for this chat
    localStorage.setItem(`chat-${id}`, JSON.stringify([]));

    setChats(updated);
    navigate(`/c/${id}`);
  };

  const removeChat = (id: string) => {
    const updated = chats.filter((chat) => chat.id !== id);
    localStorage.setItem("chats", JSON.stringify(updated));
    setChats(updated);

    // ALSO remove the chat messages
    localStorage.removeItem(`chat-${id}`);

    if (location.pathname.includes(id)) {
      navigate("/");
    }
  };

  return (
    <div className="w-64 bg-gray-900 border-r border-gray-800 text-gray-100 p-4 flex flex-col h-full">
      {/* New Chat Button - Medical Style */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={newChat}
        className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-lg mb-6 font-medium transition-colors"
      >
        <Plus size={18} className="stroke-[2.5]" />
        New Consultation
      </motion.button>

      {/* Chat List - Medical Records Style */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-blue-600 scrollbar-track-gray-800 pr-1">
        <div className="flex items-center gap-2 mb-4 px-2 text-gray-400 text-sm">
          <Stethoscope size={16} />
          <span>Recent Consultations</span>
        </div>

        <div className="space-y-1">
          {chats.map((chat) => (
            <motion.div
              key={chat.id}
              whileHover={{ x: 2 }}
              className={`group text-left w-full p-3 rounded-lg text-sm transition-colors flex items-center gap-3 ${
                location.pathname.includes(chat.id)
                  ? "bg-blue-900/30 text-blue-100"
                  : "hover:bg-gray-800/50 text-gray-300"
              }`}
            >
              <button
                onClick={() => navigate(`/c/${chat.id}`)}
                className="flex items-center gap-3 flex-1 truncate"
              >
                <div
                  className={`w-2 h-2 rounded-full ${
                    location.pathname.includes(chat.id)
                      ? "bg-blue-400"
                      : "bg-gray-600"
                  }`}
                ></div>
                <span className="truncate">{chat.title}</span>
              </button>
              <div className="flex items-center gap-2 ml-auto">
                <Clock size={12} className="text-gray-500" />
                <button
                  onClick={() => removeChat(chat.id)}
                  className="text-gray-500 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Sidebar
