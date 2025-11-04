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

  const handleAttachClick = () => {
    console.log("Attach button clicked");
    console.log("fileInputRef current:", fileInputRef.current);
    if (fileInputRef.current) {
      console.log("Triggering file input click");
      fileInputRef.current.click();
    }
  };

  const handleSend = async (userMessage) => {
    if (!userMessage.trim()) return;

    const newMessage = { message: userMessage, sender: "user", direction: "outgoing" };
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
      let reply;

      if (Array.isArray(data.results) && data.results.length > 0) {
        reply = data.results
          .map((obj) =>
            Object.entries(obj)
              .map(([key, value]) => `${key}: ${value}`)
              .join("\n")
          )
          .join("\n\n");
      } else {
        reply = "✅ Query executed successfully — no rows returned.";
      }

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

  const handleFileUpload = async (file) => {
    if (!file) return;
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("http://localhost:8000/upload/", {
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
<div className="flex justify-center items-center h-screen">
  <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              style={{ display: "none" }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileUpload(file);
                e.target.value = "";
              }}
            />
  <motion.div
    initial={{ opacity: 0, y: 15 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4 }}
    className="border rounded-2xl shadow bg-white flex overflow-hidden"
    style={{
      width: "90vw",
      height: "95vh",
      maxWidth: "90vw",
      maxHeight: "95vh",
      marginLeft: "5vw"
    }}
  >

    <MainContainer
      style={{
        borderRadius: "1rem",
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <ChatContainer style={{ flexGrow: 1, overflow: "hidden" }}>
        <MessageList
          typingIndicator={
            isTyping ? <TypingIndicator content="Data Pal is thinking..." /> : null
          }
          style={{
            flexGrow: 1,
            overflowY: "auto",
            wordWrap: "break-word",
          }}
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
        </MainContainer>
      </motion.div>
    </div>
  );
}
