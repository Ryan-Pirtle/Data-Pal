import React, { useState, useRef } from "react";
import { motion } from "framer-motion";
import { useEffect } from "react";
import TopBar from "./TopBar";


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
  const [plotMode, setPlotMode] = useState(false);

  const [messages, setMessages] = useState([
    {
      message: "Hi! I’m Data Pal. Ask me anything about your uploaded dataset.",
      sender: "assistant",
      direction: "incoming",
    },
  ]);

  const [tableData, setTableData] = useState(null);

  const [isTyping, setIsTyping] = useState(false);
  const fileInputRef = useRef(null);

  const handleAttachClick = () => {
    console.log("Attach button clicked");
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };


useEffect(() => {
  const latest = messages[messages.length - 1]
  if (!latest?.isPlot || !latest?.plot) return

  function loadAndRender() {
    const id = `plot-${latest.plot.root_id}`

    // clear container before embedding
    const el = document.getElementById(id)
    if (el) el.innerHTML = ""

    window.Bokeh.embed.embed_item(latest.plot, id)
  }

  if (!window.Bokeh) {
    const script = document.createElement("script")
    script.src = "https://cdn.bokeh.org/bokeh/release/bokeh-3.7.3.min.js"
    script.onload = loadAndRender
    document.body.appendChild(script)
  } else {
    loadAndRender()
  }
}, [messages])





  const handleSend = async (userMessage) => {
    if (!userMessage.trim()) return;

    const newMsg = { message: userMessage, sender: "user", direction: "outgoing" };
    setMessages((prev) => [...prev, newMsg]);
    setIsTyping(true);

    // Clear plot/table display for new queries
    setTableData(null);

    try {
      const res = await fetch("http://localhost:8000/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_query: userMessage, plot_mode: plotMode }),
      });

      const data = await res.json();
      console.log("Backend response:", data);
      // console.error("llm_code:\n", data?.detail?.llm_code);

      if (!res.ok) {
   console.error("PLOT ERROR:");
  console.error("error:", data?.detail?.error);
  console.error("exception:", data?.detail?.exception);
  console.error("llm_code:\n", data?.detail?.llm_code);
}
      // Backend may return
      // { text, table, plot_url }

      // Table mode
if (data.mode === "table" && Array.isArray(data.results)) {
  setMessages(prev => [
  ...prev,
  {
    sender: "assistant",
    direction: "incoming",
    isTable: true,
    table: data.results
  }
]);

}

// Plot mode
if (data.mode === "plot" && data.plot_json) {
  setMessages(prev => [
    ...prev,
    {
      sender: "assistant",
      direction: "incoming",
      isPlot: true,
      plot: data.plot_json,
      message: "✅ Plot generated"
    }
  ]);
}


    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { message: "Error processing your query.", sender: "assistant", direction: "incoming" },
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
        {
          message: `File "${file.name}" uploaded successfully.`,
          sender: "assistant",
          direction: "incoming",
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          message: "Upload failed. Please make sure it's a CSV.",
          sender: "assistant",
          direction: "incoming",
        },
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
          marginLeft: "5vw",
          marginTop: "2.5vh",
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
              {messages.map((msg, i) => (
                <Message key={i} model={msg}>
                  <Message.CustomContent>
  {msg.isPlot ? (
  <div id={`plot-${msg.plot.root_id}`} />
) : msg.isTable ? (
  <div className="overflow-auto max-h-64">
    <table className="table-auto border-collapse w-full text-sm">
      <thead>
        <tr>
          {Object.keys(msg.table[0]).map(col => (
            <th key={col} className="border px-2 py-1 bg-gray-100">{col}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {msg.table.map((row, i) => (
          <tr key={i}>
            {Object.values(row).map((val, j) => (
              <td key={j} className="border px-2 py-1">
                {String(val)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
) : (
  <pre className="text-sm md:text-base font-mono whitespace-pre-wrap break-words">
    {msg.message}
  </pre>
)}

</Message.CustomContent>
                </Message>
              ))}
            </MessageList>

            <MessageInput
              placeholder="Ask a question about your data..."
              onSend={handleSend}
              attachButton={true}
              onAttachClick={handleAttachClick}
            />
          </ChatContainer>

          

        

          <div className="p-2 border-t">
            <button
              className="px-3 py-1 rounded"
              style={{ backgroundColor: "rgb(198, 227, 250)", color: "black" }}
              onClick={() => {
                setPlotMode((prev) => !prev);
                console.log("Plot mode:", !plotMode);
              }}
            >
              {plotMode ? "Switch to Table Mode" : "Switch to Plot Mode"}
            </button>
            
          </div>
        </MainContainer>
      </motion.div>
    </div>
  );
}