import "dotenv/config";
import cors from "cors";
import axios from "axios";
import multer from "multer";
import express from "express";
import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";

const app = express();
const PORT = process.env.PORT || 5000;
const SESSION_TTL = 24 * 60 * 60; // 24 hours in seconds

// Upstash Redis
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

// Per-IP limits
const ipUploadLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(1, "24 h"),
  prefix: "ratelimit:ip_upload",
});

async function storePDFSession(sessionId, pdfText) {
  await redis.set(`pdf_session:${sessionId}`, pdfText, { ex: SESSION_TTL });
}

async function getPDFSession(sessionId) {
  return await redis.get(`pdf_session:${sessionId}`);
}

const ipQueryLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "24 h"),
  prefix: "ratelimit:ip_query",
});

// Global limits (across all users)
const globalUploadLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(50, "24 h"),
  prefix: "ratelimit:global_upload",
});

// Middleware
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://mcp-file-insights-chat.vercel.app",
    ],
  })
);
app.use(express.json());

// Multer
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") cb(null, true);
    else cb(new Error("Only PDF files are allowed"), false);
  },
});

// Health check
app.get("/health", (req, res) => res.send("OK"));

// UPLOAD endpoint - handles PDF upload once
app.post("/api/upload", upload.single("pdf"), async (req, res) => {
  const ip = req.ip || req.headers["x-forwarded-for"] || "anonymous";

  try {
    // 1. Global upload limit (50/day total)
    const globalResult = await globalUploadLimiter.limit("global");
    if (!globalResult.success) {
      return res.status(429).json({
        error: "Universal file upload limit reached 📈",
      });
    }

    // 2. Per-IP upload limit (1/day)
    const ipUploadResult = await ipUploadLimiter.limit(ip);
    if (!ipUploadResult.success) {
      return res.status(429).json({
        error: "Only 1 PDF upload allowed per day.",
      });
    }

    // Validation
    if (!req.file) {
      return res.status(400).json({ error: "PDF file is required" });
    }

    // Process PDF
    const pdfParse = (await import("pdf-parse")).default;
    const pdfData = await pdfParse(req.file.buffer);
    const pdfText = pdfData.text.slice(0, 30000);

    // Generate sessionId and store in Redis
    const sessionId = `${ip}_${Date.now()}`;
    await storePDFSession(sessionId, pdfText);

    res.json({ success: true, sessionId });
  } catch (error) {
    console.error("Upload Error:", error);
    const errorMessage =
      error.response?.data?.error?.message || error.message || "Server error";
    res.status(500).json({ error: errorMessage });
  }
});

// QUERY endpoint - handles questions using sessionId
app.post("/api/query", async (req, res) => {
  const ip = req.ip || req.headers["x-forwarded-for"] || "anonymous";

  try {
    const { sessionId, question } = req.body;

    // Validation
    if (!sessionId) {
      return res.status(400).json({ error: "Session ID is required" });
    }
    if (!question || question.trim().length === 0 || question.length > 250) {
      return res
        .status(400)
        .json({ error: "Question must be 1–250 characters" });
    }

    // Per-IP query limit (5/day)
    const ipQueryResult = await ipQueryLimiter.limit(ip);
    if (!ipQueryResult.success) {
      return res.status(429).json({
        error: "Daily query limit reached: Max 5 questions per day.",
      });
    }

    // Retrieve PDF text from Redis
    const pdfText = await getPDFSession(sessionId);
    if (!pdfText) {
      return res.status(404).json({
        error: "Session expired or invalid. Please re-upload your PDF.",
      });
    }

    // Query Groq
    const groqRes = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: "Answer based only on the provided PDF content.",
          },
          {
            role: "user",
            content: `PDF content:\n${pdfText}\n\nQuestion: ${question}`,
          },
        ],
        max_tokens: 1024,
        temperature: 0.7,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const answer = groqRes.data.choices[0].message.content.trim();
    res.json({ success: true, answer });
  } catch (error) {
    console.error("Query Error:", error);
    const errorMessage =
      error.response?.data?.error?.message || error.message || "Server error";
    res.status(500).json({ error: errorMessage });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Backend running on port ${PORT}`);
});
