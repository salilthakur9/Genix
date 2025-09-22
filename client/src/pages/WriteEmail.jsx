import React, { useState } from "react";
import { Mail, Send } from "lucide-react";
import axios from "axios";
import { useAuth } from "@clerk/clerk-react";
import toast from "react-hot-toast";
import Markdown from "react-markdown";

axios.defaults.baseURL = import.meta.env.VITE_BASE_URL;

const WriteEmail = () => {
  const emailTones = [
    { tone: "professional", text: "Professional" },
    { tone: "respectful", text: "Respectful" },
    { tone: "friendly", text: "Friendly" },
    { tone: "casual", text: "Casual" },
  ];

  const [subject, setSubject] = useState("");
  const [receiverDesignation, setReceiverDesignation] = useState("");
  const [senderDesignation, setSenderDesignation] = useState("");
  const [selectedTone, setSelectedTone] = useState(emailTones[0]);
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState("");

  const { getToken } = useAuth();

  const onSubmitHandler = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);

      const prompt = `Write an email about "${subject}" from a ${senderDesignation} to a ${receiverDesignation}, with a ${selectedTone.text.toLowerCase()} tone.`;

      const { data } = await axios.post(
        "/api/ai/generate-email",
        { prompt, tone: selectedTone.tone },
        {
          headers: { Authorization: `Bearer ${await getToken()}` },
        }
      );

      if (data.success) {
        setContent(data.content);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
    setLoading(false);
  };

  return (
    <div className="h-full overflow-y-scroll p-6 flex items-start flex-wrap gap-4 text-slate-700">
      {/* Left Form */}
      <form
        onSubmit={onSubmitHandler}
        className="w-full max-w-lg p-4 bg-white rounded-lg border border-gray-200"
      >
        <div className="flex items-center gap-3">
          <Mail className="w-6 text-[#8E37EB]" />
          <h1 className="text-xl font-semibold">Email Configuration</h1>
        </div>

        {/* Subject */}
        <p className="mt-6 text-sm font-medium">Email Subject</p>
        <input
          onChange={(e) => setSubject(e.target.value)}
          value={subject}
          type="text"
          className="w-full p-2 px-3 mt-2 outline-none text-sm rounded-md border border-gray-300"
          placeholder="e.g., Meeting Reminder for Project Update"
          required
        />

        {/* Receiver */}
        <p className="mt-4 text-sm font-medium">Receiver's Designation</p>
        <input
          onChange={(e) => setReceiverDesignation(e.target.value)}
          value={receiverDesignation}
          type="text"
          className="w-full p-2 px-3 mt-2 outline-none text-sm rounded-md border border-gray-300"
          placeholder="e.g., Manager, Team Lead"
          required
        />

        {/* Sender */}
        <p className="mt-4 text-sm font-medium">Your Designation</p>
        <input
          onChange={(e) => setSenderDesignation(e.target.value)}
          value={senderDesignation}
          type="text"
          className="w-full p-2 px-3 mt-2 outline-none text-sm rounded-md border border-gray-300"
          placeholder="e.g., Intern, Developer"
          required
        />

        {/* Tone Selection */}
        <p className="mt-4 text-sm font-medium">Email Tone</p>
        <div className="mt-3 flex gap-3 flex-wrap sm:max-w-9/11">
          {emailTones.map((item, index) => (
            <span
              onClick={() => setSelectedTone(item)}
              key={index}
              className={`text-xs px-4 py-1 border rounded-full cursor-pointer ${
                selectedTone.tone === item.tone
                  ? "bg-purple-50 text-purple-700"
                  : "text-gray-500 border-gray-300"
              }`}
            >
              {item.text}
            </span>
          ))}
        </div>

        {/* Submit */}
        <button
          disabled={loading}
          className="w-full flex justify-center items-center gap-2 
          bg-gradient-to-r from-[#8E37EB] to-[#ae76e9] text-white px-4 py-2 mt-6 text-sm rounded-lg cursor-pointer"
        >
          {loading ? (
            <span className="w-4 h-4 my-1 rounded-full border-2 border-t-transparent animate-spin"></span>
          ) : (
            <Send className="w-5" />
          )}
          Generate Email
        </button>
      </form>

      {/* Right Panel */}
      <div className="w-full max-w-lg p-4 bg-white rounded-lg flex flex-col border border-gray-200 min-h-96 max-h-[600px]">
        <div className="flex items-center gap-3">
          <Send className="w-5 h-5 text-[#8E37EB]" />
          <h1 className="text-xl font-semibold">Generated Email</h1>
        </div>

        {!content ? (
          <div className="flex-1 flex justify-center items-center">
            <div className="text-sm flex flex-col items-center gap-5 text-gray-400">
              <Mail className="w-9 h-9" />
              <p>Fill in the details and click "Generate Email" to get started</p>
            </div>
          </div>
        ) : (
          <div className="mt-3 h-full overflow-y-scroll text-sm text-slate-600">
            <div className="reset-tw">
              <Markdown>{content}</Markdown>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WriteEmail;
