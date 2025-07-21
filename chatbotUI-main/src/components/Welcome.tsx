import { useNavigate } from "react-router-dom";
import { Stethoscope, MessageSquarePlus, HeartPulse } from "lucide-react";

const Welcome = () => {
  const navigate = useNavigate();

  const handleNewConsultation = () => {
    // Generate a random ID for the new chat
    const newChatId = crypto.randomUUID();

    // Save it into localStorage chats list
    const chats = JSON.parse(localStorage.getItem("chats") || "[]");
    chats.push({ id: newChatId, title: "New Consultation" });
    localStorage.setItem("chats", JSON.stringify(chats));

    // Navigate to the chat page
    navigate(`/c/${newChatId}`);
  };

  return (
    <div className="h-full w-full flex flex-col justify-center items-center bg-gradient-to-b from-gray-900 to-gray-950 p-6 text-center text-gray-100">
      <div className="mb-8 p-6 bg-blue-900/30 rounded-full border border-blue-700/30">
        <Stethoscope className="h-12 w-12 text-blue-400" strokeWidth={1.5} />
      </div>

      <h1 className="text-4xl font-bold mb-4 flex items-center gap-3 text-blue-400">
        <HeartPulse className="text-blue-400" />
        MediChat Assistant
      </h1>

      <p className="text-lg text-gray-400 max-w-md mb-8">
        Your AI-powered medical consultation partner. Get instant responses to
        your health questions.
      </p>

      <div className="flex flex-col items-center gap-4">
        <p className="text-gray-400 text-sm">Start by:</p>
        <button
          onClick={handleNewConsultation}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all font-medium"
        >
          <MessageSquarePlus size={18} />
          New Medical Consultation
        </button>

        <div className="text-xs text-gray-500 mt-6 flex flex-col items-center gap-1">
          <div className="flex gap-2">
            <span className="px-2 py-1 bg-gray-800 rounded-md">
              100% Private
            </span>
          </div>
          <p className="max-w-xs mt-2 text-gray-500">
            Your conversations are encrypted and never stored permanently.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Welcome;
