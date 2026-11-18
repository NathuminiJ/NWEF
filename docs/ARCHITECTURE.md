# Architecture & design notes

## 1. System shape

A modular Next.js monolith is used deliberately: one deployable, one database, clear service boundaries. UI components never talk to Prisma directly; they call route handlers which call services which call the pure domain modules.

```text
Browser → App Router page / API route → service → domain module (workflow/rbac/sla/scoring) → Prisma → PostgreSQL
                                              ↘ audit writer / storage / PDF / notifications
```

This keeps the state machine and permission rules independently testable from HTTP and React.

## 2. Domain invariants

1. **Stream A never stores income, salary, employment or asset evidence.** Its only free-form field is `StreamAData.circumstances`. The upload allow-list in `constants.ts` excludes financial document types for this stream, and `uploadDocument()` rechecks it server-side.
2. **Stream B always records** sport, position, level, results, recruiting coach name/phone, and optional club/achievements/coach declaration.
3. **One application = one child.** Multi-child support is achieved by creating multiple applications under one guardian account (`Application.guardianId`), with OTP identity as the only login credential.
4. **Status changes only through `assertTransition()`.** No route may set `status` directly. Side effects are passed into `performTransition()` as transaction-scoped callbacks.
5. **Info Requested pauses the clock.** `clockPausedAt` is set on entry; `pausedDurationMs` accumulates on exit; `slaDueAt = submittedAt + turnaround + pausedDurationMs`.
6. **Panel scores are independent.** `Score` is unique on `(applicationId, panelMemberId)`. Weights are per stream and sum to 1.00. Recommendation requires a submitted rubric and, for `RECOMMENDED`, an average weighted score at or above `MIN_PANEL_SCORE_FOR_RECOMMENDATION`.
7. **TrusteeApproved generates an award letter** (PDF stored in object storage) and an `Award` offer. Finance converts it to an `ActiveAward` by creating instalments; only after that can payments be posted.
8. **Payments reconcile against `FeeInvoice`.** A payment is always linked to both an instalment and a Trinity College fee invoice; overpayment is rejected and invoice status is recomputed.
9. **Audit rows are immutable.** Only `INSERT` and `SELECT` are exposed by code. Each row's HMAC covers its predecessor hash, forming a tamper-evident chain.

## 3. Money & budget

All monetary fields are `Decimal(12,2)` (budgets `Decimal(14,2)`). `BudgetTiles` shows Budget / Committed / Paid / Available; `available = max(0, budget - committed)`. Committed is recomputed after trustee approvals, paid after finance payments. This is intentionally simple — for high-volume production, move aggregation to a scheduled materialised view.

## 4. Security boundaries

### Authentication
`POST /api/auth/otp/request` finds an existing user by phone/email or creates an APPLICANT. Staff accounts must be pre-provisioned (seed or Super Admin). Codes are HMAC-hashed with `OTP_SECRET`, expire in 10 minutes, allow 5 attempts, and requests are rate-limited per identifier. `POST /api/auth/otp/verify` consumes the challenge, creates a session, and sets the cookie.

### Sessions
Session tokens are high-entropy random strings; only their HMAC hashes are stored. `getCurrentUser()` checks revocation, expiry and `isActive`, then refreshes `lastSeenAt`. Absolute lifetimes by role:

| Role | Lifetime |
| --- | --- |
| Applicant | 12h |
| Admin Officer / Screening Reviewer | 8h |
| Interview Panel / Finance Officer | 4h |
| Trustee / Super Admin | 2h |

### Authorization
Two layers:
- `assertCan(role, permission)` in `rbac.ts` for coarse capability checks.
- `canAccessApplication()` in `services/access.ts` for ownership and pipeline-stage scoping, plus stage guards inside each transition.

Denials write a `PERMISSION_DENIED` audit event.

### Data protection (Sri Lanka PDPA)
- `ConsentRecord` stores purpose, version, text, timestamp and IP. Application submission requires consent; award acceptance records a separate consent.
- `encryptPii()` / `decryptPii()` provide AES-256-GCM with a 32-byte key from `PDPA_ENCRYPTION_KEY`. Use for `User.nicEncrypted` and `User.bankAccountEncrypted`.
- `DataSubjectRequest` supports ACCESS, ERASURE, RECTIFICATION, PORTABILITY and OBJECTION with a 30-day due date and a Super Admin resolution workflow.
- Data protection notice is presented at login and in the wizard; retention statement is in `constants.ts`.

## 5. File storage

`StorageService` has two implementations:
- **local** (development): writes under `.storage/<applicationId>/<random>.<ext>`, with path-traversal checks.
- **s3** (production): S3-compatible (AWS or MinIO), server-side AES256 encryption, presigned URLs via `@aws-sdk/s3-request-presigner`.

Downloads always go through `/api/documents/[documentId]`, which checks access and writes a `DOCUMENT_DOWNLOAD` audit event. No public bucket access is required.

## 6. Notifications

`Notification` rows are created for every template send. OTP delivery uses Twilio when `OTP_DRIVER=twilio`, otherwise console logging. Replace `notifications.ts` with your SMS/email provider adapter as needed; the interface is intentionally small.

## 7. Production hardening checklist

- [ ] Set all secrets from a secret manager; never reuse dev fallbacks. Generate 32-byte base64 PDPA key.
- [ ] Run PostgreSQL with TLS and encrypted backups; restrict the app DB role to `INSERT/SELECT` on `AuditLog` (revoke `UPDATE/DELETE`) so immutability is enforced by the database, not only by code.
- [ ] Replace the console OTP driver with a vetted SMS provider and add per-IP rate limits at the edge/WAF.
- [ ] Move `writeAudit()` chain lookup to an advisory lock or sequence-backed table under concurrency (current implementation is correct for moderate single-writer load).
- [ ] Add CSRF tokens or `Origin` checks for cookie-authenticated mutations if the app is served from multiple origins.
- [ ] Configure CORS/CDN caching so document and API responses remain private (`no-store` is already set on file downloads).
- [ ] Add retention jobs for expired OTP challenges/sessions and for PDPA-driven erasure.
- [ ] Add observability (structured logs, metrics on SLA flags and failed transitions) and alerting.
- [ ] Review annual budget recomputation against accounting policy; add reconciliation reports.
- [ ] Perform role-permission and PDPA review before each award cycle.

## 8. Extending the skeleton

- Add a criterion: update `SCORE_CRITERIA` in `constants.ts` (weights must still sum to 1.0 per stream) and the wizard/scorecard picks it up.
- Add a screening item: update `SCREENING_CHECKLIST`; the reviewer UI and server-side completeness check use the same list.
- Add a state: add the enum value in `prisma/schema.prisma`, a `TransitionDefinition` in `workflow.ts`, a label in `STATUS_LABELS`, and any side effects in the service that calls `performTransition()`.
