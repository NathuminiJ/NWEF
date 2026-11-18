# NWEF Online Application Portal

Production-ready **full-stack skeleton** for the Eng. Nahil Wijesuriya Endowment Fund (NWEF) scholarship portal.

- **Stack:** Next.js 15 (App Router), TypeScript, Prisma, PostgreSQL, Tailwind CSS, Zod, AES-256-GCM field encryption, hash-chained audit log.
- **Auth:** Passwordless OTP (SMS/email) with database-backed sessions and role-specific timeouts.
- **Streams:** Stream A (Old Trinitian Support — **no income/salary fields**) and Stream B (Sports Scholarships).
- **Roles:** Applicant, Admin Officer, Screening Reviewer, Interview Panel, Trustee, Finance Officer, Super Admin.

---

## Quick start

```bash
cp .env.example .env
# edit .env — at minimum DATABASE_URL and all secrets
docker compose up -d postgres
npm install
npm run prisma:generate
npm run prisma:migrate
npm run seed
npm run dev
```

Open http://localhost:3000. In development the OTP is printed to the console and also returned as `devCode` from `POST /api/auth/otp/request`.

Useful commands:

| Command | Purpose |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build && npm start` | Production build/serve |
| `npm run typecheck` | TypeScript validation |
| `npm run lint` | ESLint |
| `npm run test` | Unit tests (workflow, RBAC, scoring, SLA) |
| `npm run prisma:studio` | Database browser |

Seeded staff phones: `+94770000001` … `+94770000006` (Admin → Super Admin). Replace before deployment.

---

## Project structure

```text
prisma/
  schema.prisma              All entities, enums, relations, audit/PDPA models
  seed.ts                    Staff accounts + annual budgets
src/
  app/
    api/                     Route handlers (auth, applications, screening, interviews,
                             trustee, finance, admin, PDPA self-service)
    (pages)                  Applicant portal + 7 role dashboards
  components/
    application/             Wizard, uploader, timeline, booking, e-signature, renewal
    screening/               Checklist reviewer
    interview/               Scorecard, attendance
    trustee/                 Budget tiles, batch approval
    finance/                 Ledger, invoices, payments, award activation
    admin/                   Session scheduler, user/role editor
    layout/ AuthShell, UI primitives
  lib/
    workflow.ts              State machine (single source of truth)
    rbac.ts                  Permission matrix + guards
    sla.ts                   10-day clock with pause/resume
    audit.ts                 Append-only, hash-chained audit writer
    scoring.ts               Weighted 1–5 rubric (per stream)
    budget.ts                Budget tiles and recomputation
    auth/                    OTP + session management
    validation.ts            Zod request schemas
    storage.ts pdf.ts        Local/S3 storage, award-letter PDF
    pdpa.ts                  Field encryption, consent, data-subject requests
  services/                  Business logic (application, screening, interview, trustee, finance, admin)
  middleware.ts              Route presence guard (server-side checks repeated in APIs/pages)
tests/                       Vitest unit tests
docs/ARCHITECTURE.md         Detailed design notes
docs/API.md                  Endpoint reference
```

---

## Workflow pipeline

```mermaid
flowchart LR
  DRAFT --> SUBMITTED --> UNDER_SCREENING
  UNDER_SCREENING -->|request info| INFO_REQUESTED
  INFO_REQUESTED -->|response: clock resumes| UNDER_SCREENING
  UNDER_SCREENING --> SHORTLISTED
  UNDER_SCREENING --> NOT_ELIGIBLE
  SHORTLISTED --> INTERVIEW_SCHEDULED --> INTERVIEWED
  INTERVIEWED --> RECOMMENDED
  INTERVIEWED --> NOT_RECOMMENDED
  RECOMMENDED --> TRUSTEE_APPROVED
  RECOMMENDED --> TRUSTEE_WAITLISTED
  RECOMMENDED --> TRUSTEE_DECLINED
  NOT_RECOMMENDED --> TRUSTEE_APPROVED
  NOT_RECOMMENDED --> TRUSTEE_WAITLISTED
  NOT_RECOMMENDED --> TRUSTEE_DECLINED
  TRUSTEE_WAITLISTED --> TRUSTEE_APPROVED
  TRUSTEE_WAITLISTED --> TRUSTEE_DECLINED
  TRUSTEE_APPROVED --> AWARD_ACCEPTED --> ACTIVE_AWARD --> ANNUAL_RENEWAL
```

Every arrow is a `TransitionDefinition` in `src/lib/workflow.ts` with `from`, `to`, allowed roles and guards. All status changes go through `performTransition()`, which writes the timeline event, applies SLA clock rules, runs atomic side effects and appends an audit record **in one database transaction**.

`INFO_REQUESTED` stores `clockPausedAt`; the stored due date is extended by the live pause interval so reviewers never see a false overdue flag. On resume, elapsed paused time is added to `pausedDurationMs` and `slaDueAt` is recomputed (submission + 10 days + total paused time).

---

## Roles at a glance

| Role | Primary capability | Explicitly cannot |
| --- | --- | --- |
| Applicant | Create/edit own draft, upload documents, book interview, respond to info requests, e-sign award, request renewal | Screen, score, approve, record payments, read audit |
| Admin Officer | Manage pipeline, screening, interview sessions, award letters, SLA reports | Trustee decisions, payment posting |
| Screening Reviewer | Screening checklist + eligibility outcome, request information | Score, approve, pay |
| Interview Panel | Independent weighted scorecards, mark attendance | Screen, approve, pay |
| Trustee | Batch approve/waitlist/decline, view budget | Post payments, alter scores |
| Finance Officer | Activate awards, instalments, invoices, payments, budget | Decide awards, screen |
| Super Admin | Full permissions, user/role management, audit & PDPA | — |

Permission logic lives in `src/lib/rbac.ts` and is enforced again by resource-level guards in `src/services/access.ts`. Changing a role or disabling a user revokes all of that user's live sessions.

---

## Security & compliance implemented

- Passwordless OTP with expiry, attempt limits, request rate limiting, single-use challenges.
- DB-backed sessions with HMAC-hashed tokens, `HttpOnly`/`Secure`/`SameSite` cookies and per-role absolute timeouts (Applicant 12h → Trustee/Super Admin 2h).
- Strict RBAC with deny-by-default permission sets and resource ownership/status checks.
- Append-only `AuditLog` with HMAC hash chaining (`verifyAuditChain()`), recording every view, status change, score, decision, payment, upload/download and denial with actor + timestamp.
- PII field encryption helpers (AES-256-GCM) for NIC/bank data; consent records; 30-day PDPA data-subject request register.
- Upload validation: PDF/JPG/PNG only, 10MB cap, MIME allow-list per stream, SHA-256 checksum, private storage (local dev / S3 with SSE in prod).
- Security headers, no-store on document responses, canonical error responses.

Production hardening notes are in `docs/ARCHITECTURE.md`.

---

## Testing

Unit tests cover the state machine guards, clock pause math, RBAC separation, weighted rubrics and SLA flags:

```bash
npm run test
```

---

## Documentation

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — domain model, invariants, deployment hardening checklist.
- [`docs/API.md`](docs/API.md) — endpoint reference with required roles.
