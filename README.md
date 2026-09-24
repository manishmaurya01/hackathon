# VeriWrite AI

**From Detection Scores to Explainable Evidence**

VeriWrite AI analyzes academic submissions for suspicious writing patterns and provides explainable evidence instead of relying only on a percentage score.

---

## Problem

AI-writing detectors usually return a single number — *"AI Generated: 92%"* — with no justification. That creates three concrete problems:

1. **A number cannot be reviewed.** An instructor has no way to check the claim, so the score becomes an accusation rather than a signal.
2. **False certainty causes harm.** Phrasing like *"definitely written by AI"* presents a probabilistic guess as fact, which is dangerous when a student's academic record is on the line.
3. **No actionable next step.** Even when a score is right, the reviewer still doesn't know *which* passage or *what* pattern triggered it, so they cannot have an informed conversation with the student.

## Solution

VeriWrite AI treats detection as an **evidence problem**, not a scoring problem.

Every submission is cleaned, split into numbered sections, and analyzed for concrete writing patterns. The result is a structured report containing:

- **AI-likelihood** expressed as `Unlikely / Low / Moderate / Elevated / High` — never a bare percentage.
- **Confidence** stated separately, so weak evidence cannot masquerade as a strong conclusion.
- **Signals** describing the specific pattern observed (repetition, uniform sentence structure, generic wording, formality shifts).
- **Evidence** quoting the exact excerpt, naming the section it came from, and explaining *why* it was flagged.
- **Recommendations** giving the reviewer a concrete next step.

If a model claims a high likelihood but supplies no supporting evidence, the report is **downgraded** rather than published — a report that cannot explain itself is not allowed to make a strong claim.

## Features

| # | Feature | Description |
|---|---------|-------------|
| 1 | **Signup / Login** | JWT sessions with bcrypt-hashed passwords (cost 12). |
| 2 | **Upload & Paste input** | PDF, DOCX and TXT upload, or paste text directly. Real extraction with corruption, binary, empty and size handling. |
| 3 | **OpenRouter analysis** | Dedicated service module; the API key never leaves the backend. |
| 4 | **AI-pattern & suspicious-pattern detection** | Detects uniform sentence structure, repetitive phrasing, templated wording, generic language, formality inconsistency and abrupt style shifts. |
| 5 | **Explainable report** | Section-level evidence explorer with quoted excerpts highlighted inline in the original text. |
| 6 | **Report history** | Searchable, filterable list with pagination. Full assignment bodies are excluded from list responses. |
| 7 | **Usage stats** | Real MongoDB aggregations — no hardcoded numbers. |
| 8 | **Integration / API docs** | Endpoint reference, copyable request/response examples, authentication guide. |
| 9 | **Settings & Profile** | Edit name/email, security summary, logout. |
| 10 | **Landing page** | Navbar, Features, How It Works, Integration sections. |

**Wording rules enforced throughout:** the UI and the model prompt never display "AI Generated: 92%" or claim work was "definitely written by AI".

## Tech Stack

**Frontend**

- React 18
- Vite
- JavaScript (ES Modules)
- Tailwind CSS
- React Router
- Lucide React
- Axios

**Backend**

- Node.js
- Express.js
- JavaScript (ES Modules)
- MongoDB + Mongoose
- Multer (uploads)
- JWT (`jsonwebtoken`)
- bcrypt
- pdf-parse (PDF), mammoth (DOCX)

**AI**

- OpenRouter only — model configurable via `OPENROUTER_MODEL`

## Architecture

```
┌──────────────────────────────┐        ┌───────────────────────────────┐
│  React SPA (Vite :5173)      │        │  Express API (:5000)          │
│                              │  HTTP  │                               │
│  Landing / Login / Signup    │───────▶│  /api/auth    JWT + bcrypt    │
│  Dashboard / Analyze         │  JSON  │  /api/analysis  create + read │
│  Reports / Report/:id        │  Bearer│  /api/reports  list/delete    │
│  Integration/Settings/Profile│◀───────│  /api/dashboard/stats         │
│                              │        │  /api/health                  │
└──────────────────────────────┘        └──────────────┬────────────────┘
                                                       │
                              ┌────────────────────────┼─────────────────┐
                              ▼                        ▼                ▼
                       ┌─────────────┐        ┌──────────────┐  ┌──────────────┐
                       │  MongoDB    │        │ extract svc  │  │  OpenRouter  │
                       │  users      │        │ PDF/DOCX/TXT │  │  service     │
                       │  reports    │        │ clean+split  │  │  (server-    │
                       └─────────────┘        └──────────────┘  │   side key)  │
                                                                └──────────────┘
```

**Analysis pipeline**

```
text/file → extract → clean → split sections
   → save Report (status: processing)
   → OpenRouter call (structured JSON)
   → validate + normalize
       · verify quotes are verbatim
       · resolve evidence to real section numbers
       · downgrade unsupported "High" claims (no evidence → no strong claim)
   → status: completed  |  status: failed (+ persisted error)
```

Failures are persisted as `failed` reports rather than silently discarded, so an interrupted analysis is visible in history instead of vanishing.

## Setup

### Prerequisites

- Node.js 18+
- MongoDB running locally (or an Atlas URI)
- An OpenRouter API key

### 1. Install

```bash
npm install            # root (concurrently)
cd backend  && npm install
cd ../frontend && npm install
```

### 2. Configure environment

Create `backend/.env`:

```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/veriwrite
JWT_SECRET=change-me-to-a-long-random-string
OPENROUTER_API_KEY=sk-or-...
OPENROUTER_MODEL=openai/gpt-4o-mini
CLIENT_URL=http://localhost:5173
MAX_FILE_SIZE=5242880
NODE_ENV=development
```

Create `frontend/.env`:

```env
VITE_API_URL=http://localhost:5000/api
```

> `.env` files are gitignored. `.env.example` files document every required variable.

### 3. Run

```bash
# from the repository root
npm run dev
```

Or start each service separately:

```bash
cd backend   && node src/server.js     # http://localhost:5000/api
cd frontend  && npm run dev            # http://localhost:5173
```

### 4. Verify

```bash
curl http://localhost:5000/api/health
```

```json
{ "success": true, "data": { "status": "up", "aiConfigured": true, "maxFileSize": 5242880 } }
```

`aiConfigured: false` means `OPENROUTER_API_KEY` is missing — analysis requests will return a real `503` rather than a fake success.

## Environment Variables

### Backend

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | Yes | API port (default `5000`). |
| `MONGODB_URI` | Yes | MongoDB connection string. |
| `JWT_SECRET` | Yes | Secret for signing JWTs. Use a long random value. |
| `OPENROUTER_API_KEY` | Yes | OpenRouter key. **Server-side only — never sent to the browser.** |
| `OPENROUTER_MODEL` | Yes | Model identifier, e.g. `openai/gpt-4o-mini`. |
| `CLIENT_URL` | Yes | Allowed CORS origin (default `http://localhost:5173`). |
| `MAX_FILE_SIZE` | No | Upload limit in bytes (default `5242880` = 5 MB). |
| `NODE_ENV` | No | `development` or `production`. |

### Frontend

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_URL` | Yes | API base URL, e.g. `http://localhost:5000/api`. |

## API Endpoints

Base URL: `http://localhost:5000/api`

Protected routes require `Authorization: Bearer <JWT>`.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/auth/signup` | None | Create an account, returns a JWT. |
| `POST` | `/api/auth/login` | None | Exchange credentials for a JWT. |
| `GET` | `/api/auth/me` | JWT | Read the authenticated user. |
| `POST` | `/api/analysis` | JWT | Analyze pasted text (`text`) or an uploaded file (`file`). |
| `POST` | `/api/analysis/extract` | JWT | Dry run: extract, clean and split without an AI call. |
| `GET` | `/api/analysis` | JWT | List your reports (search via `?q=`, filter via `?status=`). |
| `GET` | `/api/analysis/:id` | JWT | Fetch one full report. |
| `DELETE` | `/api/analysis/:id` | JWT | Delete one of your reports. |
| `GET` | `/api/dashboard/stats` | JWT | Real usage statistics + recent reports. |
| `GET` | `/api/health` | None | Service status and configuration. |

> Report read/delete endpoints are also available under `/api/reports` as aliases.

### Example request

```bash
curl -X POST http://localhost:5000/api/analysis \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>" \
  -d '{"text": "Assignment content..."}'
```

### Example response

```json
{
  "success": true,
  "message": "Analysis complete.",
  "data": {
    "status": "completed",
    "reportId": "66f1a2b3c4d5e6f7a8b9c0d1",
    "report": {
      "overallStatus": "Needs Attention",
      "aiLikelihood": "Elevated",
      "confidence": "Moderate",
      "sectionsFlagged": 3,
      "signals": [{ "type": "repetition", "severity": "medium", "label": "Repetitive phrasing" }],
      "evidence": [{ "section": 2, "text": "It is important to note that...", "confidence": "Moderate" }]
    }
  }
}
```

### Error responses

| Status | Code | Meaning |
|--------|------|---------|
| `400` | `INVALID_FILE_TYPE` | Only PDF, DOCX and TXT are accepted. |
| `400` | `TEXT_TOO_SHORT` | Fewer than 15 words. |
| `401` | — | Missing or invalid JWT. |
| `404` | — | Report not found, or owned by another user. |
| `413` | `FILE_TOO_LARGE` | Upload exceeds `MAX_FILE_SIZE`. |
| `429` | `AI_RATE_LIMITED` | OpenRouter rate limit reached. |
| `503` | `MISSING_API_KEY` | `OPENROUTER_API_KEY` not configured. |

Every report is scoped to its owner — another user receives `404` for both read and delete.

## Security

- **Passwords** hashed with bcrypt (cost 12) via a Mongoose pre-save hook.
- **Sessions** signed with JWT (7-day expiry).
- **API key** confined to `backend/src/services/openrouter.service.js`; never serialized to the client.
- **Authorization** enforced per document — `findOne({ _id, userId })` on every report read/delete.
- **Uploads** restricted by extension, MIME sniffing and size limit; binary and corrupt files rejected with clear errors.
- **Input validation** on every body and query, with length caps (`text` ≤ 60,000 chars).
- **Headers** hardened with Helmet; CORS restricted to the configured client origin.
- **Errors** return structured messages; stack traces are not leaked for handled errors.

## Future Enhancements

*Listed for roadmap purposes only — none of these are implemented in the MVP.*

- **Similarity detection** — cross-submission and web-source comparison.
- **Self-hosted models (e.g. Ollama)** — an alternative provider alongside OpenRouter.
- **Job queue (Redis / BullMQ)** — background processing for large batch uploads.
- **LMS integrations** — Canvas, Moodle and Blackboard plugins.
- **Webhooks** — push completed reports to external systems.
- **Typed SDKs** — Node and Python clients.
- **Model-ensemble scoring** — combine multiple models for stronger confidence estimates.

## Team

Built for a hackathon by the VeriWrite AI team.

- **Issue:** AI detectors give verdicts without proof.
- **Approach:** make every claim checkable — quote the text, name the section, state the confidence.

---

AI-detection is probabilistic. VeriWrite reports observed writing patterns and the evidence behind them — it is not a determination of misconduct.
