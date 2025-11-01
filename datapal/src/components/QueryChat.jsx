import React, { useState, useRef } from "react";
import { motion } from "framer-motion";
import "@chatscope/chat-ui-kit-styles/dist/default/styles.min.css";
import {
  MainContainer,
  ChatContainer,
  MessageList,
  Message,
  MessageInput,
  TypingIndicator,
} from "@chatscope/chat-ui-kit-react";

export default function QueryChat() {
  const [messages, setMessages] = useState([
    {
      message: "👋 Hi! I’m Data Pal. Ask me anything about your uploaded dataset.",
      sender: "assistant",
      direction: "incoming",
    },
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const fileInputRef = useRef(null);

  // --- File picker open handler
  const handleAttachClick = () => {
    console.log("Attach button clicked");

    if (fileInputRef.current) {
      console.log("Opening file picker");
      fileInputRef.current.click();
    }
  };

  // --- Send message to backend
  const handleSend = async (userMessage) => {
    if (!userMessage.trim()) return;

    const newMessage = {
      message: userMessage,
      sender: "user",
      direction: "outgoing",
    };
    const updatedMessages = [...messages, newMessage];
    setMessages(updatedMessages);
    setIsTyping(true);

    try {
      const res = await fetch("http://localhost:8000/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_query: userMessage }),
      });

      const data = await res.json();
      const reply =
        data.results?.length > 0
          ? JSON.stringify(data.results, null, 2)
          : "✅ Query executed successfully — no rows returned.";

      setMessages([...updatedMessages, { message: reply, sender: "assistant", direction: "incoming" }]);
    } catch (error) {
      setMessages([
        ...updatedMessages,
        { message: "❌ Sorry, something went wrong with your query. Please try again.", sender: "assistant", direction: "incoming" },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  // --- File upload handler
  const handleFileUpload = async (file) => {
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("http://localhost:8000/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw data;

      setMessages((prev) => [
        ...prev,
        { message: `✅ File "${file.name}" uploaded successfully!`, sender: "assistant", direction: "incoming" },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { message: "❌ Upload failed. Please make sure it's a CSV and try again.", sender: "assistant", direction: "incoming" },
      ]);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full h-[70vh] md:h-[75vh] max-w-3xl mx-auto border rounded-2xl shadow bg-white"
    >
      <MainContainer
  style={{
    borderRadius: "1rem",
    height: "100%",
    display: "flex",
    flexDirection: "column",
  }}
>
  <ChatContainer>
    <MessageList
      typingIndicator={
        isTyping ? <TypingIndicator content="Data Pal is thinking..." /> : null
      }
    >
      {messages.map((msg, idx) => (
        <Message key={idx} model={msg}>
          <Message.CustomContent>
            <pre
              className={`text-sm md:text-base font-mono ${
                msg.sender === "assistant" ? "text-gray-800" : "text-gray-900"
              } whitespace-pre-wrap break-words overflow-auto max-w-full`}
            >
              {msg.message}
            </pre>
          </Message.CustomContent>
        </Message>
      ))}
    </MessageList>

    <MessageInput
      placeholder="Ask a question about your data..."
      onSend={handleSend}
      attachButton={true}
      onAttachClick={handleAttachClick}
      style={{
        borderTop: "1px solid #e5e7eb",
        borderBottomLeftRadius: "1rem",
        borderBottomRightRadius: "1rem",
      }}
    />
  </ChatContainer>

  {/* ✅ Moved outside ChatContainer */}
  <input
    ref={fileInputRef}
    type="file"
    accept=".csv"
    style={{ display: "none" }}
    onChange={(e) => {
      const file = e.target.files?.[0];
      if (file) handleFileUpload(file);
      e.target.value = ""; // reset so same file can be reselected
    }}
  />
</MainContainer>

    </motion.div>
  );
}
