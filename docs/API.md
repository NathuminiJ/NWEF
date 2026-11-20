# API reference

All endpoints return `{ success: true, data }` on success and
`{ success: false, error: { code, message, details? } }` on failure. Auth uses the
`nwef_session` cookie set by the OTP verify endpoint.

## Auth

| Method | Path | Access | Notes |
| --- | --- | --- | --- |
| POST | `/api/auth/otp/request` | Public | `{ phone, email? }`; creates applicant accounts only |
| POST | `/api/auth/otp/verify` | Public | `{ identifier, code }`; sets session cookie |
| POST | `/api/auth/logout` | Authenticated | Revokes session |
| GET | `/api/auth/me` | Authenticated | Current user + role |

## Applications

| Method | Path | Access | Notes |
| --- | --- | --- | --- |
| GET | `/api/applications` | Authenticated | Role-scoped list; `status`, `stream`, `search` filters |
| POST | `/api/applications` | Applicant | Create draft with stream + child |
| GET | `/api/applications/:id` | Scoped | Full detail incl. timeline; writes VIEW audit |
| PATCH | `/api/applications/:id` | Owner, draft only | Autosave child/guardian/stream payload |
| POST | `/api/applications/:id/submit` | Applicant | Requires documents + consent; DRAFT → SUBMITTED |
| POST | `/api/applications/:id/documents` | Owner/Admin | multipart: `type`, `file` (PDF/JPG/PNG ≤ 10MB) |
| DELETE | `/api/applications/:id/documents/:documentId` | Owner, draft | Soft delete + storage removal |
| GET | `/api/applications/:id/timeline` | Scoped | Append-only status events |
| POST | `/api/applications/:id/info-request` | Admin/Reviewer | Pauses SLA clock |
| POST | `/api/applications/:id/info-response` | Applicant/Admin | Resumes SLA clock |
| POST | `/api/applications/:id/interview-booking` | Applicant | `{ slotId }`; capacity checked atomically |
| POST | `/api/applications/:id/screening` | Admin/Reviewer | Checklist + outcome → shortlist / not shortlisted |
| GET / POST | `/api/applications/:id/scores` | Panel/Admin | Independent weighted scorecards |
| POST | `/api/applications/:id/interview/attended` | Admin/Panel | INTERVIEW_SCHEDULED → INTERVIEWED |
| POST | `/api/applications/:id/trustee-decision` | Trustee | Approve/waitlist/decline; generates award letter on approve |
| GET | `/api/applications/:id/award-letter` | Scoped | PDF stream with audit |
| GET | `/api/applications/:id/summary-pdf` | Scoped | Application summary PDF with audit |
| GET | `/api/portal-guide` | Public | Full design/functionality reference PDF |
| POST | `/api/applications/:id/accept-award` | Applicant | Typed/drawn signature + consent |
| POST | `/api/applications/:id/activate-award` | Finance | Creates instalments → ACTIVE_AWARD |
| POST | `/api/applications/:id/renewal` | Applicant/Admin | Opens next-year application |
| POST | `/api/applications/:id/transition` | Role per transition | Generic guarded transition for side-effect-free actions |
| GET | `/api/documents/:documentId` | Scoped | Private file download with audit |

## Screening & interviews

| Method | Path | Access | Notes |
| --- | --- | --- | --- |
| GET | `/api/screening/queue` | Admin/Reviewer | Includes 10-day SLA flags |
| GET | `/api/interview-sessions` | Authenticated | Sessions with slot availability |
| POST | `/api/interview-sessions` | Admin | Create session + slots |
| GET | `/api/interview-sessions/:id` | Authenticated | Session detail |

## Trustee & finance

| Method | Path | Access | Notes |
| --- | --- | --- | --- |
| GET | `/api/trustee/queue` | Trustee | Applications awaiting decision |
| POST | `/api/trustee/decisions` | Trustee | Batch approve/waitlist/decline with batch ID |
| GET | `/api/trustee/budget` | Trustee/Finance/Admin | Budget tiles |
| GET / POST | `/api/finance/invoices` | Finance | List / register Trinity fee invoices |
| GET | `/api/finance/ledger` | Finance/Admin | Instalments, payments, invoice status |
| POST | `/api/finance/payments` | Finance | Post payment against instalment + invoice |

## Administration & PDPA

| Method | Path | Access | Notes |
| --- | --- | --- | --- |
| GET | `/api/admin/users` | Authenticated | User list (role management UI is Super Admin only) |
| PATCH | `/api/admin/users/:id` | Super Admin | Change role/active; revokes sessions |
| GET | `/api/admin/audit` | Super Admin | Filter by `entityType`, `entityId`, `action`, `take` |
| GET | `/api/admin/audit/integrity` | Super Admin | Hash-chain verification |
| GET | `/api/admin/pdpa/requests` | Super Admin | Data subject request register |
| PATCH | `/api/admin/pdpa/requests/:id` | Super Admin | Resolve/reject request |
| GET | `/api/admin/reports/sla` | Reporting roles | SLA flag report |
| POST | `/api/me/consent` | Authenticated | Record consent to processing |
| POST | `/api/me/data-requests` | Authenticated | Open PDPA request (30-day SLA) |

## Error codes

`BAD_REQUEST` (400), `UNAUTHORIZED` (401), `FORBIDDEN` (403), `NOT_FOUND` (404), `CONFLICT` (409), `VALIDATION_ERROR` (422), `RATE_LIMITED` (429), `INTERNAL` (500). Prisma unique violations are mapped to 409 and missing records to 404.
