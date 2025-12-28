import "dotenv/config";
import cors from "cors";
import axios from "axios";
import multer from "multer";
import express from "express";
import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";

const app = express();
const PORT = 5000;

// Initialize Upstash Redis
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

// Persistent rate limiters using Upstash
const uploadLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(1, "24 h"),
  prefix: "ratelimit:upload",
});

const queryLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "24 h"),
  prefix: "ratelimit:query",
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

// Multer config
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed"), false);
    }
  },
});

// Health check
app.get("/health", (req, res) => res.send("OK"));

// Main query endpoint with persistent rate limiting
app.post("/api/query", upload.single("pdf"), async (req, res) => {
  const ip = req.ip || req.headers["x-forwarded-for"] || "anonymous";

  try {
    // Always check upload limit (1 per day)
    const uploadResult = await uploadLimiter.limit(ip);
    if (!uploadResult.success) {
      return res.status(429).json({
        error: "Only 1 PDF upload allowed per day.",
      });
    }

    // Check query limit only if PDF is uploaded
    if (req.file) {
      const queryResult = await queryLimiter.limit(ip);
      if (!queryResult.success) {
        return res.status(429).json({
          error: "Daily query limit reached: Max 5 questions per day.",
        });
      }
    }

    const { question } = req.body;

    if (!question || question.trim().length === 0 || question.length > 250) {
      return res.status(400).json({
        error: "Question must be 1–250 characters",
      });
    }

    if (!req.file) {
      return res.status(400).json({ error: "PDF file is required" });
    }

    const pdfParse = (await import("pdf-parse")).default;
    const pdfData = await pdfParse(req.file.buffer);
    const pdfText = pdfData.text.slice(0, 30000);

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
    console.error("Error:", error);

    const errorMessage =
      error.response?.data?.error?.message || error.message || "Server error";

    res.status(500).json({ error: errorMessage });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Backend running on port ${PORT}`);
});
