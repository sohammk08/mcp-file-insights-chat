# MCP File Insights Chat

## Overview

MCP File Insights Chat is a full-stack web application that allows users to upload PDF documents and ask questions about their content. The app processes the PDF, extracts text, and uses AI to provide accurate answers based on the document. It features a clean, dark-themed interface inspired by modern chat apps, with rate limiting to prevent abuse.

The project uses a React frontend for interactive UI and an Express backend for handling uploads, queries, and AI integration. It ensures secure, persistent limits using Redis and supports deployment on popular platforms.

## Features

- **PDF Upload**: Users can upload PDFs up to 10MB via a simple clip icon.
- **Q&A Chat**: Ask up to 5 questions per uploaded document; AI responds based on PDF content.
- **Rate Limiting**: Per-IP: 1 upload and 5 queries per day; global: 50 uploads per day across all users.
- **Persistent Sessions**: Upload once, ask follow-ups without resending PDF.
- **UI Enhancements**: Auto-scroll chat, loading indicators, limit banners, disabled inputs on limits reached.
- **Social Links**: Header with GitHub, X (Twitter), and LinkedIn icons for creator.
- **Local Persistence**: Limit states saved in localStorage to survive refreshes.

## Architecture

The app follows a client-server model:

- **Frontend (React + Vite)**: Handles UI, file uploads, chat display, and user interactions. Uses TailwindCSS for styling, react-icons for icons, and fetch for API calls. States manage messages, limits, and session ID. Persistent storage via localStorage for rate limits.
- **Backend (Express.js)**: Processes PDF uploads, extracts text using pdf-parse, stores in Redis with session ID. Handles queries by retrieving stored text and calling Groq API for AI responses. Uses Upstash Redis for rate limiting (per-IP and global). No disk storage — all in-memory/Redis for Render compatibility.
- **Communication**: Frontend sends PDF to `/api/upload` (gets sessionId), then questions to `/api/query` with sessionId. Backend enforces limits before processing.

## Services Used

- **Groq API**: For AI model (llama-3.3-70b-versatile) to generate answers from PDF text.
- **Upstash Redis**: Persistent storage for rate limits, PDF text, and sessions (24-hour TTL).
- **Render.com**: Hosts backend (auto-deploys from GitHub).
- **Vercel**: Hosts frontend (auto-builds React app).
- **UptimeRobot**: Optional to ping /health every 5 minutes, keeping Render instance awake.

## Setup Locally

### Prerequisites

- Node.js (v20+ recommended)
- pnpm (package manager)
- Git
- Accounts: Groq (for API key), Upstash (for Redis — optional for local, required for production)

Clone the repo:

```bash
git clone https://github.com/sohammk08/mcp-file-insights-chat.git
cd mcp-file-insights-chat
```

### Backend Setup

1. Navigate to backend:

   ```bash
   cd backend
   ```

2. Install dependencies:

   ```bash
   pnpm install
   ```

3. Create `.env` file in backend folder (example):

   ```
   PORT=5000
   GROQ_API_KEY=gsk_your_groq_key_here
   UPSTASH_REDIS_REST_URL=your_upstash_url_here
   UPSTASH_REDIS_REST_TOKEN=your_upstash_token_here
   ```

4. Run backend:
   ```bash
   node index.js
   ```
   Backend runs on http://localhost:5000. Test /health endpoint.

### Frontend Setup

1. Navigate to root (frontend):

   ```bash
   cd ..
   ```

2. Install dependencies:

   ```bash
   pnpm install
   ```

3. Create `.env` file in root (example):

   ```
   VITE_API_URL=http://localhost:5000
   ```

4. Run frontend:
   ```bash
   pnm run dev
   ```
   Frontend runs on http://localhost:5173. Connects to local backend.

### Running the App

- Open frontend in browser.
- Upload PDF via clip icon (calls /api/upload).
- Ask questions (calls /api/query with sessionId).
- Limits enforced server-side; frontend disables UI on errors.

For full production behavior locally, set Upstash vars (limits use in-memory fallback without them).

## Deployment

- **Backend (Render)**: Connect GitHub repo, set root to backend, runtime Node, build `pnpm install`, start `pnpm start`. Add env vars (GROQ_API_KEY, Upstash).
- **Frontend (Vercel)**: Connect GitHub, set VITE_API_URL to Render URL, build with pnpm.
- **UptimeRobot**: Ping Render /health every 5 minutes to avoid sleep.
- **Upstash**: Create free Redis DB, add vars to Render.

## Usage

- Upload PDF: Click clip, select file.
- Ask questions: Type and send (Enter or button).
- Limits: 1 upload + 5 queries per day per IP; 50 global uploads/day.
- Refresh: Limits persist via localStorage (UI disabled if exceeded).

## Limitations

- Free tiers: Render sleeps after 15 minutes (use UptimeRobot); Upstash free has 10k commands/day.
- PDF size: Max 10MB; text extraction limited to ~30k chars.
- AI: Answers based only on PDF; no external knowledge.
- No user accounts — IP-based limits.

## License

MIT License. Feel free to fork and improve.

For questions, contact via LinkedIn or GitHub.
