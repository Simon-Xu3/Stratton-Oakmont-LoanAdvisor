# Bank Loan Document Verification MVP

This project is a loan document pre-screening demo. A user selects sample JSON/CSV documents in the browser, the frontend reads and parses those files, the backend stores structured data in PostgreSQL, deterministic rules verify the application, and a small RAG flow asks an OpenAI model to explain the result with policy references.

The system does not approve or reject loans. It only produces a pre-screening status and reviewer-facing explanation.

## What It Does

- Creates a loan application record.
- Reads application form JSON, payslip JSON, and bank statement CSV in the browser.
- Sends parsed JSON data to the backend instead of uploading raw files.
- Stores applications, parsed documents, bank transactions, and verification results in PostgreSQL.
- Runs rule-based checks for document completeness, name match, employer match, income match, and salary stability.
- Generates structured RAG policy analysis with OpenAI.

## Current Backend Structure

The backend is intentionally simple:

```text
server/
├── server.js        # Express app, API routes, request flow
├── database.js      # PostgreSQL connection and schema setup
├── verification.js  # deterministic verification rules
└── ai.js            # policy corpus, policy retrieval, OpenAI RAG call
```

There is no separate controller/service/router layer. The API flow is kept in `server.js` so the request path is easy to follow.

## Upload And Verification Flow

```text
User selects files
→ frontend reads file.text()
→ frontend parses JSON/CSV
→ POST /api/applications/intake
→ backend creates application
→ backend saves parsed documents
→ backend saves bank transactions
→ backend runs verification rules
→ frontend opens /result/:id
→ frontend calls policy explanation API
→ backend retrieves matching policies
→ backend calls OpenAI
→ frontend displays structured AI analysis
```

Important: raw files are not stored. The database stores file names and parsed structured data.

## RAG Output

`GET /api/applications/:id/policy-explanation` returns structured JSON:

```json
{
  "applicationId": 1,
  "status": "manual_review_required",
  "relatedPolicies": [],
  "summary": "Income evidence does not match the declared income.",
  "riskLevel": "high",
  "explanation": "The policy reason for the review result.",
  "recommendedActions": ["Request updated income evidence."],
  "requiredDocuments": ["Recent payslip", "Bank statement"]
}
```

The rules decide the application status. RAG only retrieves policy context and explains the result.

## API Routes

```text
GET  /api/health
POST /api/applications
POST /api/applications/intake
POST /api/applications/:id/verify
GET  /api/applications/:id/policy-explanation
GET  /api/applications/:id
```

## Tech Stack

- React
- TypeScript
- Vite
- Tailwind CSS
- Express
- PostgreSQL
- OpenAI Responses API

## Environment Variables

Create `.env` from `.env.example`:

```bash
cp .env.example .env
```

Required for local development:

```env
PORT=3000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/loan_verification
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5-mini
```

Do not commit a real `OPENAI_API_KEY`.

The current local backend script uses the local proxy at `http://127.0.0.1:7897` for OpenAI API calls.

## Setup

Install dependencies:

```bash
npm install
```

Start PostgreSQL:

```bash
docker compose up -d
```

Create database tables:

```bash
npm run db:setup
```

Run type checks:

```bash
npm test
```

Start the app:

```bash
npm run dev
```

Build the frontend:

```bash
npm run build
```

Production-style run:

```bash
npm run build
npm start
```

## Default URLs

- Development app: `http://localhost:5173`
- Development API: proxied from `/api` to `http://localhost:3000/api`
- Production app and API: `http://localhost:3000`
- Health check: `http://localhost:3000/api/health`
- PostgreSQL: `localhost:5432`

If port `5173` is already in use, Vite will automatically choose the next available port.

## Sample Data

Sample files are under `sample-data/`:

```text
sample-data/
├── passed/
├── missing-documents/
└── income-mismatch/
```

Use these files on the upload page to demo the three main verification outcomes.
