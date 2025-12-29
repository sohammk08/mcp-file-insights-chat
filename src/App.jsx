import {
  FaGithub,
  FaArrowUp,
  FaFilePdf,
  FaLinkedinIn,
  FaInfoCircle,
  FaQuestionCircle,
} from "react-icons/fa";
import { FiPaperclip } from "react-icons/fi";
import { GiPaperClip } from "react-icons/gi";
import { FaXTwitter } from "react-icons/fa6";
import { RiChatAiLine } from "react-icons/ri";
import { useState, useRef, useEffect } from "react";

function App() {
  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const [messages, setMessages] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [showLimitBanner, setShowLimitBanner] = useState(false);

  // Initialize state with localStorage values directly
  const [uploadBlocked, setUploadBlocked] = useState(
    () => localStorage.getItem("uploadBlocked") === "true"
  );
  const [queryLimitReached, setQueryLimitReached] = useState(
    () => localStorage.getItem("queryLimitReached") === "true"
  );
  const [queryCount, setQueryCount] = useState(() =>
    parseInt(localStorage.getItem("queryCount") || "0")
  );

  // Save limits to localStorage when they change
  useEffect(() => {
    localStorage.setItem("uploadBlocked", uploadBlocked);
    localStorage.setItem("queryLimitReached", queryLimitReached);
    localStorage.setItem("queryCount", queryCount.toString());
  }, [uploadBlocked, queryLimitReached, queryCount]);

  const handleFileClick = () => fileInputRef.current?.click();

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert("File too large — max 10MB");
        return;
      }

      setSelectedFile(file);
      setMessages([]);
      setIsLoading(true);

      // Upload PDF and get sessionId
      const formData = new FormData();
      formData.append("pdf", file);

      try {
        const API_URL = import.meta.env.VITE_API_URL;
        const res = await fetch(`${API_URL}/api/upload`, {
          method: "POST",
          body: formData,
        });
        const data = await res.json();

        if (data.success) {
          setSessionId(data.sessionId);
          setMessages([
            {
              role: "ai",
              content: "PDF uploaded successfully! Ask me anything about it.",
            },
          ]);
        } else {
          alert(`Upload failed: ${data.error}`);
          setSelectedFile(null);
          if (
            data.error.includes("upload") ||
            data.error.includes("Only 1 PDF")
          ) {
            setUploadBlocked(true);
          }
        }
      } catch (err) {
        alert("Network error during upload");
        setSelectedFile(null);
      }

      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!inputValue.trim()) return;
    if (!sessionId) {
      alert("Please upload a PDF first");
      return;
    }

    const userQuestion = inputValue.trim();
    setInputValue("");
    setIsLoading(true);
    setMessages((prev) => [
      ...prev,
      { role: "user", content: userQuestion },
      { role: "ai", content: "loading" },
    ]);

    try {
      const API_URL = import.meta.env.VITE_API_URL;
      const res = await fetch(`${API_URL}/api/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: sessionId,
          question: userQuestion,
        }),
      });
      const data = await res.json();

      if (data.success) {
        setMessages((prev) => [
          ...prev.slice(0, -1),
          { role: "ai", content: data.answer },
        ]);
        setQueryCount((prev) => prev + 1);
        if (queryCount + 1 >= 5) {
          setQueryLimitReached(true);
          setShowLimitBanner(true);
          setTimeout(() => setShowLimitBanner(false), 5000);
        }
      } else {
        setMessages((prev) => [
          ...prev.slice(0, -1),
          { role: "ai", content: `Error: ${data.error}` },
        ]);
        if (data.error.includes("query") || data.error.includes("Max 5")) {
          setQueryLimitReached(true);
          setShowLimitBanner(true);
          setTimeout(() => setShowLimitBanner(false), 6000);
        }
        if (data.error.includes("Session expired")) {
          setSessionId(null);
          setSelectedFile(null);
          setUploadBlocked(false);
        }
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev.slice(0, -1),
        { role: "ai", content: "Network error — trying to connect..." },
      ]);
    }

    setIsLoading(false);
  };

  // Auto-scroll to latest message
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const hasChatStarted = selectedFile || messages.length > 0;

  return (
    <div className="bg-black h-screen w-screen flex flex-col text-white">
      {showLimitBanner && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-red-600 text-white px-6 py-3 rounded-lg shadow-lg animate-pulse">
          Daily limit reached: Max 5 questions or 1 upload per day
        </div>
      )}
      {/* Header */}
      <div className="flex justify-between mt-8 mx-6">
        <h1 className="flex text-xl font-semibold">
          <RiChatAiLine className="mr-2 mt-1 text-2xl" />
          MCP File Insights Chat
        </h1>
        <span className="flex justify-center items-center bg-neutral-700 px-3 py-2 rounded-lg text-sm font-doto">
          Created by Sohamm Kulkarni
          <div className="flex -space-x-1.5 ml-4">
            {/* GitHub */}
            <div
              className="size-7 rounded-full bg-white ring-2 ring-neutral-700 cursor-pointer flex items-center justify-center"
              title="Open GitHub"
              onClick={() =>
                window.open("https://github.com/sohammk08", "_blank")
              }
            >
              <FaGithub className="size-5.5 text-black" />
            </div>

            {/* X (Twitter) */}
            <div
              className="size-7 rounded-full bg-black ring-2 ring-neutral-700 cursor-pointer flex items-center justify-center"
              title="Open X"
              onClick={() =>
                window.open("https://x.com/skulkarni2517", "_blank")
              }
            >
              <FaXTwitter className="size-5 p-0.5 text-white" />
            </div>

            {/* LinkedIn */}
            <div
              className="size-7 rounded-full bg-[#0A66C2] ring-2 ring-neutral-700 cursor-pointer flex items-center justify-center"
              title="Open LinkedIn"
              onClick={() =>
                window.open(
                  "https://www.linkedin.com/in/sohamm-kulkarni-1b418b292/",
                  "_blank"
                )
              }
            >
              <FaLinkedinIn className="size-5 p-0.5 text-white" />
            </div>
          </div>
        </span>
      </div>

      {/* Instructions Card — shown only before any file/chat */}
      {!hasChatStarted && (
        <div className="max-w-2xl mx-auto mt-12 p-8 bg-linear-to-tr from-yellow-500 via-purple-500 to-indigo-500 rounded-2xl shadow-2xl">
          <div className="flex items-center justify-center gap-3 mb-6">
            <FaFilePdf className="text-5xl" />
            <h1 className="text-4xl font-bold text-center">
              Upload Files, Get Answers
            </h1>
          </div>
          <ul className="space-y-4 text-lg font-medium max-w-md mx-auto">
            <li className="flex items-start gap-3">
              <GiPaperClip className="w-6 h-6 mt-1 shrink-0" />
              <span>Upload a PDF (max 10MB) using the clip icon</span>
            </li>
            <li className="flex items-start gap-3">
              <FaQuestionCircle className="w-6 h-6 mt-1 shrink-0" />
              <span>Ask questions about the document</span>
            </li>
            <li className="flex items-start gap-3">
              <FaInfoCircle className="w-6 h-6 mt-1 shrink-0" />
              <span>Limited to 1 upload/day & 5 queries (250 chars max)</span>
            </li>
          </ul>
        </div>
      )}

      {/* Chat Messages Area */}
      {hasChatStarted && (
        <div className="flex-1 overflow-y-auto px-4 mt-8 pb-32">
          <div className="max-w-3xl mx-auto space-y-4">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${
                  msg.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-xl px-5 py-3 rounded-2xl ${
                    msg.role === "user"
                      ? "bg-blue-600 text-white"
                      : "bg-neutral-800 text-gray-100"
                  }`}
                >
                  {msg.content === "loading" ? (
                    <div className="flex space-x-2">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-0"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-150"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-300"></div>
                    </div>
                  ) : (
                    <p className="text-base whitespace-pre-wrap">
                      {msg.content}
                    </p>
                  )}
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
        </div>
      )}

      {/* Input Container Card — EXACTLY YOUR ORIGINAL DESIGN, UNTOUCHED */}
      <div
        className={`relative mt-auto ${
          queryLimitReached || uploadBlocked ? "pointer-events-none" : ""
        }`}
      >
        <div className="bg-[#1e1e1e] rounded-3xl w-3xl mx-auto mb-4 flex flex-col">
          {selectedFile && (
            <div className="flex mx-auto text-center text-sm bg-neutral-700 text-gray-200 py-1 px-2 mt-3 rounded-full">
              <FaFilePdf className="mr-1 my-auto text-red-500/80" />
              Attached: {selectedFile.name}
            </div>
          )}

          <div className="flex items-center p-2 rounded-full mx-3 mt-3 border-2 border-neutral-700">
            <button
              onClick={uploadBlocked ? null : handleFileClick}
              className={`ml-1 ${
                uploadBlocked
                  ? "cursor-not-allowed opacity-50"
                  : "cursor-pointer"
              }`}
              title={
                uploadBlocked ? "Daily upload limit reached" : "Upload PDF"
              }
            >
              <FiPaperclip className="text-gray-300 text-base" />
            </button>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="application/pdf"
              className="hidden"
            />

            <input
              type="text"
              placeholder="Ask question here"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (!queryLimitReached && !isLoading) {
                    handleSubmit();
                  }
                }
              }}
              maxLength={250}
              disabled={queryLimitReached || uploadBlocked}
              className={`flex-1 outline-none border-none bg-transparent text-base placeholder-gray-300 text-gray-200 mx-3 ${
                queryLimitReached || uploadBlocked
                  ? "opacity-50 cursor-not-allowed"
                  : ""
              }`}
            />

            <button
              onClick={queryLimitReached || isLoading ? null : handleSubmit}
              disabled={isLoading || queryLimitReached}
              className={`p-2 rounded-full ml-2 ${
                queryLimitReached || isLoading
                  ? "bg-gray-600 opacity-50 cursor-not-allowed"
                  : "bg-blue-500 hover:bg-blue-600 cursor-pointer"
              }`}
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <FaArrowUp className="text-sm" />
              )}
            </button>
          </div>

          <div className="flex justify-between px-3 pb-3 mx-1 mt-2 text-xs text-gray-400">
            <span>characters: {inputValue.length}/250</span>
            <span>queries: {queryCount}/5</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
