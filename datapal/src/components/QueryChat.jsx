import React, { useState } from "react";
import { Send } from "lucide-react";
import { motion } from "framer-motion";

export default function QueryChat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("http://localhost:8000/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_query: userMessage.content }),
      });

      const data = await res.json();
      if (!res.ok) throw data;

      const responseText =
        data.results?.length > 0
          ? JSON.stringify(data.results, null, 2)
          : "Query executed successfully — no rows returned.";

      const botMessage = { role: "assistant", content: responseText };
      setMessages((prev) => [...prev, botMessage]);
    } catch (err) {
      const botMessage = {
        role: "assistant",
        content:
          err?.detail?.db_error ||
          err?.detail?.error ||
          "❌ Something went wrong with your query.",
      };
      setMessages((prev) => [...prev, botMessage]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[80vh] max-w-3xl mx-auto border rounded-2xl shadow-md bg-white">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-3 rounded-2xl whitespace-pre-wrap max-w-[80%] ${
              msg.role === "user"
                ? "bg-blue-500 text-white ml-auto"
                : "bg-gray-100 text-gray-900 mr-auto"
            }`}
          >
            {msg.content}
          </motion.div>
        ))}
        {loading && (
          <div className="text-gray-500 italic text-sm">Thinking...</div>
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 p-3 border-t bg-gray-50"
      >
        <input
          type="text"
          placeholder="Ask a question about your data..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 rounded-xl border p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          disabled={loading}
          className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl transition disabled:opacity-50"
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
}
