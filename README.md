# Stratton Oakmont Loan Advisor

[![AWS EC2](https://img.shields.io/badge/Deployed%20on-AWS%20EC2-FF9900?logo=amazonec2&logoColor=white)](#cloud-deployment)
![Amazon Linux](https://img.shields.io/badge/Server-Amazon%20Linux-232F3E?logo=amazonaws&logoColor=white)
![Nginx](https://img.shields.io/badge/Reverse%20Proxy-Nginx-009639?logo=nginx&logoColor=white)

An AI-assisted workspace for reviewing loan application files, checking supporting documents, and turning policy rules into clear guidance for human reviewers.

> **Important:** This project is a pre-screening demonstration. It does not approve or reject loans, replace underwriting, or make a final lending decision.

The showcase build is deployed on **AWS EC2 running Amazon Linux**. Nginx receives public traffic and forwards it to a production Node.js service that serves both the REST API and the compiled React application.

![Stratton Oakmont Loan Advisor overview](<showcase images/Screenshot 2026-08-08 at 9.43.06 PM.png>)

## Why This Project Exists

Loan review often requires people to move between application forms, payslips, bank statements, policy documents, and internal checklists. The difficult part is not simply collecting the data—it is finding inconsistencies and explaining what they mean.

Stratton Oakmont Loan Advisor explores a practical way to make that process easier:

- deterministic rules handle facts that should be repeatable and auditable;
- policy retrieval supplies the relevant review context;
- AI turns those facts and policies into concise, reviewer-friendly guidance;
- a human remains responsible for the actual lending decision.

The core idea is to use AI for explanation, not authority. Rules determine the pre-screening status; the model explains the result, while retrieved sample policies define next steps.

## What the Website Does

- Captures applicant, employer, income, loan amount, and address information.
- Accepts an application form in JSON, a payslip in JSON, and a bank statement in CSV format.
- Parses files in the browser and sends structured data to the API.
- Stores applications, extracted document data, transactions, and verification results in PostgreSQL.
- Checks document completeness, applicant identity, employer consistency, income consistency, and salary history.
- Assigns one of three pre-screening outcomes: `verification_passed`, `additional_documents_required`, or `manual_review_required`.
- Retrieves policies related to the verification results.
- Uses the OpenAI Responses API for a structured explanation. Rule results and sample policy clauses supply the risk level, recommended actions, and document requests.
- Lets reviewers re-run verification on the saved application.

## Product Tour

### 1. Start from a focused review workspace

The landing page explains the three-part workflow: capture an application, run deterministic checks, and generate AI-assisted guidance.

![Landing page and review workflow](<showcase images/Screenshot 2026-08-08 at 9.43.06 PM.png>)

### 2. Create the review file

Reviewers enter the application details and attach up to three supporting files. The sample form is pre-filled so the demo can be explored quickly.

![Application intake form and document uploads](<showcase images/Screenshot 2026-08-08 at 9.43.17 PM.png>)

The browser reads and parses the selected files. Raw file binaries are not stored by the backend; only the file names and extracted structured data are submitted.

### 3. Follow the analysis state

The result page gives immediate loading feedback while it retrieves the saved application and asks the AI service for a policy explanation.

![AI review loading state](<showcase images/Screenshot 2026-08-08 at 9.43.55 PM.png>)

### 4. Review the application summary

The result view brings together the overall status, borrower details, requested amount, uploaded-document count, and average salary calculated from bank transactions.

![Application summary with a passed verification status](<showcase images/Screenshot 2026-08-08 at 9.44.06 PM.png>)

### 5. Inspect every deterministic check

Each rule reports its own status and a short explanation. This keeps the automated result understandable and makes it easier for a reviewer to identify exactly what needs attention.

![Detailed rule-based verification results](<showcase images/Screenshot 2026-08-08 at 9.44.15 PM.png>)

The current rules evaluate:

| Check | What it looks for |
| --- | --- |
| Document completeness | Application form, payslip, and bank statement are present |
| Name match | Applicant name matches the payslip |
| Employer match | Application and payslip refer to the same employer |
| Payslip income match | Payslip income is reasonably close to declared income |
| Bank income match | Average salary deposits are reasonably close to declared income |
| Salary stability | Salary records cover at least three distinct months |

Income gaps above 10% request more documents, while gaps above 15% require manual review. Any manual-review result takes priority over a missing-document result when the final status is calculated.

### 6. Turn policy context into useful guidance

The review section shows a rule-based risk level, a short summary, an AI explanation, policy-defined actions and document requests, and the policies used as context. If AI is unavailable, the page still shows the verification checks and policy guidance with a clear warning.

![AI-generated risk guidance and related lending policies](<showcase images/Screenshot 2026-08-08 at 9.44.25 PM.png>)

The model receives only verification check names, outcomes, details, and matched sample policy text. Applicant names, employer names, loan amounts, and uploaded documents are not included in the AI request. It is explicitly instructed not to approve or reject the loan.

## How It Works

```mermaid
flowchart LR
    A[Reviewer enters application details] --> B[Browser parses JSON and CSV]
    B --> C[Express intake API]
    C --> D[(PostgreSQL)]
    C --> E[Deterministic verification]
    E --> D
    D --> F[Policy retrieval by check and outcome]
    F --> G[OpenAI structured analysis]
    G --> H[Human-readable review guidance]
    E --> H
    H --> I[Human reviewer]
```

1. The React client reads the selected files with the browser `File` API.
2. JSON documents are parsed directly; CSV rows are converted into normalized bank transactions.
3. `POST /api/applications/intake` creates the application and stores its structured document data.
4. The backend runs all verification rules and persists each individual result.
5. The result page loads the application and requests its policy explanation.
6. The backend matches policy entries to the rule names and outcomes.
7. The OpenAI Responses API returns an explanation constrained by a strict JSON schema. Successful explanations are cached for five minutes to reduce repeated API calls.
8. The UI presents the rule results, policy-defined actions and document requests, and the AI explanation. Rule results appear while the explanation is still loading.

## Design Principles

### Rules make decisions; AI explains them

Checks such as identity matching and income thresholds should produce the same output for the same data. Keeping those checks in normal application code makes them easy to inspect, test, and change. The AI layer cannot override their status.

### Human review stays in the loop

The interface uses language such as “review guidance” and “manual review required” because the system is designed to support a reviewer, not replace one. Credit, affordability, fraud, compliance, and final underwriting checks remain outside this demo.

### Show the evidence behind the summary

The UI displays every rule result and every retrieved policy alongside the generated guidance. A reviewer can see why the system reached its pre-screening status instead of receiving only an opaque score.

### Keep data handling simple for the prototype

Documents are parsed client-side, and the server stores structured content rather than raw uploaded files. This makes the demo flow easy to understand. A production implementation would still need stronger validation, encryption, access controls, retention policies, audit logs, malware scanning, and secure document storage.

## Technology Stack

| Layer | Technology | Purpose |
| --- | --- | --- |
| Frontend | React 18 + TypeScript | Component-based, type-safe user interface |
| Routing | React Router | Landing, intake, and result routes |
| Styling | Tailwind CSS | Responsive layout and visual design |
| Icons | Lucide React | Lightweight interface icons |
| HTTP client | Axios | Typed requests to the backend API |
| Build tooling | Vite 6 | Development server and production build |
| Backend | Node.js + Express | REST API and production static-file server |
| Database | PostgreSQL 16 + `pg` | Applications, documents, transactions, and checks |
| Local database image | pgvector/pgvector | PostgreSQL-compatible Docker image; vector search is not used yet |
| AI | OpenAI Responses API | Schema-constrained policy explanation |
| Local orchestration | Docker Compose + concurrently | Database and combined client/server development workflow |
| Cloud hosting | AWS EC2 | Hosts the live full-stack application |
| Server OS | Amazon Linux | Production Linux environment and service management |
| Production web service | Nginx + systemd | Reverse proxy, process supervision, and restart on boot |

Policy retrieval uses 22 versioned sample clauses in `server/policies.json`, covering missing documents, identity and employer checks, income gaps at both configured thresholds, missing bank salary data, salary history, and passed checks. The backend matches clauses to verification check names, outcomes, and relevant result details, prioritizing checks that need action. Recommendations and document requests are selected from explicit policy fields and cite their policy and check; the model cannot add new ones. The review status and risk level come from deterministic verification results. The corpus is demonstration material, not real bank policy. Embeddings and vector search are not used yet.

## Project Structure

```text
.
├── database/
│   └── schema.sql              # PostgreSQL tables and indexes
├── sample-data/
│   ├── passed/                 # Complete application with matching income
│   ├── missing-documents/      # Scenario requiring more evidence
│   └── income-mismatch/        # Scenario requiring manual review
├── server/
│   ├── ai.js                   # Policy corpus, retrieval, and OpenAI request
│   ├── database.js             # PostgreSQL connection and schema setup
│   ├── server.js               # Express routes and application data flow
│   └── verification.js         # Deterministic verification rules
├── showcase images/            # Screenshots used in this README
├── src/
│   ├── api/                    # Frontend API client and file parsing
│   ├── components/             # Reusable UI components
│   ├── pages/                  # Home, intake, and result screens
│   ├── styles/                 # Global Tailwind styles
│   ├── App.tsx                 # Client-side routes
│   └── types/                  # Shared frontend TypeScript models
├── docker-compose.yml
├── package.json
└── vite.config.ts
```

## Getting Started

### Prerequisites

- Node.js 18 or newer
- npm
- Docker with Docker Compose
- An OpenAI API key for optional AI explanation; rule and policy guidance still works without one

### 1. Install dependencies

```bash
npm install
```

### 2. Configure the environment

```bash
cp .env.example .env
```

Then add your API key to `.env`:

```env
PORT=3000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/loan_verification
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-5-mini
```

Never commit a real `OPENAI_API_KEY`.

The development server connects to the OpenAI API directly. If your network requires a proxy, configure it explicitly in your own environment before starting the server.

### 3. Start PostgreSQL

```bash
docker compose up -d
```

### 4. Create the database schema

```bash
npm run db:setup
```

### 5. Start the application

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). Vite proxies `/api` requests to the development Express server at `http://localhost:8765`. `npm start` still uses `PORT` from `.env` (default 3000).

## Cloud Deployment

This project goes beyond a local prototype: the showcase version is deployed as a live full-stack application on an **AWS EC2 instance running Amazon Linux**.

```mermaid
flowchart LR
    U[Public web traffic] --> N[Nginx reverse proxy]
    subgraph EC2[AWS EC2 · Amazon Linux]
        N --> A[Node.js and Express]
        A --> F[Production React build]
        S[systemd] -->|keeps running| A
    end
    A --> P[(PostgreSQL)]
    A --> O[OpenAI Responses API]
```

### Deployment highlights

- Provisioned and configured an Amazon Linux EC2 server.
- Built the React and TypeScript frontend into production-ready static assets with Vite.
- Used Express to serve the compiled frontend and REST API from one application.
- Configured Nginx as the public-facing reverse proxy.
- Managed the Node.js process with systemd so it starts on boot and restarts after failures.
- Connected the deployed application to PostgreSQL and the OpenAI Responses API through production environment variables.
- Configured EC2 networking and security-group access for the public website while keeping internal application ports behind Nginx.

This deployment demonstrates ownership of the complete delivery path—from frontend and backend development to Linux server configuration and cloud hosting—not just running the project on a local development machine.

## Try the Demo Scenarios

Open **Create AI Review**, keep or edit the pre-filled applicant details, and upload files from one of these folders:

| Scenario | Folder | Expected outcome |
| --- | --- | --- |
| All checks pass | `sample-data/passed/` | `verification_passed` |
| Evidence is missing | `sample-data/missing-documents/` | `additional_documents_required` |
| Income does not match | `sample-data/income-mismatch/` | `manual_review_required` |

Each folder contains an application JSON file and the relevant supporting files. The application JSON is uploaded as the application-form document; the editable fields in the web form are still the source of the application record itself.

## Available Commands

| Command | Description |
| --- | --- |
| `npm run dev` | Run the Express API and Vite client together |
| `npm run dev:server` | Run only the backend in development mode |
| `npm run dev:client` | Run only the Vite frontend |
| `npm run db:setup` | Apply the PostgreSQL schema |
| `npm run typecheck` | Check the TypeScript frontend |
| `npm test` | Run TypeScript checking and focused policy/API fallback tests |
| `npm run build` | Type-check and create the frontend production build |
| `npm start` | Serve the API and an existing `dist/` build on port 3000 |
| `npm run preview` | Build the frontend and start the production-style server |

## API Overview

All successful responses use `{ "data": ..., "error": null }`. Errors use `{ "data": null, "error": { "code": "...", "message": "..." } }`.

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/health` | Check the API and database connection |
| `POST` | `/api/applications` | Create an application without documents |
| `POST` | `/api/applications/intake` | Create an application, save parsed documents, and run checks |
| `POST` | `/api/applications/:id/verify` | Re-run deterministic verification |
| `GET` | `/api/applications/:id` | Retrieve an application and all saved review data |
| `GET` | `/api/applications/:id/policy-explanation` | Retrieve related policies and generate AI guidance |

Example policy-explanation response:

```json
{
  "data": {
    "applicationId": 3,
    "status": "additional_documents_required",
    "relatedPolicies": [
      {
        "id": "SAL-001",
        "title": "Short Salary History",
        "version": "demo-v2",
        "source": "Sample policy corpus for demonstration",
        "content": "If salary deposits appear in fewer than three distinct months, request additional salary history before relying on income stability.",
        "appliesTo": [{ "checkName": "salary_stability", "results": ["additional_documents_required"] }],
        "documents": ["Additional salary history."]
      }
    ],
    "summary": "Additional evidence is needed for: salary stability.",
    "riskLevel": "medium",
    "guidanceSource": "ai",
    "warning": null,
    "explanation": "The salary history covers fewer than three months.",
    "recommendedActions": [],
    "requiredDocuments": [
      { "text": "Additional salary history.", "policyIds": ["SAL-001"], "checkNames": ["salary_stability"] }
    ]
  },
  "error": null
}
```

## Current Scope and Limitations

- The project is an MVP and is not suitable for real lending decisions.
- CSV parsing intentionally supports a simple comma-separated sample format; it is not a full RFC-compliant parser.
- JSON payloads and extracted fields have minimal runtime validation.
- Policies are stored in a versioned sample JSON file, not an approved bank policy repository or vector database.
- AI-generated explanations require network access and a valid OpenAI API key. Missing configuration, transient network failures, rate limits, and invalid AI output leave rule results, policy-defined guidance, and matched policies visible with an explicit warning.
- The model output is schema-validated, but it must still be reviewed by a person.
- Authentication, authorization, audit logging, encryption strategy, document retention, observability, and production security controls are not implemented.
- Currency formatting currently uses USD, while the sample address is in Singapore; production deployments should make currency and locale explicit.
- `npm test` runs TypeScript validation and focused policy retrieval, guidance, retry, and cache tests; browser tests have not yet been added.

## Possible Next Steps

- Add runtime schemas for every uploaded document and API request.
- Add authentication, reviewer roles, audit history, and application search.
- Move sample policies into an approved repository with ownership, effective dates, and a review workflow.
- Add embeddings and PostgreSQL vector search when the policy corpus grows large enough to justify it.
- Add OCR and secure object storage for real PDF or image documents.
- Add credit, affordability, fraud, and compliance integrations behind clearly separated review stages.
- Add unit tests for threshold boundaries and end-to-end tests for the three sample scenarios.

## Responsible Use

This repository demonstrates a review workflow, not a complete lending system. Any real deployment would require legal, compliance, security, privacy, accessibility, and model-risk review. Final decisions should always be made through an approved process with meaningful human oversight.
