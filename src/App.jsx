import {
  FaArrowUp,
  FaFilePdf,
  FaInfoCircle,
  FaQuestionCircle,
} from "react-icons/fa";
import { useState } from "react";
import { FiPaperclip } from "react-icons/fi";
import { GiPaperClip } from "react-icons/gi";
import { RiChatAiLine } from "react-icons/ri";

function App() {
  const [inputValue, setInputValue] = useState("");

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
  };

  return (
    <div className="bg-black h-screen w-screen flex flex-col">
      <div className="flex justify-between mt-8 mx-6">
        <h1 className="flex text-white text-center font-poppins text-xl font-semibold flex-none">
          <RiChatAiLine className="mr-2 mt-1" />
          MCP File Insights Chat
        </h1>
        <span className="bg-neutral-700 text-white font-medium font-doto px-3 py-2 rounded-lg flex items-center text-base">
          Created by Sohamm Kulkarni
        </span>
      </div>

      {/* Usage/Definitions */}
      <div className="bg-linear-to-tr w-full max-w-2xl from-yellow-400 via-purple-400 to-indigo-300 p-8 mx-auto mt-46 rounded-2xl shadow-2xl">
        <div className="flex items-center justify-center gap-3 mb-6">
          <FaFilePdf className="text-white text-5xl" />
          <h1 className="text-4xl text-center text-white font-poppins font-bold">
            Upload Files, Get Answers
          </h1>
        </div>
        <ul className="text-white text-lg space-y-4 font-medium max-w-md mx-auto leading-relaxed">
          <li className="flex items-start gap-3">
            <GiPaperClip className="w-6 h-6 mt-1 shrink-0" />
            <span>Upload a PDF file (max 10MB) via the clip icon</span>
          </li>
          <li className="flex items-start gap-3">
            <FaQuestionCircle className="w-6 h-6 mt-1 shrink-0" />
            <span>Ask questions about the uploaded file</span>
          </li>
          <li className="flex items-start gap-3">
            <FaInfoCircle className="w-6 h-6 mt-1 shrink-0" />
            <span>
              Keep in mind that you are limited to 1 file upload per day and 5
              queries (max 250 characters)
            </span>
          </li>
        </ul>
      </div>

      {/* Input area */}
      <div className="flex-1" />
      <div className="bg-[#1e1e1e] rounded-3xl w-3xl mx-auto mb-4 flex flex-col">
        <div className="flex items-center p-2 rounded-full mx-3 mt-3 border-2 border-neutral-700">
          <FiPaperclip className="text-gray-300 text-base mr-2 ml-1 cursor-pointer" />
          <input
            type="text"
            placeholder="Ask question here"
            value={inputValue}
            onChange={handleInputChange}
            maxLength={250}
            className="flex-1 outline-none border-none bg-transparent text-base placeholder-gray-300"
          />
          <button className="p-2 bg-blue-500 text-white rounded-full ml-2">
            <FaArrowUp className="text-sm" />
          </button>
        </div>

        {/* Character and query limit indicators */}
        <div className="flex justify-between px-3 pb-3 mx-1 mt-2 text-xs text-gray-400">
          <span>characters: {inputValue.length}/250</span>
          <span>query limit: 0/5</span>
        </div>
      </div>
    </div>
  );
}

export default App;
